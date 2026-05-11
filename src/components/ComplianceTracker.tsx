/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Mail,
  MessageSquare,
  ClipboardCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { COMPLIANCE_CATEGORIES } from '../constants';

const MOCK_FILINGS = [
  { id: '1', client: 'Reliance Industries Ltd', type: 'GSTR-3B', category: 'GST', dueDate: '20 Mar 2026', status: 'Filed', filedDate: '18 Mar 2026', penalty: 0 },
  { id: '2', client: 'Tata Motors Ltd', type: 'GSTR-1', category: 'GST', dueDate: '11 Mar 2026', status: 'Filed', filedDate: '10 Mar 2026', penalty: 0 },
  { id: '3', client: 'Adani Enterprises', type: 'TDS Payment', category: 'Income Tax', dueDate: '07 Mar 2026', status: 'Late', filedDate: '10 Mar 2026', penalty: 500 },
  { id: '4', client: 'Infosys Ltd', type: 'AOC-4', category: 'ROC', dueDate: '30 Mar 2026', status: 'Pending', filedDate: '-', penalty: 0 },
  { id: '5', client: 'HDFC Bank', type: 'Statutory Audit', category: 'Audit', dueDate: '31 Mar 2026', status: 'Upcoming', filedDate: '-', penalty: 0 },
  { id: '6', client: 'Zomato Ltd', type: 'GSTR-3B', category: 'GST', dueDate: '20 Mar 2026', status: 'Pending', filedDate: '-', penalty: 0 },
];

export const ComplianceTracker: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');

  return (
    <div className="p-8 space-y-6 h-full bg-slate-50 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Compliance Tracker</h2>
          <p className="text-slate-500">Track all your client filings and due dates in one place.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <CalendarIcon className="w-4 h-4" />
            Calendar View
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-500">Total Filings (Mar)</p>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ClipboardCheck className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">142</h3>
          <p className="text-xs text-slate-400 mt-2">+12% from last month</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-500">Pending Filings</p>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">18</h3>
          <p className="text-xs text-slate-400 mt-2">Due in next 7 days</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-500">Late Filings</p>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">3</h3>
          <p className="text-xs text-slate-400 mt-2">Penalty accumulated: ₹1,500</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex gap-2 overflow-x-auto pb-2 md:pb-0">
          <button 
            onClick={() => setActiveCategory('All')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
              activeCategory === 'All' ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            All Categories
          </button>
          {COMPLIANCE_CATEGORIES.map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                activeCategory === cat ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search filings..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-bottom border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client & Filing Type</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Filed Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_FILINGS.map((filing) => (
              <motion.tr 
                key={filing.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-slate-50/50 transition-colors group"
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{filing.client}</p>
                    <p className="text-xs text-slate-500">{filing.type}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                    filing.category === 'GST' ? 'bg-emerald-100 text-emerald-700' : 
                    filing.category === 'Income Tax' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {filing.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-600 font-medium">{filing.dueDate}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {filing.status === 'Filed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {filing.status === 'Pending' && <Clock className="w-4 h-4 text-amber-500" />}
                    {filing.status === 'Late' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    {filing.status === 'Upcoming' && <Clock className="w-4 h-4 text-slate-400" />}
                    <span className={cn(
                      "text-xs font-bold",
                      filing.status === 'Filed' ? 'text-emerald-600' : 
                      filing.status === 'Pending' ? 'text-amber-600' : 
                      filing.status === 'Late' ? 'text-red-600' : 'text-slate-500'
                    )}>
                      {filing.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-500">{filing.filedDate}</p>
                  {filing.penalty > 0 && (
                    <p className="text-[10px] text-red-500 font-bold">Penalty: ₹{filing.penalty}</p>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Send Reminder">
                      <Mail className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="WhatsApp Reminder">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
