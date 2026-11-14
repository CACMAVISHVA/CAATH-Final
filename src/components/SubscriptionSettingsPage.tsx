import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, LockKeyhole, Printer, ReceiptText, X } from 'lucide-react';
import { User } from '../types';
import { Modal } from './Modal';
import {
  BillingCycle,
  calculateSubscriptionTotals,
  createCashfreeCheckoutOrder,
  generateSubscriptionRequestReference,
  getFirmSubscription,
  getPlatformSettings,
  listSubscriptionInvoices,
  listSubscriptionRequests,
  PlatformSettings,
  submitSubscriptionRequest,
  SUBSCRIPTION_PLANS,
  Subscription,
  SubscriptionInvoice,
  SubscriptionPlan,
  SubscriptionRequest,
  verifyCashfreeCheckoutOrder,
} from '../services/subscriptionService';
import { normalizeAuthError } from '../lib/authErrorNormalizer';

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-IN') : 'Not scheduled';
const formatLimit = (value: number) => value < 0 ? 'Unlimited' : String(value);
const daysRemaining = (value?: string | null) => {
  if (!value) return null;
  const remaining = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(remaining)) return null;
  return Math.max(0, Math.ceil(remaining / 86_400_000));
};

type CashfreeCheckoutResult = { error?: { message?: string }; redirect?: boolean };

declare global {
  interface Window {
    Cashfree?: (options: { mode: 'sandbox' | 'production' }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: '_self' }) => Promise<CashfreeCheckoutResult>;
    };
  }
}

const loadCashfreeCheckout = async () => {
  if (window.Cashfree) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-caath-cashfree]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Secure checkout could not be loaded.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.dataset.caathCashfree = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Secure checkout could not be loaded.'));
    document.head.appendChild(script);
  });
};

type SubscriptionSettingsPageProps = {
  user: User;
  onSubscriptionChanged: () => Promise<void>;
};

export const SubscriptionSettingsPage: React.FC<SubscriptionSettingsPageProps> = ({ user, onSubscriptionChanged }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('Starter');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('Monthly');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [successReference, setSuccessReference] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gatewayStarting, setGatewayStarting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSuperAdmin = user.role === 'SuperAdmin';
  const isGodAdmin = user.role === 'GodAdmin';
  const totals = useMemo(() => calculateSubscriptionTotals(selectedPlan, billingCycle), [selectedPlan, billingCycle]);
  const currentConfig = SUBSCRIPTION_PLANS[(user.firm?.subscriptionPlan || subscription?.plan || selectedPlan) as SubscriptionPlan];
  const currentStatus = user.firm?.subscriptionStatus || subscription?.status || 'Trial';
  const isTrial = currentStatus === 'Trial';
  const currentEndDate = subscription?.trial_ends_at || subscription?.trial_end_date || subscription?.next_billing_date || subscription?.expires_at || user.firm?.subscriptionExpiryDate;
  const trialDaysRemaining = isTrial ? daysRemaining(currentEndDate) : null;
  const currentPlanLabel = isTrial ? '15-day Free Trial' : (user.firm?.subscriptionPlan || subscription?.plan || 'Starter');

  const planActionLabel = (plan: SubscriptionPlan, isCurrent: boolean) => {
    if (isTrial) return `Choose ${plan}`;
    if (currentStatus === 'Active') return isCurrent ? `Renew ${plan}` : `Upgrade to ${plan}`;
    return `Activate ${plan}`;
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await getPlatformSettings();
      setPlatformSettings(settings);
      if (user.firmId) {
        const [current, invoiceRows, requestRows] = await Promise.all([
          getFirmSubscription(user.firmId),
          listSubscriptionInvoices(user.firmId),
          listSubscriptionRequests(user.firmId),
        ]);
        setSubscription(current);
        setInvoices(invoiceRows);
        setRequests(requestRows);
        if (current?.plan) setSelectedPlan(current.plan);
      }
    } catch (loadError) {
      setError(normalizeAuthError(loadError).userMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user.firmId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnedOrderId = params.get('order_id');
    if (params.get('payment') !== 'return' || !returnedOrderId || !isSuperAdmin) return;
    let active = true;
    setGatewayStarting(true);
    setError(null);
    verifyCashfreeCheckoutOrder(returnedOrderId)
      .then(async (result) => {
        if (!active) return;
        if (result.status === 'PAID') {
          setNotice(`Payment verified by Cashfree${result.referenceNumber ? ` (${result.referenceNumber})` : ''}. God Admin approval is now pending.`);
          await onSubscriptionChanged();
          await load();
        } else {
          setNotice(`Cashfree payment status: ${result.status}. No subscription was activated.`);
        }
      })
      .catch((statusError) => active && setError(normalizeAuthError(statusError).userMessage))
      .finally(() => {
        if (active) setGatewayStarting(false);
        window.history.replaceState({}, '', '/settings/subscription');
      });
    return () => { active = false; };
  }, [isSuperAdmin, onSubscriptionChanged]);

  const openActivation = async (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setBillingCycle('Monthly');
    setUtrNumber('');
    setScreenshotFile(null);
    setSuccessReference(null);
    setError(null);
    setNotice(null);
    try {
      setReferenceNumber(await generateSubscriptionRequestReference());
      setShowModal(true);
    } catch (refError) {
      setError(normalizeAuthError(refError).userMessage);
    }
  };

  const submitRequest = async () => {
    if (!isSuperAdmin) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (!screenshotFile) throw new Error('Upload the payment screenshot before submitting.');
      const request = await submitSubscriptionRequest({ user, plan: selectedPlan, billingCycle, utrNumber, screenshotFile });
      setSuccessReference(request.reference_number);
      setReferenceNumber(request.reference_number);
      setNotice('Payment submitted successfully. Status: Pending Verification.');
      await onSubscriptionChanged();
      await load();
    } catch (submitError) {
      setError(normalizeAuthError(submitError).userMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const startCashfreePayment = async () => {
    if (!isSuperAdmin) return;
    setGatewayStarting(true);
    setError(null);
    setNotice(null);
    try {
      const order = await createCashfreeCheckoutOrder(selectedPlan, billingCycle);
      await loadCashfreeCheckout();
      if (!window.Cashfree) throw new Error('Secure checkout is unavailable. Please try again.');
      const result = await window.Cashfree({ mode: order.mode }).checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: '_self',
      });
      if (result?.error) throw new Error(result.error.message || 'Cashfree checkout could not be opened.');
    } catch (paymentError) {
      setError(normalizeAuthError(paymentError).userMessage);
      setGatewayStarting(false);
    }
  };

  const printInvoice = () => {
    window.print();
  };

  if (isGodAdmin) {
    return (
      <div className="caath-page h-full overflow-y-auto bg-matte-black p-4 text-slate-300 sm:p-6 lg:p-8">
        <h2 className="text-2xl font-bold gold-text-gradient">Subscription Settings</h2>
        <p className="mt-2 text-sm text-slate-500">Use Platform / Subscriptions to review requests, activate firms, manage platform payment settings, and view invoices.</p>
      </div>
    );
  }

  return (
    <div className="caath-page h-full overflow-y-auto bg-matte-black p-4 text-slate-300 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold gold-text-gradient">Subscription Settings</h2>
          <p className="mt-1 text-sm text-slate-500">Secure Cashfree payments, trial status, invoices, and plan governance for this workspace.</p>
        </div>
        {!isSuperAdmin && (
          <div className="flex items-center gap-2 border border-slate-800 bg-matte-black-light px-4 py-3 text-xs text-slate-400">
            <LockKeyhole className="h-4 w-4 text-gold" />
            SuperAdmin controls are required for subscription activation.
          </div>
        )}
      </div>

      {notice && <div className="mt-5 border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}
      {error && <div className="mt-5 border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      {isTrial && (
        <div className="mt-6 border border-emerald-500/25 bg-emerald-500/10 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">15-day free trial</p>
              <h3 className="mt-2 text-xl font-bold text-white">Explore CAATH before choosing a paid plan.</h3>
              <p className="mt-1 text-sm text-slate-400">Your workspace remains on trial until {formatDate(currentEndDate)}. Select a plan below whenever you are ready.</p>
            </div>
            <div className="min-w-32 border border-emerald-500/20 bg-matte-black/40 p-4 text-center">
              <p className="text-3xl font-black text-emerald-300">{trialDaysRemaining ?? '—'}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Days remaining</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 border border-gold/25 bg-gold/10 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">How subscription activation works</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ['1', 'Choose plan', 'Super Admin selects the plan and billing period.'],
            ['2', 'Pay securely', 'Cashfree opens its hosted checkout for UPI, cards and other supported methods.'],
            ['3', 'Automatic verification', 'CAATH verifies the signed Cashfree response—no screenshot is required.'],
            ['4', 'CAATH approval', 'God Admin reviews the verified payment, activates service and generates the GST invoice.'],
          ].map(([step, title, description]) => <div key={step} className="border border-white/10 bg-matte-black-light p-4"><span className="flex h-7 w-7 items-center justify-center bg-gold text-xs font-black text-black">{step}</span><p className="mt-3 font-bold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>)}
        </div>
        <p className="mt-4 text-xs text-slate-400">Cashfree confirms payment securely, but subscription activation remains controlled by CAATH God Admin. Manual UPI proof remains available as a fallback.</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-6">
        {[
          ['Current Plan', currentPlanLabel],
          ['Subscription Status', currentStatus],
          [isTrial ? 'Trial Ends' : 'Renewal Date', formatDate(currentEndDate)],
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
            const isCurrent = (user.firm?.subscriptionPlan || subscription?.plan) === plan;
            return (
              <div key={plan} className={`border p-5 ${isCurrent ? 'border-gold/40 bg-gold/10' : 'border-slate-800 bg-matte-black-light'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xl font-bold text-white">{plan}</h4>
                    <p className="mt-1 text-sm text-slate-500">{formatINR(config.monthlyAmount)} / month</p>
                    <p className="text-xs text-slate-600">{formatINR(config.annualAmount)} / annual</p>
                  </div>
                  {isCurrent && <CheckCircle2 className="h-5 w-5 text-gold" />}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-center">
                  <div className="border border-slate-800 bg-matte-black p-2"><p className="text-[10px] text-slate-500">Clients</p><p className="text-sm font-bold text-white">{formatLimit(config.clientLimit)}</p></div>
                  <div className="border border-slate-800 bg-matte-black p-2"><p className="text-[10px] text-slate-500">Staff</p><p className="text-sm font-bold text-white">{formatLimit(config.staffLimit)}</p></div>
                </div>
                <div className="mt-5 space-y-2">
                  {config.features.map((feature) => <div key={feature} className="flex items-center gap-2 text-xs text-slate-300"><CheckCircle2 className="h-3.5 w-3.5 text-gold" />{feature}</div>)}
                </div>
                <button
                  type="button"
                  disabled={!isSuperAdmin}
                  onClick={() => openActivation(plan)}
                  className="mt-6 flex w-full items-center justify-center gap-2 bg-gold px-4 py-2.5 text-sm font-bold text-matte-black transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4" />
                  {planActionLabel(plan, isCurrent)}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 border border-slate-800 bg-matte-black-light p-5">
        <h3 className="text-lg font-bold text-white">Payment Requests</h3>
        <div className="mt-4 overflow-hidden border border-slate-800">
          <table className="w-full text-left">
            <thead className="bg-matte-black">
              <tr>{['Reference', 'Plan', 'Cycle', 'Total', 'Payment', 'Status', 'Submitted'].map((head) => <th key={head} className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500">{head}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {requests.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">No payment requests submitted yet.</td></tr>
              ) : requests.map((request) => (
                <tr key={request.id}>
                  <td className="px-4 py-3 text-xs font-bold text-white">{request.reference_number}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{request.plan}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{request.billing_cycle}</td>
                  <td className="px-4 py-3 text-xs font-bold text-gold">{formatINR(request.total_amount)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{request.payment_provider === 'Cashfree' ? `Cashfree · ${request.gateway?.status || 'Checking'}` : request.utr_number || '-'}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-300">{request.status}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(request.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 border border-slate-800 bg-matte-black-light p-5">
        <h3 className="text-lg font-bold text-white">Billing History</h3>
        <div className="mt-4 overflow-hidden border border-slate-800">
          <table className="w-full text-left">
            <thead className="bg-matte-black">
              <tr>{['Invoice', 'Plan', 'Cycle', 'Total', 'Period', 'Action'].map((head) => <th key={head} className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500">{head}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {invoices.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No subscription invoices yet.</td></tr>
              ) : invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 text-xs font-bold text-white">{invoice.invoice_number}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{invoice.plan}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{invoice.billing_cycle}</td>
                  <td className="px-4 py-3 text-xs font-bold text-gold">{formatINR(invoice.total_amount)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(invoice.subscription_start_date)} - {formatDate(invoice.subscription_end_date)}</td>
                  <td className="px-4 py-3"><button onClick={() => setSelectedInvoice(invoice)} className="text-xs font-bold text-gold">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Activate Subscription" size="xl" contentClassName="space-y-5">
        {successReference ? (
          <div className="border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" />
            <h3 className="mt-3 text-lg font-bold text-white">Request Submitted Successfully</h3>
            <p className="mt-2 text-sm text-slate-300">Reference Number:</p>
            <p className="text-xl font-bold text-gold">{successReference}</p>
            <p className="mt-2 text-sm font-bold text-emerald-300">Status: Pending Verification</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Plan</label>
                <select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value as SubscriptionPlan)} className="mt-1 w-full border border-slate-800 bg-matte-black px-3 py-2 text-sm text-white">
                  {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlan[]).map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Billing Cycle</label>
                <select value={billingCycle} onChange={(event) => setBillingCycle(event.target.value as BillingCycle)} className="mt-1 w-full border border-slate-800 bg-matte-black px-3 py-2 text-sm text-white">
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="border border-slate-800 bg-matte-black p-3"><p className="text-[10px] uppercase text-slate-500">Plan Amount</p><p className="text-lg font-bold text-white">{formatINR(totals.amount)}</p></div>
              <div className="border border-slate-800 bg-matte-black p-3"><p className="text-[10px] uppercase text-slate-500">GST (18%)</p><p className="text-lg font-bold text-white">{formatINR(totals.gstAmount)}</p></div>
              <div className="border border-gold/30 bg-gold/10 p-3"><p className="text-[10px] uppercase text-slate-500">Total Payable</p><p className="text-lg font-bold text-gold">{formatINR(totals.totalAmount)}</p></div>
            </div>
            <div className="border border-emerald-500/25 bg-emerald-500/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Cashfree secure checkout</p>
                  <p className="mt-1 text-xs text-slate-400">Payment is verified automatically. God Admin approval is still required before activation.</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">Sandbox testing enabled until Cashfree completes live KYC review</p>
                </div>
                <button type="button" onClick={startCashfreePayment} disabled={gatewayStarting} className="flex shrink-0 items-center justify-center gap-2 bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">
                  {gatewayStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  {gatewayStarting ? 'Opening Checkout…' : `Pay ${formatINR(totals.totalAmount)}`}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-600"><span className="h-px flex-1 bg-slate-800" />Manual UPI fallback<span className="h-px flex-1 bg-slate-800" /></div>
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <div className="flex min-h-40 items-center justify-center border border-slate-800 bg-white p-3 text-center text-xs text-slate-700">
                {platformSettings?.subscription_qr_image_url ? <img src={platformSettings.subscription_qr_image_url} alt="Subscription UPI QR" className="max-h-40 max-w-full" /> : 'QR code not configured'}
              </div>
              <div className="space-y-3 border border-slate-800 bg-matte-black p-4">
                <div><p className="text-[10px] font-bold uppercase text-slate-500">UPI ID</p><p className="text-sm font-bold text-white">{platformSettings?.subscription_upi_id || 'Not configured'}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-slate-500">Amount</p><p className="text-sm font-bold text-white">{formatINR(totals.totalAmount)}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-slate-500">Reference Number</p><p className="text-sm font-bold text-gold">{referenceNumber}</p></div>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Transaction Reference Number (UTR)</label>
              <input value={utrNumber} onChange={(event) => setUtrNumber(event.target.value)} placeholder="123456789012" className="mt-1 w-full border border-slate-800 bg-matte-black px-3 py-2 text-sm text-white placeholder:text-slate-600" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Payment Screenshot</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setScreenshotFile(event.target.files?.[0] || null)}
                className="mt-1 w-full border border-slate-800 bg-matte-black px-3 py-2 text-sm text-slate-300 file:mr-3 file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-matte-black"
              />
              {screenshotFile && <p className="mt-1 text-xs text-slate-500">{screenshotFile.name}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
              <button onClick={submitRequest} disabled={submitting || !utrNumber.trim() || !screenshotFile} className="flex items-center gap-2 bg-gold px-4 py-2 text-sm font-bold text-matte-black disabled:opacity-50">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Payment
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal isOpen={Boolean(selectedInvoice)} onClose={() => setSelectedInvoice(null)} title="Subscription Invoice" size="xl" contentClassName="space-y-4">
        {selectedInvoice && (
          <div className="print:bg-white print:text-black">
            <div className="border border-slate-800 bg-matte-black p-6 print:border-slate-300 print:bg-white">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 print:border-slate-300">
                <div>
                  <h3 className="text-2xl font-bold text-white print:text-black">CAATH PMS</h3>
                  <p className="text-sm text-slate-500">{platformSettings?.company_name || 'CAATH PMS'}</p>
                  <p className="text-xs text-slate-500">{platformSettings?.company_gstin || 'GSTIN not configured'}</p>
                </div>
                <ReceiptText className="h-8 w-8 text-gold" />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InvoiceLine label="Firm Name" value={selectedInvoice.firm?.firm_name || selectedInvoice.firm?.name || user.firm?.name || '-'} />
                <InvoiceLine label="GSTIN" value={selectedInvoice.firm?.gstin || '-'} />
                <InvoiceLine label="Invoice Number" value={selectedInvoice.invoice_number} />
                <InvoiceLine label="Issue Date" value={formatDate(selectedInvoice.invoice_date)} />
                <InvoiceLine label="Subscription Plan" value={selectedInvoice.plan} />
                <InvoiceLine label="Billing Cycle" value={selectedInvoice.billing_cycle} />
                <InvoiceLine label="Subscription Period" value={`${formatDate(selectedInvoice.subscription_start_date)} - ${formatDate(selectedInvoice.subscription_end_date)}`} />
                <InvoiceLine label="UTR Number" value={selectedInvoice.utr_number || '-'} />
              </div>
              <div className="mt-5 border border-slate-800 print:border-slate-300">
                <InvoiceAmount label="Amount" value={selectedInvoice.amount} />
                <InvoiceAmount label="GST" value={selectedInvoice.gst_amount} />
                <InvoiceAmount label="Total" value={selectedInvoice.total_amount} strong />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3 print:hidden">
              <button onClick={() => setSelectedInvoice(null)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400"><X className="h-4 w-4" />Close</button>
              <button onClick={printInvoice} className="flex items-center gap-2 bg-gold px-4 py-2 text-sm font-bold text-matte-black"><Printer className="h-4 w-4" />Print / Save PDF</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const InvoiceLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
    <p className="text-sm font-bold text-white print:text-black">{value}</p>
  </div>
);

const InvoiceAmount: React.FC<{ label: string; value: number; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="flex justify-between border-b border-slate-800 px-4 py-3 last:border-b-0 print:border-slate-300">
    <span className="text-sm text-slate-400 print:text-slate-700">{label}</span>
    <span className={`text-sm ${strong ? 'font-bold text-gold print:text-black' : 'font-bold text-white print:text-black'}`}>{formatINR(value)}</span>
  </div>
);
