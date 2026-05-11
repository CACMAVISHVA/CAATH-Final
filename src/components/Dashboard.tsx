/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Users, 
  ClipboardCheck, 
  Bell, 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Activity,
  Cpu,
  Zap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const STATS = [
  { label: 'Total Clients', value: '124', icon: Users, color: 'text-gold', bg: 'bg-gold/10' },
  { label: 'Pending Filings', value: '18', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { label: 'Active Notices', value: '4', icon: Bell, color: 'text-red-500', bg: 'bg-red-500/10' },
  { label: 'Revenue (MTD)', value: '₹4.2L', icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

const STAFF_PERFORMANCE = [
  { name: 'Rahul', tasks: 45, docs: 120, rating: 4.8 },
  { name: 'Priya', tasks: 38, docs: 95, rating: 4.5 },
  { name: 'Amit', tasks: 52, docs: 140, rating: 4.9 },
];

const REVENUE_DATA = [
  { name: 'Jan', value: 3.2 },
  { name: 'Feb', value: 3.8 },
  { name: 'Mar', value: 4.2 },
  { name: 'Apr', value: 3.5 },
  { name: 'May', value: 4.5 },
  { name: 'Jun', value: 5.1 },
];

const COMPLIANCE_DATA = [
  { name: 'GST', value: 45, color: '#10b981' },
  { name: 'Income Tax', value: 30, color: '#3b82f6' },
  { name: 'ROC', value: 15, color: '#f59e0b' },
  { name: 'Audit', value: 10, color: '#ef4444' },
];

const RECENT_TASKS = [
  { id: 1, title: 'GSTR-3B Filing - Reliance Ind.', status: 'Urgent', deadline: 'Today', client: 'Reliance Industries' },
  { id: 2, title: 'TDS Payment - Tata Motors', status: 'Upcoming', deadline: 'Tomorrow', client: 'Tata Motors' },
  { id: 3, title: 'Statutory Audit - HDFC Bank', status: 'In Progress', deadline: '25 Mar', client: 'HDFC Bank' },
  { id: 4, title: 'ROC AOC-4 Filing - Infosys', status: 'Pending', deadline: '30 Mar', client: 'Infosys' },
];

const AI_QUEUE = [
  { id: 1, name: 'Invoice_Reliance_Mar.pdf', status: 'Processing', progress: 65 },
  { id: 2, name: 'Bank_Stmt_Tata_Q4.csv', status: 'Completed', progress: 100 },
  { id: 3, name: 'Receipt_Travel_01.jpg', status: 'Queued', progress: 0 },
];

export const Dashboard: React.FC = () => {
  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full bg-matte-black text-slate-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text-gradient">Welcome back, CA Vishva</h2>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-slate-500">Here's what's happening in your practice today.</p>
            <div className="flex items-center gap-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <Activity className="w-3 h-3" />
              Portal Sync: Online
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-matte-black-light border border-slate-800 rounded-xl">
            <Cpu className="w-4 h-4 text-gold" />
            <span className="text-xs font-bold text-slate-400">AI Engine: <span className="text-emerald-500 uppercase">Active</span></span>
          </div>
          <button className="px-6 py-2 bg-gold text-matte-black rounded-xl font-bold hover:bg-gold-light transition-all shadow-lg shadow-gold/20">
            Add New Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 shadow-xl hover:border-gold/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} border border-gold/10`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="flex items-center gap-1 text-gold text-xs font-bold">
                <TrendingUp className="w-3 h-3" />
                +12%
              </div>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-bold text-white mt-1 group-hover:gold-text-gradient transition-all">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 bg-matte-black-light rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Revenue Analytics</h3>
            <select className="text-xs bg-matte-black border border-slate-800 rounded-lg px-3 py-1.5 text-slate-400 focus:ring-1 focus:ring-gold outline-none">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REVENUE_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
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
                />
                <Tooltip 
                  cursor={{ fill: '#0f172a' }}
                  contentStyle={{ backgroundColor: '#121212', borderRadius: '12px', border: '1px solid #d4af37', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {REVENUE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === REVENUE_DATA.length - 1 ? '#d4af37' : '#1e293b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-8">
          <div className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6">Compliance Mix</h3>
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={COMPLIANCE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {COMPLIANCE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-white">100%</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Total Filings</span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {COMPLIANCE_DATA.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-400">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-white">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">AI Extraction Queue</h3>
              <Zap className="w-4 h-4 text-gold animate-pulse" />
            </div>
            <div className="space-y-4">
              {AI_QUEUE.map((doc) => (
                <div key={doc.id} className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-slate-400 truncate max-w-[120px]">{doc.name}</span>
                    <span className={doc.status === 'Completed' ? 'text-emerald-500' : 'text-gold'}>{doc.status}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${doc.progress}%` }}
                      className={cn(
                        "h-full rounded-full",
                        doc.status === 'Completed' ? 'bg-emerald-500' : 'bg-gold'
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 bg-matte-black-light rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Staff Performance</h3>
            <button className="text-xs text-gold font-bold hover:underline">View Detailed Analytics</button>
          </div>
          <div className="space-y-4">
            {STAFF_PERFORMANCE.map((staff, idx) => (
              <div key={staff.name} className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 hover:bg-matte-black transition-all group">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-gold font-bold border border-slate-700">
                  {staff.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white group-hover:text-gold transition-colors">{staff.name}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tasks: {staff.tasks}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Docs: {staff.docs}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-gold font-bold">
                    <span>{staff.rating}</span>
                    <TrendingUp className="w-3 h-3" />
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Rating</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 gold-gradient rounded-2xl border border-gold/20 shadow-2xl text-matte-black">
          <h3 className="text-lg font-bold mb-4">Market Insights</h3>
          <p className="text-xs font-medium mb-6 opacity-80">
            We've analyzed the top 5 PMS (Karbon, Canopy, TaxDome, Jetpack, Ignition) and integrated their best features:
          </p>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
              <div>
                <p className="text-xs font-bold">Unified Workflow</p>
                <p className="text-[10px] opacity-70">Single source of truth for all compliance.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
              <div>
                <p className="text-xs font-bold">AI Data Extraction</p>
                <p className="text-[10px] opacity-70">Automated OCR for invoices & bank statements.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
              <div>
                <p className="text-xs font-bold">Secure Client Portal</p>
                <p className="text-[10px] opacity-70">Direct document vault & secure messaging.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
              <div>
                <p className="text-xs font-bold">Performance Tracking</p>
                <p className="text-[10px] opacity-70">Real-time staff efficiency metrics.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">
        <div className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Urgent Tasks</h3>
            <button className="text-xs text-gold font-bold hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {RECENT_TASKS.map((task) => (
              <div key={task.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 hover:bg-matte-black transition-all group">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  task.status === 'Urgent' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-500'
                )}>
                  {task.status === 'Urgent' ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-gold transition-colors">{task.title}</h4>
                  <p className="text-xs text-slate-500">{task.client}</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-xs font-bold",
                    task.status === 'Urgent' ? 'text-red-500' : 'text-slate-500'
                  )}>{task.deadline}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{task.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6">Compliance Heatmap</h3>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 28 }).map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "aspect-square rounded-md",
                  i % 7 === 0 ? 'bg-red-500' : 
                  i % 5 === 0 ? 'bg-amber-400' : 
                  i % 3 === 0 ? 'bg-emerald-400' : 'bg-slate-800'
                )}
                title={`Day ${i + 1}`}
              />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-slate-800" />
              <span>No Due Dates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-400" />
              <span>Low Volume</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span>High Volume</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
