import React from 'react';
import {
  BrainCircuit,
  GitBranch,
  Layers3,
  Lightbulb,
  Network,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { ActivityIndicator, EOXButton, EOXMetric, TimelineList, WorkspacePanel } from '../../design-system';
import { cn } from '../../lib/utils';
import { CommandAction } from '../../services/commandPaletteService';
import {
  knowledgeGraph,
  learningSignals,
  memoryGovernanceSignals,
  memoryRecords,
  playbooks,
} from '../organizational-memory';

interface LearningDashboardProps {
  onNavigate: (tab: string) => void;
  onCommandAction: (action: CommandAction) => void;
}

export const LearningDashboard: React.FC<LearningDashboardProps> = ({ onNavigate, onCommandAction }) => {
  const graphLinks = knowledgeGraph.reduce((count, node) => count + node.relatedTo.length, 0);

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-4 text-white">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Enterprise Organizational Intelligence</p>
          <h1 className="text-xl font-bold text-white">Learning Dashboard</h1>
        </div>
        <ActivityIndicator label="Memory governed" tone="live" />
        <EOXButton onClick={() => onNavigate('workspace')}><Workflow className="h-4 w-4" />Live workspace</EOXButton>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <EOXMetric label="Memory Records" value={String(memoryRecords.length)} detail="Workflow-linked institutional memories" tone="blue" />
        <EOXMetric label="Learning Signals" value={String(learningSignals.length)} detail="Recurring operational patterns" tone="gold" />
        <EOXMetric label="Graph Links" value={String(graphLinks)} detail="Cross-domain relationships" tone="green" />
        <EOXMetric label="Playbooks" value={String(playbooks.length)} detail="Guided execution templates" tone="blue" />
        <EOXMetric label="Maturity" value="87" detail="Organizational intelligence score" tone="green" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(340px,0.9fr)_minmax(440px,1.2fr)_340px]">
        <div className="space-y-4">
          <WorkspacePanel title="Organizational Memory Core" meta="Institutional memory, outcome lineage and operational impact" live>
            <div className="space-y-3">
              {memoryRecords.map((record) => (
                <div key={record.id} className="border border-slate-800 bg-matte-black p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{record.title}</p>
                    <span className="text-xs font-bold text-gold">{record.confidence}%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{record.sourceWorkflow}</p>
                  <p className="mt-2 text-xs text-slate-400">{record.operationalContext}</p>
                  <p className="mt-2 text-xs text-emerald-300">{record.organizationalImpact}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-slate-600">Lineage: {record.resolutionLineage.join(' -> ')}</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Operational Learning Engine" meta="Recurring issue learning and effectiveness tracking" live>
            <div className="space-y-2">
              {learningSignals.map((signal) => (
                <div key={signal.id} className="border border-slate-800 bg-matte-black p-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-gold" />
                    <p className="text-sm font-bold text-white">{signal.pattern}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{signal.improvement}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">
                    <span className="border border-slate-800 px-2 py-1 text-slate-400">{signal.recurrence} repeats</span>
                    <span className="border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-300">{signal.effectiveness}% effective</span>
                    <span className={cn('border px-2 py-1', signal.staleRisk === 'high' ? 'border-red-500/20 text-red-300' : signal.staleRisk === 'medium' ? 'border-gold/20 text-gold' : 'border-slate-800 text-slate-400')}>{signal.staleRisk} stale risk</span>
                  </div>
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </div>

        <div className="space-y-4">
          <WorkspacePanel title="Enterprise Knowledge Graph" meta="Workflow, client, escalation and governance relationships" live>
            <div className="grid gap-2 sm:grid-cols-2">
              {knowledgeGraph.map((node) => (
                <div key={node.id} className="border border-slate-800 bg-matte-black p-3">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-gold" />
                    <p className="truncate text-sm font-bold text-white">{node.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{node.type} | {node.relatedTo.length} links</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Workflow Playbook System" meta="Operational templates and best-practice execution" live>
            <div className="space-y-3">
              {playbooks.map((playbook) => (
                <div key={playbook.id} className="border border-slate-800 bg-matte-black p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{playbook.title}</p>
                    <span className="text-xs font-bold text-emerald-300">{playbook.confidence}%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{playbook.scope}</p>
                  <div className="mt-3 space-y-2">
                    {playbook.steps.map((step) => (
                      <div key={step.id} className="border border-slate-800 bg-matte-black-light p-2">
                        <p className="text-xs font-bold text-white">{step.title}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{step.ownerRole} | {step.checkpoint}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Explainable Learning Timeline" meta="Source workflows, lineage, confidence and impact" live>
            <TimelineList
              events={memoryRecords.map((record) => ({
                id: record.id,
                title: record.title,
                detail: `${record.sourceWorkflow} | ${record.organizationalImpact}`,
                time: record.lastValidated,
                tone: record.confidence > 88 ? 'green' : record.confidence > 84 ? 'blue' : 'gold',
              }))}
            />
          </WorkspacePanel>
        </div>

        <aside className="space-y-4">
          <WorkspacePanel title="Institutional Guidance" meta="Contextual recommendations and resolution memory" live>
            <div className="space-y-2">
              {memoryRecords.slice(0, 3).map((record) => (
                <button key={record.id} onClick={() => onCommandAction('open-playbooks')} className="w-full border border-slate-800 bg-matte-black p-2 text-left hover:border-gold/40">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-gold" />
                    <p className="text-xs font-bold text-white">{record.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{record.organizationalImpact}</p>
                </button>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Knowledge-Aware Collaboration" meta="Workflow notes, overlays and shared learning" live>
            <div className="space-y-2">
              {['Attach GST variance pattern to team room', 'Suggest notice handoff continuity note', 'Share clean approval checklist with reviewers'].map((item) => (
                <div key={item} className="border border-slate-800 bg-matte-black p-2">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-gold" />
                    <p className="text-xs text-slate-300">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Knowledge Governance" meta="Aging, pruning, ownership and confidence controls" live>
            <div className="space-y-2">
              {memoryGovernanceSignals.map((signal) => (
                <div key={signal.id} className="border border-slate-800 bg-matte-black p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-white">{signal.title}</p>
                    <span className={cn('text-[10px] font-bold uppercase', signal.status === 'healthy' ? 'text-emerald-300' : signal.status === 'review' ? 'text-gold' : 'text-red-300')}>{signal.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{signal.control}</p>
                </div>
              ))}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Organizational Intelligence Analytics" meta="Learning metrics and maturity indicators" live>
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-slate-800 bg-matte-black p-2">
                <Layers3 className="mb-1 h-4 w-4 text-gold" />
                <p className="text-lg font-bold text-white">18%</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Issue reduction</p>
              </div>
              <div className="border border-slate-800 bg-matte-black p-2">
                <ShieldCheck className="mb-1 h-4 w-4 text-emerald-300" />
                <p className="text-lg font-bold text-white">82%</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Knowledge use</p>
              </div>
              <div className="border border-slate-800 bg-matte-black p-2">
                <GitBranch className="mb-1 h-4 w-4 text-sky-300" />
                <p className="text-lg font-bold text-white">14</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Graph links</p>
              </div>
              <div className="border border-slate-800 bg-matte-black p-2">
                <BrainCircuit className="mb-1 h-4 w-4 text-gold" />
                <p className="text-lg font-bold text-white">87</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Maturity</p>
              </div>
            </div>
          </WorkspacePanel>
        </aside>
      </div>
    </div>
  );
};

export default LearningDashboard;

