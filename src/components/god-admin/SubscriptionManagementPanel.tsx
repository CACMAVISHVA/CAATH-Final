/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileText, Printer, Settings, XCircle } from 'lucide-react';
import { FirmRow } from './FirmOperationsPanel';
import { cn } from '../../lib/utils';
import {
  BillingCycle,
  calculateSubscriptionTotals,
  PlatformSettings,
  Subscription,
  SubscriptionInvoice,
  SubscriptionPlan,
  SubscriptionRequest,
  SUBSCRIPTION_PLANS,
} from '../../services/subscriptionService';

export interface SubscriptionRow {
  id: string;
  firm_id: string;
  plan: string;
  status: string;
  amount: number;
  starts_at: string | null;
  expires_at: string | null;
  billing_cycle?: string | null;
  created_at?: string | null;
}

type Tab = 'requests' | 'active' | 'expired' | 'invoices' | 'settings';

interface SubscriptionManagementPanelProps {
  firms: FirmRow[];
  subscriptions: Subscription[];
  requests: SubscriptionRequest[];
  invoices: SubscriptionInvoice[];
  platformSettings: PlatformSettings | null;
  busyAction: string | null;
  onApproveRequest: (request: SubscriptionRequest) => void;
  onRejectRequest: (request: SubscriptionRequest, remarks: string) => void;
  onManualActivate: (input: { firmId: string; plan: SubscriptionPlan; billingCycle: BillingCycle; utrNumber?: string }) => void;
  onSavePlatformSettings: (settings: Partial<PlatformSettings>) => void;
}

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-IN') : '-';

export const SubscriptionManagementPanel: React.FC<SubscriptionManagementPanelProps> = ({
  firms,
  subscriptions,
  requests,
  invoices,
  platformSettings,
  busyAction,
  onApproveRequest,
  onRejectRequest,
  onManualActivate,
  onSavePlatformSettings,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [rejecting, setRejecting] = useState<SubscriptionRequest | null>(null);
  const [remarks, setRemarks] = useState('');
  const [manualFirmId, setManualFirmId] = useState(firms[0]?.id || '');
  const [manualPlan, setManualPlan] = useState<SubscriptionPlan>('Starter');
  const [manualCycle, setManualCycle] = useState<BillingCycle>('Monthly');
  const [manualUtr, setManualUtr] = useState('');
  const [settingsDraft, setSettingsDraft] = useState<Partial<PlatformSettings>>(platformSettings || {});
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionInvoice | null>(null);

  const firmName = (firmId: string) => {
    const firm = firms.find((item) => item.id === firmId);
    return firm?.name || requests.find((item) => item.firm_id === firmId)?.firm?.firm_name || requests.find((item) => item.firm_id === firmId)?.firm?.name || 'Tenant Workspace';
  };

  const expiredSubscriptions = useMemo(() => subscriptions.filter((sub) => sub.status === 'Expired' || (sub.expires_at && new Date(sub.expires_at) < new Date() && sub.status !== 'Active')), [subscriptions]);
  const activeSubscriptions = useMemo(() => subscriptions.filter((sub) => sub.status === 'Active'), [subscriptions]);
  const manualTotals = calculateSubscriptionTotals(manualPlan, manualCycle);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          ['requests', 'Subscription Requests'],
          ['active', 'Active Subscriptions'],
          ['expired', 'Expired Subscriptions'],
          ['invoices', 'Invoices'],
          ['settings', 'Platform Settings'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id as Tab)} className={cn('border px-4 py-2 text-xs font-bold uppercase', activeTab === id ? 'border-gold bg-gold/10 text-gold' : 'border-slate-800 bg-matte-black-light text-slate-400')}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'requests' && (
        <Panel title="Pending Verification">
          <Table headers={['Firm', 'Plan', 'Cycle', 'Amount', 'GST', 'Total', 'UTR', 'Requested', 'Status', 'Actions']}>
            {requests.length === 0 ? <Empty colSpan={10} label="No subscription requests." /> : requests.map((request) => (
              <tr key={request.id}>
                <Cell strong>{firmName(request.firm_id)}</Cell>
                <Cell>{request.plan}</Cell>
                <Cell>{request.billing_cycle}</Cell>
                <Cell>{formatINR(request.amount)}</Cell>
                <Cell>{formatINR(request.gst_amount)}</Cell>
                <Cell strong>{formatINR(request.total_amount)}</Cell>
                <Cell>{request.utr_number}</Cell>
                <Cell>{formatDate(request.created_at)}</Cell>
                <Cell><Badge status={request.status} /></Cell>
                <Cell>
                  {request.status === 'Pending Verification' ? (
                    <div className="flex gap-2">
                      <button onClick={() => onApproveRequest(request)} disabled={busyAction === `request-${request.id}`} className="bg-gold px-3 py-1.5 text-xs font-bold text-matte-black disabled:opacity-50">Approve</button>
                      <button onClick={() => setRejecting(request)} className="bg-red-600 px-3 py-1.5 text-xs font-bold text-white">Reject</button>
                    </div>
                  ) : '-'}
                </Cell>
              </tr>
            ))}
          </Table>
        </Panel>
      )}

      {activeTab === 'active' && (
        <Panel title="Active Subscriptions">
          <ManualActivation firms={firms} firmId={manualFirmId} onFirmChange={setManualFirmId} plan={manualPlan} onPlanChange={setManualPlan} cycle={manualCycle} onCycleChange={setManualCycle} utr={manualUtr} onUtrChange={setManualUtr} total={manualTotals.totalAmount} onSubmit={() => onManualActivate({ firmId: manualFirmId, plan: manualPlan, billingCycle: manualCycle, utrNumber: manualUtr })} />
          <Table headers={['Firm', 'Plan', 'Cycle', 'Amount', 'Start', 'Expiry', 'Status']}>
            {activeSubscriptions.length === 0 ? <Empty colSpan={7} label="No active subscriptions." /> : activeSubscriptions.map((sub) => (
              <tr key={sub.id}><Cell strong>{firmName(sub.firm_id)}</Cell><Cell>{sub.plan}</Cell><Cell>{sub.billing_cycle || '-'}</Cell><Cell>{formatINR(sub.amount)}</Cell><Cell>{formatDate(sub.starts_at)}</Cell><Cell>{formatDate(sub.expires_at)}</Cell><Cell><Badge status={sub.status} /></Cell></tr>
            ))}
          </Table>
        </Panel>
      )}

      {activeTab === 'expired' && (
        <Panel title="Expired Subscriptions">
          <Table headers={['Firm', 'Plan', 'Amount', 'Expiry', 'Status']}>
            {expiredSubscriptions.length === 0 ? <Empty colSpan={5} label="No expired subscriptions." /> : expiredSubscriptions.map((sub) => (
              <tr key={sub.id}><Cell strong>{firmName(sub.firm_id)}</Cell><Cell>{sub.plan}</Cell><Cell>{formatINR(sub.amount)}</Cell><Cell>{formatDate(sub.expires_at)}</Cell><Cell><Badge status={sub.status} /></Cell></tr>
            ))}
          </Table>
        </Panel>
      )}

      {activeTab === 'invoices' && (
        <Panel title="Subscription Invoices">
          <Table headers={['Invoice', 'Firm', 'Plan', 'Cycle', 'Total', 'Issue Date', 'Action']}>
            {invoices.length === 0 ? <Empty colSpan={7} label="No invoices generated." /> : invoices.map((invoice) => (
              <tr key={invoice.id}><Cell strong>{invoice.invoice_number}</Cell><Cell>{firmName(invoice.firm_id)}</Cell><Cell>{invoice.plan}</Cell><Cell>{invoice.billing_cycle}</Cell><Cell strong>{formatINR(invoice.total_amount)}</Cell><Cell>{formatDate(invoice.invoice_date)}</Cell><Cell><button onClick={() => setSelectedInvoice(invoice)} className="text-xs font-bold text-gold">View</button></Cell></tr>
            ))}
          </Table>
        </Panel>
      )}

      {activeTab === 'settings' && (
        <Panel title="Platform Payment Settings">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Company Name" value={settingsDraft.company_name || ''} onChange={(value) => setSettingsDraft({ ...settingsDraft, company_name: value })} />
            <Input label="Company GSTIN" value={settingsDraft.company_gstin || ''} onChange={(value) => setSettingsDraft({ ...settingsDraft, company_gstin: value })} />
            <Input label="Subscription UPI ID" value={settingsDraft.subscription_upi_id || ''} onChange={(value) => setSettingsDraft({ ...settingsDraft, subscription_upi_id: value })} />
            <Input label="Subscription QR Image URL" value={settingsDraft.subscription_qr_image_url || ''} onChange={(value) => setSettingsDraft({ ...settingsDraft, subscription_qr_image_url: value })} />
            <Input label="Contact Email" value={settingsDraft.subscription_contact_email || ''} onChange={(value) => setSettingsDraft({ ...settingsDraft, subscription_contact_email: value })} />
            <Input label="Contact Phone" value={settingsDraft.subscription_contact_phone || ''} onChange={(value) => setSettingsDraft({ ...settingsDraft, subscription_contact_phone: value })} />
            <label className="md:col-span-2">
              <span className="text-xs font-bold uppercase text-slate-500">Company Address</span>
              <textarea value={settingsDraft.company_address || ''} onChange={(event) => setSettingsDraft({ ...settingsDraft, company_address: event.target.value })} className="mt-1 h-24 w-full border border-slate-800 bg-matte-black px-3 py-2 text-sm text-white" />
            </label>
          </div>
          <button onClick={() => onSavePlatformSettings(settingsDraft)} className="mt-4 flex items-center gap-2 bg-gold px-4 py-2 text-sm font-bold text-matte-black"><Settings className="h-4 w-4" />Save Settings</button>
        </Panel>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg border border-slate-800 bg-matte-black-light p-5">
            <h3 className="text-lg font-bold text-white">Reject Subscription Request</h3>
            <p className="mt-1 text-sm text-slate-500">{rejecting.reference_number}</p>
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Reason for rejection" className="mt-4 h-28 w-full border border-slate-800 bg-matte-black px-3 py-2 text-sm text-white" />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => { setRejecting(null); setRemarks(''); }} className="px-4 py-2 text-sm text-slate-400">Cancel</button>
              <button onClick={() => { onRejectRequest(rejecting, remarks); setRejecting(null); setRemarks(''); }} className="bg-red-600 px-4 py-2 text-sm font-bold text-white">Reject</button>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-3xl border border-slate-800 bg-matte-black-light p-6">
            <div className="flex justify-between border-b border-slate-800 pb-4">
              <div><h3 className="text-2xl font-bold text-white">CAATH PMS</h3><p className="text-sm text-slate-500">Subscription Invoice</p></div>
              <FileText className="h-8 w-8 text-gold" />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Info label="Firm Name" value={firmName(selectedInvoice.firm_id)} />
              <Info label="GSTIN" value={selectedInvoice.firm?.gstin || '-'} />
              <Info label="Invoice Number" value={selectedInvoice.invoice_number} />
              <Info label="Issue Date" value={formatDate(selectedInvoice.invoice_date)} />
              <Info label="Plan" value={selectedInvoice.plan} />
              <Info label="Billing Cycle" value={selectedInvoice.billing_cycle} />
              <Info label="Subscription Period" value={`${formatDate(selectedInvoice.subscription_start_date)} - ${formatDate(selectedInvoice.subscription_end_date)}`} />
              <Info label="UTR Number" value={selectedInvoice.utr_number || '-'} />
            </div>
            <div className="mt-5 border border-slate-800">
              <Amount label="Amount" value={selectedInvoice.amount} />
              <Amount label="GST" value={selectedInvoice.gst_amount} />
              <Amount label="Total" value={selectedInvoice.total_amount} strong />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setSelectedInvoice(null)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400"><XCircle className="h-4 w-4" />Close</button>
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-gold px-4 py-2 text-sm font-bold text-matte-black"><Printer className="h-4 w-4" />Print / Save PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-5"><h3 className="mb-4 text-lg font-bold text-white">{title}</h3>{children}</div>;
const Table: React.FC<{ headers: string[]; children: React.ReactNode }> = ({ headers, children }) => <div className="overflow-auto"><table className="w-full text-left"><thead className="bg-matte-black"><tr>{headers.map((head) => <th key={head} className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500">{head}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{children}</tbody></table></div>;
const Cell: React.FC<{ children: React.ReactNode; strong?: boolean }> = ({ children, strong }) => <td className={cn('px-4 py-3 text-xs', strong ? 'font-bold text-white' : 'text-slate-300')}>{children}</td>;
const Empty: React.FC<{ colSpan: number; label: string }> = ({ colSpan, label }) => <tr><td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-slate-500">{label}</td></tr>;
const Badge: React.FC<{ status: string }> = ({ status }) => <span className={cn('border px-2 py-1 text-[10px] font-bold uppercase', status === 'Active' || status === 'Approved' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : status === 'Rejected' ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300')}>{status}</span>;
const Input: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => <label><span className="text-xs font-bold uppercase text-slate-500">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full border border-slate-800 bg-matte-black px-3 py-2 text-sm text-white" /></label>;
const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => <div><p className="text-[10px] font-bold uppercase text-slate-500">{label}</p><p className="text-sm font-bold text-white">{value}</p></div>;
const Amount: React.FC<{ label: string; value: number; strong?: boolean }> = ({ label, value, strong }) => <div className="flex justify-between border-b border-slate-800 px-4 py-3 last:border-b-0"><span className="text-sm text-slate-400">{label}</span><span className={cn('text-sm font-bold', strong ? 'text-gold' : 'text-white')}>{formatINR(value)}</span></div>;

const ManualActivation: React.FC<{
  firms: FirmRow[];
  firmId: string;
  onFirmChange: (value: string) => void;
  plan: SubscriptionPlan;
  onPlanChange: (value: SubscriptionPlan) => void;
  cycle: BillingCycle;
  onCycleChange: (value: BillingCycle) => void;
  utr: string;
  onUtrChange: (value: string) => void;
  total: number;
  onSubmit: () => void;
}> = ({ firms, firmId, onFirmChange, plan, onPlanChange, cycle, onCycleChange, utr, onUtrChange, total, onSubmit }) => (
  <div className="mb-5 border border-gold/20 bg-gold/10 p-4">
    <h4 className="mb-3 text-sm font-bold text-white">Create Subscription</h4>
    <div className="grid gap-3 md:grid-cols-5">
      <select value={firmId} onChange={(event) => onFirmChange(event.target.value)} className="border border-slate-800 bg-matte-black px-3 py-2 text-sm text-white">{firms.map((firm) => <option key={firm.id} value={firm.id}>{firm.name || firm.id}</option>)}</select>
      <select value={plan} onChange={(event) => onPlanChange(event.target.value as SubscriptionPlan)} className="border border-slate-800 bg-matte-black px-3 py-2 text-sm text-white">{(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlan[]).map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select value={cycle} onChange={(event) => onCycleChange(event.target.value as BillingCycle)} className="border border-slate-800 bg-matte-black px-3 py-2 text-sm text-white"><option value="Monthly">Monthly</option><option value="Annual">Annual</option></select>
      <input value={utr} onChange={(event) => onUtrChange(event.target.value)} placeholder="UTR optional" className="border border-slate-800 bg-matte-black px-3 py-2 text-sm text-white" />
      <button onClick={onSubmit} disabled={!firmId} className="bg-gold px-4 py-2 text-sm font-bold text-matte-black disabled:opacity-50"><CheckCircle2 className="mr-2 inline h-4 w-4" />Activate {formatINR(total)}</button>
    </div>
  </div>
);
