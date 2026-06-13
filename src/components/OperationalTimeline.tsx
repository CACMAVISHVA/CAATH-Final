import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { EnterpriseActivity } from '../services/observabilityService';
import { Activity } from 'lucide-react';
import { getOperationalTimelineSnapshot, OperationalTimelineSnapshot } from '../services/operationalCollaborationService';
import { aiOperationsOrchestrator, AIOperationalTimelineEvent } from '../domains/ai-operations';
import { predictiveOperationsOrchestrator, PredictiveTimelineEvent } from '../domains/predictive-operations';

const EVENT_TYPES = ['task', 'reassignment', 'escalation', 'approval', 'gst', 'notice', 'automation', 'security', 'discussion', 'operational_telemetry', 'billing', 'payroll', 'document'];

const OperationalTimeline: React.FC = () => {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<OperationalTimelineSnapshot | null>(null);
  const [items, setItems] = useState<EnterpriseActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [aiTimeline, setAiTimeline] = useState<AIOperationalTimelineEvent[]>([]);
  const [predictiveTimeline, setPredictiveTimeline] = useState<PredictiveTimelineEvent[]>([]);

  const load = async () => {
    if (!user?.firmId) return;
    setLoading(true);
    try {
      const data = await getOperationalTimelineSnapshot(user, 80);
      setSnapshot(data);
      setItems(filter ? data.items.filter((activity) => activity.event_type === filter) : data.items);
      const aiEvents = await aiOperationsOrchestrator.getOperationalIntelligenceTimeline(user);
      setAiTimeline(aiEvents);
      const predictiveEvents = await predictiveOperationsOrchestrator.getPredictiveTimeline(user);
      setPredictiveTimeline(predictiveEvents);
    } catch (err) {
      console.error('Failed to load activities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.firmId, filter]);

  const filtered = items.filter((it) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return JSON.stringify(it).toLowerCase().includes(s);
  });

  return (
    <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Operational Timeline</h3>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-matte-black border border-slate-800 text-sm rounded px-2 py-1">
            <option value="">All</option>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-matte-black border border-slate-800 rounded px-2 py-1 text-sm" />
        </div>
      </div>

      {snapshot && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-400">Open Communication Chains</p>
            <p className="text-2xl font-bold text-amber-300">{snapshot.intelligence.unresolvedCommunicationChains}</p>
          </div>
          <div className="p-3 bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-400">Stalled Approval Responses</p>
            <p className="text-2xl font-bold text-red-300">{snapshot.intelligence.stalledApprovalsDueToMissingResponse}</p>
          </div>
          <div className="p-3 bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-400">Dependency Discussions</p>
            <p className="text-2xl font-bold text-white">{snapshot.intelligence.operationalDependencyDiscussions}</p>
          </div>
          <div className="p-3 bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-400">Escalation Conversations</p>
            <p className="text-2xl font-bold text-gold">{snapshot.intelligence.unresolvedEscalationConversations}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center text-slate-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-6 text-center text-slate-500">No activity found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((it) => (
            <div key={it.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-matte-black transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-900/60 border border-slate-800 flex items-center justify-center">
                <Activity className="w-4 h-4 text-gold" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white font-bold">{it.actor_name || 'System'}</div>
                  <div className="text-xs text-slate-500">{new Date(it.created_at).toLocaleString()}</div>
                </div>
                <div className="text-sm text-slate-300 mt-1 truncate">
                  {it.event_type} {it.event_subtype ? `· ${it.event_subtype}` : ''} - {it.details && typeof it.details === 'object' ? JSON.stringify(it.details) : it.details}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {aiTimeline.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI Intelligence Timeline</p>
          {aiTimeline.map((event) => (
            <div key={event.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950/50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white">{event.title}</p>
                <p className="text-[11px] text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</p>
              </div>
              <p className="text-xs text-slate-400 mt-1">{event.detail}</p>
            </div>
          ))}
        </div>
      )}
      {predictiveTimeline.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Predictive Risk Timeline</p>
          {predictiveTimeline.map((event) => (
            <div key={event.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950/50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gold">{event.title}</p>
                <p className="text-[11px] text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</p>
              </div>
              <p className="text-xs text-slate-400 mt-1">{event.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OperationalTimeline;
