import { AIGovernanceRuntime } from '../../runtime/ai';
import { commandCenterOrchestrator } from '../command-center';
import { getGSTDashboardSummary } from '../../services/gstAnalyticsService';
import { getOperationalHealthSummary } from '../../services/operationalIntelligenceService';
import { getOperationalAssistanceSnapshot } from '../../services/operationalAssistanceEngineService';
import { createNotification } from '../../services/notificationService';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import { onboardingOrchestrator } from '../onboarding';
import { AIRuntimeSafeguards } from './AIRuntimeSafeguards';
import {
  AIComplianceNarrative,
  AIOperationalRecommendation,
  AIIntelligentNudge,
  AIOpsDashboardIntelligence,
  AIOperationalTimelineEvent,
  AIWorkflowOptimizationSnapshot,
  AITaskPriorityItem,
} from './types';

const toPriority = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

export class AIOperationsOrchestrator {
  private readonly governance = new AIGovernanceRuntime();
  private readonly safeguards = new AIRuntimeSafeguards();

  private authorize(user: User, workflow: string, prompt: string) {
    if (!user.firmId) return { allowed: false, prompt, reason: 'Firm context missing.' };
    const throttled = this.safeguards.allowExecution(user.firmId);
    if (!throttled.allowed) return { allowed: false, prompt, reason: 'AI runtime throttled for safety.' };
    return this.governance.authorizeAndTrack(prompt, 'caath-operational-model', {
      tenantId: user.firmId,
      actorId: user.id,
      actorRole: user.role,
      workflow,
      correlationId: `aiops_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    });
  }

  async getWorkflowRecommendations(user: User): Promise<AIOperationalRecommendation[]> {
    if (!user.firmId) return [];
    const decision = this.authorize(user, 'ai_workflow_recommendations', 'Generate workflow recommendations from operational signals.');
    if (!decision.allowed) {
      return [{
        id: 'aiops-fallback',
        title: 'AI runtime temporarily limited',
        summary: decision.reason || 'AI execution unavailable.',
        recommendedAction: 'Use operational dashboard alerts and retry AI recommendations in a minute.',
        priority: 'medium',
        source: 'workflow',
      }];
    }

    const [health, assist] = await Promise.all([
      getOperationalHealthSummary(user.firmId),
      getOperationalAssistanceSnapshot(user),
    ]);

    const recs: AIOperationalRecommendation[] = [];
    if (health.noticeExposure >= 60) {
      recs.push({
        id: 'aiops-sla-notice',
        title: 'GST/notice SLA breach risk',
        summary: `${health.noticeExposure}% notice exposure detected with overdue pressure.`,
        recommendedAction: 'Escalate top notice workflows and allocate review owner within the next 4 hours.',
        priority: toPriority(health.noticeExposure),
        source: 'compliance',
      });
    }
    if (health.workloadRisk >= 60) {
      recs.push({
        id: 'aiops-workload-balance',
        title: 'Workload imbalance detected',
        summary: `${health.workloadRisk}% workload risk indicates uneven execution lanes.`,
        recommendedAction: 'Reassign low-priority tasks from overloaded staff and keep critical tasks in primary lane.',
        priority: toPriority(health.workloadRisk),
        source: 'workload',
      });
    }
    assist.recommendations.slice(0, 3).forEach((item, index) => {
      const mappedPriority = item.priority === 'critical' ? 'critical' : item.priority === 'high' ? 'high' : 'medium';
      recs.push({
        id: `aiops-assist-${index}`,
        title: item.title,
        summary: item.rationale,
        recommendedAction: item.suggestedAction,
        priority: mappedPriority,
        source: 'workflow',
      });
    });

    return recs.slice(0, 6);
  }

  async getComplianceNarrative(user: User): Promise<AIComplianceNarrative> {
    if (!user.firmId) {
      return {
        title: 'Compliance context unavailable',
        narrative: 'Firm context is required to compute compliance intelligence.',
        riskBand: 'moderate',
        explainabilityNote: 'Narrative generation was skipped due to missing tenant context.',
      };
    }
    const [health, gst] = await Promise.all([
      getOperationalHealthSummary(user.firmId),
      getGSTDashboardSummary(user.firmId),
    ]);
    const trendTotal = gst.monthlyTrend.reduce((sum, item) => sum + item.filed + item.late + item.pending, 0);
    const lateRatio = trendTotal > 0 ? Math.round((gst.overdueFilings / trendTotal) * 100) : 0;
    const riskBand: 'low' | 'moderate' | 'high' = health.workflowHealthScore >= 80 && lateRatio < 15 ? 'low' : health.workflowHealthScore >= 65 ? 'moderate' : 'high';
    return {
      title: 'AI Compliance Intelligence',
      narrative: `Workflow health is ${health.workflowHealthScore}. Late filing ratio is ${lateRatio}%. Audit and compliance pressure should prioritize mismatch-heavy clients.`,
      riskBand,
      explainabilityNote: 'Narrative derived from workflow health, filing timeliness, and operational risk indicators.',
    };
  }

  async getWorkflowOptimization(user: User): Promise<AIWorkflowOptimizationSnapshot> {
    if (!user.firmId) {
      return { efficiencyScore: 0, bottleneckRisk: 0, escalationPressure: 0, delayPrediction: 0, recommendations: [] };
    }
    const health = await getOperationalHealthSummary(user.firmId);
    const efficiencyScore = Math.max(0, 100 - Math.round((health.workloadRisk + health.approvalPressure) / 2));
    const bottleneckRisk = Math.round((health.approvalPressure + health.noticeExposure) / 2);
    const escalationPressure = health.reliabilityTrends.escalationPressure.total;
    const delayPrediction = Math.round((health.workloadRisk * 0.55) + (health.approvalPressure * 0.45));
    const recommendations = await this.getWorkflowRecommendations(user);
    return { efficiencyScore, bottleneckRisk, escalationPressure, delayPrediction, recommendations };
  }

  async getOperationalSearchSuggestions(user: User, query: string) {
    const commands = commandCenterOrchestrator.search(user.role, query).slice(0, 5);
    return commands.map((command, index) => ({
      id: `ai-search-${command.id}`,
      title: command.title,
      summary: command.subtitle,
      recommendedAction: `Execute "${command.title}" from command palette for faster resolution.`,
      priority: index === 0 ? 'high' as const : 'medium' as const,
      source: 'search' as const,
    }));
  }

  async getTaskPrioritizationQueue(user: User): Promise<AITaskPriorityItem[]> {
    if (!user.firmId) return [];
    const { data, error } = await supabase
      .from('tasks')
      .select('id,title,priority,deadline,status')
      .eq('firm_id', user.firmId)
      .not('status', 'in', '("Completed","Archived")')
      .order('deadline', { ascending: true })
      .limit(40);
    if (error) throw error;
    const now = Date.now();
    return (data || []).map((task: any) => {
      const dueMs = task.deadline ? Math.max(0, new Date(task.deadline).getTime() - now) : 7 * 24 * 60 * 60 * 1000;
      const dueDays = Math.max(0, Math.round(dueMs / (24 * 60 * 60 * 1000)));
      const base = task.priority === 'Urgent' ? 90 : task.priority === 'High' ? 75 : task.priority === 'Medium' ? 55 : 40;
      const urgencyBoost = dueDays <= 1 ? 20 : dueDays <= 3 ? 10 : 0;
      const priorityScore = Math.min(100, base + urgencyBoost);
      const urgency: AITaskPriorityItem['urgency'] =
        priorityScore >= 90 ? 'critical' : priorityScore >= 75 ? 'high' : priorityScore >= 55 ? 'medium' : 'low';
      return {
        taskId: task.id,
        title: task.title,
        priorityScore,
        urgency,
        reason: dueDays <= 1 ? 'SLA at immediate risk.' : `Due in ${dueDays} day(s).`,
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 12);
  }

  async getIntelligentNudges(user: User): Promise<AIIntelligentNudge[]> {
    const nudges: AIIntelligentNudge[] = [];
    const progress = onboardingOrchestrator.loadProgress(user.id);
    const flow = onboardingOrchestrator.getFlow(user.role);
    if (progress.completedStepIds.length < Math.max(2, Math.floor(flow.setupSteps.length / 2))) {
      nudges.push({
        id: 'nudge-onboarding',
        title: 'Activation progression pending',
        message: 'You have incomplete activation milestones. Complete setup to unlock faster workflow execution.',
        priority: 'medium',
        audienceRole: user.role,
      });
    }
    const recs = await this.getWorkflowRecommendations(user);
    recs.filter((item) => item.priority === 'high' || item.priority === 'critical').slice(0, 2).forEach((item, index) => {
      nudges.push({
        id: `nudge-risk-${index}`,
        title: item.title,
        message: item.recommendedAction,
        priority: item.priority,
        audienceRole: user.role,
      });
    });
    return nudges;
  }

  async dispatchOperationalNudges(user: User) {
    const nudges = await this.getIntelligentNudges(user);
    if (!user.firmId) return nudges;
    await Promise.all(nudges.map((nudge) => createNotification({
      firmId: user.firmId,
      recipientUserId: user.id,
      audienceRole: nudge.audienceRole,
      title: `AI Nudge: ${nudge.title}`,
      message: nudge.message,
      priority: nudge.priority === 'critical' ? 'CRITICAL' : nudge.priority === 'high' ? 'HIGH' : 'MEDIUM',
      user,
    })));
    return nudges;
  }

  async getDashboardIntelligence(user: User): Promise<AIOpsDashboardIntelligence> {
    const [complianceNarrative, optimization, recommendations] = await Promise.all([
      this.getComplianceNarrative(user),
      this.getWorkflowOptimization(user),
      this.getWorkflowRecommendations(user),
    ]);
    return {
      summary: `AI operations indicates ${optimization.bottleneckRisk}% bottleneck risk with ${optimization.delayPrediction}% delay prediction pressure.`,
      recommendations: recommendations.slice(0, 4),
      complianceNarrative,
      optimization,
    };
  }

  async getOperationalIntelligenceTimeline(user: User): Promise<AIOperationalTimelineEvent[]> {
    const [recommendations, optimization] = await Promise.all([
      this.getWorkflowRecommendations(user),
      this.getWorkflowOptimization(user),
    ]);
    const now = new Date().toISOString();
    const events: AIOperationalTimelineEvent[] = recommendations.slice(0, 5).map((item, index) => {
      const eventType: AIOperationalTimelineEvent['type'] = item.source === 'automation' ? 'automation_hint' : 'workflow_risk';
      return {
        id: `ai-timeline-${index}`,
        timestamp: now,
        type: eventType,
        title: item.title,
        detail: `${item.summary} ${item.recommendedAction}`,
      };
    });
    events.push({
      id: 'ai-timeline-optimization',
      timestamp: now,
      type: 'ai_insight',
      title: 'Workflow optimization snapshot',
      detail: `Efficiency ${optimization.efficiencyScore}, bottleneck risk ${optimization.bottleneckRisk}, delay prediction ${optimization.delayPrediction}.`,
    });
    return events;
  }
}

export const aiOperationsOrchestrator = new AIOperationsOrchestrator();
