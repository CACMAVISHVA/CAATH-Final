import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getServiceClient, markOrderPaid, readRawBody, requireCashfreeConfiguration } from '../server/cashfree.js';

const send = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
};

export const createWebhookHandler = (deps = { getServiceClient, markOrderPaid, readRawBody, requireCashfreeConfiguration, now: Date.now }) => async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
  try {
    const rawBody = await deps.readRawBody(req);
    const timestamp = String(req.headers['x-webhook-timestamp'] || '');
    const signature = String(req.headers['x-webhook-signature'] || '');
    const sentAt = Number(timestamp);
    if (!/^\d{13}$/.test(timestamp) || !Number.isSafeInteger(sentAt) || Math.abs(deps.now() - sentAt) > 300000) return send(res, 401, { error: 'Invalid webhook timestamp.' });
    const { secretKey } = deps.requireCashfreeConfiguration();
    const expected = createHmac('sha256', secretKey).update(timestamp + rawBody).digest('base64');
    if (!timestamp || !signature || Buffer.byteLength(signature) !== Buffer.byteLength(expected)
      || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return send(res, 401, { error: 'Invalid webhook signature.' });
    }
    const event = JSON.parse(rawBody) as {
      data?: { order?: { order_id?: string; order_amount?: number; order_currency?: string }; payment?: { cf_payment_id?: string | number; payment_status?: string; payment_amount?: number; payment_currency?: string } };
    };
    const orderId = event.data?.order?.order_id;
    if (!orderId) return send(res, 422, { error: 'Order reference is missing.' });
    const db = deps.getServiceClient();
    const { data: order, error } = await db.from('payment_gateway_orders').select('*').eq('provider_order_id', orderId).maybeSingle();
    if (error || !order) return send(res, 404, { error: 'Payment order was not found.' });
    const paymentStatus = String(event.data?.payment?.payment_status || '').toUpperCase();
    // A failed attempt is not a terminal order failure. Cashfree allows retries.
    if (paymentStatus !== 'SUCCESS') return send(res, 200, { received: true });
    const paymentId = String(event.data?.payment?.cf_payment_id || '');
    if (!paymentId || paymentId.length > 128) return send(res, 422, { error: 'Payment reference is missing.' });
    if (event.data?.payment?.payment_currency !== order.currency || event.data?.order?.order_currency !== order.currency) return send(res, 422, { error: 'Payment currency mismatch.' });
    const receivedAmount = Number(event.data?.payment?.payment_amount ?? event.data?.order?.order_amount);
    if (!Number.isFinite(receivedAmount) || Math.abs(receivedAmount - Number(order.total_amount)) > 0.01) {
      return send(res, 422, { error: 'Payment amount does not match the CAATH order.' });
    }
    await deps.markOrderPaid(db, order, paymentId);
    return send(res, 200, { received: true });
  } catch (error) {
    // Keep the response generic while preserving a non-sensitive diagnostic in
    // server logs. Never log the request body, signature, or Cashfree secrets.
    console.error('Cashfree webhook processing failed:', error instanceof Error ? error.message : 'Unknown error');
    return send(res, (error as { statusCode?: number }).statusCode === 413 ? 413 : 500, { error: 'Webhook processing failed.' });
  }
};

export default createWebhookHandler();
