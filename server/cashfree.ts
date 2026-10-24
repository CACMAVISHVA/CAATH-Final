import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IncomingMessage } from 'node:http';

export const CASHFREE_API_VERSION = '2025-01-01';
export const CASHFREE_ENV = process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox';
export const CASHFREE_BASE_URL = CASHFREE_ENV === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

export type CashfreePlan = 'CAATH Practice OS';
export type CashfreeBillingCycle = 'Monthly';

const monthlyAmounts: Record<CashfreePlan, number> = { 'CAATH Practice OS': 1499 };

export const calculatePaymentTotals = (plan: CashfreePlan, cycle: CashfreeBillingCycle) => {
  const monthly = monthlyAmounts[plan];
  const amount = monthly;
  // CAATH is not charging GST on its own subscriptions until its GST
  // registration is active. Keep the field for invoice compatibility so tax
  // can be enabled later without changing the payment/order schema.
  const gstAmount = 0;
  return { amount, gstAmount, totalAmount: amount };
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
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += bytes.length;
    if (size > 262144) throw Object.assign(new Error('Request too large.'), { statusCode: 413 });
    chunks.push(bytes);
  }
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

const sendApprovalEmailIfConfigured = async (db: SupabaseClient, decision: Record<string, any>, request: Record<string, any>) => {
  if (decision?.status !== 'pending' || !process.env.RESEND_API_KEY || !process.env.CAATH_EMAIL_FROM) return;
  const { data: settings } = await db.from('platform_settings').select('approval_email_enabled').eq('id', true).maybeSingle();
  if (!settings?.approval_email_enabled) return;
  const configuredRecipient = process.env.GOD_ADMIN_EMAIL;
  const { data: godAdmin } = configuredRecipient
    ? { data: { email: configuredRecipient } }
    : await db.from('users').select('email').eq('role', 'GodAdmin').eq('status', 'Active').limit(1).maybeSingle();
  if (!godAdmin?.email) return;
  const actionUrl = `https://caath.in${decision.actionUrl}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.CAATH_EMAIL_FROM,
      to: [godAdmin.email],
      subject: `CAATH approval required: ${request.reference_number}`,
      html: `<p>Cashfree verified payment <strong>${request.reference_number}</strong>.</p><p><a href="${actionUrl}">Review and approve this subscription</a></p><p>Sign-in as God Admin is required before any approval can be completed.</p><hr /><p style="font-size:12px;color:#667085">This is a transactional payment-approval alert, not marketing. To opt out of non-essential CAATH email, contact <a href="mailto:cacmavishva@gmail.com?subject=EMAIL%20PREFERENCES%20%E2%80%94%20CAATH">CAATH email preferences</a>. Important security, payment and account notices may still be sent.</p>`,
    }),
  });
  if (!response.ok) console.error('Approval email delivery failed:', response.status, await response.text());
};

export const markOrderPaid = async (db: SupabaseClient, order: Record<string, any>, providerPaymentId?: string | null) => {
  const { data: result, error } = await db.rpc('complete_cashfree_payment', { p_order_id: order.id, p_payment_id: providerPaymentId || null });
  if (error || !result) throw error || new Error('Payment completion unavailable.');
  await sendApprovalEmailIfConfigured(db, result.decision || {}, result.approvalRequest).catch(() => {
    console.error('Approval notification delivery failed.');
  });
  return result as { order: Record<string, any>; approvalRequest: { id: string; reference_number: string }; decision: Record<string, any> };
};
