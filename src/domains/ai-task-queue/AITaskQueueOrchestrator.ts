import { User } from '../../types';
import { getTasks, TaskRow } from '../tasks/services/taskDomainService';
import { recordOperationalTelemetry } from '../../services/operationalTelemetryPipelineService';
import { AIWorkloadBalanceInsight, AITaskQueueItem, SLAIntelligenceSignal } from './types';

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

const daysToDeadline = (deadline: string | null) => {
  if (!deadline) return 14;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.round(diff / (24 * 60 * 60 * 1000));
};

const statusRiskWeight = (status: string) => {
  if (status === 'Escalated') return 35;
  if (status === 'Under Review' || status === 'Review') return 22;
  if (status === 'In Progress') return 15;
  if (status === 'Assigned') return 12;
  return 8;
};

const priorityWeight = (priority: string) => {
  if (priority === 'Urgent') return 35;
  if (priority === 'High') return 24;
  if (priority === 'Medium') return 14;
  return 8;
};

const actionFromScores = (slaRisk: number, escalation: number): AITaskQueueItem['recommendedAction'] => {
  if (escalation >= 80) return 'escalate';
  if (slaRisk >= 80) return 'assign';
  if (slaRisk >= 65) return 'remind';
  if (slaRisk >= 45) return 'review';
  return 'close';
};

export class AITaskQueueOrchestrator {
  async getPrioritizedQueue(user: User): Promise<AITaskQueueItem[]> {
    if (!user.firmId) return [];
    const tasks = await getTasks(user.firmId);
    const openTasks = tasks.filter((task) => !['Completed', 'Archived'].includes(task.status));
    const queue = openTasks.map((task) => this.toQueueItem(task));
    const sorted = queue.sort((a, b) => (b.urgencyScore + b.escalationScore) - (a.urgencyScore + a.escalationScore)).slice(0, 20);

    try {
      await recordOperationalTelemetry({
        firmId: user.firmId,
        metric: 'workflow_transition',
        eventName: 'ai_task_queue_refreshed',
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        workflowType: 'ai_task_queue',
        workflowId: user.id,
        payload: { queueSize: sorted.length, topUrgency: sorted[0]?.urgencyScore || 0 },
      });
    } catch {}

    return sorted;
  }

  getWorkloadBalanceInsights(tasks: TaskRow[]): AIWorkloadBalanceInsight {
    const loads: Record<string, number> = {};
    tasks.filter((task) => !['Completed', 'Archived'].includes(task.status)).forEach((task) => {
      if (!task.assigned_to) return;
      loads[task.assigned_to] = (loads[task.assigned_to] || 0) + 1;
    });
    const overloadedUsers = Object.entries(loads)
      .filter(([, count]) => count >= 8)
      .map(([userId, activeTasks]) => ({ userId, activeTasks }))
      .sort((a, b) => b.activeTasks - a.activeTasks);

    const suggestedReassignmentCount = overloadedUsers.reduce((acc, item) => acc + Math.max(0, item.activeTasks - 6), 0);
    const recommendation = overloadedUsers.length > 0
      ? `Workload imbalance detected. Reassign ${suggestedReassignmentCount} workflows from overloaded lanes.`
      : 'Workload distribution is stable.';
    return { overloadedUsers, recommendation, suggestedReassignmentCount };
  }

  getSLAIntelligence(queue: AITaskQueueItem[]): SLAIntelligenceSignal {
    const highRiskCount = queue.filter((item) => item.slaBreachProbability >= 75).length;
    const mediumRiskCount = queue.filter((item) => item.slaBreachProbability >= 50 && item.slaBreachProbability < 75).length;
    return {
      highRiskCount,
      mediumRiskCount,
      summary: `${highRiskCount} tasks are in high SLA breach probability and ${mediumRiskCount} are medium risk.`,
    };
  }

  private toQueueItem(task: TaskRow): AITaskQueueItem {
    const days = daysToDeadline(task.deadline);
    const deadlinePressure = days <= 0 ? 40 : days <= 1 ? 32 : days <= 3 ? 22 : days <= 7 ? 14 : 6;
    const urgencyScore = clamp(priorityWeight(task.priority) + deadlinePressure + statusRiskWeight(task.status));
    const slaBreachProbability = clamp((urgencyScore * 0.7) + (days <= 1 ? 20 : 0));
    const escalationScore = clamp(statusRiskWeight(task.status) + (days <= 0 ? 30 : 10));
    const recommendedAction = actionFromScores(slaBreachProbability, escalationScore);
    return {
      taskId: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      deadline: task.deadline,
      urgencyScore,
      slaBreachProbability,
      escalationScore,
      recommendedAction,
      explanation: `Priority ${task.priority}, status ${task.status}, deadline pressure ${days}d.`,
      sourceTask: task,
    };
  }
}

export const aiTaskQueueOrchestrator = new AITaskQueueOrchestrator();
