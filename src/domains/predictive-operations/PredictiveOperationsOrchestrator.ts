import { createNotification, NotificationPriority } from '../../services/notificationService';
import { recordOperationalTelemetry } from '../../services/operationalTelemetryPipelineService';
import { getPredictiveOperationalSnapshot } from '../../services/predictiveOperationalIntelligenceService';
import { User } from '../../types';
import { aiTaskQueueOrchestrator } from '../ai-task-queue';
import {
  ExplainablePrediction,
  PredictiveSeverity,
  PredictiveAlertEnvelope,
  PredictiveOperationsSnapshot,
  PredictiveTimelineEvent,
  WorkflowSimulationInput,
  WorkflowSimulationResult,
} from './types';

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const priorityMap: Record<'low' | 'medium' | 'high' | 'critical', NotificationPriority> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
};

export class PredictiveOperationsOrchestrator {
  private cache = new Map<string, { at: number; snapshot: PredictiveOperationsSnapshot }>();
  private readonly cacheMs = 90_000;

  async getSnapshot(user: User): Promise<PredictiveOperationsSnapshot> {
    if (!user.firmId) {
      return {
        generatedAt: new Date().toISOString(),
        workflowCompletionPrediction: 0,
        workflowDelayForecast: 0,
        escalationProbability: 0,
        slaBreachForecast: 0,
        bottleneckProbability: 0,
        taskAgingRisk: 0,
        workloadForecastSummary: 'Firm context required.',
        explainablePredictions: [],
      };
    }

    const cacheKey = `${user.firmId}:${user.role}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.at < this.cacheMs) return cached.snapshot;

    const [predictive, queue] = await Promise.all([
      getPredictiveOperationalSnapshot(user.firmId),
      aiTaskQueueOrchestrator.getPrioritizedQueue(user),
    ]);

    const highQueueRisk = queue.filter((item) => item.slaBreachProbability >= 75).length;
    const workflowDelayForecast = clamp((predictive.workloadImbalanceScore * 0.45) + (predictive.governanceRiskScore * 0.35) + highQueueRisk * 3);
    const escalationProbability = clamp((predictive.escalationHeatmap.reduce((sum, p) => sum + p.count, 0) / 30) * 8 + predictive.workloadImbalanceScore * 0.4);
    const slaBreachForecast = clamp((highQueueRisk * 8) + (predictive.governanceRiskScore * 0.35));
    const bottleneckProbability = clamp((predictive.workloadImbalanceScore * 0.55) + (predictive.billingPressureScore * 0.2) + (predictive.governanceRiskScore * 0.25));
    const taskAgingRisk = clamp((predictive.riskSignals.find((s) => s.key === 'overdue_workflow_clusters')?.value || 0) * 4.5);
    const workflowCompletionPrediction = clamp(100 - Math.round((workflowDelayForecast + slaBreachForecast) / 2));

    const severityFromProbability = (value: number): PredictiveSeverity =>
      value >= 80 ? 'critical' : value >= 65 ? 'high' : value >= 45 ? 'medium' : 'low';

    const explainablePredictions: ExplainablePrediction[] = [
      {
        id: 'pred-delay',
        title: 'Workflow delay forecast',
        severity: severityFromProbability(workflowDelayForecast),
        probability: workflowDelayForecast,
        confidence: clamp(68 + (predictive.reliabilityTrendSummary.workflowThroughput.points.length > 10 ? 15 : 6)),
        reasoning: [
          `Workload imbalance score: ${predictive.workloadImbalanceScore}`,
          `Governance risk score: ${predictive.governanceRiskScore}`,
          `High-risk queue items: ${highQueueRisk}`,
        ],
        recommendedIntervention: 'Rebalance high-risk assignments and trigger SLA-safe reassignment simulation.',
        window: 'next 7 days',
      },
      {
        id: 'pred-sla',
        title: 'SLA breach forecast',
        severity: severityFromProbability(slaBreachForecast),
        probability: slaBreachForecast,
        confidence: clamp(70 + Math.min(20, highQueueRisk * 2)),
        reasoning: [
          `Queue high-risk concentration: ${highQueueRisk}`,
          `Escalation trend volume: ${predictive.escalationHeatmap.reduce((s, p) => s + p.count, 0)}`,
          `Overdue signal severity: ${predictive.riskSignals.find((s) => s.key === 'overdue_workflow_clusters')?.severity || 'low'}`,
        ],
        recommendedIntervention: 'Prioritize top SLA lanes and trigger governed reminders for near-breach workflows.',
        window: 'next 3-5 days',
      },
      {
        id: 'pred-bottleneck',
        title: 'Operational bottleneck probability',
        severity: severityFromProbability(bottleneckProbability),
        probability: bottleneckProbability,
        confidence: clamp(66 + (predictive.staffLoadRisks.length > 5 ? 16 : 8)),
        reasoning: [
          `Staff high-load lanes: ${predictive.staffLoadRisks.filter((item) => item.riskBand === 'high').length}`,
          `Billing pressure score: ${predictive.billingPressureScore}`,
          `Approval throughput trend: ${predictive.reliabilityTrendSummary.workflowThroughput.total}`,
        ],
        recommendedIntervention: 'Simulate workflow redistribution and escalate only governance-critical items.',
        window: 'next 14 days',
      },
    ].filter((item) => item.confidence >= 60);

    const snapshot: PredictiveOperationsSnapshot = {
      generatedAt: new Date().toISOString(),
      workflowCompletionPrediction,
      workflowDelayForecast,
      escalationProbability,
      slaBreachForecast,
      bottleneckProbability,
      taskAgingRisk,
      workloadForecastSummary: `Forecast indicates ${predictive.workloadImbalanceScore >= 60 ? 'elevated' : 'moderate'} workload pressure with completion projection at ${workflowCompletionPrediction}%.`,
      explainablePredictions,
    };

    this.cache.set(cacheKey, { at: Date.now(), snapshot });
    return snapshot;
  }

  simulate(input: WorkflowSimulationInput): WorkflowSimulationResult {
    const workloadFactor = Math.max(1, input.availableStaff);
    const projectedOverdue = Math.max(0, Math.round(input.currentOverdue + input.deltaWorkflows * 0.25 - workloadFactor * 0.5));
    const projectedEscalations = Math.max(0, Math.round(input.currentEscalations + input.deltaWorkflows * 0.15 - workloadFactor * 0.35));
    const projectedSlaRisk = clamp(projectedOverdue * 6 + projectedEscalations * 4);
    return {
      scenario: input.scenario,
      projectedOverdue,
      projectedEscalations,
      projectedSlaRisk,
      confidence: clamp(65 + Math.min(20, input.availableStaff)),
      explanation: [
        `Delta workflows simulated: ${input.deltaWorkflows}`,
        `Current overdue baseline: ${input.currentOverdue}`,
        `Available staff factor: ${input.availableStaff}`,
      ],
    };
  }

  async getPredictiveTimeline(user: User): Promise<PredictiveTimelineEvent[]> {
    const snapshot = await this.getSnapshot(user);
    const now = new Date().toISOString();
    return snapshot.explainablePredictions.slice(0, 3).map((item, index) => ({
      id: `predictive-${index}`,
      timestamp: now,
      category: item.id.includes('sla') ? 'sla_prediction' : 'forecast',
      title: item.title,
      detail: `${item.probability}% probability (${item.window}). ${item.recommendedIntervention}`,
    }));
  }

  async getPredictiveAlerts(user: User): Promise<PredictiveAlertEnvelope[]> {
    const snapshot = await this.getSnapshot(user);
    return snapshot.explainablePredictions
      .filter((item) => item.probability >= 65 && item.confidence >= 65)
      .slice(0, 3)
      .map((item, index) => ({
        id: `pred-alert-${index}`,
        title: `Predictive Alert: ${item.title}`,
        message: `${item.probability}% risk predicted. ${item.recommendedIntervention}`,
        severity: item.severity,
        audienceRole: user.role,
      }));
  }

  async dispatchPredictiveAlerts(user: User): Promise<number> {
    if (!user.firmId) return 0;
    const alerts = await this.getPredictiveAlerts(user);
    await Promise.all(alerts.map((alert) => createNotification({
      firmId: user.firmId,
      recipientUserId: user.id,
      audienceRole: alert.audienceRole,
      title: alert.title,
      message: alert.message,
      priority: priorityMap[alert.severity],
      user,
    })));

    try {
      await recordOperationalTelemetry({
        firmId: user.firmId,
        metric: 'workflow_escalation',
        eventName: 'predictive_alerts_dispatched',
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        workflowType: 'predictive_operations',
        workflowId: user.id,
        payload: { dispatched: alerts.length },
      });
    } catch {}
    return alerts.length;
  }
}

export const predictiveOperationsOrchestrator = new PredictiveOperationsOrchestrator();
