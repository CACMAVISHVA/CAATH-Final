/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Download,
  Trash2,
  FileText,
  CreditCard,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AnalyticsLoader } from './loaders/AnalyticsLoader';
import { ExportModal, ExportOptions, exportData } from './ExportModal';
import { Modal } from './Modal';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { useAuth } from '../context/AuthContext';
import { getRevenueIntelligenceSnapshot, RevenueIntelligenceSnapshot } from '../services/revenueIntelligenceService';

const BillingAnalytics = lazy(() => import('./BillingAnalytics'));

interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface NewInvoice {
  client: string;
  invoiceNumber: string;
  lineItems: InvoiceLineItem[];
  dueDate: string;
  notes: string;
}

const MOCK_CLIENTS = [
  'Reliance Industries Ltd',
  'Tata Motors Ltd',
  'HDFC Bank',
  'Infosys Ltd',
  'Adani Enterprises',
  'Zomato Ltd',
];

const REVENUE_DATA = [
  { month: 'Jan', revenue: 320000, expenses: 120000 },
  { month: 'Feb', revenue: 380000, expenses: 130000 },
  { month: 'Mar', revenue: 420000, expenses: 140000 },
  { month: 'Apr', revenue: 350000, expenses: 125000 },
  { month: 'May', revenue: 450000, expenses: 150000 },
  { month: 'Jun', revenue: 510000, expenses: 160000 },
];

const MOCK_BILLING = [
  { id: '1', client: 'Reliance Industries Ltd', amount: 125000, type: 'Retainer', status: 'Paid', date: '15 Mar 2026', invoiceNumber: 'INV-2024-001' },
  { id: '2', client: 'Tata Motors Ltd', amount: 85000, type: 'One-time', status: 'Paid', date: '10 Mar 2026', invoiceNumber: 'INV-2024-045' },
  { id: '3', client: 'Adani Enterprises', amount: 45000, type: 'Retainer', status: 'Unpaid', date: '05 Mar 2026', invoiceNumber: 'INV-2024-012' },
  { id: '4', client: 'Infosys Ltd', amount: 250000, type: 'Retainer', status: 'Overdue', date: '20 Feb 2026', invoiceNumber: 'INV-2024-089' },
  { id: '5', client: 'HDFC Bank', amount: 180000, type: 'One-time', status: 'Paid', date: '18 Mar 2026', invoiceNumber: 'INV-2024-112' },
];

const maxRevenue = Math.max(...REVENUE_DATA.map(d => d.revenue));

export const BillingRevenue: React.FC = () => {
  const { user } = useAuth();
  const [revenueSnapshot, setRevenueSnapshot] = useState<RevenueIntelligenceSnapshot | null>(null);
  const defaultInvoice: NewInvoice = {
    client: '',
    invoiceNumber: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    lineItems: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  };
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState<NewInvoice>(defaultInvoice);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const hasUnsavedInvoiceChanges = showInvoiceModal && (
    !!newInvoice.client ||
    !!newInvoice.notes ||
    newInvoice.lineItems.some((item) => item.description || item.quantity !== 1 || item.rate !== 0 || item.amount !== 0)
  );
  const guardInvoiceModalClose = useUnsavedChangesGuard(hasUnsavedInvoiceChanges);

  useEffect(() => {
    const loadRevenueSnapshot = async () => {
      if (!user?.firmId) return;
      try {
        const snapshot = await getRevenueIntelligenceSnapshot(user.firmId);
        setRevenueSnapshot(snapshot);
      } catch (error) {
        console.error('Failed to load revenue intelligence snapshot:', error);
      }
    };
    loadRevenueSnapshot();
  }, [user?.firmId]);

  // Export handler
  const handleExport = (options: ExportOptions) => {
    const columns = [
      { key: 'client', label: 'Client' },
      { key: 'invoiceNumber', label: 'Invoice Number' },
      { key: 'type', label: 'Type' },
      { key: 'date', label: 'Date' },
      { key: 'amount', label: 'Amount (₹)' },
      { key: 'status', label: 'Status' },
    ];

    const records = MOCK_BILLING as unknown as Record<string, unknown>[];
    exportData(records, options, columns, 'Billing Report');
  };

  const calculateSubtotal = () => {
    return newInvoice.lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateGST = () => {
    return Math.round(calculateSubtotal() * 0.18);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    const updatedItems = [...newInvoice.lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate;
    }

    setNewInvoice({ ...newInvoice, lineItems: updatedItems });
  };

  const addLineItem = () => {
    setNewInvoice({
      ...newInvoice,
      lineItems: [...newInvoice.lineItems, { description: '', quantity: 1, rate: 0, amount: 0 }],
    });
  };

  const removeLineItem = (index: number) => {
    if (newInvoice.lineItems.length > 1) {
      const updatedItems = newInvoice.lineItems.filter((_, i) => i !== index);
      setNewInvoice({ ...newInvoice, lineItems: updatedItems });
    }
  };

  const handleCreateInvoice = () => {
    if (!newInvoice.client) return;

    setIsSubmitting(true);

    setTimeout(() => {
      setShowInvoiceModal(false);
      setNewInvoice(defaultInvoice);
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="p-6 space-y-6 h-full bg-matte-black text-slate-300 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gold-text-gradient">Subscription & Billing</h2>
          <p className="text-sm text-slate-500">Manage workspace subscription, payments, invoices, and practice revenue.</p>
        </div>
        <button
          onClick={() => setShowInvoiceModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-matte-black font-bold hover:bg-gold-light transition-colors"
        >
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
                <p className="mt-1 text-sm text-slate-500">
                  Renewal: {user.firm.subscriptionExpiryDate ? new Date(user.firm.subscriptionExpiryDate).toLocaleDateString() : 'Pending activation'}
                </p>
              </div>
              <span className={cn(
                'px-3 py-1 text-[10px] font-bold uppercase',
                user.firm.subscriptionStatus === 'Active' || user.firm.subscriptionStatus === 'Trial'
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-amber-500/10 text-amber-300',
              )}>
                {user.firm.subscriptionStatus}
              </span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="border border-slate-800 bg-matte-black p-3">
                <p className="text-[10px] uppercase text-slate-500">Admins</p>
                <p className="text-lg font-bold text-white">{user.firm.maxAdmins}</p>
              </div>
              <div className="border border-slate-800 bg-matte-black p-3">
                <p className="text-[10px] uppercase text-slate-500">Staff</p>
                <p className="text-lg font-bold text-white">{user.firm.maxStaff}</p>
              </div>
              <div className="border border-slate-800 bg-matte-black p-3">
                <p className="text-[10px] uppercase text-slate-500">Clients</p>
                <p className="text-lg font-bold text-white">{user.firm.maxClients}</p>
              </div>
            </div>
          </div>
          <div className="border border-gold/20 bg-gold/10 p-5">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-gold" />
              <h3 className="font-bold text-white">Activate Subscription</h3>
            </div>
            <p className="mt-3 text-sm text-slate-300">Payment integration is ready for Razorpay, Stripe, or UPI gateway activation.</p>
            <button className="mt-5 w-full bg-gold px-4 py-2 text-sm font-bold text-matte-black">
              Activate Subscription
            </button>
          </div>
        </div>
      )}

      {/* Interactive Analytics Cards - Real Data Driven */}
      <Suspense fallback={<AnalyticsLoader />}>
        <BillingAnalytics />
      </Suspense>

      {revenueSnapshot && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-matte-black-light border border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Received This Month</p>
            <p className="text-lg font-bold text-emerald-400 mt-2">{formatINR(revenueSnapshot.kpis.revenueReceivedThisMonth)}</p>
          </div>
          <div className="p-4 bg-matte-black-light border border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Receivables Pending</p>
            <p className="text-lg font-bold text-white mt-2">{formatINR(revenueSnapshot.kpis.receivablesPending)}</p>
          </div>
          <div className="p-4 bg-matte-black-light border border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Overdue Collections</p>
            <p className="text-lg font-bold text-red-400 mt-2">{formatINR(revenueSnapshot.kpis.overdueCollections)}</p>
          </div>
          <div className="p-4 bg-matte-black-light border border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Realization Rate</p>
            <p className="text-lg font-bold text-gold mt-2">{revenueSnapshot.kpis.revenueRealizationRate}%</p>
          </div>
        </div>
      )}

      {revenueSnapshot && revenueSnapshot.workflowSignals.length > 0 && (
        <div className="p-4 bg-matte-black-light border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Workflow to Billing Signals</h3>
            <span className="text-xs text-slate-500">
              {revenueSnapshot.kpis.completedTasksAwaitingBilling} completed task(s) awaiting billing
            </span>
          </div>
          <div className="space-y-2">
            {revenueSnapshot.workflowSignals.slice(0, 5).map((signal) => (
              <div key={signal.taskId} className="p-3 border border-slate-800 bg-matte-black">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-white">{signal.taskTitle}</p>
                  <span className={`text-[10px] font-bold uppercase ${signal.risk === 'high' ? 'text-red-400' : signal.risk === 'medium' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {signal.risk} risk
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{signal.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Chart - CSS-only bar chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-4 bg-matte-black-light border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Revenue vs Expenses</h3>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-gold" />
                <span className="text-xs text-slate-500">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-slate-600" />
                <span className="text-xs text-slate-500">Expenses</span>
              </div>
            </div>
          </div>
          <div className="h-48 flex items-end justify-between gap-2">
            {REVENUE_DATA.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col-reverse gap-0.5">
                  <div
                    className="w-full bg-gold/60 transition-all"
                    style={{ height: `${(d.expenses / maxRevenue) * 100}%`, minHeight: '4px' }}
                  />
                  <div
                    className="w-full bg-gold transition-all"
                    style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: '8px' }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="p-4 bg-matte-black-light border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-4">Recent Invoices</h3>
          <div className="space-y-3">
            {MOCK_BILLING.map((bill) => (
              <div key={bill.id} className="flex items-center gap-3 p-2 border border-slate-800 hover:border-gold/30 transition-colors">
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center",
                  bill.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' :
                  bill.status === 'Unpaid' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                )}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{bill.client}</p>
                  <p className="text-[10px] text-slate-500">{bill.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white">₹{(bill.amount / 1000).toFixed(1)}k</p>
                  <p className={cn(
                    "text-[10px] font-bold",
                    bill.status === 'Paid' ? 'text-emerald-400' :
                    bill.status === 'Unpaid' ? 'text-amber-400' : 'text-red-400'
                  )}>{bill.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Billing History Table */}
      <div className="bg-matte-black-light border border-slate-800">
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white">Billing History</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search invoices..."
                className="pl-9 pr-3 py-1.5 bg-matte-black border border-slate-800 text-xs text-white placeholder:text-slate-600"
              />
            </div>
            <button className="p-1.5 bg-matte-black border border-slate-800 text-slate-500 hover:text-gold transition-colors">
              <Filter className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 bg-matte-black border border-slate-800 text-slate-500 hover:text-gold transition-colors">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Invoice</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Client</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Type</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {MOCK_BILLING.map((bill) => (
              <tr key={bill.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-xs font-bold text-white">{bill.invoiceNumber}</p>
                  <p className="text-[10px] text-slate-500">{bill.date}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-slate-300">{bill.client}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">
                    {bill.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs font-bold text-white">₹{bill.amount.toLocaleString()}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {bill.status === 'Paid' && <div className="w-1.5 h-1.5 bg-emerald-400" />}
                    {bill.status === 'Unpaid' && <div className="w-1.5 h-1.5 bg-amber-400" />}
                    {bill.status === 'Overdue' && <div className="w-1.5 h-1.5 bg-red-400" />}
                    <span className={cn(
                      "text-[10px] font-bold",
                      bill.status === 'Paid' ? 'text-emerald-400' :
                      bill.status === 'Unpaid' ? 'text-amber-400' : 'text-red-400'
                    )}>
                      {bill.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="p-1.5 text-slate-500 hover:text-gold transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => guardInvoiceModalClose(() => setShowInvoiceModal(false))}
        title="Create New Invoice"
        size="xl"
        contentClassName="space-y-4"
      >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase font-bold mb-1.5">Client *</label>
                  <select
                    value={newInvoice.client}
                    onChange={e => setNewInvoice({ ...newInvoice, client: e.target.value })}
                    className="w-full px-3 py-2 bg-matte-black border border-slate-800 text-sm text-white"
                  >
                    <option value="">Select Client</option>
                    {MOCK_CLIENTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase font-bold mb-1.5">Invoice Number</label>
                  <input
                    type="text"
                    value={newInvoice.invoiceNumber}
                    onChange={e => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-matte-black border border-slate-800 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-slate-500 uppercase font-bold">Line Items</label>
                  <button onClick={addLineItem} type="button" className="text-xs text-gold hover:underline">+ Add Item</button>
                </div>
                <div className="space-y-2">
                  {newInvoice.lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={e => handleLineItemChange(index, 'description', e.target.value)}
                        className="col-span-5 px-2 py-1.5 bg-matte-black border border-slate-800 text-xs text-white"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity || ''}
                        onChange={e => handleLineItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="col-span-2 px-2 py-1.5 bg-matte-black border border-slate-800 text-xs text-white text-center"
                      />
                      <input
                        type="number"
                        placeholder="Rate"
                        value={item.rate || ''}
                        onChange={e => handleLineItemChange(index, 'rate', parseInt(e.target.value) || 0)}
                        className="col-span-2 px-2 py-1.5 bg-matte-black border border-slate-800 text-xs text-white text-right"
                      />
                      <div className="col-span-2 px-2 py-1.5 text-xs text-white text-right">
                        ?{item.amount.toLocaleString()}
                      </div>
                      <button
                        onClick={() => removeLineItem(index)}
                        className="col-span-1 p-1.5 text-slate-500 hover:text-red-400"
                        disabled={newInvoice.lineItems.length === 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase font-bold mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={e => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-matte-black border border-slate-800 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase font-bold mb-1.5">Notes</label>
                  <input
                    type="text"
                    placeholder="Additional notes..."
                    value={newInvoice.notes}
                    onChange={e => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-matte-black border border-slate-800 text-sm text-white"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-white font-bold">?{calculateSubtotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">GST (18%)</span>
                  <span className="text-white font-bold">?{calculateGST().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-gold font-bold">?{calculateTotal().toLocaleString()}</span>
                </div>
              </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 sticky bottom-0 bg-matte-black-light">
              <button
                onClick={() => guardInvoiceModalClose(() => setShowInvoiceModal(false))}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={isSubmitting || !newInvoice.client}
                className="px-4 py-2 bg-gold text-matte-black text-sm font-bold hover:bg-gold-light disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
      </Modal>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Billing Report"
        onExport={handleExport}
        recordCount={MOCK_BILLING.length}
      />
    </div>
  );
};
