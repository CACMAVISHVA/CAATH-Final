import React from 'react';
import { BrainCircuit, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { ComplianceAIInsight } from '../services/complianceAIService';

export const AIInsightPanel: React.FC<{ insights: ComplianceAIInsight[] }> = ({ insights }) => (
  <div className="p-4 bg-matte-black rounded-xl border border-slate-800">
    <div className="mb-4 flex items-center gap-2">
      <BrainCircuit className="h-4 w-4 text-gold" />
      <h3 className="text-sm font-bold text-white">AI Compliance Assistant</h3>
    </div>
    <div className="space-y-3">
      {insights.map((insight) => (
        <div key={insight.id} className="border border-slate-800 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {insight.severity === 'critical' ? (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              ) : (
                <Sparkles className="h-4 w-4 text-gold" />
              )}
              <p className="text-sm font-bold text-white">{insight.title}</p>
            </div>
            <span className={cn(
              'px-2 py-1 text-[10px] font-bold uppercase',
              insight.severity === 'critical' && 'bg-red-500/10 text-red-400',
              insight.severity === 'warning' && 'bg-amber-500/10 text-amber-400',
              insight.severity === 'info' && 'bg-blue-500/10 text-blue-300'
            )}>
              {insight.severity}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">{insight.detail}</p>
          <p className="mt-2 text-xs text-gold">{insight.recommendation}</p>
        </div>
      ))}
    </div>
  </div>
);
