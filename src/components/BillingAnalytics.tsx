import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowUpDown, Calculator, Clock, FileText, Search, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

type InvoiceStatus = 'Draft' | 'Generated' | 'Sent' | 'Viewed' | 'Partially Paid' | 'Paid' | 'Unpaid' | 'Overdue' | 'Cancelled' | 'Written Off';

interface Invoice {
  id: string;
  client_id: string | null;
  client_name: string;
  invoice_number: string;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  paid_amount: number;
  pending_amount: number;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  total: number;
  amount?: number;
  expense_date?: string;
  created_at?: string;
  status: string;
}

type DrilldownView = 'revenue' | 'pending' | 'overdue' | 'profit' | null;

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);

export const BillingAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [drilldownView, setDrilldownView] = useState<DrilldownView>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.firmId) return;
      const [invoiceResult, expenseResult] = await Promise.allSettled([
        supabase
          .from('invoices')
          .select('id, client_id, invoice_number, amount, cgst, sgst, igst, total, status, issue_date, due_date, paid_amount, pending_amount, client:clients(name)')
          .eq('firm_id', user.firmId)
          .neq('status', 'Cancelled')
          .order('created_at', { ascending: false }),
        supabase
          .from('expenses')
          .select('id, category, description, total, amount, expense_date, created_at, status')
          .eq('firm_id', user.firmId)
          .order('created_at', { ascending: false }),
      ]);

      if (invoiceResult.status === 'fulfilled' && !invoiceResult.value.error) {
        setInvoices((invoiceResult.value.data || []).map((row: any) => ({
          ...row,
          client_name: row.client?.name || 'Unassigned Client',
          amount: Number(row.amount || 0),
          cgst: Number(row.cgst || 0),
          sgst: Number(row.sgst || 0),
          igst: Number(row.igst || 0),
          total: Number(row.total || 0),
          paid_amount: Number(row.paid_amount || 0),
          pending_amount: Number(row.pending_amount ?? Math.max(Number(row.total || 0) - Number(row.paid_amount || 0), 0)),
        })) as Invoice[]);
      } else if (invoiceResult.status === 'fulfilled' && invoiceResult.value.error) {
        console.warn('[AUTH] Optional billing analytics unavailable: invoices', invoiceResult.value.error);
      }

      if (expenseResult.status === 'fulfilled' && !expenseResult.value.error) {
        setExpenses((expenseResult.value.data || []).map((row: any) => ({
          ...row,
          total: Number(row.total ?? row.amount ?? 0),
        })) as Expense[]);
      } else if (expenseResult.status === 'fulfilled' && expenseResult.value.error) {
        console.warn('[AUTH] Optional billing analytics unavailable: expenses', expenseResult.value.error);
      }
    };
    load();
  }, [user?.firmId]);

  const metrics = useMemo(() => {
    const paidInvoices = invoices.filter((invoice) => invoice.status === 'Paid');
    const pendingInvoices = invoices.filter((invoice) => ['Unpaid', 'Partially Paid', 'Sent', 'Viewed', 'Generated'].includes(invoice.status));
    const overdueInvoices = invoices.filter((invoice) => invoice.status === 'Overdue');
    const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const pendingAmount = pendingInvoices.reduce((sum, invoice) => sum + invoice.pending_amount, 0);
    const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + invoice.pending_amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.total, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, pendingAmount, overdueAmount, totalExpenses, netProfit, profitMargin };
  }, [invoices, expenses]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnalyticsCard title="Total Revenue (MTD)" value={formatINR(metrics.totalRevenue)} icon={TrendingUp} iconBg="bg-emerald-500/10" iconColor="text-emerald-400" onClick={() => setDrilldownView('revenue')} />
        <AnalyticsCard title="Pending Payments" value={formatINR(metrics.pendingAmount)} subtitle="Across invoices" icon={Clock} iconBg="bg-amber-500/10" iconColor="text-amber-400" onClick={() => setDrilldownView('pending')} />
        <AnalyticsCard title="Overdue Amount" value={formatINR(metrics.overdueAmount)} subtitle="Requires action" icon={AlertCircle} iconBg="bg-red-500/10" iconColor="text-red-400" onClick={() => setDrilldownView('overdue')} />
        <AnalyticsCard title="Net Profit Margin" value={`${metrics.profitMargin.toFixed(1)}%`} subtitle={formatINR(metrics.netProfit)} icon={Calculator} iconBg="bg-gold/10" iconColor="text-gold" onClick={() => setDrilldownView('profit')} />
      </div>
      {drilldownView && <DrilldownModal view={drilldownView} onClose={() => setDrilldownView(null)} invoices={invoices} expenses={expenses} />}
    </>
  );
};

interface AnalyticsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ title, value, subtitle, icon: Icon, iconBg, iconColor, onClick }) => (
  <button onClick={onClick} className="p-4 bg-matte-black-light border border-slate-800 hover:border-gold/50 transition-all text-left group">
    <div className="flex items-start justify-between mb-3">
      <div className={cn('p-2', iconBg)}><Icon className={cn('w-4 h-4', iconColor)} /></div>
      <ArrowUpDown className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <p className="text-xs text-slate-500 font-bold uppercase mb-1">{title}</p>
    <h3 className="text-xl font-bold text-white">{value}</h3>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
  </button>
);

const DrilldownModal: React.FC<{ view: DrilldownView; onClose: () => void; invoices: Invoice[]; expenses: Expense[] }> = ({ view, onClose, invoices, expenses }) => {
  const [search, setSearch] = useState('');
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    if (view === 'revenue') result = result.filter((invoice) => invoice.status === 'Paid');
    if (view === 'pending') result = result.filter((invoice) => ['Unpaid', 'Partially Paid', 'Sent', 'Viewed', 'Generated'].includes(invoice.status));
    if (view === 'overdue') result = result.filter((invoice) => invoice.status === 'Overdue');
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((invoice) => invoice.client_name.toLowerCase().includes(s) || invoice.invoice_number.toLowerCase().includes(s));
    }
    return result;
  }, [view, invoices, search]);

  const title = view === 'revenue'
    ? 'Revenue Breakdown - Paid Invoices'
    : view === 'pending'
      ? 'Pending Payments - Outstanding Invoices'
      : view === 'overdue'
        ? 'Overdue Invoices - Collection Required'
        : 'Profitability Analysis';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-matte-black-light border border-slate-800 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white">Close</button>
        </div>
        {view !== 'profit' && (
          <div className="p-4 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search client or invoice..." className="w-full pl-9 pr-3 py-1.5 bg-matte-black border border-slate-800 text-xs text-white placeholder:text-slate-600" />
            </div>
          </div>
        )}
        {view !== 'profit' ? (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-matte-black-light">
                <tr className="border-b border-slate-800">
                  {['Invoice', 'Client', 'Date', 'Amount', 'Total', 'Status'].map((head) => <th key={head} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">{head}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500"><FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />No invoices found</td></tr>
                ) : filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 text-xs font-bold text-white">{invoice.invoice_number}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">{invoice.client_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-IN') : '-'}</td>
                    <td className="px-4 py-3 text-xs text-white">{formatINR(invoice.amount)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-white">{formatINR(invoice.total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ProfitabilityView invoices={invoices} expenses={expenses} />
        )}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    Paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Unpaid: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Overdue: 'bg-red-500/10 text-red-400 border-red-500/20',
    'Partially Paid': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Sent: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Viewed: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };
  return <span className={cn('px-2 py-0.5 text-[10px] font-bold uppercase border', colors[status] || 'bg-slate-500/10 text-slate-400')}>{status}</span>;
};

const ProfitabilityView: React.FC<{ invoices: Invoice[]; expenses: Expense[] }> = ({ invoices, expenses }) => {
  const revenue = invoices.filter((invoice) => invoice.status === 'Paid').reduce((sum, invoice) => sum + invoice.total, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.total, 0);
  const netProfit = revenue - totalExpenses;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-4 gap-4">
        <Tile label="Total Revenue" value={formatINR(revenue)} tone="text-emerald-400" />
        <Tile label="Total Expenses" value={formatINR(totalExpenses)} tone="text-red-400" />
        <Tile label="Net Profit" value={formatINR(netProfit)} tone="text-white" />
        <Tile label="Profit Margin" value={`${margin.toFixed(1)}%`} tone="text-gold" />
      </div>
    </div>
  );
};

const Tile: React.FC<{ label: string; value: string; tone: string }> = ({ label, value, tone }) => (
  <div className="p-4 bg-matte-black border border-slate-800">
    <p className="text-xs text-slate-500 uppercase mb-1">{label}</p>
    <p className={cn('text-xl font-bold', tone)}>{value}</p>
  </div>
);

export default BillingAnalytics;
