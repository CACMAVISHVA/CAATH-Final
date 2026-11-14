import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getServiceClient, markOrderPaid, readRawBody, requireCashfreeConfiguration } from '../server/cashfree.js';

const send = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
  try {
    const rawBody = await readRawBody(req);
    const timestamp = String(req.headers['x-webhook-timestamp'] || '');
    const signature = String(req.headers['x-webhook-signature'] || '');
    const { secretKey } = requireCashfreeConfiguration();
    const expected = createHmac('sha256', secretKey).update(timestamp + rawBody).digest('base64');
    if (!timestamp || !signature || Buffer.byteLength(signature) !== Buffer.byteLength(expected)
      || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return send(res, 401, { error: 'Invalid webhook signature.' });
    }
    const event = JSON.parse(rawBody) as {
      data?: { order?: { order_id?: string; order_amount?: number }; payment?: { cf_payment_id?: string | number; payment_status?: string; payment_amount?: number } };
    };
    const orderId = event.data?.order?.order_id;
    if (!orderId) return send(res, 422, { error: 'Order reference is missing.' });
    const db = getServiceClient();
    const { data: order, error } = await db.from('payment_gateway_orders').select('*').eq('provider_order_id', orderId).maybeSingle();
    if (error || !order) return send(res, 404, { error: 'Payment order was not found.' });
    const receivedAmount = Number(event.data?.payment?.payment_amount ?? event.data?.order?.order_amount);
    if (!Number.isFinite(receivedAmount) || Math.abs(receivedAmount - Number(order.total_amount)) > 0.01) {
      await db.from('payment_gateway_orders').update({ status: 'FAILED', updated_at: new Date().toISOString() }).eq('id', order.id);
      return send(res, 422, { error: 'Payment amount does not match the CAATH order.' });
    }
    const paymentStatus = String(event.data?.payment?.payment_status || '').toUpperCase();
    if (paymentStatus === 'SUCCESS') {
      await markOrderPaid(db, order, String(event.data?.payment?.cf_payment_id || '') || null);
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'USER_DROPPED') {
      await db.from('payment_gateway_orders').update({ status: 'FAILED', updated_at: new Date().toISOString() }).eq('id', order.id);
    }
    return send(res, 200, { received: true });
  } catch (error) {
    // Keep the response generic while preserving a non-sensitive diagnostic in
    // server logs. Never log the request body, signature, or Cashfree secrets.
    console.error('Cashfree webhook processing failed:', error instanceof Error ? error.message : 'Unknown error');
    return send(res, 500, { error: 'Webhook processing failed.' });
  }
}
