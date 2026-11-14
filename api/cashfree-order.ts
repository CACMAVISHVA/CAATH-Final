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

const plans = new Set<CashfreePlan>(['Starter', 'Professional', 'Enterprise']);
const cycles = new Set<CashfreeBillingCycle>(['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']);

const send = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!['GET', 'POST'].includes(req.method || '')) return send(res, 405, { error: 'Method not allowed.' });
  try {
    const db = getServiceClient();
    const owner = await authenticateWorkspaceOwner(req, db);

    if (req.method === 'POST') {
      const body = JSON.parse((await readRawBody(req)) || '{}') as { plan?: CashfreePlan; billingCycle?: CashfreeBillingCycle };
      if (!body.plan || !plans.has(body.plan) || !body.billingCycle || !cycles.has(body.billingCycle)) {
        return send(res, 422, { error: 'Select a valid CAATH plan and billing cycle.' });
      }
      const totals = calculatePaymentTotals(body.plan, body.billingCycle);
      const providerOrderId = `caath_${Date.now()}_${randomUUID().slice(0, 8)}`;
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
            customer_phone: owner.mobile,
          },
          order_meta: {
            return_url: `https://caath.in/settings/subscription?payment=return&order_id=${providerOrderId}`,
            notify_url: 'https://caath.in/api/cashfree-webhook',
          },
          order_note: `CAATH ${body.plan} ${body.billingCycle} subscription`,
          order_tags: { firm_id: owner.profile.firm_id, plan: body.plan, billing_cycle: body.billingCycle },
        }),
      });
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
        totalAmount: totals.totalAmount,
      });
    }

    const requestUrl = new URL(req.url || '', 'https://caath.in');
    const orderId = requestUrl.searchParams.get('order_id');
    if (!orderId) return send(res, 422, { error: 'Payment order reference is missing.' });
    const { data: order, error } = await db.from('payment_gateway_orders').select('*')
      .eq('provider_order_id', orderId).eq('firm_id', owner.profile.firm_id).eq('created_by', owner.profile.id).maybeSingle();
    if (error || !order) return send(res, 404, { error: 'Payment order was not found.' });
    const remote = await cashfreeRequest<{ order_status: string }>(`/orders/${encodeURIComponent(orderId)}`);
    if (remote.order_status === 'PAID' && order.status !== 'PAID') {
      const paid = await markOrderPaid(db, order);
      return send(res, 200, { status: 'PAID', referenceNumber: paid.approvalRequest.reference_number });
    }
    const mapped = remote.order_status === 'EXPIRED' ? 'EXPIRED' : remote.order_status === 'TERMINATED' ? 'FAILED' : order.status;
    if (mapped !== order.status) await db.from('payment_gateway_orders').update({ status: mapped, updated_at: new Date().toISOString() }).eq('id', order.id);
    return send(res, 200, { status: mapped });
  } catch (error) {
    const status = Number((error as { statusCode?: number })?.statusCode || 500);
    const message = error instanceof Error ? error.message : 'Payment operation failed.';
    return send(res, status >= 400 && status < 600 ? status : 500, { error: message });
  }
}
