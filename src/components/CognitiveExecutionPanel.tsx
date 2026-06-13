import React from 'react';
import { Radar, Route, ShieldAlert } from 'lucide-react';
import { CognitiveCommandCenterViewModel } from '../domains/cognitive-command-center';

interface CognitiveExecutionPanelProps {
  viewModel: CognitiveCommandCenterViewModel;
}

const toneColor: Record<'stable' | 'watch' | 'critical', string> = {
  stable: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  watch: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  critical: 'text-red-300 border-red-500/30 bg-red-500/10',
};

export const CognitiveExecutionPanel: React.FC<CognitiveExecutionPanelProps> = ({ viewModel }) => {
  return (
    <section className="rounded-2xl border border-slate-800 bg-matte-black-light p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Enterprise Cognitive Execution</p>
          <h3 className="mt-1 text-xl font-bold text-white">Strategic workflow command center</h3>
        </div>
        <div className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300">
          Objective Execution {viewModel.objectiveTrackingScore}%
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {viewModel.panels.map((panel) => (
          <div key={panel.id} className={`rounded-xl border p-3 ${toneColor[panel.tone]}`}>
            <p className="text-[11px] uppercase tracking-wider">{panel.title}</p>
            <p className="mt-1 text-2xl font-bold text-white">{panel.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
            <Radar className="h-4 w-4 text-gold" />
            Cognitive Routing Heatmap
          </div>
          <div className="mt-3 space-y-3">
            {viewModel.heatmap.map((cell) => (
              <div key={cell.lane}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{cell.lane}</span>
                  <span>{cell.intensity}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className={`h-2 rounded-full ${
                      cell.status === 'critical' ? 'bg-red-500' : cell.status === 'watch' ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${cell.intensity}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
            <Route className="h-4 w-4 text-gold" />
            Strategic Actions
          </div>
          <div className="mt-3 space-y-2">
            {viewModel.topActions.map((action) => (
              <div key={action.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <p className="text-sm font-semibold text-white">{action.title}</p>
                <p className="mt-1 text-[11px] text-slate-400 uppercase">{action.priority} priority</p>
                <p className="text-[11px] text-slate-500">
                  {Math.round(action.confidence * 100)}% confidence • {action.governanceStatus}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          Cognitive Operational Timeline
        </div>
        <div className="mt-2 space-y-1.5">
          {viewModel.timeline.slice(0, 4).map((item) => (
            <p key={item.id} className="text-xs text-slate-300">{item.summary}</p>
          ))}
        </div>
      </div>
    </section>
  );
};
