import React from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { EOXButton, WorkspacePanel } from '../../design-system';

export const GovernanceSnapshot: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => (
  <WorkspacePanel title="Governance Trust" meta="Permissions, auditability and accountability" live>
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-slate-800 bg-matte-black p-2">
          <ShieldCheck className="mb-1 h-4 w-4 text-emerald-300" />
          <p className="text-lg font-bold text-white">91</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Trust</p>
        </div>
        <div className="border border-slate-800 bg-matte-black p-2">
          <LockKeyhole className="mb-1 h-4 w-4 text-gold" />
          <p className="text-lg font-bold text-white">6</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Gates</p>
        </div>
      </div>
      <EOXButton variant="primary" onClick={() => onNavigate('governance')}>Open governance</EOXButton>
    </div>
  </WorkspacePanel>
);

