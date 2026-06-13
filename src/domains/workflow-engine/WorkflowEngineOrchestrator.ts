import { runtimeEventService, runtimeQueueService } from '../../runtime/production';
import { WorkflowInstance, WorkflowTemplate, WorkflowTemplateType } from './types';

const templates: WorkflowTemplate[] = [
  { id: 'gst_notice_lifecycle', title: 'GST Notice Lifecycle', states: ['received', 'assigned', 'drafted', 'review', 'filed', 'closed'], escalationStates: ['received', 'review'] },
  { id: 'client_onboarding', title: 'Client Onboarding', states: ['intake', 'kyc', 'service_mapping', 'activation'], escalationStates: ['kyc'] },
  { id: 'audit_assignment', title: 'Audit Assignment', states: ['created', 'assigned', 'in_progress', 'review', 'completed'], escalationStates: ['in_progress', 'review'] },
  { id: 'compliance_escalation', title: 'Compliance Escalation', states: ['detected', 'triage', 'owner_assigned', 'resolved'], escalationStates: ['detected', 'triage'] },
  { id: 'approval_chain', title: 'Operational Approval Chain', states: ['submitted', 'under_review', 'approved', 'archived'], escalationStates: ['under_review'] },
];

export class WorkflowEngineOrchestrator {
  private instances = new Map<string, WorkflowInstance>();

  listTemplates(): WorkflowTemplate[] {
    return templates;
  }

  createInstance(input: { templateId: WorkflowTemplateType; tenantId: string; assignedRole: WorkflowInstance['assignedRole'] }): WorkflowInstance {
    const template = templates.find((item) => item.id === input.templateId);
    if (!template) throw new Error('Unknown workflow template');

    const now = new Date().toISOString();
    const instance: WorkflowInstance = {
      id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      templateId: input.templateId,
      tenantId: input.tenantId,
      state: template.states[0],
      assignedRole: input.assignedRole,
      correlationId: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.instances.set(instance.id, instance);
    return instance;
  }

  async transition(instanceId: string, nextState: string): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error('Workflow instance not found');
    const template = templates.find((item) => item.id === instance.templateId);
    if (!template || !template.states.includes(nextState)) throw new Error('Invalid workflow transition state');

    const updated: WorkflowInstance = { ...instance, state: nextState, updatedAt: new Date().toISOString() };
    this.instances.set(instanceId, updated);

    await runtimeEventService.emit(
      'workflow_engine.transition',
      { instanceId, templateId: updated.templateId, state: nextState },
      updated.tenantId,
      updated.correlationId,
    );

    if (template.escalationStates.includes(nextState)) {
      runtimeQueueService.enqueue({
        id: `job_escalation_${instanceId}_${Date.now()}`,
        tenantId: updated.tenantId,
        type: 'compliance_check',
        payload: { instanceId, state: nextState, templateId: updated.templateId },
        correlationId: updated.correlationId,
        priority: 'high',
        attempts: 0,
        maxAttempts: 3,
        scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
    }

    return updated;
  }

  getInstance(instanceId: string): WorkflowInstance | null {
    return this.instances.get(instanceId) || null;
  }
}

export const workflowEngineOrchestrator = new WorkflowEngineOrchestrator();

