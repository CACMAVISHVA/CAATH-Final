import React from 'react';
import { GitPullRequestArrow, RadioTower, Users } from 'lucide-react';
import { EOXButton, WorkspacePanel } from '../../design-system';
import { CommandAction } from '../../services/commandPaletteService';

export const CollaborationSnapshot: React.FC<{
  onNavigate: (tab: string) => void;
  onCommandAction: (action: CommandAction) => void;
}> = ({ onNavigate, onCommandAction }) => (
  <WorkspacePanel title="Collaborative Operations" meta="Presence, handoffs, ownership and shared awareness" live>
    <div className="grid gap-2">
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-slate-800 bg-matte-black p-2">
          <Users className="mb-1 h-4 w-4 text-emerald-300" />
          <p className="text-lg font-bold text-white">4</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Operators</p>
        </div>
        <div className="border border-slate-800 bg-matte-black p-2">
          <GitPullRequestArrow className="mb-1 h-4 w-4 text-gold" />
          <p className="text-lg font-bold text-white">3</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Handoffs</p>
        </div>
        <div className="border border-slate-800 bg-matte-black p-2">
          <RadioTower className="mb-1 h-4 w-4 text-sky-300" />
          <p className="text-lg font-bold text-white">7</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Signals</p>
        </div>
      </div>
      <div className="flex gap-2">
        <EOXButton variant="primary" onClick={() => onNavigate('collaboration')}>Open team room</EOXButton>
        <EOXButton onClick={() => onCommandAction('create-handoff')}>Create handoff</EOXButton>
      </div>
    </div>
  </WorkspacePanel>
);

