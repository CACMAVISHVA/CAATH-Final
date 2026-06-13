import { User, UserRole } from '../../../types';
import { EnterpriseActivity } from '../../../services/observabilityService';
import { operationalCollaborationRepository } from '../repositories/OperationalCollaborationRepository';
import { canViewOperationalActivity, CollaborationEntityType, resolveVisibilityRoles } from '../policies/collaborationPolicies';
import { analyticsEventPublisher } from '../../analytics/services/analyticsEventPublisher';
import { requireTenantContext } from '../../workflows/context/tenantContext';

export interface CollaborationDiscussionInput {
  firmId: string;
  entityType: CollaborationEntityType;
  entityId: string;
  title: string;
  message: string;
  category: 'coordination' | 'blocker' | 'reassignment' | 'escalation' | 'compliance' | 'billing' | 'approval';
  visibilityRoles?: UserRole[];
  requiresResponse?: boolean;
  dueBy?: string;
}

export interface CollaborationThreadSummary {
  id: string;
  createdAt: string;
  entityType: CollaborationEntityType;
  entityId: string;
  title: string;
  message: string;
  category: string;
  actorName: string;
  actorRole: string;
  status: 'open' | 'resolved';
  requiresResponse: boolean;
  dueBy: string | null;
}

export interface CollaborationIntelligenceSummary {
  unresolvedCommunicationChains: number;
  stalledApprovalsDueToMissingResponse: number;
  operationalDependencyDiscussions: number;
  unresolvedEscalationConversations: number;
}

export interface OperationalTimelineSnapshot {
  generatedAt: string;
  items: EnterpriseActivity[];
  discussionThreads: CollaborationThreadSummary[];
  intelligence: CollaborationIntelligenceSummary;
}

export const operationalCollaborationOrchestrator = {
  async postOperationalDiscussion(input: CollaborationDiscussionInput, actor: User) {
    const context = requireTenantContext(actor);
    const visibilityRoles = resolveVisibilityRoles(input.entityType, input.visibilityRoles);

    const details = {
      title: input.title,
      message: input.message,
      category: input.category,
      visibilityRoles,
      requiresResponse: Boolean(input.requiresResponse),
      dueBy: input.dueBy || null,
      status: 'open',
      clientVisible: visibilityRoles.includes('Client'),
    };

    const activity = await operationalCollaborationRepository.createDiscussionActivity({
      firm_id: input.firmId,
      event_type: 'discussion',
      event_subtype: input.category,
      reference_id: input.entityId,
      reference_table: input.entityType,
      actor_id: actor.id,
      actor_name: actor.name,
      actor_role: actor.role,
      details,
      severity: input.category === 'escalation' ? 'warning' : 'notice',
    });

    await analyticsEventPublisher.publish({
      event: 'COLLABORATION_ACTIVITY_EVENT',
      payload: {
        tenantId: context.firmId,
        entityType: input.entityType,
        entityId: input.entityId,
        category: input.category,
      },
      actor: { id: actor.id, name: actor.name, role: actor.role },
      severity: input.category === 'escalation' ? 'warning' : 'info',
    });

    return activity;
  },

  async getOperationalTimelineSnapshot(user: User, limit = 80): Promise<OperationalTimelineSnapshot> {
    if (!user.firmId) {
      return {
        generatedAt: new Date().toISOString(),
        items: [],
        discussionThreads: [],
        intelligence: {
          unresolvedCommunicationChains: 0,
          stalledApprovalsDueToMissingResponse: 0,
          operationalDependencyDiscussions: 0,
          unresolvedEscalationConversations: 0,
        },
      };
    }

    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [allActivities, approvals] = await Promise.all([
      operationalCollaborationRepository.listActivities(user.firmId, limit),
      operationalCollaborationRepository.listApprovals(user.firmId),
    ]);

    const items = allActivities.filter((activity) => canViewOperationalActivity(activity, user.role));

    const discussionThreads: CollaborationThreadSummary[] = items
      .filter((activity) => activity.event_type === 'discussion')
      .map((activity) => {
        const details = (activity.details || {}) as Record<string, unknown>;
        const category = String(details.category || activity.event_subtype || 'coordination');
        return {
          id: activity.id,
          createdAt: activity.created_at,
          entityType: (activity.reference_table || 'workflows') as CollaborationEntityType,
          entityId: activity.reference_id || 'unknown',
          title: String(details.title || 'Operational discussion'),
          message: String(details.message || ''),
          category,
          actorName: activity.actor_name || 'System',
          actorRole: activity.actor_role || 'System',
          status: details.status === 'resolved' ? 'resolved' : 'open',
          requiresResponse: Boolean(details.requiresResponse),
          dueBy: typeof details.dueBy === 'string' ? details.dueBy : null,
        };
      });

    const unresolvedCommunicationChains = discussionThreads.filter((thread) => thread.status === 'open').length;
    const operationalDependencyDiscussions = discussionThreads.filter((thread) => ['blocker', 'reassignment', 'coordination'].includes(thread.category)).length;
    const unresolvedEscalationConversations = discussionThreads.filter((thread) => thread.status === 'open' && thread.category === 'escalation').length;

    const staleApprovals = approvals.filter(
      (approval: any) =>
        ['PENDING', 'UNDER_REVIEW'].includes(approval.status || '') &&
        approval.updated_at &&
        approval.updated_at <= sevenDaysAgoIso,
    );

    const approvalDiscussionIds = new Set(
      discussionThreads.filter((thread) => thread.entityType === 'approvals').map((thread) => thread.entityId),
    );

    const stalledApprovalsDueToMissingResponse = staleApprovals.filter((approval: any) => !approvalDiscussionIds.has(approval.id)).length;

    await analyticsEventPublisher.publish({
      event: 'WORKFLOW_LATENCY_EVENT',
      payload: {
        tenantId: user.firmId,
        workflowType: 'operational_collaboration_snapshot',
        workflowId: user.id,
        latencyMs: 0,
      },
      actor: { id: user.id, name: user.name, role: user.role },
      severity: unresolvedEscalationConversations > 0 ? 'warning' : 'info',
    });

    return {
      generatedAt: new Date().toISOString(),
      items,
      discussionThreads: discussionThreads.slice(0, 20),
      intelligence: {
        unresolvedCommunicationChains,
        stalledApprovalsDueToMissingResponse,
        operationalDependencyDiscussions,
        unresolvedEscalationConversations,
      },
    };
  },
};
