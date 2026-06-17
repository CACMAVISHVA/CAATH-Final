/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { createNotification } from './notificationService';
import { User } from '../types';

export type SubscriptionPlan = 'Starter' | 'Professional' | 'Enterprise';
export type SubscriptionStatus =
  | 'Trial'
  | 'Pending Verification'
  | 'Pending Payment'
  | 'Active'
  | 'Expired'
  | 'Suspended'
  | 'Cancelled'
  | 'Rejected';
export type BillingCycle = 'Monthly' | 'Annual';

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
  utr_number: string;
  status: 'Pending Verification' | 'Approved' | 'Rejected';
  remarks: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
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

export const GST_RATE = 0.18;

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanConfig> = {
  Starter: {
    plan: 'Starter',
    monthlyAmount: 999,
    annualAmount: 9990,
    clientLimit: 10,
    staffLimit: 3,
    storageLimitGB: 10,
    features: ['Client Management', 'GST Compliance', 'Task Management', 'Document Management', 'Notice Management', 'Email Support'],
  },
  Professional: {
    plan: 'Professional',
    monthlyAmount: 1599,
    annualAmount: 15990,
    clientLimit: 50,
    staffLimit: 10,
    storageLimitGB: 50,
    features: ['Everything in Starter', 'Workflow Automation', 'Compliance Tracking', 'Invoice Management', 'Priority Support', 'Reports & Analytics'],
  },
  Enterprise: {
    plan: 'Enterprise',
    monthlyAmount: 2599,
    annualAmount: 25990,
    clientLimit: -1,
    staffLimit: -1,
    storageLimitGB: 200,
    features: ['Everything in Professional', 'Advanced Analytics', 'Audit Trail', 'Multi-Branch Support', 'White Label Capability', 'Dedicated Support'],
  },
};

export const getPlanAmount = (plan: SubscriptionPlan, billingCycle: BillingCycle) =>
  billingCycle === 'Annual' ? SUBSCRIPTION_PLANS[plan].annualAmount : SUBSCRIPTION_PLANS[plan].monthlyAmount;

export const calculateSubscriptionTotals = (plan: SubscriptionPlan, billingCycle: BillingCycle) => {
  const amount = getPlanAmount(plan, billingCycle);
  const gstAmount = Math.round(amount * GST_RATE);
  return { amount, gstAmount, totalAmount: amount + gstAmount };
};

const currentYear = () => new Date().getFullYear();

const nextSequence = (value: string | null | undefined) => {
  const current = Number((value || '').split('-').pop() || '0');
  return Number.isFinite(current) ? current + 1 : 1;
};

const planLimits = (plan: SubscriptionPlan) => {
  const config = SUBSCRIPTION_PLANS[plan];
  return {
    max_admins: plan === 'Enterprise' ? 10 : plan === 'Professional' ? 3 : 1,
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
  notices: plan !== 'Starter' || true,
  reports: plan !== 'Starter',
  billing: true,
  analytics: plan !== 'Starter',
});

const addCycle = (start: Date, billingCycle: BillingCycle) => {
  const end = new Date(start);
  if (billingCycle === 'Monthly') end.setMonth(end.getMonth() + 1);
  else end.setFullYear(end.getFullYear() + 1);
  return end;
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
    .select('*, firm:firms(name, firm_name, gstin)')
    .order('created_at', { ascending: false });
  if (firmId) query = query.eq('firm_id', firmId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as SubscriptionRequest[];
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
}) => {
  if (params.user.role !== 'SuperAdmin') throw new Error('Only SuperAdmin can request subscription activation.');
  if (!params.user.firmId) throw new Error('A workspace is required to request activation.');
  if (!params.utrNumber.trim()) throw new Error('Transaction Reference Number (UTR) is required.');

  const referenceNumber = await generateSubscriptionRequestReference();
  const totals = calculateSubscriptionTotals(params.plan, params.billingCycle);

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
    user: params.user,
  });

  return data as SubscriptionRequest;
};

const upsertActiveSubscription = async (params: {
  firmId: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  amount: number;
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
  const startDate = new Date();
  const endDate = addCycle(startDate, request.billing_cycle);
  const subscription = await upsertActiveSubscription({
    firmId: request.firm_id,
    plan: request.plan,
    billingCycle: request.billing_cycle,
    amount: request.amount,
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
