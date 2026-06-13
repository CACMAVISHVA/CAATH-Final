import { User } from '../../../types';
import { createNotification, NotificationInput } from '../../../services/notificationService';
import { emitWorkflowEvent } from '../events/workflowEvents';
import { requireTenantContext } from '../context/tenantContext';

export const notificationWorkflowOrchestrator = {
  async notifyTaskAssignment(
    input: Omit<NotificationInput, 'priority'> & { taskId?: string },
    user: User,
  ) {
    const context = requireTenantContext(user);
    await createNotification({ ...input, priority: 'MEDIUM', user });
    await emitWorkflowEvent(
      'TASK_ACTIVITY_CREATED',
      { taskId: input.taskId || '', activityType: 'assigned', actorId: user.id },
      context.firmId,
      user.id,
    );
  },
};
