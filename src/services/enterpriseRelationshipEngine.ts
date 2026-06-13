import { supabase } from '../lib/supabase';
import { User } from '../types';
import { getEnterpriseKnowledgeGraphSnapshot, RelationshipContextChain } from './enterpriseKnowledgeGraphService';

export interface RelationshipInsight {
  id: string;
  title: string;
  summary: string;
  severity: 'info' | 'warning' | 'critical';
  recommendation: string;
}

export interface OrganizationalHealth {
  workloadHealth: number;
  approvalHealth: number;
  automationReliability: number;
  workforcePressure: number;
  noticeExposure: number;
  operationalResponsiveness: number;
  overall: number;
}

export interface RelationshipEngineSnapshot {
  health: OrganizationalHealth;
  analytics: {
    staffingPressure: number;
    approvalBottlenecks: number;
    overdueEscalationClusters: number;
    reassignmentTrend: number;
    utilizationScore: number;
  };
  graph: {
    nodeCount: number;
    edgeCount: number;
    relationshipDensity: number;
    dependencyChains: number;
    workflowImpactPropagation: number;
    dependencyClusters: number;
    crossDomainPressure: number;
    contextChains: RelationshipContextChain[];
  };
  insights: RelationshipInsight[];
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const toSeverity = (score: number): 'info' | 'warning' | 'critical' => {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'warning';
  return 'info';
};

export const getEnterpriseRelationshipSnapshot = async (
  firmId: string,
  user: User
): Promise<RelationshipEngineSnapshot> => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [tasksRes, approvalsRes, noticesRes, reassignRes, automationRes, knowledgeGraph] = await Promise.all([
    supabase.from('tasks').select('id,status,deadline,assigned_to,updated_at').eq('firm_id', firmId),
    supabase.from('approval_tasks').select('id,status,updated_at').eq('firm_id', firmId),
    supabase.from('notices').select('id,status,created_at').eq('firm_id', firmId),
    supabase.from('task_reassignments').select('id,created_at').eq('firm_id', firmId).gte('created_at', thirtyDaysAgo),
    supabase.from('automation_runs').select('id,status').eq('firm_id', firmId).gte('created_at', thirtyDaysAgo),
    getEnterpriseKnowledgeGraphSnapshot(firmId, user),
  ]);

  if (tasksRes.error) throw tasksRes.error;
  if (approvalsRes.error) throw approvalsRes.error;
  if (noticesRes.error) throw noticesRes.error;
  if (reassignRes.error) throw reassignRes.error;
  if (automationRes.error) throw automationRes.error;

  const tasks = tasksRes.data || [];
  const approvals = approvalsRes.data || [];
  const notices = noticesRes.data || [];
  const reassignments = reassignRes.data || [];
  const automationRuns = automationRes.data || [];

  const visibleTasks = user.role === 'Staff' ? tasks.filter((t) => t.assigned_to === user.id) : tasks;
  const overdue = visibleTasks.filter((t) => t.deadline && new Date(t.deadline) < now && !['Completed', 'Archived'].includes(t.status)).length;
  const escalated = visibleTasks.filter((t) => t.status === 'Escalated').length;

  const workloadHealth = clamp(100 - overdue * 6 - escalated * 5);
  const approvalBottlenecks = approvals.filter((a) => ['PENDING', 'UNDER_REVIEW'].includes(a.status) && a.updated_at && a.updated_at <= sevenDaysAgo).length;
  const approvalHealth = clamp(100 - approvalBottlenecks * 10);

  const failedAutomations = automationRuns.filter((a) => a.status === 'failed').length;
  const automationReliability = clamp(100 - (automationRuns.length === 0 ? 0 : (failedAutomations / automationRuns.length) * 100));

  const staffingPressure = visibleTasks.filter((t) => !['Completed', 'Archived'].includes(t.status)).length;
  const workforcePressure = clamp(staffingPressure * 7);

  const noticeExposureCount = notices.filter((n) => ['Received', 'Assigned'].includes(n.status)).length;
  const noticeExposure = clamp(noticeExposureCount * 8 + overdue * 2);

  const reassignmentTrend = reassignments.length;
  const operationalResponsiveness = clamp(100 - (overdue * 4 + approvalBottlenecks * 6 + failedAutomations * 5));
  const utilizationScore = clamp(100 - Math.abs(50 - Math.min(staffingPressure * 5, 100)));

  const overall = clamp(
    workloadHealth * 0.25 +
    approvalHealth * 0.2 +
    automationReliability * 0.15 +
    (100 - workforcePressure) * 0.15 +
    (100 - noticeExposure) * 0.15 +
    operationalResponsiveness * 0.1
  );

  const insights: RelationshipInsight[] = [];
  if (workloadHealth < 65) {
    insights.push({
      id: 'rel-workload',
      title: 'Workload pressure rising',
      summary: `Overdue/escalated clusters are increasing across workflow lanes.`,
      severity: toSeverity(100 - workloadHealth),
      recommendation: 'Redistribute ownership and prioritize high-risk overdue items this cycle.',
    });
  }
  if (approvalHealth < 70) {
    insights.push({
      id: 'rel-approval',
      title: 'Approval bottleneck detected',
      summary: `${approvalBottlenecks} approvals are stale beyond 7 days.`,
      severity: toSeverity(100 - approvalHealth),
      recommendation: 'Escalate pending approvals and rebalance reviewer capacity.',
    });
  }
  if (noticeExposure > 55) {
    insights.push({
      id: 'rel-notice',
      title: 'Notice spike impacting operations',
      summary: `${noticeExposureCount} active notices are contributing to execution load.`,
      severity: toSeverity(noticeExposure),
      recommendation: 'Create notice response lanes and split ownership by team specialization.',
    });
  }
  if (reassignmentTrend > 12) {
    insights.push({
      id: 'rel-reassign',
      title: 'High reassignment trend',
      summary: `${reassignmentTrend} reassignments in the last 30 days indicate distribution instability.`,
      severity: toSeverity(reassignmentTrend * 5),
      recommendation: 'Review intake quality and assignment rules to reduce churn.',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'rel-stable',
      title: 'Cross-module operations stable',
      summary: 'No significant relationship anomalies detected across tasks, approvals, and notices.',
      severity: 'info',
      recommendation: 'Continue monitoring with weekly redistribution and approval hygiene checks.',
    });
  }

  if (user.role === 'Staff') {
    return {
      health: {
        workloadHealth,
        approvalHealth: 0,
        automationReliability: 0,
        workforcePressure,
        noticeExposure,
        operationalResponsiveness,
        overall,
      },
      analytics: {
        staffingPressure,
        approvalBottlenecks: 0,
        overdueEscalationClusters: overdue + escalated,
        reassignmentTrend: 0,
        utilizationScore,
      },
      graph: {
        nodeCount: knowledgeGraph.nodes.length,
        edgeCount: knowledgeGraph.edges.length,
        relationshipDensity: knowledgeGraph.metrics.relationshipDensity,
        dependencyChains: knowledgeGraph.metrics.dependencyChains,
        workflowImpactPropagation: knowledgeGraph.metrics.workflowImpactPropagation,
        dependencyClusters: knowledgeGraph.metrics.dependencyClusters,
        crossDomainPressure: knowledgeGraph.metrics.crossDomainPressure,
        contextChains: knowledgeGraph.contextChains.slice(0, 2),
      },
      insights: insights.slice(0, 2),
    };
  }

  return {
    health: {
      workloadHealth,
      approvalHealth,
      automationReliability,
      workforcePressure,
      noticeExposure,
      operationalResponsiveness,
      overall,
    },
    analytics: {
      staffingPressure,
      approvalBottlenecks,
      overdueEscalationClusters: overdue + escalated,
      reassignmentTrend,
      utilizationScore,
    },
    graph: {
      nodeCount: knowledgeGraph.nodes.length,
      edgeCount: knowledgeGraph.edges.length,
      relationshipDensity: knowledgeGraph.metrics.relationshipDensity,
      dependencyChains: knowledgeGraph.metrics.dependencyChains,
      workflowImpactPropagation: knowledgeGraph.metrics.workflowImpactPropagation,
      dependencyClusters: knowledgeGraph.metrics.dependencyClusters,
      crossDomainPressure: knowledgeGraph.metrics.crossDomainPressure,
      contextChains: knowledgeGraph.contextChains.slice(0, 4),
    },
    insights,
  };
};
