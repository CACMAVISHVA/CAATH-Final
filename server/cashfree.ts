import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IncomingMessage } from 'node:http';

export const CASHFREE_API_VERSION = '2025-01-01';
export const CASHFREE_ENV = process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox';
export const CASHFREE_BASE_URL = CASHFREE_ENV === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

export type CashfreePlan = 'Starter' | 'Professional' | 'Enterprise';
export type CashfreeBillingCycle = 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';

const monthlyAmounts: Record<CashfreePlan, number> = { Starter: 999, Professional: 1599, Enterprise: 2599 };

export const calculatePaymentTotals = (plan: CashfreePlan, cycle: CashfreeBillingCycle) => {
  const monthly = monthlyAmounts[plan];
  const amount = cycle === 'Yearly'
    ? monthly * 10
    : cycle === 'Half-Yearly'
      ? Math.round(monthly * 6 * 0.92)
      : cycle === 'Quarterly'
        ? Math.round(monthly * 3 * 0.96)
        : monthly;
  const gstAmount = Math.round(amount * 0.18);
  return { amount, gstAmount, totalAmount: amount + gstAmount };
};

export const getServiceClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('CAATH payment database configuration is incomplete.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

export const requireCashfreeConfiguration = () => {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secretKey) throw new Error('Cashfree payment configuration is incomplete.');
  return { appId, secretKey };
};

export const readRawBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
};

export const authenticateWorkspaceOwner = async (req: IncomingMessage, db: SupabaseClient) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) throw Object.assign(new Error('Sign in again to continue.'), { statusCode: 401 });
  const token = auth.slice(7);
  const { data: authData, error: authError } = await db.auth.getUser(token);
  if (authError || !authData.user) throw Object.assign(new Error('Sign in again to continue.'), { statusCode: 401 });
  const { data: profile, error: profileError } = await db
    .from('users')
    .select('id, firm_id, name, email, role, status')
    .eq('auth_id', authData.user.id)
    .maybeSingle();
  if (profileError || !profile || profile.role !== 'SuperAdmin' || profile.status !== 'Active' || !profile.firm_id) {
    throw Object.assign(new Error('Only an active workspace Super Admin can make subscription payments.'), { statusCode: 403 });
  }
  const mobile = String(authData.user.user_metadata?.mobile || authData.user.phone || '').replace(/\D/g, '').slice(-10);
  if (!/^\d{10}$/.test(mobile)) {
    throw Object.assign(new Error('Add a valid 10-digit mobile number to your CAATH account before payment.'), { statusCode: 422 });
  }
  return { profile, authUser: authData.user, mobile };
};

export const cashfreeRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const { appId, secretKey } = requireCashfreeConfiguration();
  const response = await fetch(`${CASHFREE_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': CASHFREE_API_VERSION,
      'x-client-id': appId,
      'x-client-secret': secretKey,
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({})) as T & { message?: string; type?: string };
  if (!response.ok) {
    const message = typeof payload?.message === 'string' ? payload.message : 'Cashfree could not process this request.';
    throw Object.assign(new Error(message), { statusCode: response.status });
  }
  return payload;
};

export const ensureApprovalRequest = async (db: SupabaseClient, order: Record<string, any>) => {
  const { data: existing } = await db
    .from('subscription_requests')
    .select('id, reference_number')
    .eq('gateway_order_id', order.id)
    .maybeSingle();
  if (existing) return existing;

  const reference = `CF-${new Date().getFullYear()}-${String(order.provider_order_id).slice(-16).toUpperCase()}`;
  const { data: request, error } = await db.from('subscription_requests').insert([{
    reference_number: reference,
    firm_id: order.firm_id,
    plan: order.plan,
    billing_cycle: order.billing_cycle,
    amount: order.amount,
    gst_amount: order.gst_amount,
    total_amount: order.total_amount,
    utr_number: order.provider_payment_id || order.provider_order_id,
    screenshot_url: null,
    screenshot_path: null,
    payment_provider: 'Cashfree',
    gateway_order_id: order.id,
    status: 'Pending Verification',
    created_by: order.created_by,
    updated_by: order.created_by,
  }]).select('id, reference_number').single();
  if (error) throw error;

  await db.from('firms').update({ subscription_plan: order.plan, subscription_status: 'Pending Verification', updated_at: new Date().toISOString() }).eq('id', order.firm_id);
  await db.from('notifications').insert([
    {
      firm_id: order.firm_id,
      audience_role: 'SuperAdmin',
      title: 'Cashfree payment received',
      message: `${reference} was verified by Cashfree and is awaiting CAATH approval.`,
      priority: 'HIGH',
      status: 'UNREAD',
      created_by: order.created_by,
    },
    {
      firm_id: null,
      audience_role: 'GodAdmin',
      title: 'Paid subscription awaiting approval',
      message: `${reference} was verified by Cashfree. Review and activate the workspace subscription.`,
      priority: 'HIGH',
      status: 'UNREAD',
      created_by: order.created_by,
    },
  ]);
  return request;
};

export const markOrderPaid = async (db: SupabaseClient, order: Record<string, any>, providerPaymentId?: string | null) => {
  const { data: updated, error } = await db.from('payment_gateway_orders').update({
    status: 'PAID',
    provider_payment_id: providerPaymentId || order.provider_payment_id || null,
    paid_at: order.paid_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', order.id).select('*').single();
  if (error) throw error;
  const approvalRequest = await ensureApprovalRequest(db, updated);
  return { order: updated, approvalRequest };
};
