import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import OperationalTimeline from './OperationalTimeline';
import { getDashboardMetrics } from '../services/dashboardService';
import { getOperationalHealthSummary, OperationalHealthSummary } from '../services/operationalIntelligenceService';
import { getEnterpriseRelationshipSnapshot, RelationshipEngineSnapshot } from '../services/enterpriseRelationshipEngine';
import { getRoleAwareCommandCenterSnapshot, RoleCommandCenterSnapshot } from '../services/roleAwareCommandCenterService';
import { EnterpriseFinancialIntelligenceSnapshot, getEnterpriseFinancialIntelligenceSnapshot } from '../services/enterpriseFinancialIntelligenceService';
import { EnterpriseOrchestrationSnapshot, getEnterpriseOrchestrationSnapshot } from '../services/enterpriseOrchestrationService';
import { IntegrationHealthSnapshot, getIntegrationHealthSnapshot } from '../services/enterpriseIntegrationOrchestrationService';
import { ExecutiveDecisionSnapshot, getExecutiveDecisionSnapshot } from '../services/executiveDecisionIntelligenceService';
import { operationsCenterOrchestrator, OperationsCenterSnapshot, GovernedOperationalAction } from '../domains/operations-center';
import { predictiveOperationsCenterOrchestrator, PredictiveOperationsCenterSnapshot } from '../domains/predictive-operations-center';
import { predictiveOperationsOrchestrator } from '../domains/predictive-operations';

const warnOptionalPanelModule = (label: string, reason: unknown) => {
  console.warn(`[AUTH] Optional operational panel module unavailable: ${label}`, reason);
};

const OperationalPanel: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [intelligence, setIntelligence] = useState<OperationalHealthSummary | null>(null);
  const [relationships, setRelationships] = useState<RelationshipEngineSnapshot | null>(null);
  const [commandCenter, setCommandCenter] = useState<RoleCommandCenterSnapshot | null>(null);
  const [financial, setFinancial] = useState<EnterpriseFinancialIntelligenceSnapshot | null>(null);
  const [orchestration, setOrchestration] = useState<EnterpriseOrchestrationSnapshot | null>(null);
  const [integration, setIntegration] = useState<IntegrationHealthSnapshot | null>(null);
  const [executiveSynthesis, setExecutiveSynthesis] = useState<ExecutiveDecisionSnapshot | null>(null);
  const [operationsCenter, setOperationsCenter] = useState<OperationsCenterSnapshot | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [predictiveCenter, setPredictiveCenter] = useState<PredictiveOperationsCenterSnapshot | null>(null);

  useEffect(() => {
    const firmId = user?.firmId;
    if (!firmId) return;

    (async () => {
      const [
        metricsResult,
        healthResult,
        relationshipsResult,
        commandResult,
        financialResult,
        orchestrationResult,
        integrationResult,
        executiveResult,
        opsCenterResult,
        predictiveResult,
      ] = await Promise.allSettled([
        getDashboardMetrics(firmId),
        getOperationalHealthSummary(firmId),
        getEnterpriseRelationshipSnapshot(firmId, user!),
        getRoleAwareCommandCenterSnapshot(user!),
        user?.role === 'SuperAdmin' ? getEnterpriseFinancialIntelligenceSnapshot(firmId, user!) : Promise.resolve(null),
        getEnterpriseOrchestrationSnapshot(user!),
        getIntegrationHealthSnapshot(user!),
        getExecutiveDecisionSnapshot(user!),
        operationsCenterOrchestrator.getSnapshot(user!),
        predictiveOperationsCenterOrchestrator.getSnapshot(user!),
      ] as const);

      if (metricsResult.status === 'fulfilled') setMetrics(metricsResult.value);
      else warnOptionalPanelModule('metrics', metricsResult.reason);
      if (healthResult.status === 'fulfilled') setIntelligence(healthResult.value);
      else warnOptionalPanelModule('operational health', healthResult.reason);
      if (relationshipsResult.status === 'fulfilled') setRelationships(relationshipsResult.value);
      else warnOptionalPanelModule('enterprise relationships', relationshipsResult.reason);
      if (commandResult.status === 'fulfilled') setCommandCenter(commandResult.value);
      else warnOptionalPanelModule('role-aware command center', commandResult.reason);
      if (financialResult.status === 'fulfilled') setFinancial(financialResult.value);
      else warnOptionalPanelModule('enterprise financial intelligence', financialResult.reason);
      if (orchestrationResult.status === 'fulfilled') setOrchestration(orchestrationResult.value);
      else warnOptionalPanelModule('enterprise orchestration', orchestrationResult.reason);
      if (integrationResult.status === 'fulfilled') setIntegration(integrationResult.value);
      else warnOptionalPanelModule('integration health', integrationResult.reason);
      if (executiveResult.status === 'fulfilled') setExecutiveSynthesis(executiveResult.value);
      else warnOptionalPanelModule('executive decision intelligence', executiveResult.reason);
      if (opsCenterResult.status === 'fulfilled') setOperationsCenter(opsCenterResult.value);
      else warnOptionalPanelModule('operations center', opsCenterResult.reason);
      if (predictiveResult.status === 'fulfilled') setPredictiveCenter(predictiveResult.value);
      else warnOptionalPanelModule('predictive operations center', predictiveResult.reason);
    })();
  }, [user?.firmId]);

  const runGovernedAction = async (action: GovernedOperationalAction, taskId?: string) => {
    if (!user || !taskId) return;
    setActionBusy(`${action}:${taskId}`);
    try {
      await operationsCenterOrchestrator.executeGovernedAction({
        user,
        action,
        targetTaskId: taskId,
        reason: 'Triggered from operations command center',
      });
      const refreshed = await operationsCenterOrchestrator.getSnapshot(user);
      setOperationsCenter(refreshed);
      const predictive = await predictiveOperationsCenterOrchestrator.getSnapshot(user);
      setPredictiveCenter(predictive);
    } catch (err) {
      console.error(err);
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {operationsCenter && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Enterprise Operations Command Center</h3>
              <p className="text-sm text-slate-500">Centralized operational intelligence with governed AI execution controls.</p>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
              SLA High Risk {operationsCenter.sla.highRisk}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Active Clients</p><p className="text-2xl font-bold text-white">{operationsCenter.executiveKpis?.activeClients ?? '-'}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Pending Workloads</p><p className="text-2xl font-bold text-amber-300">{operationsCenter.executiveKpis?.pendingWorkloads ?? '-'}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Escalation Alerts</p><p className="text-2xl font-bold text-red-300">{operationsCenter.executiveKpis?.escalationAlerts ?? '-'}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">AI Queue Size</p><p className="text-2xl font-bold text-gold">{operationsCenter.aiCenter?.taskQueue.length ?? '-'}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Workflow Health</p><p className="text-2xl font-bold text-emerald-300">{operationsCenter.operationalHealth?.workflowHealthScore ?? '-'}</p></div>
          </div>

          {operationsCenter.aiCenter?.taskQueue?.length ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {operationsCenter.aiCenter.taskQueue.slice(0, 4).map((item) => (
                <div key={item.taskId} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    <span className="text-[10px] uppercase text-gold">{item.recommendedAction}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{item.explanation}</p>
                  <div className="mt-2 flex gap-2 text-[11px]">
                    <span className="px-2 py-1 bg-slate-900 rounded text-slate-300">Urg {item.urgencyScore}</span>
                    <span className="px-2 py-1 bg-slate-900 rounded text-amber-300">SLA {item.slaBreachProbability}%</span>
                    <span className="px-2 py-1 bg-slate-900 rounded text-red-300">Esc {item.escalationScore}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['assign', 'escalate', 'review', 'remind', 'prioritize'] as GovernedOperationalAction[]).map((action) => (
                      <button
                        key={`${item.taskId}-${action}`}
                        onClick={() => runGovernedAction(action, item.taskId)}
                        disabled={actionBusy === `${action}:${item.taskId}`}
                        className="px-2 py-1 text-[10px] uppercase border border-slate-700 rounded text-slate-300 hover:border-gold/40 disabled:opacity-50"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Unified Operational Activity Stream</p>
            <div className="space-y-2">
              {(operationsCenter.unifiedActivityStream.events || []).slice(0, 4).map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                  <p className="text-xs text-white font-bold">{event.event_type} {event.event_subtype ? `· ${event.event_subtype}` : ''}</p>
                  <p className="text-[11px] text-slate-400">{new Date(event.created_at).toLocaleString()}</p>
                </div>
              ))}
              {(operationsCenter.unifiedActivityStream.aiEvents || []).slice(0, 2).map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                  <p className="text-xs text-gold font-bold">{event.title}</p>
                  <p className="text-[11px] text-slate-400">{event.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {predictiveCenter && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Predictive Operations Center</h3>
              <p className="text-sm text-slate-500">Explainable forecasting, risk windows, and simulation-based operational planning.</p>
            </div>
            <button
              onClick={async () => {
                if (!user) return;
                await predictiveOperationsOrchestrator.dispatchPredictiveAlerts(user);
                const refreshed = await predictiveOperationsCenterOrchestrator.getSnapshot(user);
                setPredictiveCenter(refreshed);
              }}
              className="px-3 py-2 text-xs uppercase border border-slate-700 rounded text-slate-200 hover:border-gold/40"
            >
              Dispatch Predictive Alerts
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Completion</p><p className="text-2xl font-bold text-white">{predictiveCenter.predictive.workflowCompletionPrediction}%</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Delay Forecast</p><p className="text-2xl font-bold text-amber-300">{predictiveCenter.predictive.workflowDelayForecast}%</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Escalation Probability</p><p className="text-2xl font-bold text-red-300">{predictiveCenter.predictive.escalationProbability}%</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">SLA Breach Forecast</p><p className="text-2xl font-bold text-red-300">{predictiveCenter.predictive.slaBreachForecast}%</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Bottleneck Probability</p><p className="text-2xl font-bold text-gold">{predictiveCenter.predictive.bottleneckProbability}%</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Task Aging Risk</p><p className="text-2xl font-bold text-white">{predictiveCenter.predictive.taskAgingRisk}%</p></div>
          </div>
          <p className="mt-3 text-sm text-slate-300">{predictiveCenter.predictive.workloadForecastSummary}</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {predictiveCenter.predictive.explainablePredictions.map((prediction) => (
              <div key={prediction.id} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{prediction.title}</p>
                  <span className="text-[10px] uppercase text-gold">Conf {prediction.confidence}%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{prediction.probability}% probability • {prediction.window}</p>
                <div className="mt-2 space-y-1">
                  {prediction.reasoning.map((r, idx) => <p key={`${prediction.id}-${idx}`} className="text-[11px] text-slate-300">• {r}</p>)}
                </div>
                <p className="text-xs text-gold mt-2">{prediction.recommendedIntervention}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Simulation Preview</p>
            <p className="text-sm text-slate-300">Projected overdue: {predictiveCenter.simulationPreview.projectedOverdue} • Escalations: {predictiveCenter.simulationPreview.projectedEscalations} • SLA risk: {predictiveCenter.simulationPreview.projectedSlaRisk}%</p>
            <div className="mt-2 space-y-1">
              {predictiveCenter.simulationPreview.explanation.map((line, idx) => <p key={`sim-${idx}`} className="text-[11px] text-slate-400">{line}</p>)}
            </div>
          </div>
        </div>
      )}

      {commandCenter && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">{commandCenter.summary.headline}</h3>
              <p className="text-sm text-slate-500">{commandCenter.summary.executiveSummary}</p>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
              Priority {commandCenter.priorityScore} • {commandCenter.urgencyBand}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {commandCenter.keyMetrics.map((item) => (
              <div key={item.label} className="p-3 bg-slate-900/40 rounded-lg">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="text-2xl font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {commandCenter.alerts.slice(0, 6).map((alert) => (
              <div key={alert.id} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{alert.title}</p>
                  <span className={`text-[10px] uppercase font-bold ${
                    alert.severity === 'critical' ? 'text-red-400' : alert.severity === 'high' ? 'text-amber-300' : alert.severity === 'medium' ? 'text-blue-300' : 'text-slate-400'
                  }`}>{alert.severity}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{alert.summary}</p>
              </div>
            ))}
          </div>
          {commandCenter.recommendations.length > 0 && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Recommended Actions (Governance-Safe)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {commandCenter.recommendations.slice(0, 6).map((rec) => (
                  <div key={rec.id} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white">{rec.title}</p>
                      <span className={`text-[10px] uppercase font-bold ${
                        rec.priority === 'critical' ? 'text-red-400' : rec.priority === 'high' ? 'text-amber-300' : rec.priority === 'medium' ? 'text-blue-300' : 'text-slate-400'
                      }`}>{rec.priority}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{rec.rationale}</p>
                    <p className="text-xs text-gold mt-1">{rec.suggestedAction}</p>
                    <p className="text-[10px] text-slate-500 mt-2">
                      {rec.requiresApproval ? 'Approval Required' : 'Execution Owner Decision'} • {rec.governanceNote}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 space-y-1 text-xs text-slate-400">
            <p>{commandCenter.summary.governanceSnapshot}</p>
            <p>{commandCenter.summary.billingPressureSummary}</p>
            <p>{commandCenter.summary.escalationSummary}</p>
            <p>{commandCenter.summary.workflowHealthSummary}</p>
          </div>
        </div>
      )}

      {executiveSynthesis && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Executive Decision Intelligence</h3>
              <p className="text-sm text-slate-500">Grounded synthesis across workflow, compliance, approvals, and financial continuity.</p>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
              Severity {executiveSynthesis.operationalSeverityScore}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Workflow Heat</p><p className="text-2xl font-bold text-white">{executiveSynthesis.decisionHeat.workflow}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Approval Heat</p><p className="text-2xl font-bold text-amber-300">{executiveSynthesis.decisionHeat.approval}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Financial Heat</p><p className="text-2xl font-bold text-gold">{executiveSynthesis.decisionHeat.financial}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Compliance Heat</p><p className="text-2xl font-bold text-red-300">{executiveSynthesis.decisionHeat.compliance}</p></div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {executiveSynthesis.insights.map((insight) => (
              <div key={insight.id} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{insight.title}</p>
                  <span className={`text-[10px] uppercase font-bold ${
                    insight.severity === 'critical' ? 'text-red-400' : insight.severity === 'high' ? 'text-amber-300' : insight.severity === 'medium' ? 'text-blue-300' : 'text-slate-400'
                  }`}>{insight.severity}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{insight.summary}</p>
                <div className="mt-2 space-y-1">
                  {insight.evidence.map((evidence, index) => (
                    <p key={`${insight.id}-ev-${index}`} className="text-[11px] text-slate-300">• {evidence}</p>
                  ))}
                </div>
                <p className="text-xs text-gold mt-2">{insight.actionContext}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Operational Health</h3>
            <p className="text-sm text-slate-500">Live workload, automation and approval risk insights.</p>
          </div>
          <div className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
            Risk score {intelligence?.score ?? '--'}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-400">Escalation Alerts</p>
            <p className="text-2xl font-bold text-amber-400">{metrics?.escalationAlerts ?? '-'}</p>
          </div>
          <div className="p-3 bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-400">Overloaded Staff</p>
            <p className="text-2xl font-bold text-red-400">{metrics?.overloadedStaff ?? '-'}</p>
          </div>
          <div className="p-3 bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-400">Approval Pressure</p>
            <p className="text-2xl font-bold text-white">{intelligence?.approvalPressure ?? '-'}</p>
          </div>
          <div className="p-3 bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-400">Automation Reliability</p>
            <p className="text-2xl font-bold text-emerald-400">{intelligence?.automationReliability ?? '-'}%</p>
          </div>
          <div className="p-3 bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-400">Workflow Health</p>
            <p className="text-2xl font-bold text-blue-300">{intelligence?.workflowHealthScore ?? '-'}%</p>
          </div>
          <div className="p-3 bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-400">Lifecycle Reliability</p>
            <p className="text-2xl font-bold text-emerald-300">{intelligence?.lifecycleReliabilityScore ?? '-'}%</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-400">Practice Risk</p>
            <p className="text-2xl font-bold text-white">{intelligence?.score ?? '-'}%</p>
          </div>
          <div className="p-3 bg-slate-900/40 rounded-lg">
            <p className="text-xs text-slate-400">Notice Exposure</p>
            <p className="text-2xl font-bold text-white">{intelligence?.noticeExposure ?? '-'}%</p>
          </div>
        </div>
      </div>

      {intelligence?.integrity && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Workflow Integrity Monitoring</h3>
              <p className="text-sm text-slate-500">Governance-safe lifecycle diagnostics and recovery recommendations.</p>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
              Integrity {intelligence.integrity.operationalIntegrityScore}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Orphan Workflows</p><p className="text-2xl font-bold text-amber-300">{intelligence.integrity.counts.orphanWorkflows}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Invalid Transitions</p><p className="text-2xl font-bold text-red-300">{intelligence.integrity.counts.invalidTransitions}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Notice/Task Sync Failures</p><p className="text-2xl font-bold text-amber-300">{intelligence.integrity.counts.noticeTaskSyncFailures}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Unresolved Approval Clusters</p><p className="text-2xl font-bold text-white">{intelligence.integrity.counts.unresolvedApprovalClusters}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Escalation Loops</p><p className="text-2xl font-bold text-red-300">{intelligence.integrity.counts.escalationLoops}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Billing Continuity Gaps</p><p className="text-2xl font-bold text-gold">{intelligence.integrity.counts.billingContinuityGaps}</p></div>
          </div>
          <div className="mt-4 space-y-2">
            {intelligence.integrity.recoverySuggestions.slice(0, 3).map((suggestion, index) => (
              <p key={`${index}-${suggestion}`} className="text-sm text-slate-300 border border-slate-800 rounded-lg bg-slate-950/80 px-3 py-2">
                {suggestion}
              </p>
            ))}
          </div>
        </div>
      )}

      {intelligence?.documentIntelligence && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Document Intelligence</h3>
              <p className="text-sm text-slate-500">Extraction, routing, and compliance document orchestration visibility.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Unresolved Notices</p><p className="text-2xl font-bold text-amber-300">{intelligence.documentIntelligence.unresolvedNotices}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Processing Backlog</p><p className="text-2xl font-bold text-white">{intelligence.documentIntelligence.processingBacklog}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Extraction Failures</p><p className="text-2xl font-bold text-red-300">{intelligence.documentIntelligence.extractionFailures}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Overdue Doc Workflows</p><p className="text-2xl font-bold text-red-300">{intelligence.documentIntelligence.overdueDocumentWorkflows}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">High-Risk Documents</p><p className="text-2xl font-bold text-gold">{intelligence.documentIntelligence.highRiskComplianceDocuments}</p></div>
          </div>
        </div>
      )}

      {intelligence?.predictive && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Predictive Operations + Risk Intelligence</h3>
              <p className="text-sm text-slate-500">Proactive risk signals, trend foundations, and governance-aware forecasting.</p>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
              Health {intelligence.predictive.operationalHealthScore}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Governance Risk</p><p className="text-2xl font-bold text-red-300">{intelligence.predictive.governanceRiskScore}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Billing Pressure</p><p className="text-2xl font-bold text-amber-300">{intelligence.predictive.billingPressureScore}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Workload Imbalance</p><p className="text-2xl font-bold text-white">{intelligence.predictive.workloadImbalanceScore}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Escalation Trend (30d)</p><p className="text-2xl font-bold text-gold">{intelligence.predictive.escalationHeatmap.reduce((s, p) => s + p.count, 0)}</p></div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Top Risk Signals</p>
              {intelligence.predictive.riskSignals.slice(0, 3).map((signal) => (
                <div key={signal.key} className="mb-2">
                  <p className="text-sm font-bold text-white">{signal.summary}</p>
                  <p className="text-xs text-slate-400">{signal.recommendation}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Forecast Signals (7d)</p>
              {intelligence.predictive.forecastSignals.slice(0, 4).map((forecast) => (
                <div key={forecast.metric} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-slate-300">{forecast.metric.replace(/_/g, ' ')}</span>
                  <span className="text-white font-bold">{forecast.direction.toUpperCase()} {forecast.projected7d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {intelligence?.topInsights && intelligence.topInsights.length > 0 && (
        <div className="grid gap-3">
          {intelligence.topInsights.map((insight) => (
            <div key={insight.id} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{insight.category}</p>
                  <h4 className="mt-2 text-lg font-bold text-white">{insight.title}</h4>
                </div>
                <span className={`px-2 py-1 text-[10px] font-bold uppercase ${
                  insight.severity === 'critical'
                    ? 'bg-red-500/10 text-red-300'
                    : insight.severity === 'warning'
                    ? 'bg-amber-500/10 text-amber-300'
                    : 'bg-blue-500/10 text-blue-300'
                }`}>
                  {insight.severity}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-400">{insight.summary}</p>
              <p className="mt-2 text-sm text-gold">{insight.recommendation}</p>
            </div>
          ))}
        </div>
      )}

      {relationships && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Cross-Module Relationship Intelligence</h3>
              <p className="text-sm text-slate-500">Tasks, approvals, notices, automations, and workforce pressure mapping.</p>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
              Org Health {relationships.health.overall}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Staffing Pressure</p><p className="text-2xl font-bold text-white">{relationships.analytics.staffingPressure}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Approval Bottlenecks</p><p className="text-2xl font-bold text-amber-400">{relationships.analytics.approvalBottlenecks}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Overdue+Escalation</p><p className="text-2xl font-bold text-red-400">{relationships.analytics.overdueEscalationClusters}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Reassignment Trend</p><p className="text-2xl font-bold text-gold">{relationships.analytics.reassignmentTrend}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Utilization Score</p><p className="text-2xl font-bold text-emerald-400">{relationships.analytics.utilizationScore}</p></div>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Operational Context Graph</p>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Entity Nodes</p><p className="text-2xl font-bold text-white">{relationships.graph.nodeCount}</p></div>
              <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Relationship Edges</p><p className="text-2xl font-bold text-blue-300">{relationships.graph.edgeCount}</p></div>
              <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Dependency Chains</p><p className="text-2xl font-bold text-amber-300">{relationships.graph.dependencyChains}</p></div>
              <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Impact Propagation</p><p className="text-2xl font-bold text-gold">{relationships.graph.workflowImpactPropagation}</p></div>
              <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Cross-Domain Pressure</p><p className="text-2xl font-bold text-red-300">{relationships.graph.crossDomainPressure}</p></div>
            </div>
          </div>

          {relationships.graph.contextChains.length > 0 && (
            <div className="mt-4 space-y-2">
              {relationships.graph.contextChains.map((chain, index) => (
                <div key={`${chain.rootEntity}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-bold text-sm">Context Chain {index + 1}</p>
                    <span className={`text-[10px] uppercase font-bold ${
                      chain.risk === 'high' ? 'text-red-400' : chain.risk === 'medium' ? 'text-amber-400' : 'text-blue-400'
                    }`}>{chain.risk}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{chain.summary}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {relationships.insights.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-white font-bold text-sm">{item.title}</p>
                  <span className={`text-[10px] uppercase font-bold ${
                    item.severity === 'critical' ? 'text-red-400' : item.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                  }`}>{item.severity}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{item.summary}</p>
                <p className="text-xs text-gold mt-1">{item.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {user?.role === 'SuperAdmin' && financial && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Executive Financial Command Center</h3>
              <p className="text-sm text-slate-500">Operational-financial continuity across profitability, receivables, payroll and workflow execution.</p>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
              Profitability {financial.pnl.profitabilityScore}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Accrual Revenue</p><p className="text-2xl font-bold text-emerald-300">{financial.pnl.accrualRevenue}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Net Operating Profit</p><p className="text-2xl font-bold text-white">{financial.pnl.netOperatingProfit}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Receivables Pending</p><p className="text-2xl font-bold text-amber-300">{financial.balanceSheet.receivablesPending}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Payroll Obligations</p><p className="text-2xl font-bold text-red-300">{financial.balanceSheet.payrollObligations}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Liquidity Pressure</p><p className="text-2xl font-bold text-gold">{financial.balanceSheet.liquidityPressureScore}</p></div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {financial.financialRisks.slice(0, 4).map((risk) => (
              <div key={risk.id} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{risk.title}</p>
                  <span className={`text-[10px] uppercase font-bold ${
                    risk.severity === 'critical' ? 'text-red-400' : risk.severity === 'high' ? 'text-amber-300' : risk.severity === 'medium' ? 'text-blue-300' : 'text-slate-400'
                  }`}>{risk.severity}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{risk.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {orchestration && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Enterprise Orchestration Control</h3>
              <p className="text-sm text-slate-500">Governance-safe multi-step workflow chaining and execution continuity visibility.</p>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
              Chain Integrity {orchestration.summary.chainIntegrityScore}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Active Chains</p><p className="text-2xl font-bold text-emerald-300">{orchestration.summary.activeChains}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Blocked Flows</p><p className="text-2xl font-bold text-red-300">{orchestration.summary.blockedChains}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Failed Stages</p><p className="text-2xl font-bold text-amber-300">{orchestration.summary.failedStages}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Pending Approvals</p><p className="text-2xl font-bold text-white">{orchestration.summary.pendingGovernanceApprovals}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Stalled Chains</p><p className="text-2xl font-bold text-gold">{orchestration.summary.stalledChains}</p></div>
          </div>
          <div className="mt-4 space-y-2">
            {orchestration.continuitySignals.slice(0, 3).map((signal) => (
              <p key={signal} className="text-sm text-slate-300 border border-slate-800 rounded-lg bg-slate-950/80 px-3 py-2">{signal}</p>
            ))}
          </div>
        </div>
      )}

      {integration && (
        <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Enterprise Integration Ecosystem</h3>
              <p className="text-sm text-slate-500">Connector reliability, external orchestration health, and governance-safe interoperability visibility.</p>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
              Reliability {integration.summary.connectorReliabilityScore}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Active Chains</p><p className="text-2xl font-bold text-emerald-300">{integration.summary.activeChains}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Blocked Chains</p><p className="text-2xl font-bold text-red-300">{integration.summary.blockedChains}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Failed Chains</p><p className="text-2xl font-bold text-amber-300">{integration.summary.failedChains}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Pending Governance</p><p className="text-2xl font-bold text-white">{integration.summary.pendingGovernanceApprovals}</p></div>
            <div className="p-3 bg-slate-900/40 rounded-lg"><p className="text-xs text-slate-400">Delivery Failures</p><p className="text-2xl font-bold text-gold">{integration.summary.notificationDeliveryFailures}</p></div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {integration.connectors.slice(0, 6).map((connector) => (
              <div key={connector.key} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{connector.displayName}</p>
                  <span className={`text-[10px] uppercase font-bold ${
                    connector.status === 'offline' ? 'text-red-400' : connector.status === 'degraded' ? 'text-amber-300' : 'text-emerald-300'
                  }`}>{connector.status}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Reliability {connector.reliabilityScore} • Failed chains {connector.failedChains} • Delivery failures {connector.deliveryFailures}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <OperationalTimeline />
    </div>
  );
};

export default OperationalPanel;
