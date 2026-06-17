import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, LockKeyhole, RefreshCw } from 'lucide-react';
import { User } from '../types';
import {
  activateFirmSubscription,
  getFirmSubscription,
  SUBSCRIPTION_PLANS,
  Subscription,
  SubscriptionPlan,
} from '../services/subscriptionService';
import { normalizeAuthError } from '../lib/authErrorNormalizer';

const formatDate = (value?: string | null) => {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleDateString();
};

const formatLimit = (value: number) => value < 0 ? 'Unlimited' : String(value);

type SubscriptionSettingsPageProps = {
  user: User;
  onSubscriptionChanged: () => Promise<void>;
};

export const SubscriptionSettingsPage: React.FC<SubscriptionSettingsPageProps> = ({ user, onSubscriptionChanged }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>((user.firm?.subscriptionPlan || 'Starter') as SubscriptionPlan);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState<SubscriptionPlan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSuperAdmin = user.role === 'SuperAdmin';
  const currentConfig = SUBSCRIPTION_PLANS[(user.firm?.subscriptionPlan || selectedPlan) as SubscriptionPlan];

  useEffect(() => {
    const load = async () => {
      if (!user.firmId) return;
      setLoading(true);
      setError(null);
      try {
        const current = await getFirmSubscription(user.firmId);
        setSubscription(current);
        if (current?.plan) setSelectedPlan(current.plan);
      } catch (loadError) {
        setError(normalizeAuthError(loadError).userMessage);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.firmId]);

  const renewalDate = useMemo(
    () => subscription?.next_billing_date || subscription?.expires_at || user.firm?.subscriptionExpiryDate,
    [subscription?.next_billing_date, subscription?.expires_at, user.firm?.subscriptionExpiryDate],
  );

  const handlePlanAction = async (plan: SubscriptionPlan) => {
    if (!user.firmId || !isSuperAdmin) return;
    setSavingPlan(plan);
    setNotice(null);
    setError(null);
    try {
      const next = await activateFirmSubscription(user.firmId, plan, user);
      setSubscription(next);
      setSelectedPlan(plan);
      await onSubscriptionChanged();
      setNotice(`${plan} plan is now active.`);
    } catch (actionError) {
      setError(normalizeAuthError(actionError).userMessage);
    } finally {
      setSavingPlan(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-8 text-slate-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold gold-text-gradient">Subscription Settings</h2>
          <p className="mt-1 text-sm text-slate-500">Plan activation, renewal, limits, and billing governance for this workspace.</p>
        </div>
        {!isSuperAdmin && (
          <div className="flex items-center gap-2 border border-slate-800 bg-matte-black-light px-4 py-3 text-xs text-slate-400">
            <LockKeyhole className="h-4 w-4 text-gold" />
            SuperAdmin controls are required for plan changes and billing history.
          </div>
        )}
      </div>

      {notice && <div className="mt-5 border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}
      {error && <div className="mt-5 border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <div className="mt-6 grid gap-4 lg:grid-cols-6">
        {[
          ['Current Plan', user.firm?.subscriptionPlan || subscription?.plan || 'Starter'],
          ['Subscription Status', user.firm?.subscriptionStatus || subscription?.status || 'Pending'],
          ['Renewal Date', formatDate(renewalDate)],
          ['Admin Limit', String(user.firm?.maxAdmins ?? 1)],
          ['Staff Limit', String(user.firm?.maxStaff ?? currentConfig.staffLimit)],
          ['Client Limit', String(user.firm?.maxClients ?? currentConfig.clientLimit)],
        ].map(([label, value]) => (
          <div key={label} className="border border-slate-800 bg-matte-black-light p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-2 text-sm font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Plan Comparison</h3>
          {loading && <span className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading subscription</span>}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlan[]).map((plan) => {
            const config = SUBSCRIPTION_PLANS[plan];
            const isCurrent = selectedPlan === plan || user.firm?.subscriptionPlan === plan;
            const isSaving = savingPlan === plan;
            const actionLabel = user.firm?.subscriptionStatus === 'Active'
              ? isCurrent ? 'Renew Plan' : 'Upgrade Plan'
              : 'Activate Plan';

            return (
              <div key={plan} className={`border p-5 ${isCurrent ? 'border-gold/40 bg-gold/10' : 'border-slate-800 bg-matte-black-light'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xl font-bold text-white">{plan}</h4>
                    <p className="mt-1 text-sm text-slate-500">INR {config.monthlyAmount.toLocaleString('en-IN')} / month</p>
                  </div>
                  {isCurrent && <CheckCircle2 className="h-5 w-5 text-gold" />}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="border border-slate-800 bg-matte-black p-2">
                    <p className="text-[10px] text-slate-500">Clients</p>
                    <p className="text-sm font-bold text-white">{formatLimit(config.clientLimit)}</p>
                  </div>
                  <div className="border border-slate-800 bg-matte-black p-2">
                    <p className="text-[10px] text-slate-500">Staff</p>
                    <p className="text-sm font-bold text-white">{formatLimit(config.staffLimit)}</p>
                  </div>
                  <div className="border border-slate-800 bg-matte-black p-2">
                    <p className="text-[10px] text-slate-500">Storage</p>
                    <p className="text-sm font-bold text-white">{config.storageLimitGB}GB</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {config.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-gold" />
                      {feature}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={!isSuperAdmin || isSaving}
                  onClick={() => handlePlanAction(plan)}
                  className="mt-6 flex w-full items-center justify-center gap-2 bg-gold px-4 py-2.5 text-sm font-bold text-matte-black transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : isCurrent ? <RefreshCw className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                  {actionLabel}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {isSuperAdmin && (
        <div className="mt-8 border border-slate-800 bg-matte-black-light p-5">
          <h3 className="text-lg font-bold text-white">Billing History</h3>
          <p className="mt-1 text-sm text-slate-500">Payment gateway records will appear here after live billing provider activation.</p>
          <div className="mt-4 border border-slate-800 bg-matte-black p-4 text-sm text-slate-400">
            No payment records are attached to this workspace yet.
          </div>
        </div>
      )}
    </div>
  );
};
