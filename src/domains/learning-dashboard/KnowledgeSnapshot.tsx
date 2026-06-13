import React from 'react';
import { BrainCircuit, GitBranch } from 'lucide-react';
import { EOXButton, WorkspacePanel } from '../../design-system';

export const KnowledgeSnapshot: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => (
  <WorkspacePanel title="Organizational Memory" meta="Learning, playbooks and institutional guidance" live>
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-slate-800 bg-matte-black p-2">
          <BrainCircuit className="mb-1 h-4 w-4 text-gold" />
          <p className="text-lg font-bold text-white">3</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Memories</p>
        </div>
        <div className="border border-slate-800 bg-matte-black p-2">
          <GitBranch className="mb-1 h-4 w-4 text-emerald-300" />
          <p className="text-lg font-bold text-white">14</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Links</p>
        </div>
      </div>
      <EOXButton variant="primary" onClick={() => onNavigate('learning')}>Open learning</EOXButton>
    </div>
  </WorkspacePanel>
);

