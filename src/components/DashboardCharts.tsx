/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
  Pie,
} from 'recharts';
import { DashboardMetrics } from '../services/dashboardService';

const COMPLIANCE_DATA = [
  { name: 'GST', value: 45, color: '#10b981' },
  { name: 'Income Tax', value: 30, color: '#3b82f6' },
  { name: 'ROC', value: 15, color: '#f59e0b' },
  { name: 'Audit', value: 10, color: '#ef4444' },
];

interface DashboardChartsProps {
  metrics: DashboardMetrics;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ metrics }) => {
  const revenueData = [
    { name: 'Jan', value: 0 },
    { name: 'Feb', value: 0 },
    { name: 'Mar', value: 0 },
    { name: 'Apr', value: 0 },
    { name: 'May', value: 0 },
    { name: 'Jun', value: metrics.revenue / 100000 },
  ];

  return (
    <>
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
            <BarChart data={revenueData}>
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
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === revenueData.length - 1 ? '#d4af37' : '#1e293b'} />
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
                    <Cell key={`comp-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-bold text-white">{metrics.filingCount || 0}</span>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Filings</span>
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
      </div>
    </>
  );
};

export default DashboardCharts;
