import React from 'react';
import { AlertTriangle, HeartPulse } from 'lucide-react';
import { PlatformMetricsCards } from './PlatformMetricsCards';
import { PortalActivityPanel } from './PortalActivityPanel';
import { ControlTowerSnapshot } from '../../services/godAdminPlatformSegmentationService';

interface ControlTowerModuleProps {
  snapshot: ControlTowerSnapshot;
  portalLoading: boolean;
  portalSummary: any;
  portalRecent: any[];
  portalTop: [string, number] | undefined;
  onMetricClick: (type: 'active' | 'suspended' | 'pending' | 'revenue') => void;
}

export const ControlTowerModule: React.FC<ControlTowerModuleProps> = ({
  snapshot,
  portalLoading,
  portalSummary,
  portalRecent,
  portalTop,
  onMetricClick,
}) => {
  const healthTone =
    snapshot.orchestrationHealth === 'healthy'
      ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
      : snapshot.orchestrationHealth === 'watch'
      ? 'text-amber-300 border-amber-500/20 bg-amber-500/10'
      : 'text-red-400 border-red-500/20 bg-red-500/10';

  return (
    <div className="space-y-6">
      <PlatformMetricsCards
        activeFirms={snapshot.activeFirms}
        suspendedFirms={snapshot.suspendedFirms}
        pendingSubscriptions={snapshot.pendingSubscriptions}
        platformRevenue={snapshot.activeRevenue}
        portalTotal={portalSummary?.total ?? 0}
        portalFailed={portalSummary?.failed ?? 0}
        portalTop={portalTop}
        onMetricClick={onMetricClick}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-5 rounded-2xl border ${healthTone}`}>
          <div className="flex items-center gap-2 mb-2">
            <HeartPulse className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wider">Orchestration Health</p>
          </div>
          <p className="text-lg font-bold capitalize">{snapshot.orchestrationHealth}</p>
          <p className="text-xs mt-1 opacity-80">Critical platform alerts (7d): {snapshot.criticalAlerts}</p>
        </div>
        <div className="p-5 rounded-2xl border border-slate-800 bg-matte-black-light">
          <div className="flex items-center gap-2 mb-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wider">Critical Platform Alerts</p>
          </div>
          <p className="text-2xl font-bold text-white">{snapshot.criticalAlerts}</p>
          <p className="text-xs text-slate-500 mt-1">Governance-impacting warning/critical events in the last 7 days.</p>
        </div>
      </div>

      {portalSummary && (
        <PortalActivityPanel loading={portalLoading} summary={portalSummary} recent={portalRecent} />
      )}
    </div>
  );
};
