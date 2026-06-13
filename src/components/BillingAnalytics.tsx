import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  Calculator,
  Calendar,
  Users,
  PieChart,
  BarChart3,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '../lib/utils';

// Types
interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  status: 'Draft' | 'Generated' | 'Sent' | 'Viewed' | 'Partially Paid' | 'Paid' | 'Unpaid' | 'Overdue' | 'Cancelled' | 'Written Off';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  paidAmount: number;
  notes?: string;
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  mode: 'UPI' | 'Bank Transfer' | 'Cheque' | 'Cash';
  reference?: string;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor?: string;
  status: 'Pending' | 'Approved' | 'Paid';
}

// Sample data - in production this comes from Supabase
const SAMPLE_INVOICES: Invoice[] = [
  { id: '1', clientId: 'c1', clientName: 'Reliance Industries Ltd', invoiceNumber: 'INV-2026-001', amount: 100000, cgst: 9000, sgst: 9000, igst: 0, total: 118000, status: 'Paid', issueDate: '2026-04-01', dueDate: '2026-04-15', paidDate: '2026-04-10', paidAmount: 118000 },
  { id: '2', clientId: 'c2', clientName: 'Tata Motors Ltd', invoiceNumber: 'INV-2026-002', amount: 75000, cgst: 6750, sgst: 6750, igst: 0, total: 88500, status: 'Paid', issueDate: '2026-04-05', dueDate: '2026-04-20', paidDate: '2026-04-18', paidAmount: 88500 },
  { id: '3', clientId: 'c3', clientName: 'HDFC Bank', invoiceNumber: 'INV-2026-003', amount: 150000, cgst: 13500, sgst: 13500, igst: 0, total: 177000, status: 'Overdue', issueDate: '2026-03-15', dueDate: '2026-03-30', paidAmount: 0 },
  { id: '4', clientId: 'c4', clientName: 'Infosys Ltd', invoiceNumber: 'INV-2026-004', amount: 200000, cgst: 18000, sgst: 18000, igst: 0, total: 236000, status: 'Paid', issueDate: '2026-04-10', dueDate: '2026-04-25', paidDate: '2026-04-22', paidAmount: 236000 },
  { id: '5', clientId: 'c5', clientName: 'Adani Enterprises', invoiceNumber: 'INV-2026-005', amount: 45000, cgst: 4050, sgst: 4050, igst: 0, total: 53100, status: 'Unpaid', issueDate: '2026-04-12', dueDate: '2026-04-27', paidAmount: 0 },
  { id: '6', clientId: 'c1', clientName: 'Reliance Industries Ltd', invoiceNumber: 'INV-2026-006', amount: 25000, cgst: 2250, sgst: 2250, igst: 0, total: 29500, status: 'Partially Paid', issueDate: '2026-04-15', dueDate: '2026-04-30', paidAmount: 15000 },
  { id: '7', clientId: 'c6', clientName: 'Zomato Ltd', invoiceNumber: 'INV-2026-007', amount: 80000, cgst: 7200, sgst: 7200, igst: 0, total: 94400, status: 'Sent', issueDate: '2026-04-18', dueDate: '2026-05-02', paidAmount: 0 },
  { id: '8', clientId: 'c7', clientName: 'Wipro Ltd', invoiceNumber: 'INV-2026-008', amount: 120000, cgst: 10800, sgst: 10800, igst: 0, total: 141600, status: 'Overdue', issueDate: '2026-03-20', dueDate: '2026-04-05', paidAmount: 0 },
  { id: '9', clientId: 'c8', clientName: 'TCS Ltd', invoiceNumber: 'INV-2026-009', amount: 95000, cgst: 8550, sgst: 8550, igst: 0, total: 112100, status: 'Paid', issueDate: '2026-04-08', dueDate: '2026-04-22', paidDate: '2026-04-20', paidAmount: 112100 },
  { id: '10', clientId: 'c9', clientName: 'ITC Ltd', invoiceNumber: 'INV-2026-010', amount: 60000, cgst: 5400, sgst: 5400, igst: 0, total: 70800, status: 'Unpaid', issueDate: '2026-04-20', dueDate: '2026-05-05', paidAmount: 0 },
];

const SAMPLE_EXPENSES: Expense[] = [
  { id: 'e1', category: 'Salary', description: 'Staff Salary April', amount: 85000, date: '2026-04-01', status: 'Paid' },
  { id: 'e2', category: 'Software', description: 'Tally Subscription', amount: 3000, date: '2026-04-05', status: 'Paid' },
  { id: 'e3', category: 'Travel', description: 'Client Visit - Mumbai', amount: 8500, date: '2026-04-10', status: 'Approved' },
  { id: 'e4', category: 'Office', description: 'Office Supplies', amount: 2500, date: '2026-04-12', status: 'Paid' },
  { id: 'e5', category: 'Professional Fees', description: 'GST Consultant', amount: 15000, date: '2026-04-15', status: 'Pending' },
  { id: 'e6', category: 'Tax', description: 'Professional Tax', amount: 5000, date: '2026-04-20', status: 'Paid' },
];

type DrilldownView = 'revenue' | 'pending' | 'overdue' | 'profit' | null;

interface DrilldownModalProps {
  view: DrilldownView;
  onClose: () => void;
  invoices: Invoice[];
  expenses: Expense[];
}

export const BillingAnalytics: React.FC = () => {
  const [drilldownView, setDrilldownView] = useState<DrilldownView>(null);

  // Define data FIRST, then use in calculations
  const invoices = SAMPLE_INVOICES;
  const expenses = SAMPLE_EXPENSES;

  // Calculate metrics from real data
  const metrics = useMemo(() => {
    // Guard against empty/undefined data
    if (!invoices || invoices.length === 0) {
      return { totalRevenue: 0, pendingAmount: 0, overdueAmount: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0 };
    }

    const paidInvoices = invoices.filter(i => i.status === 'Paid');
    const unpaidInvoices = invoices.filter(i => ['Unpaid', 'Partially Paid', 'Sent', 'Viewed'].includes(i.status));
    const overdueInvoices = invoices.filter(i => i.status === 'Overdue');

    const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);
    const pendingAmount = unpaidInvoices.reduce((sum, i) => sum + (i.total - i.paidAmount), 0);
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.total, 0);

    const expenseData = expenses || [];
    const totalExpenses = expenseData.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return { totalRevenue, pendingAmount, overdueAmount, totalExpenses, netProfit, profitMargin };
  }, [invoices, expenses]);

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <>
      {/* Interactive Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Total Revenue (MTD)"
          value={formatINR(metrics.totalRevenue)}
          trend="+12%"
          trendUp={true}
          icon={TrendingUp}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-400"
          onClick={() => setDrilldownView('revenue')}
        />
        <AnalyticsCard
          title="Pending Payments"
          value={formatINR(metrics.pendingAmount)}
          subtitle="Across invoices"
          icon={Clock}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-400"
          onClick={() => setDrilldownView('pending')}
        />
        <AnalyticsCard
          title="Overdue Amount"
          value={formatINR(metrics.overdueAmount)}
          subtitle="Requires action"
          icon={AlertCircle}
          iconBg="bg-red-500/10"
          iconColor="text-red-400"
          onClick={() => setDrilldownView('overdue')}
        />
        <AnalyticsCard
          title="Net Profit Margin"
          value={`${metrics.profitMargin.toFixed(1)}%`}
          trend={metrics.netProfit > 0 ? `₹${(metrics.netProfit / 100000).toFixed(1)}L` : 'Negative'}
          trendUp={metrics.netProfit > 0}
          icon={Calculator}
          iconBg="bg-gold/10"
          iconColor="text-gold"
          onClick={() => setDrilldownView('profit')}
        />
      </div>

      {/* Drilldown Modal */}
      {drilldownView && (
        <DrilldownModal
          view={drilldownView}
          onClose={() => setDrilldownView(null)}
          invoices={invoices}
          expenses={expenses}
        />
      )}
    </>
  );
};

interface AnalyticsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title, value, subtitle, trend, trendUp, icon: Icon, iconBg, iconColor, onClick
}) => (
  <button
    onClick={onClick}
    className="p-4 bg-matte-black-light border border-slate-800 hover:border-gold/50 transition-all text-left group"
  >
    <div className="flex items-start justify-between mb-3">
      <div className={cn("p-2", iconBg)}>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <ArrowUpDown className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <p className="text-xs text-slate-500 font-bold uppercase mb-1">{title}</p>
    <div className="flex items-end justify-between">
      <h3 className="text-xl font-bold text-white">{value}</h3>
      {trend && (
        <span className={cn("text-xs font-bold", trendUp ? 'text-emerald-400' : 'text-red-400')}>
          {trend}
        </span>
      )}
    </div>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
  </button>
);

const DrilldownModal: React.FC<DrilldownModalProps> = ({ view, onClose, invoices, expenses }) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'clientName' | 'amount' | 'date' | 'invoiceNumber'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  // Filter and sort logic based on view
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Filter by view
    if (view === 'revenue') {
      result = result.filter(i => i.status === 'Paid');
    } else if (view === 'pending') {
      result = result.filter(i => ['Unpaid', 'Partially Paid', 'Sent', 'Viewed'].includes(i.status));
    } else if (view === 'overdue') {
      result = result.filter(i => i.status === 'Overdue');
    }

    // Filter by status dropdown
    if (filterStatus !== 'all') {
      result = result.filter(i => i.status === filterStatus);
    }

    // Search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i => i.clientName.toLowerCase().includes(s) || i.invoiceNumber.toLowerCase().includes(s));
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'clientName') cmp = a.clientName.localeCompare(b.clientName);
      else if (sortField === 'amount') cmp = a.total - b.total;
      else if (sortField === 'date') cmp = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [view, invoices, search, sortField, sortAsc, filterStatus]);

  // Calculate totals
  const totals = useMemo(() => {
    return {
      count: filteredInvoices.length,
      amount: filteredInvoices.reduce((sum, i) => sum + i.total, 0),
      cgst: filteredInvoices.reduce((sum, i) => sum + i.cgst, 0),
      sgst: filteredInvoices.reduce((sum, i) => sum + i.sgst, 0),
      pending: filteredInvoices.reduce((sum, i) => sum + (i.total - i.paidAmount), 0),
    };
  }, [filteredInvoices]);

  const getDaysOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const getTitle = () => {
    switch (view) {
      case 'revenue': return 'Revenue Breakdown - Paid Invoices';
      case 'pending': return 'Pending Payments - Outstanding Invoices';
      case 'overdue': return 'Overdue Invoices - Collection Required';
      case 'profit': return 'Profitability Analysis';
      default: return 'Analytics';
    }
  };

  const handleSort = (field: 'clientName' | 'amount' | 'date' | 'invoiceNumber') => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-matte-black-light border border-slate-800 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">{getTitle()}</h2>
            <p className="text-xs text-slate-500">Click headers to sort • Use search to filter</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-matte-black border border-slate-800 text-xs text-slate-400 hover:text-gold flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white">✕</button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search client or invoice..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-matte-black border border-slate-800 text-xs text-white placeholder:text-slate-600"
            />
          </div>
          {view !== 'profit' && (
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-matte-black border border-slate-800 text-xs text-white"
            >
              <option value="all">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Sent">Sent</option>
            </select>
          )}
        </div>

        {/* Table */}
        {view !== 'profit' ? (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-matte-black-light">
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase cursor-pointer hover:text-gold" onClick={() => handleSort('invoiceNumber')}>
                    Invoice {sortField === 'invoiceNumber' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase cursor-pointer hover:text-gold" onClick={() => handleSort('clientName')}>
                    Client {sortField === 'clientName' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase cursor-pointer hover:text-gold" onClick={() => handleSort('date')}>
                    Date {sortField === 'date' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase cursor-pointer hover:text-gold" onClick={() => handleSort('amount')}>
                    Amount {sortField === 'amount' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">GST</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Status</th>
                  {view === 'overdue' && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Days Overdue</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-white">{inv.invoiceNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-300">{inv.clientName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-500">{new Date(inv.issueDate).toLocaleDateString('en-IN')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-white">{formatINR(inv.amount)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-500">{formatINR(inv.cgst + inv.sgst)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-white">{formatINR(inv.total)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    {view === 'overdue' && (
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-red-400">{getDaysOverdue(inv.dueDate)} days</span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredInvoices.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No invoices found</p>
              </div>
            )}
          </div>
        ) : (
          /* Profitability View */
          <div className="flex-1 overflow-auto p-4">
            <ProfitabilityView invoices={invoices} expenses={expenses} />
          </div>
        )}

        {/* Footer with totals */}
        {view !== 'profit' && (
          <div className="p-4 border-t border-slate-800 bg-matte-black">
            <div className="flex justify-between items-center">
              <div className="flex gap-6">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Count</p>
                  <p className="text-sm font-bold text-white">{totals.count} invoices</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Subtotal</p>
                  <p className="text-sm font-bold text-white">{formatINR(totals.amount - totals.cgst - totals.sgst)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">GST (CGST+SGST)</p>
                  <p className="text-sm font-bold text-white">{formatINR(totals.cgst + totals.sgst)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Total</p>
                  <p className="text-sm font-bold text-gold">{formatINR(totals.amount)}</p>
                </div>
                {view !== 'revenue' && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Pending</p>
                    <p className="text-sm font-bold text-amber-400">{formatINR(totals.pending)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    'Paid': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Unpaid': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Overdue': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Partially Paid': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Sent': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'Viewed': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    'Draft': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'Generated': 'bg-gold/10 text-gold border-gold/20',
  };
  return (
    <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase border", colors[status] || 'bg-slate-500/10 text-slate-400')}>
      {status}
    </span>
  );
};

const ProfitabilityView: React.FC<{ invoices: Invoice[]; expenses: Expense[] }> = ({ invoices, expenses }) => {
  const formatINR = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  const revenue = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.total, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = revenue - totalExpenses;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  // Group expenses by category
  const expenseByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  // Client-wise revenue
  const clientRevenue = invoices.filter(i => i.status === 'Paid').reduce((acc, i) => {
    acc[i.clientName] = (acc[i.clientName] || 0) + i.total;
    return acc;
  }, {} as Record<string, number>);

  const topClients = Object.entries(clientRevenue).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-matte-black border border-slate-800">
          <p className="text-xs text-slate-500 uppercase mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-emerald-400">{formatINR(revenue)}</p>
        </div>
        <div className="p-4 bg-matte-black border border-slate-800">
          <p className="text-xs text-slate-500 uppercase mb-1">Total Expenses</p>
          <p className="text-xl font-bold text-red-400">{formatINR(totalExpenses)}</p>
        </div>
        <div className="p-4 bg-matte-black border border-slate-800">
          <p className="text-xs text-slate-500 uppercase mb-1">Net Profit</p>
          <p className="text-xl font-bold text-white">{formatINR(netProfit)}</p>
        </div>
        <div className="p-4 bg-matte-black border border-slate-800">
          <p className="text-xs text-slate-500 uppercase mb-1">Profit Margin</p>
          <p className="text-xl font-bold text-gold">{margin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-matte-black border border-slate-800">
          <h4 className="text-sm font-bold text-white mb-4">Expense Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(expenseByCategory).map(([cat, amt]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{cat}</span>
                <span className="text-xs font-bold text-white">{formatINR(amt)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-matte-black border border-slate-800">
          <h4 className="text-sm font-bold text-white mb-4">Top Clients by Revenue</h4>
          <div className="space-y-2">
            {topClients.map(([client, amt]) => (
              <div key={client} className="flex items-center justify-between">
                <span className="text-xs text-slate-400 truncate max-w-[150px]">{client}</span>
                <span className="text-xs font-bold text-gold">{formatINR(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingAnalytics;