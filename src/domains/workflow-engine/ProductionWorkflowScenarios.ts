import { UserRole } from '../../types';
import { workflowEngineOrchestrator } from './WorkflowEngineOrchestrator';

export class ProductionWorkflowScenarios {
  async runGSTNoticeLifecycle(tenantId: string) {
    const flow = workflowEngineOrchestrator.createInstance({ templateId: 'gst_notice_lifecycle', tenantId, assignedRole: 'Staff' });
    await workflowEngineOrchestrator.transition(flow.id, 'assigned');
    await workflowEngineOrchestrator.transition(flow.id, 'drafted');
    return workflowEngineOrchestrator.transition(flow.id, 'review');
  }

  async runClientOnboarding(tenantId: string) {
    const flow = workflowEngineOrchestrator.createInstance({ templateId: 'client_onboarding', tenantId, assignedRole: 'Admin' });
    await workflowEngineOrchestrator.transition(flow.id, 'kyc');
    await workflowEngineOrchestrator.transition(flow.id, 'service_mapping');
    return workflowEngineOrchestrator.transition(flow.id, 'activation');
  }

  async runAuditAssignment(tenantId: string, role: UserRole = 'Admin') {
    const flow = workflowEngineOrchestrator.createInstance({ templateId: 'audit_assignment', tenantId, assignedRole: role });
    await workflowEngineOrchestrator.transition(flow.id, 'assigned');
    await workflowEngineOrchestrator.transition(flow.id, 'in_progress');
    return workflowEngineOrchestrator.transition(flow.id, 'review');
  }

  async runEscalationChain(tenantId: string) {
    const flow = workflowEngineOrchestrator.createInstance({ templateId: 'compliance_escalation', tenantId, assignedRole: 'SuperAdmin' });
    await workflowEngineOrchestrator.transition(flow.id, 'triage');
    return workflowEngineOrchestrator.transition(flow.id, 'owner_assigned');
  }

  async runApprovalChain(tenantId: string) {
    const flow = workflowEngineOrchestrator.createInstance({ templateId: 'approval_chain', tenantId, assignedRole: 'Admin' });
    await workflowEngineOrchestrator.transition(flow.id, 'under_review');
    return workflowEngineOrchestrator.transition(flow.id, 'approved');
  }
}

export const productionWorkflowScenarios = new ProductionWorkflowScenarios();

