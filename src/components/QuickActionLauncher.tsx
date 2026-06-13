import React from 'react';
import { Command, X, Zap } from 'lucide-react';

interface QuickActionLauncherProps {
  onOpenPalette: () => void;
  onAction: (actionId: string) => void;
}

export const QuickActionLauncher: React.FC<QuickActionLauncherProps> = ({ onOpenPalette, onAction }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {isExpanded && (
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-matte-black-light/95 p-2 shadow-2xl">
          <button onClick={() => { onAction('create-task'); setIsExpanded(false); }} className="px-3 py-2 text-xs font-bold text-slate-200 hover:text-gold text-left">+ Create Task</button>
          <button onClick={() => { onAction('create-client'); setIsExpanded(false); }} className="px-3 py-2 text-xs font-bold text-slate-200 hover:text-gold text-left">+ Create Client</button>
          <button onClick={() => { onAction('open-approvals'); setIsExpanded(false); }} className="px-3 py-2 text-xs font-bold text-slate-200 hover:text-gold text-left">Open Approvals</button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenPalette}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-matte-black px-3 py-2 text-xs font-bold text-slate-300 hover:border-gold/40 hover:text-white"
        >
          <Command className="h-3.5 w-3.5" /> Search (Ctrl+K)
        </button>
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="h-12 w-12 rounded-full bg-gold text-matte-black shadow-xl flex items-center justify-center"
          aria-label="Open Quick Actions"
        >
          {isExpanded ? <X className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
};
