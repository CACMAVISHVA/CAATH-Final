import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, LockKeyhole, Printer, ReceiptText, X } from 'lucide-react';
import { User } from '../types';
import { Modal } from './Modal';
import {
  BillingCycle,
  calculateSubscriptionTotals,
  generateSubscriptionRequestReference,
  getFirmSubscription,
  getPlatformSettings,
  listSubscriptionInvoices,
  PlatformSettings,
  submitSubscriptionRequest,
  SUBSCRIPTION_PLANS,
  Subscription,
  SubscriptionInvoice,
  SubscriptionPlan,
} from '../services/subscriptionService';
import { normalizeAuthError } from '../lib/authErrorNormalizer';

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-IN') : 'Not scheduled';
const formatLimit = (value: number) => value < 0 ? 'Unlimited' : String(value);

type SubscriptionSettingsPageProps = {
  user: User;
  onSubscriptionChanged: () => Promise<void>;
};

export const SubscriptionSettingsPage: React.FC<SubscriptionSettingsPageProps> = ({ user, onSubscriptionChanged }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('Starter');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('Monthly');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [successReference, setSuccessReference] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSuperAdmin = user.role === 'SuperAdmin';
  const isGodAdmin = user.role === 'GodAdmin';
  const totals = useMemo(() => calculateSubscriptionTotals(selectedPlan, billingCycle), [selectedPlan, billingCycle]);
  const currentConfig = SUBSCRIPTION_PLANS[(user.firm?.subscriptionPlan || subscription?.plan || selectedPlan) as SubscriptionPlan];

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await getPlatformSettings();
      setPlatformSettings(settings);
      if (user.firmId) {
        const [current, invoiceRows] = await Promise.all([
          getFirmSubscription(user.firmId),
          listSubscriptionInvoices(user.firmId),
        ]);
        setSubscription(current);
        setInvoices(invoiceRows);
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

  const openActivation = async (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setBillingCycle('Monthly');
    setUtrNumber('');
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
      const request = await submitSubscriptionRequest({ user, plan: selectedPlan, billingCycle, utrNumber });
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

  const printInvoice = () => {
    window.print();
  };

  if (isGodAdmin) {
    return (
      <div className="h-full overflow-y-auto bg-matte-black p-8 text-slate-300">
        <h2 className="text-2xl font-bold gold-text-gradient">Subscription Settings</h2>
        <p className="mt-2 text-sm text-slate-500">Use Platform / Subscriptions to review requests, activate firms, manage platform payment settings, and view invoices.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-8 text-slate-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold gold-text-gradient">Subscription Settings</h2>
          <p className="mt-1 text-sm text-slate-500">UPI activation, trial status, invoices, and plan governance for this workspace.</p>
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

      <div className="mt-6 grid gap-4 lg:grid-cols-6">
        {[
          ['Current Plan', user.firm?.subscriptionPlan || subscription?.plan || 'Starter'],
          ['Subscription Status', user.firm?.subscriptionStatus || subscription?.status || 'Trial'],
          ['Renewal Date', formatDate(subscription?.next_billing_date || subscription?.expires_at || user.firm?.subscriptionExpiryDate)],
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
                  {user.firm?.subscriptionStatus === 'Active' ? (isCurrent ? 'Renew Plan' : 'Upgrade Plan') : 'Activate Plan'}
                </button>
              </div>
            );
          })}
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
                  <option value="Annual">Annual</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="border border-slate-800 bg-matte-black p-3"><p className="text-[10px] uppercase text-slate-500">Plan Amount</p><p className="text-lg font-bold text-white">{formatINR(totals.amount)}</p></div>
              <div className="border border-slate-800 bg-matte-black p-3"><p className="text-[10px] uppercase text-slate-500">GST (18%)</p><p className="text-lg font-bold text-white">{formatINR(totals.gstAmount)}</p></div>
              <div className="border border-gold/30 bg-gold/10 p-3"><p className="text-[10px] uppercase text-slate-500">Total Payable</p><p className="text-lg font-bold text-gold">{formatINR(totals.totalAmount)}</p></div>
            </div>
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
            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
              <button onClick={submitRequest} disabled={submitting || !utrNumber.trim()} className="flex items-center gap-2 bg-gold px-4 py-2 text-sm font-bold text-matte-black disabled:opacity-50">
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
