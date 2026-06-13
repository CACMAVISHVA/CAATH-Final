import { User } from '../../types';
import {
  EcosystemFederationSnapshot,
  FederatedConnector,
  IntegrationAdapterContract,
  IntegrationEvent,
  IntegrationGovernancePolicy,
  IntegrationRuntimeSafeguard,
} from './types';

const adapters: IntegrationAdapterContract[] = [
  {
    id: 'adapter-gst-provider',
    provider: 'GST provider adapter',
    category: 'government',
    capabilities: ['filing-status-sync', 'gstin-validation', 'return-status-reconciliation'],
    credentialMode: 'vault-reference',
    lifecycle: 'operate',
  },
  {
    id: 'adapter-mca-provider',
    provider: 'MCA workflow adapter',
    category: 'government',
    capabilities: ['filing-workflow-status', 'company-master-validation', 'compliance-event-sync'],
    credentialMode: 'vault-reference',
    lifecycle: 'configure',
  },
  {
    id: 'adapter-income-tax-provider',
    provider: 'Income-tax coordination adapter',
    category: 'government',
    capabilities: ['notice-status-sync', 'validation-checks', 'filing-dependency-feed'],
    credentialMode: 'manual-attestation',
    lifecycle: 'validate',
  },
  {
    id: 'adapter-communication-federation',
    provider: 'Communication federation adapter',
    category: 'communication',
    capabilities: ['email-routing', 'sms-notification', 'whatsapp-coordination', 'communication-audit'],
    credentialMode: 'oauth-token',
    lifecycle: 'operate',
  },
  {
    id: 'adapter-webhook-workflow',
    provider: 'External workflow webhook adapter',
    category: 'workflow',
    capabilities: ['webhook-ingress', 'event-routing', 'external-task-sync', 'retry-isolation'],
    credentialMode: 'service-account',
    lifecycle: 'operate',
  },
  {
    id: 'adapter-future-banking',
    provider: 'Banking and ERP extension adapter',
    category: 'finance',
    capabilities: ['bank-feed-placeholder', 'erp-sync-placeholder', 'accounting-system-federation'],
    credentialMode: 'vault-reference',
    lifecycle: 'discover',
  },
];

const connectors: FederatedConnector[] = [
  {
    id: 'connector-gst-status',
    name: 'GST filing status sync',
    adapterId: 'adapter-gst-provider',
    targetSystem: 'GST ecosystem',
    category: 'government',
    status: 'healthy',
    trust: 'verified',
    healthScore: 94,
    syncSuccessRate: 98,
    latencyMs: 420,
    lastSync: '8m',
    rateLimit: '120/min guarded',
    credentialRef: 'vault://gov/gst/status-sync',
    ownerRole: 'Admin',
    governanceLineage: ['gst-intelligence', 'governance', 'audit-trail'],
  },
  {
    id: 'connector-mca-workflow',
    name: 'MCA workflow coordination',
    adapterId: 'adapter-mca-provider',
    targetSystem: 'MCA workflows',
    category: 'government',
    status: 'pending-governance',
    trust: 'requires-review',
    healthScore: 72,
    syncSuccessRate: 86,
    latencyMs: 760,
    lastSync: 'manual validation',
    rateLimit: '60/min approval gated',
    credentialRef: 'vault://gov/mca/workflow',
    ownerRole: 'SuperAdmin',
    governanceLineage: ['compliance', 'approval-chain', 'governance'],
  },
  {
    id: 'connector-income-tax',
    name: 'Income-tax notice coordination',
    adapterId: 'adapter-income-tax-provider',
    targetSystem: 'Income-tax coordination',
    category: 'government',
    status: 'degraded',
    trust: 'restricted',
    healthScore: 68,
    syncSuccessRate: 78,
    latencyMs: 990,
    lastSync: '24m',
    rateLimit: 'manual retry only',
    credentialRef: 'vault://gov/it/notice-sync',
    ownerRole: 'SuperAdmin',
    governanceLineage: ['notice-center', 'governance', 'operational-memory'],
  },
  {
    id: 'connector-communication',
    name: 'Email, SMS and WhatsApp federation',
    adapterId: 'adapter-communication-federation',
    targetSystem: 'Communication providers',
    category: 'communication',
    status: 'healthy',
    trust: 'verified',
    healthScore: 91,
    syncSuccessRate: 96,
    latencyMs: 310,
    lastSync: 'live',
    rateLimit: 'batched per workflow',
    credentialRef: 'vault://comms/federation',
    ownerRole: 'Admin',
    governanceLineage: ['collaboration', 'notifications', 'audit-trail'],
  },
  {
    id: 'connector-webhook',
    name: 'External workflow webhooks',
    adapterId: 'adapter-webhook-workflow',
    targetSystem: 'External task systems',
    category: 'workflow',
    status: 'circuit-open',
    trust: 'restricted',
    healthScore: 61,
    syncSuccessRate: 74,
    latencyMs: 1240,
    lastSync: 'circuit breaker active',
    rateLimit: 'isolated queue',
    credentialRef: 'vault://workflow/webhooks',
    ownerRole: 'SuperAdmin',
    governanceLineage: ['workflow-orchestration', 'autonomous-operations', 'runtime-safety'],
  },
];

const policies: IntegrationGovernancePolicy[] = [
  {
    id: 'policy-credential-vault',
    title: 'Credential vault isolation',
    appliesTo: ['government', 'communication', 'workflow', 'finance', 'documents', 'ai-provider', 'erp'],
    allowedRoles: ['GodAdmin', 'SuperAdmin'],
    requiresApprovalFor: ['credential_rotation', 'new_provider_activation', 'external_execution'],
    credentialRule: 'Only vault references may cross domain boundaries. Raw credentials are never exposed in UI state.',
    rationale: 'Prevents credential leakage and keeps external execution audit-safe.',
  },
  {
    id: 'policy-government-actions',
    title: 'Government connector governance',
    appliesTo: ['government'],
    allowedRoles: ['SuperAdmin', 'Admin'],
    requiresApprovalFor: ['filing_submission', 'notice_response', 'status_reconciliation_override'],
    credentialRule: 'Provider adapters must validate context and record workflow lineage before external action.',
    rationale: 'Government workflows require explainable traceability and operator-owned execution.',
  },
  {
    id: 'policy-runtime-safety',
    title: 'Runtime-safe retry and sync control',
    appliesTo: ['workflow', 'communication', 'government'],
    allowedRoles: ['SuperAdmin', 'Admin'],
    requiresApprovalFor: ['circuit_breaker_reset', 'retry_storm_override', 'bulk_external_dispatch'],
    credentialRule: 'Retry queues are isolated by connector and workflow source.',
    rationale: 'Prevents integration storms, deadlocks and cascading retry failures.',
  },
];

const events: IntegrationEvent[] = [
  {
    id: 'event-gst-sync',
    type: 'sync',
    sourceWorkflow: 'GST variance review',
    targetSystem: 'GST ecosystem',
    detail: 'Filing status synchronized and reconciled with workflow memory.',
    status: 'healthy',
    time: '8m',
    trace: ['workflow:gstr-3b', 'connector:gst-status', 'policy:government-actions'],
  },
  {
    id: 'event-webhook-circuit',
    type: 'retry',
    sourceWorkflow: 'External task sync',
    targetSystem: 'External task systems',
    detail: 'Circuit breaker opened after retry threshold to prevent sync storm.',
    status: 'circuit-open',
    time: '12m',
    trace: ['workflow:external-sync', 'connector:webhook', 'safeguard:circuit-breaker'],
  },
  {
    id: 'event-comms-audit',
    type: 'webhook',
    sourceWorkflow: 'Notice evidence request',
    targetSystem: 'Communication providers',
    detail: 'Email and WhatsApp coordination routed with communication memory linkage.',
    status: 'healthy',
    time: '18m',
    trace: ['workflow:notice', 'connector:communication', 'audit:communication-memory'],
  },
  {
    id: 'event-mca-governance',
    type: 'governance_review',
    sourceWorkflow: 'MCA filing validation',
    targetSystem: 'MCA workflows',
    detail: 'Connector activation paused until credential owner approval is complete.',
    status: 'pending-governance',
    time: '31m',
    trace: ['workflow:mca', 'connector:mca-workflow', 'policy:credential-vault'],
  },
];

const safeguards: IntegrationRuntimeSafeguard[] = [
  { id: 'safeguard-rate-governance', label: 'External rate governance', state: 'active', purpose: 'Limits outbound execution by connector and source workflow.' },
  { id: 'safeguard-circuit-breaker', label: 'Connector circuit breakers', state: 'triggered', purpose: 'Opens on repeated failures to stop cascading retries.' },
  { id: 'safeguard-queue-isolation', label: 'Queue isolation', state: 'active', purpose: 'Separates retry paths for GST, communications and workflow webhooks.' },
  { id: 'safeguard-reconciliation', label: 'Sync reconciliation', state: 'watching', purpose: 'Detects workflow desynchronization and requires governed recovery.' },
];

const getRecommendations = (items: FederatedConnector[]) => {
  const degraded = items.filter((connector) => connector.status === 'degraded' || connector.status === 'circuit-open');
  return [
    'Rotate income-tax coordination credential through vault approval before retrying notice synchronization.',
    'Keep webhook connector isolated until retry storm cause is reconciled with workflow automation history.',
    degraded.length > 0
      ? `${degraded.length} connector(s) need governance review before external execution resumes.`
      : 'All connectors are within governed operating thresholds.',
    'Prioritize future banking and ERP adapters behind the same vault-reference and circuit-breaker contracts.',
  ];
};

export class IntegrationFabricOrchestrator {
  generateSnapshot(_user: User): EcosystemFederationSnapshot {
    const avgLatencyMs = Math.round(connectors.reduce((sum, connector) => sum + connector.latencyMs, 0) / connectors.length);
    const syncSuccessRate = Math.round(connectors.reduce((sum, connector) => sum + connector.syncSuccessRate, 0) / connectors.length);
    const reliabilityScore = Math.round(connectors.reduce((sum, connector) => sum + connector.healthScore, 0) / connectors.length);
    const dependencyRisk = connectors.filter((connector) => connector.status === 'degraded' || connector.status === 'circuit-open').length * 12;

    return {
      generatedAt: new Date().toISOString(),
      adapters,
      connectors,
      policies,
      events,
      safeguards,
      analytics: {
        syncSuccessRate,
        avgLatencyMs,
        externalThroughput: 184,
        reliabilityScore,
        dependencyRisk,
      },
      recommendations: getRecommendations(connectors),
    };
  }
}

export const integrationFabricOrchestrator = new IntegrationFabricOrchestrator();
