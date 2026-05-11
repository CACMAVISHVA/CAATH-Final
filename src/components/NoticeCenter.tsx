/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Bell, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  ExternalLink, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  FileText 
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const MOCK_NOTICES = [
  { id: '1', client: 'Reliance Industries Ltd', source: 'Income Tax', receivedDate: '15 Mar 2026', deadline: '30 Mar 2026', status: 'Assigned', assignedTo: 'CA Rahul', noticeNumber: 'IT-2024-001' },
  { id: '2', client: 'Tata Motors Ltd', source: 'GST', receivedDate: '10 Mar 2026', deadline: '25 Mar 2026', status: 'Drafted', assignedTo: 'CA Priya', noticeNumber: 'GST-2024-045' },
  { id: '3', client: 'Adani Enterprises', source: 'MCA', receivedDate: '05 Mar 2026', deadline: '20 Mar 2026', status: 'Filed', assignedTo: 'CA Amit', noticeNumber: 'MCA-2024-012' },
  { id: '4', client: 'Infosys Ltd', source: 'Income Tax', receivedDate: '20 Mar 2026', deadline: '05 Apr 2026', status: 'Received', assignedTo: '-', noticeNumber: 'IT-2024-089' },
  { id: '5', client: 'HDFC Bank', source: 'GST', receivedDate: '18 Mar 2026', deadline: '02 Apr 2026', status: 'Received', assignedTo: '-', noticeNumber: 'GST-2024-112' },
];

export const NoticeCenter: React.FC = () => {
  return (
    <div className="p-8 space-y-6 h-full bg-slate-50 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notice Center</h2>
          <p className="text-slate-500">Track and manage legal notices from IT, GST, and MCA portals.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">
          <Plus className="w-4 h-4" />
          Log New Notice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">New Notices</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">2</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Bell className="w-4 h-4 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Drafting Stage</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">1</h3>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <FileText className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Upcoming Deadlines</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">3</h3>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Clock className="w-4 h-4 text-red-500" />
            </div>
          </div>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Closed This Month</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">12</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by notice number or client..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {MOCK_NOTICES.map((notice) => (
          <motion.div 
            key={notice.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
          >
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1.5",
              notice.status === 'Received' ? 'bg-blue-500' : 
              notice.status === 'Filed' ? 'bg-emerald-500' : 'bg-amber-500'
            )} />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  notice.source === 'Income Tax' ? 'bg-blue-500/10 text-blue-600' : 
                  notice.source === 'GST' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                )}>
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-lg font-bold text-slate-900">{notice.client}</h4>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                      {notice.source}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Notice #: {notice.noticeNumber}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Received: {notice.receivedDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-red-500 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Deadline: {notice.deadline}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:items-end gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Status</p>
                    <p className={cn(
                      "text-sm font-bold",
                      notice.status === 'Filed' ? 'text-emerald-500' : 
                      notice.status === 'Received' ? 'text-blue-500' : 'text-amber-500'
                    )}>{notice.status}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200 hidden md:block" />
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600 font-medium">{notice.assignedTo}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    Draft Reply
                  </button>
                  <button className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
