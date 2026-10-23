import { supabase } from '../lib/supabase';
import { Subscription, SUBSCRIPTION_PLANS, SubscriptionPlan } from './subscriptionService';
import { PaymentEntry, getInvoices } from './invoiceService';

export interface SubscriptionLedgerEntry {
  subscriptionId: string;
  plan: SubscriptionPlan;
  status: string;
  amount: number;
  periodStart: string | null;
  periodEnd: string | null;
  paymentStatus: string | null;
}

export interface RenewalForecast {
  subscriptionId: string;
  renewsOn: string | null;
  amount: number;
  gracePeriodEnds: string | null;
  requiresAction: boolean;
}

export const getSubscriptionLedger = async (firmId: string): Promise<SubscriptionLedgerEntry[]> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as Subscription[]).map((subscription) => ({
    subscriptionId: subscription.id,
    plan: subscription.plan,
    status: subscription.status,
    amount: subscription.amount,
    periodStart: subscription.start_date ?? subscription.starts_at ?? null,
    periodEnd: subscription.end_date ?? subscription.expires_at ?? null,
    paymentStatus: subscription.last_payment_status ?? null,
  }));
};

export const getPaymentHistory = async (firmId: string): Promise<PaymentEntry[]> => {
  const invoices = await getInvoices(firmId);
  if (invoices.length === 0) return [];
  const { data, error } = await supabase
    .from('invoice_payments')
    .select('*')
    .in('invoice_id', invoices.map((invoice) => invoice.id))
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return (data || []) as PaymentEntry[];
};

export const getRenewalForecast = async (firmId: string): Promise<RenewalForecast[]> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('firm_id', firmId)
    .in('status', ['Active', 'Trial', 'Suspended'])
    .order('next_billing_date', { ascending: true });
  if (error) throw error;
  return ((data || []) as Subscription[]).map((subscription) => ({
    subscriptionId: subscription.id,
    renewsOn: subscription.next_billing_date ?? subscription.expires_at ?? null,
    amount: subscription.amount,
    gracePeriodEnds: subscription.grace_period_end_date ?? null,
    requiresAction: subscription.status === 'Suspended' || subscription.status === 'Trial',
  }));
};

export const getPlanFeatureMatrix = () =>
  Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
    plan: plan.plan,
    monthlyAmount: plan.monthlyAmount,
    yearlyAmount: plan.annualAmount,
    clientLimit: plan.clientLimit,
    staffLimit: plan.staffLimit,
    storageLimitGB: plan.storageLimitGB,
    features: plan.features,
  }));

export type PaymentProvider = 'Razorpay' | 'Stripe' | 'UPI' | 'BankTransfer';

export interface PaymentProviderAdapter {
  provider: PaymentProvider;
  createPaymentIntent(input: Record<string, unknown>): Promise<Record<string, unknown>>;
  verifyWebhook(payload: unknown): Promise<boolean>;
}
