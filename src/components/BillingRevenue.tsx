/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText 
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const MOCK_BILLING = [
  { id: '1', client: 'Reliance Industries Ltd', amount: 125000, type: 'Retainer', status: 'Paid', date: '15 Mar 2026', invoiceNumber: 'INV-2024-001' },
  { id: '2', client: 'Tata Motors Ltd', amount: 85000, type: 'One-time', status: 'Paid', date: '10 Mar 2026', invoiceNumber: 'INV-2024-045' },
  { id: '3', client: 'Adani Enterprises', amount: 45000, type: 'Retainer', status: 'Unpaid', date: '05 Mar 2026', invoiceNumber: 'INV-2024-012' },
  { id: '4', client: 'Infosys Ltd', amount: 250000, type: 'Retainer', status: 'Overdue', date: '20 Feb 2026', invoiceNumber: 'INV-2024-089' },
  { id: '5', client: 'HDFC Bank', amount: 180000, type: 'One-time', status: 'Paid', date: '18 Mar 2026', invoiceNumber: 'INV-2024-112' },
];

const REVENUE_DATA = [
  { name: 'Jan', revenue: 320000, expenses: 120000 },
  { name: 'Feb', revenue: 380000, expenses: 130000 },
  { name: 'Mar', revenue: 420000, expenses: 140000 },
  { name: 'Apr', revenue: 350000, expenses: 125000 },
  { name: 'May', revenue: 450000, expenses: 150000 },
  { name: 'Jun', revenue: 510000, expenses: 160000 },
];

export const BillingRevenue: React.FC = () => {
  return (
    <div className="p-8 space-y-6 h-full bg-slate-50 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Billing & Revenue</h2>
          <p className="text-slate-500">Manage client invoices, payments, and track practice profitability.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Total Revenue (MTD)</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">₹4.2L</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-xs text-emerald-500 mt-2 font-bold">+12% vs last month</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Pending Payments</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">₹2.8L</h3>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Across 12 invoices</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Overdue Amount</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">₹1.5L</h3>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <p className="text-xs text-red-500 mt-2 font-bold">Action required</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Net Profit Margin</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">68%</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <p className="text-xs text-emerald-500 mt-2 font-bold">+5% vs last month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Revenue vs Expenses</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-500">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="text-xs text-slate-500">Expenses</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dx={-10}
                  tickFormatter={(value) => `₹${value/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#cbd5e1" 
                  strokeWidth={2}
                  fillOpacity={0} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Invoices</h3>
          <div className="space-y-4">
            {MOCK_BILLING.map((bill) => (
              <div key={bill.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  bill.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 
                  bill.status === 'Unpaid' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                )}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{bill.client}</h4>
                  <p className="text-xs text-slate-500">{bill.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">₹{bill.amount.toLocaleString()}</p>
                  <p className={cn(
                    "text-[10px] uppercase tracking-wider font-bold",
                    bill.status === 'Paid' ? 'text-emerald-500' : 
                    bill.status === 'Unpaid' ? 'text-amber-500' : 'text-red-500'
                  )}>{bill.status}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
            View All Invoices
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">Billing History</h3>
          <div className="flex gap-2">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search invoices..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-bottom border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Details</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_BILLING.map((bill) => (
              <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-900">{bill.invoiceNumber}</p>
                  <p className="text-xs text-slate-500">{bill.date}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-600 font-medium">{bill.client}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    {bill.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-900">₹{bill.amount.toLocaleString()}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {bill.status === 'Paid' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {bill.status === 'Unpaid' && <Clock className="w-4 h-4 text-amber-500" />}
                    {bill.status === 'Overdue' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    <span className={cn(
                      "text-xs font-bold",
                      bill.status === 'Paid' ? 'text-emerald-600' : 
                      bill.status === 'Unpaid' ? 'text-amber-600' : 'text-red-600'
                    )}>
                      {bill.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
