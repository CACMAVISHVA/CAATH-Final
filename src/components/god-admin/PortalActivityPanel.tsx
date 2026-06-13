import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { PortalActivitySummary } from '../../hooks/usePortalActivity';

interface PortalActivityPanelProps {
  loading: boolean;
  summary: PortalActivitySummary | null;
  recent: Array<Record<string, unknown>>;
}

export const PortalActivityPanel: React.FC<PortalActivityPanelProps> = ({ loading, summary, recent }) => {
  return (
    <div className="p-6 bg-matte-black-light rounded-3xl border border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gold/10 text-gold flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Portal Activity</p>
            <p className="text-xs text-slate-500">30-day platform launches and portal events</p>
          </div>
        </div>
        <span className="text-xs uppercase tracking-[0.24em] text-slate-500">{loading ? 'Refreshing' : 'Live'}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total', value: summary?.total ?? 0, icon: RefreshCw },
          { label: 'Failed', value: summary?.failed ?? 0, icon: AlertTriangle },
          { label: 'Portals', value: Object.keys(summary?.byPortal || {}).length, icon: CheckCircle2 },
        ].map((item) => (
          <div key={item.label} className="p-4 bg-matte-black border border-slate-800 rounded-3xl text-center">
            <item.icon className="w-4 h-4 text-slate-400 mb-2" />
            <p className="text-3xl font-bold text-white">{loading ? '–' : item.value}</p>
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {(recent.length > 0 ? recent.slice(0, 4) : [{ action: 'No activity yet', created_at: '' }]).map((item, index) => (
          <div key={`${item.action}-${index}`} className="p-4 rounded-3xl bg-slate-950/40 border border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-white">{String(item.action || 'No activity')}</p>
              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{item.success === false ? 'Failed' : 'Success'}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">{String(item.user_name || item.client_id || '')} • {String(item.created_at || '')}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
