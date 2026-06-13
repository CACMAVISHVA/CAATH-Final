/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, Building2, Clock, ShieldAlert, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export interface PortalSummary {
  total: number;
  failed: number;
  byPortal: Record<string, number>;
}

interface PlatformMetricsCardsProps {
  activeFirms: number;
  suspendedFirms: number;
  pendingSubscriptions: number;
  platformRevenue: number;
  portalTotal: number;
  portalFailed: number;
  portalTop: [string, number] | undefined;
  onMetricClick: (type: 'active' | 'suspended' | 'pending' | 'revenue') => void;
}

const Metric: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: string;
  onClick?: () => void;
  subtitle?: string;
}> = ({ label, value, icon: Icon, tone = 'text-gold', onClick, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "p-5 bg-matte-black-light rounded-2xl border border-slate-800 transition-all cursor-pointer",
      onClick && "hover:border-gold/50 hover:shadow-lg hover:shadow-gold/5 group"
    )}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-4">
      <Icon className={cn('w-5 h-5', tone)} />
      {onClick && (
        <Zap className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      {!onClick && <Zap className="w-4 h-4 text-slate-700" />}
    </div>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
    <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
  </motion.div>
);

export const PlatformMetricsCards: React.FC<PlatformMetricsCardsProps> = ({
  activeFirms,
  suspendedFirms,
  pendingSubscriptions,
  platformRevenue,
  portalTotal,
  portalFailed,
  portalTop,
  onMetricClick,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
      <Metric
        label="Active Firms"
        value={String(activeFirms)}
        icon={Building2}
        tone="text-emerald-400"
        onClick={() => onMetricClick('active')}
        subtitle="Click for details"
      />
      <Metric
        label="Suspended Firms"
        value={String(suspendedFirms)}
        icon={ShieldAlert}
        tone="text-red-400"
        onClick={() => onMetricClick('suspended')}
        subtitle="Click for details"
      />
      <Metric
        label="Pending Subscriptions"
        value={String(pendingSubscriptions)}
        icon={Clock}
        tone="text-amber-400"
        onClick={() => onMetricClick('pending')}
        subtitle="Click for details"
      />
      <Metric
        label="Active SaaS Revenue"
        value={`Rs ${platformRevenue.toLocaleString()}`}
        icon={TrendingUp}
        onClick={() => onMetricClick('revenue')}
        subtitle="Click for breakdown"
      />
      <Metric
        label="Portal Launches (30d)"
        value={String(portalTotal)}
        icon={Activity}
        tone="text-gold"
        subtitle={`Failed: ${portalFailed} ${portalTop ? `• Top: ${portalTop[0]} (${portalTop[1]})` : ''}`}
      />
    </div>
  );
};
