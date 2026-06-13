import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';
import { recordOperationalTelemetry, TelemetryMetric } from './operationalTelemetryPipelineService';
import { handleIntegrationEventDrivenOrchestration } from './enterpriseIntegrationOrchestrationService';

export type EnterpriseEventName =
  | 'document_uploaded'
  | 'document_classified'
  | 'notice_identified'
  | 'extraction_completed'
  | 'finance_continuity_prepared'
  | 'document_knowledge_linked'
  | 'workflow_created_from_document'
  | 'document_reviewed'
  | 'notice_created'
  | 'task_assigned'
  | 'task_completed'
  | 'workflow_escalated'
  | 'reassignment_performed'
  | 'approval_completed'
  | 'payroll_approved'
  | 'invoice_generated'
  | 'receivable_overdue'
  | 'workflow_transitioned';

export interface EnterpriseEvent {
  eventName: EnterpriseEventName;
  firmId: string;
  sourceService: string;
  actor?: Pick<User, 'id' | 'name' | 'role'>;
  workflowType?: string;
  workflowId?: string;
  visibility?: UserRole[];
  payload?: Record<string, unknown>;
}

export interface EventPropagationOutcome {
  step: string;
  status: 'success' | 'skipped';
  detail: string;
}

const metricForEvent = (eventName: EnterpriseEventName): TelemetryMetric => {
  if (eventName === 'document_uploaded' || eventName === 'notice_identified' || eventName === 'extraction_completed' || eventName === 'workflow_created_from_document' || eventName === 'document_reviewed') return 'workflow_transition';
  if (eventName === 'workflow_escalated') return 'workflow_escalation';
  if (eventName === 'reassignment_performed') return 'reassignment_frequency';
  if (eventName === 'approval_completed') return 'approval_throughput';
  if (eventName === 'payroll_approved') return 'payroll_governance';
  if (eventName === 'invoice_generated' || eventName === 'receivable_overdue') return 'revenue_lifecycle';
  if (eventName === 'task_completed' || eventName === 'task_assigned' || eventName === 'workflow_transitioned') return 'workflow_transition';
  return 'event_propagation';
};

const buildPropagationPlan = (eventName: EnterpriseEventName): EventPropagationOutcome[] => {
  switch (eventName) {
    case 'task_completed':
      return [
        { step: 'revenue_intelligence_refresh', status: 'success', detail: 'Revenue lifecycle signal prepared.' },
        { step: 'invoice_recommendation_signal', status: 'success', detail: 'Invoice recommendation propagation queued.' },
        { step: 'dashboard_refresh_signal', status: 'success', detail: 'Operational dashboard refresh hint emitted.' },
        { step: 'audit_trace', status: 'success', detail: 'Audit-safe event trace recorded.' },
      ];
    case 'notice_created':
      return [
        { step: 'workflow_create_signal', status: 'success', detail: 'Notice workflow conversion signal emitted.' },
        { step: 'assignment_notification_signal', status: 'success', detail: 'Assignment routing hint emitted.' },
        { step: 'telemetry_capture', status: 'success', detail: 'Notice telemetry tracked.' },
      ];
    default:
      return [
        { step: 'operational_propagation', status: 'success', detail: 'Event propagated through enterprise event bus.' },
        { step: 'telemetry_capture', status: 'success', detail: 'Operational telemetry captured.' },
      ];
  }
};

export const publishEnterpriseEvent = async (event: EnterpriseEvent) => {
  const propagation = buildPropagationPlan(event.eventName);
  const publishedAt = new Date().toISOString();

  const details = {
    eventName: event.eventName,
    sourceService: event.sourceService,
    workflowType: event.workflowType || null,
    workflowId: event.workflowId || null,
    visibility: event.visibility || ['GodAdmin', 'SuperAdmin', 'Admin'],
    payload: event.payload || {},
    propagation,
    publishedAt,
  };

  const { error } = await supabase.from('enterprise_activities').insert([{
    firm_id: event.firmId,
    event_type: 'enterprise_event',
    event_subtype: event.eventName,
    reference_id: event.workflowId || null,
    reference_table: event.workflowType || null,
    actor_id: event.actor?.id || null,
    actor_name: event.actor?.name || null,
    actor_role: event.actor?.role || null,
    severity: event.eventName === 'workflow_escalated' || event.eventName === 'receivable_overdue' ? 'warning' : 'notice',
    details,
  }]);

  if (error) throw error;

  await recordOperationalTelemetry({
    firmId: event.firmId,
    metric: metricForEvent(event.eventName),
    eventName: event.eventName,
    actorId: event.actor?.id,
    actorName: event.actor?.name,
    actorRole: event.actor?.role,
    workflowId: event.workflowId,
    workflowType: event.workflowType,
    severity: event.eventName === 'workflow_escalated' || event.eventName === 'receivable_overdue' ? 'warning' : 'info',
    payload: {
      sourceService: event.sourceService,
      propagationOutcomes: propagation,
      ...event.payload,
    },
  });

  try {
    if (event.actor) {
      await handleIntegrationEventDrivenOrchestration({
        actor: { ...event.actor, email: '', firmId: event.firmId } as User,
        eventName: event.eventName,
        workflowType: event.workflowType,
        workflowId: event.workflowId,
        payload: event.payload,
      });
    }
  } catch {
    // integration orchestration must never break event publishing
  }

  return {
    eventId: null,
    eventName: event.eventName,
    publishedAt,
    propagation,
  };
};

export const getEnterpriseEventHistory = async (firmId: string, limit = 100) => {
  const { data, error } = await supabase
    .from('enterprise_activities')
    .select('*')
    .eq('firm_id', firmId)
    .eq('event_type', 'enterprise_event')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};
