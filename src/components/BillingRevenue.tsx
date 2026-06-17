/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { CreditCard, Download, FileText, Plus, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { AnalyticsLoader } from './loaders/AnalyticsLoader';
import { ExportModal, ExportOptions, exportData } from './ExportModal';
import { Modal } from './Modal';
import { useAuth } from '../context/AuthContext';
import { getRevenueIntelligenceSnapshot, RevenueIntelligenceSnapshot } from '../services/revenueIntelligenceService';

const BillingAnalytics = lazy(() => import('./BillingAnalytics'));

type InvoiceRow = {
  id: string;
  client_id: string | null;
  client_name: string;
  invoice_number: string;
  billing_category: string | null;
  total: number;
  paid_amount: number;
  pending_amount: number;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  created_at: string | null;
};

type ClientOption = { id: string; name: string };
type ChartPoint = { month: string; revenue: number; expenses: number };

type BillingRevenueProps = {
  onActivateSubscription?: () => void;
};

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const buildSixMonthChart = (invoices: InvoiceRow[], expenses: Array<{ total: number; expense_date?: string | null; created_at?: string | null }>): ChartPoint[] => {
  const now = new Date();
  const points: ChartPoint[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    points.push({ month: date.toLocaleString('en-IN', { month: 'short' }), revenue: 0, expenses: 0 });
  }
  const keys = points.map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return monthKey(date);
  });
  invoices.forEach((invoice) => {
    if (invoice.status !== 'Paid') return;
    const key = invoice.issue_date ? monthKey(new Date(invoice.issue_date)) : '';
    const idx = keys.indexOf(key);
    if (idx >= 0) points[idx].revenue += invoice.total;
  });
  expenses.forEach((expense) => {
    const key = expense.expense_date || expense.created_at ? monthKey(new Date((expense.expense_date || expense.created_at) as string)) : '';
    const idx = keys.indexOf(key);
    if (idx >= 0) points[idx].expenses += expense.total;
  });
  return points;
};

export const BillingRevenue: React.FC<BillingRevenueProps> = ({ onActivateSubscription }) => {
  const { user } = useAuth();
  const [revenueSnapshot, setRevenueSnapshot] = useState<RevenueIntelligenceSnapshot | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const loadBilling = async () => {
      if (!user?.firmId) return;
      const [snapshotResult, invoiceResult, clientResult, expenseResult] = await Promise.allSettled([
        getRevenueIntelligenceSnapshot(user.firmId),
        supabase
          .from('invoices')
          .select('id, client_id, invoice_number, billing_category, total, paid_amount, pending_amount, status, issue_date, due_date, created_at, client:clients(name)')
          .eq('firm_id', user.firmId)
          .neq('status', 'Cancelled')
          .order('created_at', { ascending: false }),
        supabase
          .from('clients')
          .select('id, name')
          .eq('firm_id', user.firmId)
          .order('name', { ascending: true }),
        supabase
          .from('expenses')
          .select('total, amount, expense_date, created_at')
          .eq('firm_id', user.firmId),
      ]);

      if (snapshotResult.status === 'fulfilled') setRevenueSnapshot(snapshotResult.value);
      else console.warn('[AUTH] Optional billing module unavailable: revenue snapshot', snapshotResult.reason);

      const nextInvoices = invoiceResult.status === 'fulfilled' && !invoiceResult.value.error
        ? (invoiceResult.value.data || []).map((row: any) => ({
            ...row,
            client_name: row.client?.name || 'Unassigned Client',
            total: Number(row.total || 0),
            paid_amount: Number(row.paid_amount || 0),
            pending_amount: Number(row.pending_amount ?? Math.max(Number(row.total || 0) - Number(row.paid_amount || 0), 0)),
          })) as InvoiceRow[]
        : [];
      setInvoices(nextInvoices);

      if (clientResult.status === 'fulfilled' && !clientResult.value.error) {
        setClients((clientResult.value.data || []) as ClientOption[]);
      }

      const expenses = expenseResult.status === 'fulfilled' && !expenseResult.value.error
        ? (expenseResult.value.data || []).map((row: any) => ({ ...row, total: Number(row.total ?? row.amount ?? 0) }))
        : [];
      setChartData(buildSixMonthChart(nextInvoices, expenses));
    };
    loadBilling();
  }, [user?.firmId]);

  const maxChartValue = Math.max(1, ...chartData.map((point) => Math.max(point.revenue, point.expenses)));

  const handleExport = (options: ExportOptions) => {
    const records = invoices.map((invoice) => ({
      invoiceNumber: invoice.invoice_number,
      client: invoice.client_name,
      type: invoice.billing_category || 'General',
      date: invoice.issue_date || invoice.created_at || '',
      amount: invoice.total,
      status: invoice.status,
    }));
    exportData(records, options, [
      { key: 'invoiceNumber', label: 'Invoice Number' },
      { key: 'client', label: 'Client' },
      { key: 'type', label: 'Type' },
      { key: 'date', label: 'Date' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status' },
    ], 'Billing Report');
  };

  const subscriptionStatus = user?.firm?.subscriptionStatus;

  return (
    <div className="p-6 space-y-6 h-full bg-matte-black text-slate-300 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gold-text-gradient">Subscription & Billing</h2>
          <p className="text-sm text-slate-500">Manage workspace subscription, payments, invoices, and practice revenue.</p>
        </div>
        <button onClick={() => setShowInvoiceModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gold text-matte-black font-bold hover:bg-gold-light transition-colors">
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {user?.firm && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-slate-800 bg-matte-black-light p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Plan</p>
                <h3 className="mt-2 text-xl font-bold text-white">{user.firm.subscriptionPlan}</h3>
                <p className="mt-1 text-sm text-slate-500">Renewal: {user.firm.subscriptionExpiryDate ? new Date(user.firm.subscriptionExpiryDate).toLocaleDateString('en-IN') : 'Pending activation'}</p>
              </div>
              <span className={cn('px-3 py-1 text-[10px] font-bold uppercase', subscriptionStatus === 'Active' || subscriptionStatus === 'Trial' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300')}>
                {subscriptionStatus}
              </span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <LimitTile label="Admin Limit" value={user.firm.maxAdmins} />
              <LimitTile label="Staff Limit" value={user.firm.maxStaff} />
              <LimitTile label="Client Limit" value={user.firm.maxClients} />
            </div>
          </div>
          <div className="border border-gold/20 bg-gold/10 p-5">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-gold" />
              <h3 className="font-bold text-white">Activate Subscription</h3>
            </div>
            <p className="mt-3 text-sm text-slate-300">Pay by UPI, enter the UTR, and CAATH GodAdmin will verify activation.</p>
            <button type="button" onClick={onActivateSubscription} className="mt-5 w-full bg-gold px-4 py-2 text-sm font-bold text-matte-black">
              Activate Subscription
            </button>
          </div>
        </div>
      )}

      <Suspense fallback={<AnalyticsLoader />}>
        <BillingAnalytics />
      </Suspense>

      {revenueSnapshot && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Received This Month" value={formatINR(revenueSnapshot.kpis.revenueReceivedThisMonth)} tone="text-emerald-400" />
          <Kpi label="Receivables Pending" value={formatINR(revenueSnapshot.kpis.receivablesPending)} tone="text-white" />
          <Kpi label="Overdue Collections" value={formatINR(revenueSnapshot.kpis.overdueCollections)} tone="text-red-400" />
          <Kpi label="Realization Rate" value={`${revenueSnapshot.kpis.revenueRealizationRate}%`} tone="text-gold" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-4 bg-matte-black-light border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Revenue vs Expenses</h3>
            <div className="flex gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-gold" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-slate-600" />Expenses</span>
            </div>
          </div>
          <div className="h-48 flex items-end justify-between gap-2">
            {chartData.map((point) => (
              <div key={point.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col-reverse gap-0.5">
                  <div className="w-full bg-slate-600 transition-all" style={{ height: `${(point.expenses / maxChartValue) * 100}%`, minHeight: '4px' }} />
                  <div className="w-full bg-gold transition-all" style={{ height: `${(point.revenue / maxChartValue) * 100}%`, minHeight: '4px' }} />
                </div>
                <span className="text-[10px] text-slate-500">{point.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-matte-black-light border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-4">Recent Invoices</h3>
          <InvoiceList invoices={invoices.slice(0, 5)} />
        </div>
      </div>

      <div className="bg-matte-black-light border border-slate-800">
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white">Billing History</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input type="text" placeholder="Search invoices..." className="pl-9 pr-3 py-1.5 bg-matte-black border border-slate-800 text-xs text-white placeholder:text-slate-600" />
            </div>
            <button onClick={() => setShowExportModal(true)} className="p-1.5 bg-matte-black border border-slate-800 text-slate-500 hover:text-gold transition-colors">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800">
              {['Invoice', 'Client', 'Type', 'Amount', 'Status'].map((head) => <th key={head} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">{head}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {invoices.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">No invoices found for this workspace.</td></tr>
            ) : invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3"><p className="text-xs font-bold text-white">{invoice.invoice_number}</p><p className="text-[10px] text-slate-500">{invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-IN') : '-'}</p></td>
                <td className="px-4 py-3 text-xs text-slate-300">{invoice.client_name}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">{invoice.billing_category || 'General'}</span></td>
                <td className="px-4 py-3 text-xs font-bold text-white">{formatINR(invoice.total)}</td>
                <td className="px-4 py-3"><Status status={invoice.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="Create New Invoice" size="lg" contentClassName="space-y-4">
        <div className="border border-slate-800 bg-matte-black p-4 text-sm text-slate-400">
          Invoice creation is connected to workspace clients. Select a real client before creating an invoice.
          <select className="mt-3 w-full border border-slate-800 bg-matte-black-light px-3 py-2 text-sm text-white">
            <option value="">Select Client</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </div>
      </Modal>

      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="Billing Report" onExport={handleExport} recordCount={invoices.length} />
    </div>
  );
};

const LimitTile: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="border border-slate-800 bg-matte-black p-3">
    <p className="text-[10px] uppercase text-slate-500">{label}</p>
    <p className="text-lg font-bold text-white">{value}</p>
  </div>
);

const Kpi: React.FC<{ label: string; value: string; tone: string }> = ({ label, value, tone }) => (
  <div className="p-4 bg-matte-black-light border border-slate-800">
    <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
    <p className={cn('text-lg font-bold mt-2', tone)}>{value}</p>
  </div>
);

const InvoiceList: React.FC<{ invoices: InvoiceRow[] }> = ({ invoices }) => (
  <div className="space-y-3">
    {invoices.length === 0 ? (
      <p className="py-8 text-center text-sm text-slate-500">No recent invoices.</p>
    ) : invoices.map((invoice) => (
      <div key={invoice.id} className="flex items-center gap-3 p-2 border border-slate-800 hover:border-gold/30 transition-colors">
        <div className={cn('w-8 h-8 flex items-center justify-center', invoice.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : invoice.status === 'Overdue' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400')}>
          <FileText className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{invoice.client_name}</p>
          <p className="text-[10px] text-slate-500">{invoice.invoice_number}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-white">{formatINR(invoice.total)}</p>
          <p className="text-[10px] font-bold text-slate-500">{invoice.status}</p>
        </div>
      </div>
    ))}
  </div>
);

const Status: React.FC<{ status: string }> = ({ status }) => (
  <span className={cn('text-[10px] font-bold', status === 'Paid' ? 'text-emerald-400' : status === 'Overdue' ? 'text-red-400' : 'text-amber-400')}>{status}</span>
);
