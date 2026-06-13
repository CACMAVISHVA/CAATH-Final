import { User } from '../../types';
import { getOperationalTimelineSnapshot, postOperationalDiscussion } from '../../services/operationalCollaborationService';
import { CollaborationPostInput } from './types';

export class CollaborationOrchestrator {
  async post(input: CollaborationPostInput, actor: User) {
    return postOperationalDiscussion(
      {
        firmId: input.tenantId,
        entityType:
          input.entityType === 'workflow'
            ? 'workflows'
            : input.entityType === 'approval'
              ? 'approvals'
              : input.entityType === 'task'
                ? 'tasks'
                : input.entityType === 'client'
                  ? 'workflows'
                  : 'notices',
        entityId: input.entityId,
        title: `Discussion: ${input.entityType}`,
        message: input.text,
        category: 'coordination',
        visibilityRoles: ['SuperAdmin', 'Admin', 'Staff'],
      },
      actor,
    );
  }

  async timeline(user: User, limit = 80) {
    return getOperationalTimelineSnapshot(user, limit);
  }
}

export const collaborationOrchestrator = new CollaborationOrchestrator();
