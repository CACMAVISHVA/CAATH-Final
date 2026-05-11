/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  TrendingUp, 
  Search, 
  Filter, 
  MoreVertical, 
  Ban, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Globe, 
  Zap, 
  Activity,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Firm } from '../types';

const MOCK_FIRMS: Firm[] = [
  { 
    id: 'f1', 
    name: 'Vishva & Associates', 
    ownerUid: 'sa1', 
    ownerEmail: 'ca.vishva@firm.com', 
    status: 'Active', 
    subscriptionType: 'Yearly', 
    subscriptionStartDate: '2025-03-03', 
    subscriptionExpiryDate: '2026-03-03', 
    totalClients: 124, 
    totalStaff: 12, 
    revenueGenerated: 420000 
  },
  { 
    id: 'f2', 
    name: 'Sharma Tax Solutions', 
    ownerUid: 'sa2', 
    ownerEmail: 'rahul@sharmatax.com', 
    status: 'Active', 
    subscriptionType: 'Monthly', 
    subscriptionStartDate: '2026-03-03', 
    subscriptionExpiryDate: '2026-04-03', 
    totalClients: 45, 
    totalStaff: 4, 
    revenueGenerated: 85000 
  },
  { 
    id: 'f3', 
    name: 'Gupta & Co', 
    ownerUid: 'sa3', 
    ownerEmail: 'priya@guptaco.com', 
    status: 'Blocked', 
    subscriptionType: 'Monthly', 
    subscriptionStartDate: '2026-01-03', 
    subscriptionExpiryDate: '2026-02-03', 
    totalClients: 28, 
    totalStaff: 2, 
    revenueGenerated: 12000 
  },
];

export const GodAdminDashboard: React.FC = () => {
  const [firms, setFirms] = useState<Firm[]>(MOCK_FIRMS);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleFirmStatus = (firmId: string) => {
    setFirms(firms.map(f => {
      if (f.id === firmId) {
        return { ...f, status: f.status === 'Active' ? 'Blocked' : 'Active' };
      }
      return f;
    }));
  };

  const updateSubscription = (firmId: string, type: 'Monthly' | 'Yearly') => {
    setFirms(firms.map(f => {
      if (f.id === firmId) {
        const now = new Date();
        const start = now.toISOString().split('T')[0];
        const expiry = new Date(now);
        if (type === 'Monthly') expiry.setMonth(expiry.getMonth() + 1);
        else expiry.setFullYear(expiry.getFullYear() + 1);
        
        return { 
          ...f, 
          subscriptionType: type, 
          subscriptionStartDate: start, 
          subscriptionExpiryDate: expiry.toISOString().split('T')[0],
          status: 'Active'
        };
      }
      return f;
    }));
  };

  const filteredFirms = firms.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Total Firms', value: firms.length, icon: Globe, color: 'text-blue-400' },
    { label: 'Active Subscriptions', value: firms.filter(f => f.status === 'Active').length, icon: CheckCircle2, color: 'text-gold' },
    { label: 'Blocked Firms', value: firms.filter(f => f.status === 'Blocked').length, icon: Ban, color: 'text-red-500' },
    { label: 'Total Revenue', value: '₹' + (firms.reduce((acc, f) => acc + f.revenueGenerated, 0) / 100000).toFixed(1) + 'L', icon: TrendingUp, color: 'text-emerald-500' },
  ];

  return (
    <div className="p-8 space-y-8 h-full bg-matte-black text-slate-300 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text-gradient">God Admin Console</h2>
          <p className="text-slate-500">Global SaaS Management & Subscription Control</p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-gold/10 text-gold border border-gold/20 rounded-xl text-xs font-bold flex items-center gap-2">
            <Zap className="w-4 h-4" />
            System Status: Optimal
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <Activity className="w-4 h-4 text-slate-700" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search firms or owners..." 
              className="w-full pl-10 pr-4 py-2.5 bg-matte-black-light border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-matte-black-light border border-slate-800 rounded-xl text-sm font-bold text-slate-400 hover:text-gold transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-matte-black-light rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-matte-black border-b border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Firm Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usage</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredFirms.map((firm) => (
                <tr key={firm.id} className="hover:bg-matte-black transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gold/10 text-gold flex items-center justify-center font-bold text-sm border border-gold/20">
                        {firm.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{firm.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{firm.ownerEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-gold" />
                      <span className="text-xs font-bold text-slate-300">{firm.subscriptionType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-mono text-slate-400">{firm.subscriptionExpiryDate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Clients: {firm.totalClients}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Staff: {firm.totalStaff}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                      firm.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                    )}>
                      {firm.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => updateSubscription(firm.id, 'Monthly')}
                        className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold hover:bg-gold hover:text-matte-black transition-all"
                      >
                        +Month
                      </button>
                      <button 
                        onClick={() => updateSubscription(firm.id, 'Yearly')}
                        className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold hover:bg-gold hover:text-matte-black transition-all"
                      >
                        +Year
                      </button>
                      <button 
                        onClick={() => toggleFirmStatus(firm.id)}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          firm.status === 'Active' ? 'text-red-500 hover:bg-red-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'
                        )}
                      >
                        {firm.status === 'Active' ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <button className="p-2 text-slate-600 hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gold" />
              System Health
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-slate-500">Server Load</span>
                  <span className="text-emerald-500">24%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[24%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-slate-500">Database Latency</span>
                  <span className="text-emerald-500">12ms</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[15%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-slate-500">AI Engine Load</span>
                  <span className="text-amber-500">68%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[68%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gold/5 rounded-2xl border border-gold/20 shadow-xl">
            <h3 className="text-sm font-bold text-gold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Global Announcements
            </h3>
            <textarea 
              placeholder="Broadcast a message to all firms..."
              className="w-full h-24 bg-matte-black border border-slate-800 rounded-xl p-3 text-xs text-white focus:ring-1 focus:ring-gold outline-none resize-none"
            />
            <button className="w-full mt-3 py-2 bg-gold text-matte-black rounded-lg text-xs font-bold hover:bg-gold-light transition-all">
              Broadcast Message
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
