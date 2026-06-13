import React from 'react';
import { AlertTriangle, Bot, Gauge, Lightbulb } from 'lucide-react';
import { AIOpsDashboardIntelligence } from '../domains/ai-operations';

export const AIOperationalInsightsPanel: React.FC<{ intelligence: AIOpsDashboardIntelligence | null; loading: boolean }> = ({ intelligence, loading }) => {
  if (loading) {
    return <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-5 text-sm text-slate-500">Loading AI operational intelligence...</div>;
  }
  if (!intelligence) {
    return <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-5 text-sm text-slate-500">AI operational intelligence unavailable.</div>;
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-gold" />
        <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">AI Operational Intelligence</h3>
      </div>
      <p className="text-sm text-slate-300">{intelligence.summary}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
          <p className="text-xs text-slate-500">Efficiency</p>
          <p className="text-xl font-bold text-white flex items-center gap-1"><Gauge className="w-4 h-4 text-emerald-300" />{intelligence.optimization.efficiencyScore}</p>
        </div>
        <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
          <p className="text-xs text-slate-500">Bottleneck Risk</p>
          <p className="text-xl font-bold text-white">{intelligence.optimization.bottleneckRisk}</p>
        </div>
        <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
          <p className="text-xs text-slate-500">Escalation Pressure</p>
          <p className="text-xl font-bold text-white">{intelligence.optimization.escalationPressure}</p>
        </div>
        <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
          <p className="text-xs text-slate-500">Delay Prediction</p>
          <p className="text-xl font-bold text-white">{intelligence.optimization.delayPrediction}</p>
        </div>
      </div>
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">Compliance Narrative</p>
        <p className="text-sm text-slate-300">{intelligence.complianceNarrative.narrative}</p>
        <p className="text-[11px] text-slate-500 mt-2">{intelligence.complianceNarrative.explainabilityNote}</p>
      </div>
      <div className="space-y-2">
        {intelligence.recommendations.map((item) => (
          <div key={item.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/60">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              {item.priority === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <Lightbulb className="w-4 h-4 text-gold" />}
              {item.title}
            </p>
            <p className="text-xs text-slate-400 mt-1">{item.summary}</p>
            <p className="text-xs text-gold mt-1">{item.recommendedAction}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
