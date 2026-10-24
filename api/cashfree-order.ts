import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import {
  authenticateWorkspaceOwner,
  calculatePaymentTotals,
  cashfreeRequest,
  CASHFREE_ENV,
  CashfreeBillingCycle,
  CashfreePlan,
  getServiceClient,
  markOrderPaid,
  readRawBody,
} from '../server/cashfree.js';

const plans = new Set<CashfreePlan>(['CAATH Practice OS']);
const cycles = new Set<CashfreeBillingCycle>(['Monthly']);

const send = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!['GET', 'POST'].includes(req.method || '')) return send(res, 405, { error: 'Method not allowed.' });
  let stage = 'initialization';
  try {
    stage = 'database configuration';
    const db = getServiceClient();
    stage = 'workspace authentication';
    const owner = await authenticateWorkspaceOwner(req, db);

    if (req.method === 'POST') {
      // Never let the public production site open Cashfree's sandbox checkout.
      // This protects customers if test credentials remain configured while the
      // merchant account is being moved from onboarding to live mode.
      if (process.env.VERCEL_ENV === 'production' && CASHFREE_ENV !== 'production') {
        return send(res, 503, {
          error: 'Online payment is temporarily unavailable while live payment credentials are being enabled. Use the manual payment option or try again later.',
        });
      }
      stage = 'request validation';
      const body = JSON.parse((await readRawBody(req)) || '{}') as { plan?: CashfreePlan; billingCycle?: CashfreeBillingCycle; customerPhone?: string };
      if (!body.plan || !plans.has(body.plan) || !body.billingCycle || !cycles.has(body.billingCycle)) {
        return send(res, 422, { error: 'Select a valid CAATH plan and billing cycle.' });
      }
      const customerPhone = String(body.customerPhone || owner.mobile || '').replace(/\D/g, '').slice(-10);
      if (!/^[6-9]\d{9}$/.test(customerPhone)) {
        return send(res, 422, { error: 'Enter a valid 10-digit Indian mobile number to open secure checkout.' });
      }
      const totals = calculatePaymentTotals(body.plan, body.billingCycle);
      const providerOrderId = `caath_${Date.now()}_${randomUUID().slice(0, 8)}`;
      stage = 'Cashfree order creation';
      const created = await cashfreeRequest<{ order_id: string; payment_session_id: string; order_status: string }>('/orders', {
        method: 'POST',
        headers: { 'x-idempotency-key': randomUUID() },
        body: JSON.stringify({
          order_id: providerOrderId,
          order_amount: totals.totalAmount,
          order_currency: 'INR',
          customer_details: {
            customer_id: owner.profile.id.replace(/-/g, ''),
            customer_name: owner.profile.name,
            customer_email: owner.profile.email,
            customer_phone: customerPhone,
          },
          order_meta: {
            return_url: `https://caath.in/settings/subscription?payment=return&order_id=${providerOrderId}`,
            notify_url: 'https://caath.in/api/cashfree-webhook',
          },
          order_note: `CAATH ${body.plan} ${body.billingCycle} access purchase or renewal`,
          order_tags: { firm_id: owner.profile.firm_id, plan: body.plan, billing_cycle: body.billingCycle },
        }),
      });
      stage = 'payment order persistence';
      const { data: saved, error } = await db.from('payment_gateway_orders').insert([{
        firm_id: owner.profile.firm_id,
        created_by: owner.profile.id,
        provider_order_id: created.order_id,
        payment_session_id: created.payment_session_id,
        plan: body.plan,
        billing_cycle: body.billingCycle,
        amount: totals.amount,
        gst_amount: totals.gstAmount,
        total_amount: totals.totalAmount,
        status: 'CREATED',
      }]).select('id').single();
      if (error) throw error;
      return send(res, 200, {
        orderId: created.order_id,
        gatewayOrderId: saved.id,
        paymentSessionId: created.payment_session_id,
        mode: CASHFREE_ENV,
        autoRenew: false,
        totalAmount: totals.totalAmount,
      });
    }

    stage = 'payment verification lookup';
    const requestUrl = new URL(req.url || '', 'https://caath.in');
    const orderId = requestUrl.searchParams.get('order_id');
    if (!orderId) return send(res, 422, { error: 'Payment order reference is missing.' });
    const { data: order, error } = await db.from('payment_gateway_orders').select('*')
      .eq('provider_order_id', orderId).eq('firm_id', owner.profile.firm_id).eq('created_by', owner.profile.id).maybeSingle();
    if (error || !order) return send(res, 404, { error: 'Payment order was not found.' });
    stage = 'Cashfree payment verification';
    const remote = await cashfreeRequest<{ order_status: string; order_amount: number; order_currency: string }>(`/orders/${encodeURIComponent(orderId)}`);
    if (remote.order_status === 'PAID') {
      if (remote.order_currency !== order.currency || !Number.isFinite(Number(remote.order_amount)) || Math.abs(Number(remote.order_amount)-Number(order.total_amount)) > 0.01) return send(res,422,{ error:'Payment details do not match this order.' });
      const paid = await markOrderPaid(db, order);
      return send(res, 200, { status: 'PAID', referenceNumber: paid.approvalRequest.reference_number });
    }
    const mapped = remote.order_status === 'EXPIRED' ? 'EXPIRED' : remote.order_status === 'TERMINATED' ? 'FAILED' : order.status;
    if (mapped !== order.status) {
      const { data: finalOrder, error: updateError } = await db.from('payment_gateway_orders').update({ status: mapped, updated_at: new Date().toISOString() }).eq('id', order.id).select('status').single();
      if (updateError) throw updateError;
      return send(res, 200, { status: finalOrder.status });
    }
    return send(res, 200, { status: order.status });
  } catch (error) {
    const status = Number((error as { statusCode?: number })?.statusCode || 500);
    const message = error instanceof Error ? error.message : 'Payment operation failed.';
    console.error('[CASHFREE_ORDER] request failed', {
      stage,
      status: status >= 400 && status < 600 ? status : 500,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      message,
    });
    const isCashfreeFailure = stage.startsWith('Cashfree');
    const isGatewayAuthenticationFailure = isCashfreeFailure && (status === 401 || status === 403);
    const publicMessage = isGatewayAuthenticationFailure
      ? 'Online checkout is temporarily unavailable while CAATH reconnects the payment gateway. No payment was taken. Please try again later or contact CAATH support.'
      : isCashfreeFailure
        ? 'Cashfree could not start secure checkout. No payment was taken. Please try again later or contact CAATH support.'
        : message;
    return send(res, status >= 400 && status < 600 ? status : 500, { error: publicMessage });
  }
}
