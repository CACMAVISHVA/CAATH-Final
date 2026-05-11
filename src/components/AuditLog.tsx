/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  History as HistoryIcon, 
  Search, 
  Filter, 
  LogIn, 
  UserPlus, 
  CheckCircle2, 
  FileUp, 
  FileDown, 
  Edit3, 
  ShieldAlert, 
  Download,
  Calendar,
  Clock,
  User as UserIcon,
  Tag
} from 'lucide-react';
import { motion } from 'motion/react';
import { AuditLog as AuditLogType } from '../types';

const MOCK_LOGS: AuditLogType[] = [
  {
    id: 'log1',
    firmId: 'f1',
    userId: 'st1',
    userName: 'CA Rahul',
    userRole: 'Staff',
    action: 'Login',
    category: 'Login',
    details: 'User logged in from 192.168.1.45',
    timestamp: '2026-03-22T09:15:00Z',
    ipAddress: '192.168.1.45'
  },
  {
    id: 'log2',
    firmId: 'f1',
    userId: 'st1',
    userName: 'CA Rahul',
    userRole: 'Staff',
    action: 'Document Upload',
    category: 'Document',
    details: 'Uploaded "GSTR-3B_Reliance_Mar.pdf" for Reliance Industries',
    timestamp: '2026-03-22T10:30:00Z'
  },
  {
    id: 'log3',
    firmId: 'f1',
    userId: 'sa1',
    userName: 'CA Vishva',
    userRole: 'SuperAdmin',
    action: 'Client Assignment',
    category: 'Client',
    details: 'Assigned "Tata Motors" to staff "CA Rahul"',
    timestamp: '2026-03-22T11:00:00Z'
  },
  {
    id: 'log4',
    firmId: 'f1',
    userId: 'st1',
    userName: 'CA Rahul',
    userRole: 'Staff',
    action: 'Task Completed',
    category: 'Task',
    details: 'Completed task: "Verify TDS certificates"',
    timestamp: '2026-03-22T12:45:00Z'
  },
  {
    id: 'log5',
    firmId: 'f1',
    userId: 'ad1',
    userName: 'CA Priya',
    userRole: 'Admin',
    action: 'Client Data Modification',
    category: 'Client',
    details: 'Updated contact details for "HDFC Bank"',
    timestamp: '2026-03-22T13:20:00Z'
  },
  {
    id: 'log6',
    firmId: 'f1',
    userId: 'st2',
    userName: 'CA Amit',
    userRole: 'Staff',
    action: 'Document Download',
    category: 'Document',
    details: 'Downloaded "Audit_Report_FY25.pdf" for Infosys',
    timestamp: '2026-03-22T14:05:00Z'
  }
];

export const AuditLog: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const filteredLogs = MOCK_LOGS.filter(log => {
    const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || log.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Login': return <LogIn className="w-4 h-4 text-blue-400" />;
      case 'Client': return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'Task': return <CheckCircle2 className="w-4 h-4 text-gold" />;
      case 'Document': return <FileUp className="w-4 h-4 text-purple-400" />;
      default: return <HistoryIcon className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-8 space-y-8 h-full bg-matte-black text-slate-300 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text-gradient">Audit Logs</h2>
          <p className="text-slate-500">Track all activities and modifications across your practice.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-matte-black-light border border-slate-800 rounded-xl text-sm font-bold text-slate-400 hover:text-gold transition-all">
          <Download className="w-4 h-4" />
          Export Logs
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by user, action, or details..." 
            className="w-full pl-10 pr-4 py-2.5 bg-matte-black-light border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Login', 'Client', 'Task', 'Document'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                categoryFilter === cat 
                ? 'bg-gold/10 text-gold border-gold/20' 
                : 'bg-matte-black-light text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-matte-black-light rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-matte-black border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.map((log, idx) => (
                <motion.tr 
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-matte-black transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-gold font-bold text-xs border border-slate-700">
                        {log.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-gold transition-colors">{log.userName}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{log.userRole}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-300">{log.action}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 w-fit">
                      {getCategoryIcon(log.category)}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{log.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-400 max-w-md">{log.details}</p>
                    {log.ipAddress && (
                      <p className="text-[10px] text-slate-600 font-mono mt-1">IP: {log.ipAddress}</p>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-700 mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No audit logs found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};
