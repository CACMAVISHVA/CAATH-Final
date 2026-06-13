import { User } from '../../types';
import { runtimeKernel } from '../../runtime/production';
import { aiOperationsOrchestrator } from '../ai-operations';
import { aiOperationsCenterOrchestrator } from '../ai-operations-center';
import { getDashboardMetrics } from '../../services/dashboardService';
import { createNotification } from '../../services/notificationService';
import { getOperationalHealthSummary } from '../../services/operationalIntelligenceService';
import { getStaffMembers, getTasks, reassignTask, updateTaskStatus } from '../../services/taskService';
import { logEnterpriseActivity, queryEnterpriseActivities } from '../../services/observabilityService';
import { recordOperationalTelemetry } from '../../services/operationalTelemetryPipelineService';
import { GovernedOperationalAction, OperationalActionExecutionResult, OperationsCenterSnapshot } from './types';

const actionRequiresApproval = (action: GovernedOperationalAction) => ['approve', 'reconcile'].includes(action);

export class OperationsCenterOrchestrator {
  async getSnapshot(user: User): Promise<OperationsCenterSnapshot> {
    const tenantId = user.firmId || 'global';
    if (!user.firmId) {
      return {
        tenantId,
        generatedAt: new Date().toISOString(),
        runtimeHealth: runtimeKernel.health(),
        executiveKpis: null,
        operationalHealth: null,
        aiCenter: null,
        aiHub: null,
        unifiedActivityStream: { events: [], aiEvents: [] },
        sla: { highRisk: 0, mediumRisk: 0, summary: 'No tenant context available.' },
      };
    }

    const [kpis, operationalHealth, aiCenter, aiHub, events, aiEvents] = await Promise.all([
      getDashboardMetrics(user.firmId),
      getOperationalHealthSummary(user.firmId),
      aiOperationsCenterOrchestrator.getSnapshot(user),
      aiOperationsOrchestrator.getDashboardIntelligence(user),
      queryEnterpriseActivities({ firmId: user.firmId, limit: 60 }),
      aiOperationsOrchestrator.getOperationalIntelligenceTimeline(user),
    ]);

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      runtimeHealth: runtimeKernel.health(),
      executiveKpis: kpis,
      operationalHealth,
      aiCenter,
      aiHub,
      unifiedActivityStream: {
        events,
        aiEvents,
      },
      sla: {
        highRisk: aiCenter.sla.highRiskCount,
        mediumRisk: aiCenter.sla.mediumRiskCount,
        summary: aiCenter.sla.summary,
      },
    };
  }

  async executeGovernedAction(params: {
    user: User;
    action: GovernedOperationalAction;
    targetTaskId?: string;
    reason?: string;
  }): Promise<OperationalActionExecutionResult> {
    const { user, action, targetTaskId, reason } = params;
    if (!user.firmId) {
      return { success: false, message: 'Firm context required.', requiresApproval: false, auditLogged: false };
    }

    const requiresApproval = actionRequiresApproval(action);
    if (requiresApproval && !['Admin', 'SuperAdmin', 'GodAdmin'].includes(user.role)) {
      return { success: false, message: 'This action requires governance role approval.', requiresApproval: true, auditLogged: false };
    }

    if (!targetTaskId) {
      return { success: false, message: 'Target task is required for action execution.', requiresApproval, auditLogged: false };
    }

    const tasks = await getTasks(user.firmId);
    const target = tasks.find((task) => task.id === targetTaskId);
    if (!target) {
      return { success: false, message: 'Target task not found.', requiresApproval, auditLogged: false };
    }

    if (action === 'escalate') {
      await updateTaskStatus(targetTaskId, 'Escalated', user);
    } else if (action === 'review') {
      await updateTaskStatus(targetTaskId, 'Under Review', user);
    } else if (action === 'prioritize') {
      await updateTaskStatus(targetTaskId, 'In Progress', user);
    } else if (action === 'assign') {
      const staff = await getStaffMembers(user.firmId);
      const candidate = (staff || []).sort((a: any, b: any) => (a.activeTasks || 0) - (b.activeTasks || 0))[0];
      if (candidate) {
        await reassignTask(targetTaskId, candidate.id, user, reason || 'AI operations center assignment recommendation');
      }
    } else if (action === 'remind') {
      await createNotification({
        firmId: user.firmId,
        recipientUserId: target.assigned_to || undefined,
        audienceRole: target.assigned_to ? undefined : 'Staff',
        title: 'Operational Reminder',
        message: `Task "${target.title}" requires attention. ${reason || 'AI operations center reminder.'}`,
        priority: 'HIGH',
        user,
      });
    } else if (action === 'reconcile' || action === 'approve') {
      await createNotification({
        firmId: user.firmId,
        audienceRole: 'Admin',
        title: 'Governance Action Requested',
        message: `${action.toUpperCase()} requested for "${target.title}". ${reason || 'AI recommended governance action.'}`,
        priority: 'HIGH',
        user,
      });
    }

    let auditLogged = false;
    try {
      await logEnterpriseActivity({
        firm_id: user.firmId,
        event_type: 'operational_control_action',
        event_subtype: action,
        reference_id: targetTaskId,
        reference_table: 'tasks',
        actor_id: user.id,
        actor_name: user.name,
        actor_role: user.role,
        severity: requiresApproval ? 'notice' : 'info',
        details: { reason: reason || null, governed: true },
      } as any);

      await recordOperationalTelemetry({
        firmId: user.firmId,
        metric: 'workflow_transition',
        eventName: 'operations_center.action_executed',
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        workflowType: 'operations_center',
        workflowId: targetTaskId,
        payload: { action, requiresApproval, reason: reason || null },
      });
      auditLogged = true;
    } catch {}

    return {
      success: true,
      message: `Action "${action}" executed with governance trace.`,
      requiresApproval,
      auditLogged,
    };
  }
}

export const operationsCenterOrchestrator = new OperationsCenterOrchestrator();
