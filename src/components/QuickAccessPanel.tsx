import React, { useMemo, useState } from 'react';
import { Pin, Clock3, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { QuickAccessPin } from '../services/workspacePreferencesService';

interface QuickAccessPanelProps {
  pins: QuickAccessPin[];
  recentNavigation: string[];
  recentSearches: string[];
  onOpenTarget: (target: string) => void;
}

export const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ pins, recentNavigation, recentSearches, onOpenTarget }) => {
  const [collapsed, setCollapsed] = useState(true);
  const summary = useMemo(() => `${pins.length} pinned`, [pins.length]);

  if (pins.length === 0 && recentNavigation.length === 0 && recentSearches.length === 0) return null;

  return (
    <div className="border-b border-slate-800 bg-matte-black-light/30 px-5 py-1.5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <span className="font-bold uppercase tracking-wider">Quick Access</span>
          <span className="text-slate-500">{summary}</span>
        </button>
      </div>

      {collapsed && pins.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {pins.slice(0, 4).map((pin) => (
            <button
              key={pin.id}
              onClick={() => onOpenTarget(pin.target)}
              className="rounded-md border border-slate-800 px-2 py-0.5 text-[11px] text-slate-400 hover:border-gold/40 hover:text-white"
              title={pin.subtitle || pin.label}
            >
              {pin.label}
            </button>
          ))}
        </div>
      )}

      {!collapsed && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {pins.length > 0 && (
            <>
              <span className="inline-flex items-center gap-1 text-slate-500"><Pin className="h-3 w-3" />Pinned</span>
              {pins.slice(0, 8).map((pin) => (
                <button
                  key={pin.id}
                  onClick={() => onOpenTarget(pin.target)}
                  className="rounded-lg border border-slate-700 px-2 py-1 text-slate-300 hover:border-gold/40 hover:text-white"
                  title={pin.subtitle || pin.label}
                >
                  {pin.label}
                </button>
              ))}
            </>
          )}

          {recentNavigation.length > 0 && (
            <>
              <span className="ml-2 inline-flex items-center gap-1 text-slate-500"><Clock3 className="h-3 w-3" />Recent</span>
              {recentNavigation.slice(0, 3).map((item) => (
                <span key={item} className="rounded-lg border border-slate-800 px-2 py-1 text-slate-500">{item}</span>
              ))}
            </>
          )}

          {recentSearches.length > 0 && (
            <>
              <span className="ml-2 inline-flex items-center gap-1 text-slate-500"><Search className="h-3 w-3" />Searches</span>
              {recentSearches.slice(0, 2).map((item) => (
                <span key={item} className="rounded-lg border border-slate-800 px-2 py-1 text-slate-500">{item}</span>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
