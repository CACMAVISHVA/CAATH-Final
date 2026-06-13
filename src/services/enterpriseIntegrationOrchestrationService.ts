import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';
import { recordOperationalTelemetry } from './operationalTelemetryPipelineService';

export type IntegrationConnectorType =
  | 'gst'
  | 'mca'
  | 'banking'
  | 'email'
  | 'whatsapp'
  | 'storage'
  | 'calendar'
  | 'external_api';

export type ConnectorStatus = 'healthy' | 'degraded' | 'offline';

export interface IntegrationConnectorDefinition {
  key: string;
  type: IntegrationConnectorType;
  displayName: string;
  governanceCritical: boolean;
  allowedRoles: UserRole[];
  tenantScoped: boolean;
  secretsRequired: string[];
}

export interface IntegrationChainStep {
  key: string;
  label: string;
  status: 'ready' | 'pending' | 'blocked' | 'failed' | 'awaiting_approval';
  detail?: string;
}

export interface IntegrationChain {
  id: string;
  trigger: string;
  connectorKey: string;
  status: 'active' | 'blocked' | 'failed' | 'awaiting_approval' | 'completed';
  createdAt: string;
  updatedAt: string;
  steps: IntegrationChainStep[];
}

export interface IntegrationHealthSnapshot {
  generatedAt: string;
  connectors: Array<{
    key: string;
    type: IntegrationConnectorType;
    displayName: string;
    status: ConnectorStatus;
    reliabilityScore: number;
    failedChains: number;
    deliveryFailures: number;
  }>;
  summary: {
    activeChains: number;
    blockedChains: number;
    failedChains: number;
    pendingGovernanceApprovals: number;
    notificationDeliveryFailures: number;
    connectorReliabilityScore: number;
  };
}

const CONNECTORS: IntegrationConnectorDefinition[] = [
  { key: 'gst_core', type: 'gst', displayName: 'GST Coordination', governanceCritical: true, allowedRoles: ['GodAdmin', 'SuperAdmin', 'Admin'], tenantScoped: true, secretsRequired: ['api_key'] },
  { key: 'mca_core', type: 'mca', displayName: 'MCA Coordination', governanceCritical: true, allowedRoles: ['GodAdmin', 'SuperAdmin', 'Admin'], tenantScoped: true, secretsRequired: ['api_key'] },
  { key: 'banking_ready', type: 'banking', displayName: 'Banking Readiness', governanceCritical: true, allowedRoles: ['GodAdmin', 'SuperAdmin'], tenantScoped: true, secretsRequired: ['client_id', 'client_secret'] },
  { key: 'email_delivery', type: 'email', displayName: 'Email Connector', governanceCritical: false, allowedRoles: ['GodAdmin', 'SuperAdmin', 'Admin', 'Staff'], tenantScoped: true, secretsRequired: ['smtp_user', 'smtp_secret'] },
  { key: 'whatsapp_notify', type: 'whatsapp', displayName: 'WhatsApp Connector', governanceCritical: false, allowedRoles: ['GodAdmin', 'SuperAdmin', 'Admin'], tenantScoped: true, secretsRequired: ['provider_key'] },
  { key: 'doc_storage', type: 'storage', displayName: 'Cloud Storage Connector', governanceCritical: true, allowedRoles: ['GodAdmin', 'SuperAdmin', 'Admin'], tenantScoped: true, secretsRequired: ['bucket', 'access_key'] },
  { key: 'calendar_sync', type: 'calendar', displayName: 'Calendar Connector', governanceCritical: false, allowedRoles: ['GodAdmin', 'SuperAdmin', 'Admin', 'Staff'], tenantScoped: true, secretsRequired: ['oauth_client'] },
  { key: 'external_api_hub', type: 'external_api', displayName: 'External API Hub', governanceCritical: true, allowedRoles: ['GodAdmin', 'SuperAdmin'], tenantScoped: true, secretsRequired: ['api_token'] },
];

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const connectorByKey = (key: string) => CONNECTORS.find((connector) => connector.key === key) || null;

const assertConnectorAccess = (connector: IntegrationConnectorDefinition, actor: User) => {
  if (!connector.allowedRoles.includes(actor.role)) {
    throw new Error(`Role ${actor.role} cannot operate connector ${connector.displayName}.`);
  }
};

const defaultStepsForTrigger = (trigger: string): IntegrationChainStep[] => {
  if (trigger === 'gst_deadline_approaching') {
    return [
      { key: 'reminder_prepared', label: 'Reminder Orchestration Prepared', status: 'ready' },
      { key: 'escalation_surfaced', label: 'Operational Escalation Surfaced', status: 'pending' },
      { key: 'client_communication_prepared', label: 'Client Communication Prepared', status: 'pending' },
    ];
  }
  if (trigger === 'invoice_approved') {
    return [
      { key: 'receivable_followup_prepared', label: 'Receivable Follow-up Prepared', status: 'ready' },
      { key: 'banking_integration_readiness', label: 'Banking Integration Readiness', status: 'pending' },
    ];
  }
  if (trigger === 'notice_uploaded') {
    return [
      { key: 'external_coordination_prepared', label: 'External Coordination Prepared', status: 'ready' },
      { key: 'communication_orchestration_linked', label: 'Communication Orchestration Linked', status: 'pending' },
    ];
  }
  return [
    { key: 'integration_prepared', label: 'Integration Chain Prepared', status: 'ready' },
    { key: 'governance_validated', label: 'Governance Validation', status: 'pending' },
  ];
};

export const getIntegrationConnectorRegistry = (actor: User) =>
  CONNECTORS.filter((connector) => connector.allowedRoles.includes(actor.role)).map((connector) => ({
    ...connector,
    secretsMasked: connector.secretsRequired.map((name) => `${name}_configured`),
  }));

export const registerIntegrationOrchestrationChain = async (params: {
  actor: User;
  connectorKey: string;
  trigger: 'gst_deadline_approaching' | 'invoice_approved' | 'notice_uploaded' | 'external_api_event';
  workflowType?: string;
  workflowId?: string;
  metadata?: Record<string, unknown>;
}) => {
  if (!params.actor.firmId) {
    throw new Error('Firm context is required for integration orchestration.');
  }

  const connector = connectorByKey(params.connectorKey);
  if (!connector) throw new Error(`Unknown connector key: ${params.connectorKey}`);
  assertConnectorAccess(connector, params.actor);

  const requiresApproval = connector.governanceCritical && ['banking', 'external_api', 'gst', 'mca'].includes(connector.type);
  const steps = defaultStepsForTrigger(params.trigger);
  const status = requiresApproval ? 'awaiting_approval' : 'active';

  const details = {
    connectorKey: connector.key,
    connectorType: connector.type,
    trigger: params.trigger,
    status,
    governanceRequired: requiresApproval,
    tenantScoped: connector.tenantScoped,
    steps,
    metadata: params.metadata || {},
    integrationVisibility: ['GodAdmin', 'SuperAdmin', 'Admin'],
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('enterprise_activities').insert([{
    firm_id: params.actor.firmId,
    event_type: 'integration_orchestration',
    event_subtype: params.trigger,
    reference_id: params.workflowId || null,
    reference_table: params.workflowType || null,
    actor_id: params.actor.id,
    actor_name: params.actor.name,
    actor_role: params.actor.role,
    severity: requiresApproval ? 'notice' : 'info',
    details,
  }]).select('*').single();

  if (error) throw error;

  try {
    await recordOperationalTelemetry({
      firmId: params.actor.firmId,
      metric: 'event_propagation',
      eventName: 'integration_orchestration_chain_registered',
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorRole: params.actor.role,
      workflowType: params.workflowType,
      workflowId: params.workflowId,
      severity: requiresApproval ? 'notice' : 'info',
      payload: {
        connectorKey: connector.key,
        connectorType: connector.type,
        trigger: params.trigger,
        governanceRequired: requiresApproval,
      },
    });
  } catch {
    // keep integration chain registration stable
  }

  return data;
};

export const handleIntegrationEventDrivenOrchestration = async (params: {
  actor: User;
  eventName: string;
  workflowType?: string;
  workflowId?: string;
  payload?: Record<string, unknown>;
}) => {
  const mapping: Record<string, { connectorKey: string; trigger: 'gst_deadline_approaching' | 'invoice_approved' | 'notice_uploaded' | 'external_api_event' }> = {
    workflow_escalated: { connectorKey: 'calendar_sync', trigger: 'gst_deadline_approaching' },
    invoice_generated: { connectorKey: 'banking_ready', trigger: 'invoice_approved' },
    notice_created: { connectorKey: 'gst_core', trigger: 'notice_uploaded' },
    document_uploaded: { connectorKey: 'doc_storage', trigger: 'notice_uploaded' },
  };

  const mapped = mapping[params.eventName];
  if (!mapped) return null;

  return registerIntegrationOrchestrationChain({
    actor: params.actor,
    connectorKey: mapped.connectorKey,
    trigger: mapped.trigger,
    workflowType: params.workflowType,
    workflowId: params.workflowId,
    metadata: params.payload,
  });
};

export const getIntegrationHealthSnapshot = async (actor: User): Promise<IntegrationHealthSnapshot> => {
  if (!actor.firmId) {
    return {
      generatedAt: new Date().toISOString(),
      connectors: [],
      summary: {
        activeChains: 0,
        blockedChains: 0,
        failedChains: 0,
        pendingGovernanceApprovals: 0,
        notificationDeliveryFailures: 0,
        connectorReliabilityScore: 100,
      },
    };
  }

  const [chainsRes, notificationsRes] = await Promise.all([
    supabase
      .from('enterprise_activities')
      .select('id,event_subtype,details,created_at')
      .eq('firm_id', actor.firmId)
      .eq('event_type', 'integration_orchestration')
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('notifications')
      .select('id,status,priority,created_at')
      .eq('firm_id', actor.firmId)
      .eq('status', 'UNREAD')
      .limit(300),
  ]);

  if (chainsRes.error) throw chainsRes.error;
  if (notificationsRes.error) throw notificationsRes.error;

  const chains = (chainsRes.data || []) as Array<{ id: string; event_subtype: string; details: Record<string, unknown>; created_at: string }>;
  const visibleConnectors = getIntegrationConnectorRegistry(actor);

  const chainRows = chains.map((row) => {
    const details = (row.details || {}) as Record<string, unknown>;
    const connectorKey = String(details.connectorKey || '');
    const status = String(details.status || 'active');
    return { connectorKey, status, details };
  });

  const notificationDeliveryFailures = (notificationsRes.data || []).filter((n: any) => n.priority === 'CRITICAL').length;

  const connectors = visibleConnectors.map((connector) => {
    const relatedChains = chainRows.filter((row) => row.connectorKey === connector.key);
    const failedChains = relatedChains.filter((row) => row.status === 'failed').length;
    const blockedChains = relatedChains.filter((row) => row.status === 'blocked').length;
    const awaitingApprovals = relatedChains.filter((row) => row.status === 'awaiting_approval').length;
    const deliveryFailures = connector.type === 'email' || connector.type === 'whatsapp' ? notificationDeliveryFailures : 0;
    const reliabilityScore = clamp(100 - failedChains * 20 - blockedChains * 12 - awaitingApprovals * 6 - deliveryFailures * 2);
    const status: ConnectorStatus = reliabilityScore >= 80 ? 'healthy' : reliabilityScore >= 55 ? 'degraded' : 'offline';
    return {
      key: connector.key,
      type: connector.type,
      displayName: connector.displayName,
      status,
      reliabilityScore,
      failedChains,
      deliveryFailures,
    };
  });

  const activeChains = chainRows.filter((row) => row.status === 'active').length;
  const blockedChains = chainRows.filter((row) => row.status === 'blocked').length;
  const failedChains = chainRows.filter((row) => row.status === 'failed').length;
  const pendingGovernanceApprovals = chainRows.filter((row) => row.status === 'awaiting_approval').length;
  const connectorReliabilityScore = connectors.length === 0
    ? 100
    : Math.round(connectors.reduce((sum, connector) => sum + connector.reliabilityScore, 0) / connectors.length);

  try {
    await recordOperationalTelemetry({
      firmId: actor.firmId,
      metric: 'event_propagation',
      eventName: 'integration_health_snapshot_generated',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      severity: failedChains > 0 || blockedChains > 0 ? 'warning' : 'info',
      payload: {
        activeChains,
        blockedChains,
        failedChains,
        pendingGovernanceApprovals,
        notificationDeliveryFailures,
        connectorReliabilityScore,
      },
    });
  } catch {
    // keep snapshot path stable
  }

  return {
    generatedAt: new Date().toISOString(),
    connectors,
    summary: {
      activeChains,
      blockedChains,
      failedChains,
      pendingGovernanceApprovals,
      notificationDeliveryFailures,
      connectorReliabilityScore,
    },
  };
};

