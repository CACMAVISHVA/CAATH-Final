import React from 'react';
import { Activity, BarChart3, Bot, Database, HardDrive, Users } from 'lucide-react';
import { UsageMonitoringSnapshot } from '../../services/godAdminPlatformSegmentationService';
import { RuntimeHealthSnapshot } from '../../runtime/production';

interface UsageMonitoringModuleProps {
  snapshot: UsageMonitoringSnapshot;
  runtimeHealth?: RuntimeHealthSnapshot;
}

const Tile: React.FC<{ label: string; value: string; icon: React.ElementType; sub?: string }> = ({ label, value, icon: Icon, sub }) => (
  <div className="p-5 bg-matte-black-light rounded-2xl border border-slate-800">
    <div className="flex items-center justify-between mb-3">
      <Icon className="w-5 h-5 text-gold" />
      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{label}</p>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

export const UsageMonitoringModule: React.FC<UsageMonitoringModuleProps> = ({ snapshot, runtimeHealth }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <Tile label="Workflow Volume (30d)" value={snapshot.workflowVolume30d.toLocaleString()} icon={BarChart3} />
      <Tile label="Telemetry Load (30d)" value={snapshot.telemetryLoad30d.toLocaleString()} icon={Activity} />
      <Tile label="Automation Usage (30d)" value={snapshot.automationUsage30d.toLocaleString()} icon={Bot} />
      <Tile label="Connector/API Signals" value={snapshot.connectorEvents30d.toLocaleString()} icon={Database} sub="Integration-class events" />
      <Tile label="Active Users" value={snapshot.activeUsersEstimate.toLocaleString()} icon={Users} />
      <Tile label="Storage Usage" value={`${snapshot.storageUsageEstimateMb.toLocaleString()} MB`} icon={HardDrive} sub="Metadata-level estimate" />
      <Tile label="Runtime Queue Pending" value={String(runtimeHealth?.queue.pending ?? 0)} icon={Database} sub={`Dead-letter: ${runtimeHealth?.queue.deadLetters ?? 0}`} />
      <Tile label="Realtime Streams" value={String(runtimeHealth?.realtime.activeNotificationStreams ?? 0)} icon={Activity} />
      <Tile label="Runtime Notifications" value={String(runtimeHealth?.notifications.dispatched ?? 0)} icon={Bot} sub={`Failed: ${runtimeHealth?.notifications.failed ?? 0}`} />
    </div>
  </div>
);
