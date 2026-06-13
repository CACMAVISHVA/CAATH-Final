import React from 'react';
import { BrainCircuit, ShieldCheck } from 'lucide-react';
import { EnterpriseCognitiveDashboardViewModel } from '../domains/cognitive-dashboard';

interface EnterpriseCognitiveDashboardPanelProps {
  viewModel: EnterpriseCognitiveDashboardViewModel;
}

const toneClass: Record<'stable' | 'watch' | 'critical', string> = {
  stable: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  watch: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
  critical: 'text-red-400 border-red-500/30 bg-red-500/10',
};

export const EnterpriseCognitiveDashboardPanel: React.FC<EnterpriseCognitiveDashboardPanelProps> = ({ viewModel }) => {
  return (
    <section className="rounded-3xl border border-slate-800 bg-matte-black-light p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Enterprise Cognitive Operations</p>
          <h3 className="mt-2 text-2xl font-bold text-white">Executive decision intelligence</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs uppercase tracking-widest text-slate-300">
          <BrainCircuit className="h-4 w-4 text-gold" />
          Cognitive runtime active
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {viewModel.panels.map((panel) => (
          <div key={panel.id} className={`rounded-2xl border px-4 py-4 ${toneClass[panel.tone]}`}>
            <p className="text-[11px] uppercase tracking-widest opacity-80">{panel.title}</p>
            <p className="mt-2 text-2xl font-bold text-white">{panel.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">Strategic Heatmap</p>
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

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-slate-500">Governance Oversight</p>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-white">{viewModel.governancePassRate}%</p>
          <p className="mt-1 text-xs text-slate-400">Recommendation permission and explainability compliance.</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-xs uppercase tracking-widest text-slate-500">AI Strategic Recommendation Engine</p>
        <div className="mt-3 space-y-3">
          {viewModel.insights.slice(0, 3).map((insight) => (
            <div key={insight.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">{insight.recommendation}</p>
                <span className="text-[10px] uppercase tracking-widest text-gold">{insight.priority}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{insight.reasoning}</p>
              <p className="mt-2 text-[11px] text-slate-500">Confidence: {Math.round(insight.confidence * 100)}%</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
