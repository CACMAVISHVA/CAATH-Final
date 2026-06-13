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
import { GSTAnalyticsMetrics, GSTRiskBucketCounts } from '../../hooks/useGSTRiskAnalysis';

interface GSTDashboardPanelProps {
  metrics: GSTAnalyticsMetrics;
  riskBuckets: GSTRiskBucketCounts;
}

const RISK_DATA = (riskBuckets: GSTRiskBucketCounts) => [
  { name: 'Low', value: riskBuckets.Low, fill: '#10b981' },
  { name: 'Medium', value: riskBuckets.Medium, fill: '#f59e0b' },
  { name: 'High', value: riskBuckets.High, fill: '#ef4444' },
];

export const GSTDashboardPanel: React.FC<GSTDashboardPanelProps> = ({ metrics, riskBuckets }) => {
  const filingData = [
    { name: 'Filed', value: metrics.filed },
    { name: 'Pending', value: metrics.pending },
    { name: 'Late', value: metrics.late },
  ];

  const complianceData = RISK_DATA(riskBuckets);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="p-6 bg-matte-black-light rounded-3xl border border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Filing Health</h3>
          <span className="text-xs uppercase tracking-[0.24em] text-slate-500">By status</span>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filingData} margin={{ top: 12, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: '#0f172a' }}
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #d4af37', borderRadius: '12px' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {filingData.map((entry) => (
                  <Cell key={entry.name} fill={entry.name === 'Late' ? '#ef4444' : entry.name === 'Pending' ? '#f59e0b' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-6 bg-matte-black-light rounded-3xl border border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Risk Distribution</h3>
          <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Overall posture</span>
        </div>
        <div className="h-[260px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={complianceData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {complianceData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                cursor={{ fill: '#0f172a' }}
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #d4af37', borderRadius: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <strong className="text-2xl text-white">{metrics.avgHealthScore}%</strong>
            <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Average Health Score</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GSTDashboardPanel;
