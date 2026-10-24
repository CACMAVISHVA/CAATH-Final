/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { createNotification } from './notificationService';
import { User } from '../types';
import { firstValidationError, validateEmail, validateGSTIN, validateIndianMobile, validateRequiredName } from '../lib/fieldValidation';

export type SubscriptionPlan = 'CAATH Practice OS';
export type SubscriptionStatus =
  | 'Trial'
  | 'Pending Verification'
  | 'Pending Payment'
  | 'Active'
  | 'Expired'
  | 'Suspended'
  | 'Cancelled'
  | 'Rejected';
export type BillingCycle = 'Monthly';

export interface Subscription {
  id: string;
  firm_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  amount: number;
  starts_at?: string | null;
  expires_at?: string | null;
  trial_ends_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  next_billing_date?: string | null;
  trial_end_date?: string | null;
  grace_period_end_date?: string | null;
  features?: string[] | Record<string, boolean>;
  client_limit?: number;
  staff_limit?: number;
  storage_limit_gb?: number;
  auto_renew?: boolean;
  payment_method?: string | null;
  last_payment_date?: string | null;
  last_payment_status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionPlanConfig {
  plan: SubscriptionPlan;
  monthlyAmount: number;
  annualAmount: number;
  yearlyAmount?: number;
  clientLimit: number;
  staffLimit: number;
  storageLimitGB: number;
  features: string[];
}

export interface PlatformSettings {
  id: boolean;
  company_name: string;
  company_address: string | null;
  company_gstin: string | null;
  subscription_upi_id: string | null;
  subscription_qr_image_url: string | null;
  subscription_contact_email: string | null;
  subscription_contact_phone: string | null;
  auto_approve_trusted_renewals: boolean;
  approval_email_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionRequest {
  id: string;
  reference_number: string;
  firm_id: string;
  plan: SubscriptionPlan;
  billing_cycle: BillingCycle;
  amount: number;
  gst_amount: number;
  total_amount: number;
  utr_number: string | null;
  screenshot_url: string | null;
  screenshot_path: string | null;
  status: 'Pending Verification' | 'Approved' | 'Rejected';
  payment_provider?: 'Manual' | 'Cashfree';
  gateway_order_id?: string | null;
  gateway?: {
    status: 'CREATED' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
    provider_order_id: string;
    provider_payment_id?: string | null;
    paid_at?: string | null;
  } | null;
  remarks: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  approval_mode?: 'Manual' | 'Automatic';
  risk_decision?: { eligible?: boolean; reason?: string; evaluated_at?: string };
  approved_at?: string | null;
  approved_by?: string | null;
  firm?: { name?: string | null; firm_name?: string | null; gstin?: string | null } | null;
}

export interface SubscriptionInvoice {
  id: string;
  invoice_number: string;
  firm_id: string;
  subscription_id: string | null;
  plan: SubscriptionPlan;
  billing_cycle: BillingCycle;
  amount: number;
  gst_amount: number;
  total_amount: number;
  utr_number: string | null;
  invoice_date: string;
  subscription_start_date: string;
  subscription_end_date: string;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  firm?: { name?: string | null; firm_name?: string | null; gstin?: string | null } | null;
}

// CAATH subscriptions are currently supplied without GST. This explicit zero
// rate preserves the existing invoice fields and makes a future, controlled
// GST-registration switch straightforward.
export const GST_RATE = 0;

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanConfig> = {
  'CAATH Practice OS': {
    plan: 'CAATH Practice OS',
    monthlyAmount: 1499,
    annualAmount: 1499,
    clientLimit: -1,
    staffLimit: -1,
    storageLimitGB: 100,
    features: ['Unlimited clients and team members', 'Client, task and document management', 'GST, compliance and notice workflows', 'Billing, reports and profitability visibility', 'Audit trail and role-based controls', 'Recurring workflow automation'],
  },
};

export const getPlanAmount = (plan: SubscriptionPlan, billingCycle: BillingCycle) =>
  SUBSCRIPTION_PLANS[plan].monthlyAmount;

export const calculateSubscriptionTotals = (plan: SubscriptionPlan, billingCycle: BillingCycle) => {
  const amount = getPlanAmount(plan, billingCycle);
  const gstAmount = Math.round(amount * GST_RATE);
  return { amount, gstAmount, totalAmount: amount };
};

export interface CashfreeCheckoutOrder {
  orderId: string;
  gatewayOrderId: string;
  paymentSessionId: string;
  mode: 'sandbox' | 'production';
  autoRenew: false;
  totalAmount: number;
}

const paymentApi = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) throw new Error('Sign in again to continue with payment.');
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'The payment service could not complete the request.');
  return payload;
};

export const createCashfreeCheckoutOrder = (plan: SubscriptionPlan, billingCycle: BillingCycle, customerPhone?: string) =>
  paymentApi<CashfreeCheckoutOrder>('/api/cashfree-order', {
    method: 'POST',
    body: JSON.stringify({ plan, billingCycle, customerPhone }),
  });

export const verifyCashfreeCheckoutOrder = (orderId: string) =>
  paymentApi<{ status: string; referenceNumber?: string }>(`/api/cashfree-order?order_id=${encodeURIComponent(orderId)}`);

const currentYear = () => new Date().getFullYear();

const nextSequence = (value: string | null | undefined) => {
  const current = Number((value || '').split('-').pop() || '0');
  return Number.isFinite(current) ? current + 1 : 1;
};

const planLimits = (plan: SubscriptionPlan) => {
  const config = SUBSCRIPTION_PLANS[plan];
  return {
    max_admins: -1,
    max_staff: config.staffLimit,
    max_clients: config.clientLimit,
  };
};

const featureFlags = (plan: SubscriptionPlan) => ({
  clients: true,
  documents: true,
  workflow: true,
  gst_intelligence: true,
  compliance: true,
  notices: true,
  reports: true,
  billing: true,
  analytics: true,
});

const addCycle = (start: Date, billingCycle: BillingCycle) => {
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return end;
};

const sanitizeStorageName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 96);

const uploadPaymentProof = async (params: { firmId: string; userId: string; referenceNumber: string; file: File }) => {
  const fileExt = params.file.name.split('.').pop() || 'png';
  const path = `${params.firmId}/${params.referenceNumber}-${params.userId}-${Date.now()}.${sanitizeStorageName(fileExt)}`;
  const { error: uploadError } = await supabase.storage
    .from('subscription-payment-proofs')
    .upload(path, params.file, {
      cacheControl: '3600',
      contentType: params.file.type || 'image/png',
      upsert: false,
    });

  if (uploadError) throw uploadError;
  const { data, error: signedUrlError } = await supabase.storage
    .from('subscription-payment-proofs')
    .createSignedUrl(path, 60 * 60);
  if (signedUrlError) throw signedUrlError;
  return { path, url: data.signedUrl };
};

const signPaymentRequestScreenshots = async (requests: SubscriptionRequest[]) => {
  return Promise.all(requests.map(async (request) => {
    if (!request.screenshot_path) return request;
    const { data, error } = await supabase.storage
      .from('subscription-payment-proofs')
      .createSignedUrl(request.screenshot_path, 60 * 60);
    if (error) return request;
    return { ...request, screenshot_url: data.signedUrl };
  }));
};

export const generateSubscriptionRequestReference = async () => {
  const year = currentYear();
  const { data, error } = await supabase
    .from('subscription_requests')
    .select('reference_number')
    .like('reference_number', `SUB-${year}-%`)
    .order('reference_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return `SUB-${year}-${String(nextSequence(data?.reference_number)).padStart(6, '0')}`;
};

export const generateSubscriptionInvoiceNumber = async () => {
  const year = currentYear();
  const { data, error } = await supabase
    .from('subscription_invoices')
    .select('invoice_number')
    .like('invoice_number', `CAATH-SUB-${year}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return `CAATH-SUB-${year}-${String(nextSequence(data?.invoice_number)).padStart(6, '0')}`;
};

export const getPlatformSettings = async (): Promise<PlatformSettings> => {
  const defaults: PlatformSettings = {
    id: true,
    company_name: 'CAATH PMS',
    company_address: null,
    company_gstin: null,
    subscription_upi_id: null,
    subscription_qr_image_url: null,
    subscription_contact_email: null,
    subscription_contact_phone: null,
    auto_approve_trusted_renewals: true,
    approval_email_enabled: false,
  };

  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('id', true)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return { ...defaults, ...(data || {}) } as PlatformSettings;
};

export const savePlatformSettings = async (settings: Partial<PlatformSettings>, user: User) => {
  if (user.role !== 'GodAdmin') throw new Error('Only GodAdmin can update platform settings.');
  const validationError = firstValidationError(
    settings.company_name === undefined ? { valid: true } : validateRequiredName(settings.company_name || '', 'Company name'),
    settings.company_gstin === undefined ? { valid: true } : validateGSTIN(settings.company_gstin || '', false),
    settings.subscription_contact_email === undefined ? { valid: true } : validateEmail(settings.subscription_contact_email || '', false),
    settings.subscription_contact_phone === undefined ? { valid: true } : validateIndianMobile(settings.subscription_contact_phone || '', false),
  );
  if (validationError) throw new Error(validationError);
  const { data, error } = await supabase
    .from('platform_settings')
    .upsert([{ id: true, ...settings, updated_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) throw error;
  return data as PlatformSettings;
};

export const getFirmSubscription = async (firmId: string): Promise<Subscription | null> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data as Subscription | null;
};

export const listSubscriptionRequests = async (firmId?: string) => {
  let query = supabase
    .from('subscription_requests')
    .select('*, firm:firms(name, firm_name, gstin), gateway:payment_gateway_orders!subscription_requests_fk_gateway_order(status, provider_order_id, provider_payment_id, paid_at)')
    .order('created_at', { ascending: false });
  if (firmId) query = query.eq('firm_id', firmId);
  const { data, error } = await query;
  if (error) throw error;
  return signPaymentRequestScreenshots((data || []) as SubscriptionRequest[]);
};

export const listSubscriptionInvoices = async (firmId?: string) => {
  let query = supabase
    .from('subscription_invoices')
    .select('*, firm:firms(name, firm_name, gstin)')
    .order('created_at', { ascending: false });
  if (firmId) query = query.eq('firm_id', firmId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as SubscriptionInvoice[];
};

export const submitSubscriptionRequest = async (params: {
  user: User;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  utrNumber: string;
  screenshotFile: File;
}) => {
  if (params.user.role !== 'SuperAdmin') throw new Error('Only SuperAdmin can request subscription activation.');
  if (!params.user.firmId) throw new Error('A workspace is required to request activation.');
  if (!params.utrNumber.trim()) throw new Error('Transaction Reference Number (UTR) is required.');
  if (!params.screenshotFile) throw new Error('Payment screenshot is required.');
  if (!params.screenshotFile.type.startsWith('image/')) throw new Error('Please upload a valid image screenshot.');
  if (params.screenshotFile.size > 5 * 1024 * 1024) throw new Error('Screenshot must be 5 MB or smaller.');

  const referenceNumber = await generateSubscriptionRequestReference();
  const totals = calculateSubscriptionTotals(params.plan, params.billingCycle);
  const proof = await uploadPaymentProof({
    firmId: params.user.firmId,
    userId: params.user.id,
    referenceNumber,
    file: params.screenshotFile,
  });

  const { data, error } = await supabase
    .from('subscription_requests')
    .insert([{
      reference_number: referenceNumber,
      firm_id: params.user.firmId,
      plan: params.plan,
      billing_cycle: params.billingCycle,
      amount: totals.amount,
      gst_amount: totals.gstAmount,
      total_amount: totals.totalAmount,
      utr_number: params.utrNumber.trim(),
      screenshot_url: proof.url,
      screenshot_path: proof.path,
      status: 'Pending Verification',
      created_by: params.user.id,
      updated_by: params.user.id,
    }])
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('firms')
    .update({
      subscription_plan: params.plan,
      subscription_status: 'Pending Verification',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.user.firmId);

  await createNotification({
    firmId: params.user.firmId,
    audienceRole: 'SuperAdmin',
    title: 'Subscription request submitted',
    message: 'Your subscription activation request has been submitted.',
    priority: 'MEDIUM',
    user: params.user,
  });

  await createNotification({
    audienceRole: 'GodAdmin',
    title: 'Subscription verification required',
    message: `${params.user.firm?.name || 'A workspace'} submitted ${referenceNumber} for verification.`,
    priority: 'HIGH',
    actionUrl: `/app?tab=subscriptions&request=${data.id}`,
    user: params.user,
  });

  return data as SubscriptionRequest;
};

const upsertActiveSubscription = async (params: {
  firmId: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  amount: number;
  paymentMethod: 'Cashfree' | 'Manual';
  actor: User;
  startDate: Date;
  endDate: Date;
}) => {
  const existing = await getFirmSubscription(params.firmId);
  const limits = planLimits(params.plan);
  const payload = {
    plan: params.plan,
    status: 'Active',
    billing_cycle: params.billingCycle,
    amount: params.amount,
    starts_at: params.startDate.toISOString(),
    expires_at: params.endDate.toISOString(),
    trial_ends_at: null,
    start_date: params.startDate.toISOString(),
    end_date: params.endDate.toISOString(),
    next_billing_date: params.endDate.toISOString(),
    trial_end_date: null,
    grace_period_end_date: null,
    features: featureFlags(params.plan),
    client_limit: limits.max_clients,
    staff_limit: limits.max_staff,
    storage_limit_gb: SUBSCRIPTION_PLANS[params.plan].storageLimitGB,
    auto_renew: false,
    payment_method: params.paymentMethod,
    last_payment_status: 'Success',
    updated_by: params.actor.id,
    updated_at: new Date().toISOString(),
  };

  const query = existing
    ? supabase.from('subscriptions').update(payload).eq('id', existing.id)
    : supabase.from('subscriptions').insert([{ firm_id: params.firmId, created_by: params.actor.id, ...payload }]);

  const { data, error } = await query.select().single();
  if (error) throw error;

  const { error: firmError } = await supabase
    .from('firms')
    .update({
      subscription_plan: params.plan,
      subscription_status: 'Active',
      subscription_start_date: params.startDate.toISOString(),
      subscription_expiry_date: params.endDate.toISOString(),
      ...limits,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.firmId);

  if (firmError) throw firmError;
  return data as Subscription;
};

const createSubscriptionInvoice = async (params: {
  firmId: string;
  subscriptionId: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  utrNumber?: string | null;
  startDate: Date;
  endDate: Date;
}) => {
  const invoiceNumber = await generateSubscriptionInvoiceNumber();
  const { data, error } = await supabase
    .from('subscription_invoices')
    .insert([{
      invoice_number: invoiceNumber,
      firm_id: params.firmId,
      subscription_id: params.subscriptionId,
      plan: params.plan,
      billing_cycle: params.billingCycle,
      amount: params.amount,
      gst_amount: params.gstAmount,
      total_amount: params.totalAmount,
      utr_number: params.utrNumber || null,
      invoice_date: new Date().toISOString(),
      subscription_start_date: params.startDate.toISOString(),
      subscription_end_date: params.endDate.toISOString(),
      pdf_url: null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data as SubscriptionInvoice;
};

const writeAudit = async (user: User, params: { firmId?: string | null; action: string; entityType: string; entityId?: string; details: string }) => {
  await supabase.from('audit_logs').insert([{
    firm_id: params.firmId || null,
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId || null,
    details: params.details,
    created_by: user.id,
    updated_by: user.id,
  }]);
};

export const approveSubscriptionRequest = async (request: SubscriptionRequest, actor: User) => {
  if (actor.role !== 'GodAdmin') throw new Error('Only GodAdmin can approve subscription requests.');
  if (request.payment_provider === 'Cashfree' && request.gateway?.status !== 'PAID') {
    throw new Error('Cashfree has not verified this payment as paid. Activation is blocked.');
  }
  const startDate = new Date();
  const endDate = addCycle(startDate, request.billing_cycle);
  const subscription = await upsertActiveSubscription({
    firmId: request.firm_id,
    plan: request.plan,
    billingCycle: request.billing_cycle,
    amount: request.amount,
    paymentMethod: request.payment_provider === 'Cashfree' ? 'Cashfree' : 'Manual',
    actor,
    startDate,
    endDate,
  });

  const invoice = await createSubscriptionInvoice({
    firmId: request.firm_id,
    subscriptionId: subscription.id,
    plan: request.plan,
    billingCycle: request.billing_cycle,
    amount: request.amount,
    gstAmount: request.gst_amount,
    totalAmount: request.total_amount,
    utrNumber: request.utr_number,
    startDate,
    endDate,
  });

  const { error } = await supabase
    .from('subscription_requests')
    .update({
      status: 'Approved',
      approval_mode: 'Manual',
      approved_at: new Date().toISOString(),
      approved_by: actor.id,
      risk_decision: { eligible: false, reason: 'god_admin_review', evaluated_at: new Date().toISOString() },
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id);
  if (error) throw error;

  await createNotification({
    firmId: request.firm_id,
    audienceRole: 'SuperAdmin',
    title: 'Subscription activated',
    message: 'Your CAATH PMS subscription has been activated.',
    priority: 'HIGH',
    user: actor,
  });

  await writeAudit(actor, {
    firmId: request.firm_id,
    action: 'Subscription Request Approved',
    entityType: 'SubscriptionRequest',
    entityId: request.id,
    details: `Approved ${request.reference_number} and generated invoice ${invoice.invoice_number}.`,
  });

  return { subscription, invoice };
};

export const rejectSubscriptionRequest = async (request: SubscriptionRequest, remarks: string, actor: User) => {
  if (actor.role !== 'GodAdmin') throw new Error('Only GodAdmin can reject subscription requests.');
  if (!remarks.trim()) throw new Error('Rejection remarks are required.');

  const { error } = await supabase
    .from('subscription_requests')
    .update({
      status: 'Rejected',
      remarks: remarks.trim(),
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id);
  if (error) throw error;

  await supabase
    .from('firms')
    .update({ subscription_status: 'Rejected', updated_at: new Date().toISOString() })
    .eq('id', request.firm_id);

  await createNotification({
    firmId: request.firm_id,
    audienceRole: 'SuperAdmin',
    title: 'Subscription request rejected',
    message: `Your subscription request was rejected.\n\nReason:\n${remarks.trim()}`,
    priority: 'HIGH',
    user: actor,
  });

  await writeAudit(actor, {
    firmId: request.firm_id,
    action: 'Subscription Request Rejected',
    entityType: 'SubscriptionRequest',
    entityId: request.id,
    details: remarks.trim(),
  });
};

export const manuallyActivateSubscription = async (params: {
  firmId: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  utrNumber?: string;
  actor: User;
}) => {
  if (params.actor.role !== 'GodAdmin') throw new Error('Only GodAdmin can manually activate subscriptions.');
  const totals = calculateSubscriptionTotals(params.plan, params.billingCycle);
  const startDate = new Date();
  const endDate = addCycle(startDate, params.billingCycle);
  const subscription = await upsertActiveSubscription({
    firmId: params.firmId,
    plan: params.plan,
    billingCycle: params.billingCycle,
    amount: totals.amount,
    paymentMethod: 'Manual',
    actor: params.actor,
    startDate,
    endDate,
  });
  const invoice = await createSubscriptionInvoice({
    firmId: params.firmId,
    subscriptionId: subscription.id,
    plan: params.plan,
    billingCycle: params.billingCycle,
    amount: totals.amount,
    gstAmount: totals.gstAmount,
    totalAmount: totals.totalAmount,
    utrNumber: params.utrNumber,
    startDate,
    endDate,
  });
  await writeAudit(params.actor, {
    firmId: params.firmId,
    action: 'Manual Subscription Activation',
    entityType: 'Subscription',
    entityId: subscription.id,
    details: `Manual ${params.plan} ${params.billingCycle} subscription activated. Invoice ${invoice.invoice_number}.`,
  });
  return { subscription, invoice };
};

export const hasFeatureAccess = async (firmId: string, feature: string): Promise<boolean> => {
  const subscription = await getFirmSubscription(firmId);
  if (!subscription) return false;
  if (subscription.status === 'Active') return true;
  if (subscription.status === 'Trial') {
    const end = subscription.expires_at || subscription.end_date || subscription.trial_ends_at || subscription.trial_end_date;
    return !end || new Date(end) >= new Date();
  }
  const features = subscription.features;
  return Array.isArray(features) ? features.includes(feature) : Boolean(features?.[feature]);
};

export const getUpcomingRenewals = async (daysAhead: number = 7) => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, firms(name)')
    .in('status', ['Active', 'Trial'])
    .lte('expires_at', futureDate.toISOString());

  if (error) throw error;
  return data || [];
};
