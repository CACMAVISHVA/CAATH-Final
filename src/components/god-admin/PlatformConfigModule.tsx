import React from 'react';
import { Settings, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react';
import { PlatformConfigSnapshot } from '../../services/godAdminPlatformSegmentationService';

interface PlatformConfigModuleProps {
  snapshot: PlatformConfigSnapshot;
}

export const PlatformConfigModule: React.FC<PlatformConfigModuleProps> = ({ snapshot }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <div className="p-5 bg-matte-black-light rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <Settings className="w-5 h-5 text-gold" />
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Active Plans</p>
        </div>
        <p className="text-2xl font-bold text-white">{snapshot.activePlans}</p>
      </div>
      <div className="p-5 bg-matte-black-light rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <SlidersHorizontal className="w-5 h-5 text-amber-300" />
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Pending Entitlements</p>
        </div>
        <p className="text-2xl font-bold text-white">{snapshot.pendingEntitlements}</p>
      </div>
      <div className="p-5 bg-matte-black-light rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Governance Events (7d)</p>
        </div>
        <p className="text-2xl font-bold text-white">{snapshot.governanceEvents7d}</p>
      </div>
      <div className="p-5 bg-matte-black-light rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Feature Activation</p>
        </div>
        <p className="text-2xl font-bold text-white">{snapshot.featureActivationRate}%</p>
      </div>
    </div>

    <div className="p-5 bg-matte-black-light rounded-2xl border border-slate-800">
      <h3 className="text-sm font-bold text-white mb-2">Platform Governance Domain</h3>
      <p className="text-sm text-slate-400">
        This module is dedicated to entitlement controls, plan governance, feature activation posture, and platform-wide policy configuration context.
      </p>
    </div>
  </div>
);
