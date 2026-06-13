/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import { User } from '../types';

export type SubscriptionPlan = 'Starter' | 'Professional' | 'Enterprise';
export type SubscriptionStatus = 'Active' | 'Trial' | 'Suspended' | 'Cancelled' | 'Expired';
export type BillingCycle = 'Monthly' | 'Yearly';

export interface Subscription {
  id: string;
  firm_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  amount: number;
  start_date: string;
  end_date: string;
  next_billing_date: string;
  trial_end_date: string | null;
  grace_period_end_date: string | null;
  features: string[];
  client_limit: number;
  staff_limit: number;
  storage_limit_gb: number;
  auto_renew: boolean;
  payment_method: string | null;
  last_payment_date: string | null;
  last_payment_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlanConfig {
  plan: SubscriptionPlan;
  monthlyAmount: number;
  yearlyAmount: number;
  clientLimit: number;
  staffLimit: number;
  storageLimitGB: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanConfig> = {
  Starter: {
    plan: 'Starter',
    monthlyAmount: 4999,
    yearlyAmount: 49990,
    clientLimit: 10,
    staffLimit: 3,
    storageLimitGB: 5,
    features: [
      'Client Management',
      'Basic Task Tracking',
      'Document Storage (5GB)',
      'Email Support',
      'GST & Income Tax Filing',
    ],
  },
  Professional: {
    plan: 'Professional',
    monthlyAmount: 14999,
    yearlyAmount: 149990,
    clientLimit: 50,
    staffLimit: 10,
    storageLimitGB: 25,
    features: [
      'Everything in Starter',
      'Advanced Task Workflows',
      'Compliance Tracking',
      'Invoice & Payments',
      'Priority Support',
      'API Access',
      'Custom Reports',
    ],
  },
  Enterprise: {
    plan: 'Enterprise',
    monthlyAmount: 49999,
    yearlyAmount: 499990,
    clientLimit: -1, // Unlimited
    staffLimit: -1, // Unlimited
    storageLimitGB: 100,
    features: [
      'Everything in Professional',
      'Unlimited Clients & Staff',
      'Dedicated Account Manager',
      'Custom Integrations',
      'White-label Options',
      'Advanced Analytics',
      'Audit Trail',
      'Multi-branch Support',
    ],
  },
};

// Create subscription for a firm
export const createSubscription = async (
  firmId: string,
  plan: SubscriptionPlan,
  billingCycle: BillingCycle,
  user: User
): Promise<Subscription> => {
  const config = SUBSCRIPTION_PLANS[plan];
  const amount = billingCycle === 'Monthly' ? config.monthlyAmount : config.yearlyAmount;
  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + (billingCycle === 'Monthly' ? 0 : 1));

  const { data, error } = await supabase
    .from('subscriptions')
    .insert([{
      firm_id: firmId,
      plan,
      status: 'Active',
      billing_cycle: billingCycle,
      amount,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      next_billing_date: billingCycle === 'Monthly'
        ? new Date(startDate.setMonth(startDate.getMonth() + 1)).toISOString()
        : endDate.toISOString(),
      trial_end_date: null,
      grace_period_end_date: null,
      features: config.features,
      client_limit: config.clientLimit,
      staff_limit: config.staffLimit,
      storage_limit_gb: config.storageLimitGB,
      auto_renew: true,
      payment_method: null,
      last_payment_date: null,
      last_payment_status: null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data as Subscription;
};

// Start trial subscription
export const startTrialSubscription = async (
  firmId: string,
  plan: SubscriptionPlan,
  trialDays: number = 14,
  user: User
): Promise<Subscription> => {
  const config = SUBSCRIPTION_PLANS[plan];
  const startDate = new Date();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + trialDays);

  const { data, error } = await supabase
    .from('subscriptions')
    .insert([{
      firm_id: firmId,
      plan,
      status: 'Trial',
      billing_cycle: 'Monthly',
      amount: 0,
      start_date: startDate.toISOString(),
      end_date: trialEnd.toISOString(),
      next_billing_date: trialEnd.toISOString(),
      trial_end_date: trialEnd.toISOString(),
      grace_period_end_date: null,
      features: config.features,
      client_limit: config.clientLimit,
      staff_limit: config.staffLimit,
      storage_limit_gb: config.storageLimitGB,
      auto_renew: false,
      payment_method: null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data as Subscription;
};

// Get firm subscription
export const getFirmSubscription = async (firmId: string): Promise<Subscription | null> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('firm_id', firmId)
    .in('status', ['Active', 'Trial'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as Subscription | null;
};

// Update subscription
export const updateSubscriptionPlan = async (
  subscriptionId: string,
  newPlan: SubscriptionPlan,
  billingCycle: BillingCycle,
  user: User
): Promise<Subscription> => {
  const config = SUBSCRIPTION_PLANS[newPlan];
  const amount = billingCycle === 'Monthly' ? config.monthlyAmount : config.yearlyAmount;

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      plan: newPlan,
      billing_cycle: billingCycle,
      amount,
      client_limit: config.clientLimit,
      staff_limit: config.staffLimit,
      storage_limit_gb: config.storageLimitGB,
      features: config.features,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw error;
  return data as Subscription;
};

// Cancel subscription
export const cancelSubscription = async (subscriptionId: string, user: User) => {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'Cancelled',
      auto_renew: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (error) throw error;
};

// Suspend subscription (for non-payment)
export const suspendSubscription = async (subscriptionId: string, reason: string) => {
  const graceEnd = new Date();
  graceEnd.setDate(graceEnd.getDate() + 7); // 7 day grace period

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'Suspended',
      grace_period_end_date: graceEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (error) throw error;
};

// Reactivate subscription
export const reactivateSubscription = async (subscriptionId: string) => {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'Active',
      grace_period_end_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (error) throw error;
};

// Check feature access
export const hasFeatureAccess = async (firmId: string, feature: string): Promise<boolean> => {
  const subscription = await getFirmSubscription(firmId);
  if (!subscription) return false;
  return subscription.features.includes(feature);
};

// Check client limit
export const withinClientLimit = async (firmId: string): Promise<boolean> => {
  const subscription = await getFirmSubscription(firmId);
  if (!subscription) return true; // Default allow

  if (subscription.client_limit === -1) return true; // Unlimited

  const { count } = await supabase
    .from('clients')
    .select('id', { count: 'exact' })
    .eq('firm_id', firmId);

  return (count || 0) < subscription.client_limit;
};

// Check staff limit
export const withinStaffLimit = async (firmId: string): Promise<boolean> => {
  const subscription = await getFirmSubscription(firmId);
  if (!subscription) return true;

  if (subscription.staff_limit === -1) return true;

  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact' })
    .eq('firm_id', firmId)
    .in('role', ['Admin', 'Staff']);

  return (count || 0) < subscription.staff_limit;
};

// Get subscription usage
export const getSubscriptionUsage = async (firmId: string) => {
  const subscription = await getFirmSubscription(firmId);
  if (!subscription) return null;

  const { count: clientCount } = await supabase
    .from('clients')
    .select('id', { count: 'exact' })
    .eq('firm_id', firmId);

  const { count: staffCount } = await supabase
    .from('users')
    .select('id', { count: 'exact' })
    .eq('firm_id', firmId)
    .in('role', ['Admin', 'Staff']);

  // Storage usage would come from document vault query

  return {
    plan: subscription.plan,
    status: subscription.status,
    clients: {
      used: clientCount || 0,
      limit: subscription.client_limit,
      percentage: subscription.client_limit > 0 ? Math.round(((clientCount || 0) / subscription.client_limit) * 100) : 0,
    },
    staff: {
      used: staffCount || 0,
      limit: subscription.staff_limit,
      percentage: subscription.staff_limit > 0 ? Math.round(((staffCount || 0) / subscription.staff_limit) * 100) : 0,
    },
    billing: {
      cycle: subscription.billing_cycle,
      amount: subscription.amount,
      nextBilling: subscription.next_billing_date,
    },
  };
};

// Payment webhook handling (preparation)
export const recordPayment = async (
  subscriptionId: string,
  amount: number,
  status: 'Success' | 'Failed',
  transactionId: string
) => {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      last_payment_date: new Date().toISOString(),
      last_payment_status: status,
      status: status === 'Success' ? 'Active' : 'Suspended',
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (error) throw error;
};

// Generate renewal reminder (preparation for automation)
export const getUpcomingRenewals = async (daysAhead: number = 7) => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, firms(name)')
    .in('status', ['Active', 'Trial'])
    .lte('next_billing_date', futureDate.toISOString());

  if (error) throw error;
  return data || [];
};