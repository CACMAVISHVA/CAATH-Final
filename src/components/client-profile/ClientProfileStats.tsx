import React from 'react';
import { CheckSquare, Clock, DollarSign, Shield } from 'lucide-react';
import { ClientRow } from '../../services/clientService';
import { ClientStats } from '../../hooks/useClientProfileData';
import { cn } from '../../lib/utils';

interface ClientProfileStatsProps {
  client: ClientRow;
  stats: ClientStats | null;
  healthScore: number;
}

const RISK_COLORS: Record<string, string> = {
  Low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  High: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export const ClientProfileStats: React.FC<ClientProfileStatsProps> = ({ client, stats, healthScore }) => {
  const riskLevel = client.risk_level || 'Low';
  const getCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Client overview</p>
          <h3 className="text-2xl font-bold text-white">{client.name} profile insights</h3>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-matte-black-light p-4 inline-flex items-center gap-3">
          <Shield className="w-4 h-4 text-gold" />
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-[0.24em]">Risk posture</p>
            <span className={cn('px-3 py-1 rounded-full text-xs font-bold uppercase', RISK_COLORS[riskLevel] || RISK_COLORS.Low)}>{riskLevel}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: stats ? getCurrency(stats.totalBilled) : '-', icon: DollarSign },
          { label: 'Pending', value: stats ? getCurrency(stats.pendingPayments) : '-', icon: Clock },
          { label: 'Active Tasks', value: stats?.activeTasks ?? '-', icon: CheckSquare },
          { label: 'Overdue Filings', value: stats?.overdueFilings ?? '-', icon: Shield },
        ].map((card) => (
          <div key={card.label} className="p-5 rounded-3xl border border-slate-800 bg-matte-black-light">
            <div className="flex items-center gap-3 mb-3">
              <card.icon className="w-4 h-4 text-slate-400" />
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{card.label}</p>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-matte-black-light p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Health score</p>
          <p className="text-sm font-bold text-white">{healthScore}%</p>
        </div>
        <div className="h-3 bg-slate-900 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
            )}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>
    </div>
  );
};
