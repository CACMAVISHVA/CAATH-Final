import React from 'react';
import {
  AlertTriangle,
  Shield,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { GSTAnalyticsMetrics, GSTAnomalyAlert, GSTRiskBucketCounts } from '../../hooks/useGSTRiskAnalysis';

interface GSTRiskWidgetsProps {
  loading: boolean;
  metrics: GSTAnalyticsMetrics;
  riskBuckets: GSTRiskBucketCounts;
  anomalyAlerts: GSTAnomalyAlert[];
}

export const GSTRiskWidgets: React.FC<GSTRiskWidgetsProps> = ({ loading, metrics, riskBuckets, anomalyAlerts }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'GST Clients', value: metrics.totalClients, icon: TrendingUp, color: 'text-emerald-400' },
          { title: 'Weekly Filings', value: metrics.filingCount, icon: Zap, color: 'text-gold' },
          { title: 'High Risk', value: riskBuckets.High, icon: AlertTriangle, color: 'text-red-400' },
          { title: 'Avg. Health', value: `${metrics.avgHealthScore}%`, icon: Shield, color: 'text-sky-400' },
        ].map((card) => (
          <div key={card.title} className="p-5 bg-matte-black-light rounded-3xl border border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{card.title}</p>
            </div>
            <p className="text-3xl font-bold text-white">{loading ? '--' : card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-6 bg-matte-black-light rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm uppercase text-slate-500 tracking-[0.24em]">GST Risk Buckets</h3>
            <span className="text-xs text-slate-400">Score spread</span>
          </div>
          <div className="space-y-3">
            {(['Low', 'Medium', 'High'] as const).map((bucket) => (
              <div key={bucket} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span className="text-sm text-slate-300">{bucket}</span>
                </div>
                <span className="text-sm font-bold text-white">{loading ? '--' : riskBuckets[bucket]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-matte-black-light rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm uppercase text-slate-500 tracking-[0.24em]">Notice & anomaly signals</h3>
            <span className="text-xs text-slate-400">Top alerts</span>
          </div>
          <div className="space-y-3">
            {anomalyAlerts.map((alert) => (
              <div key={alert.title} className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{alert.title}</p>
                  <span className={`text-[11px] uppercase tracking-[0.18em] ${alert.severity === 'high' ? 'text-red-400' : alert.severity === 'medium' ? 'text-amber-400' : 'text-slate-400'}`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{alert.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
