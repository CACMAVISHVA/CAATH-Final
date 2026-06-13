import { UserRole } from '../../types';

export type ConnectorCategory = 'government' | 'communication' | 'workflow' | 'finance' | 'documents' | 'ai-provider' | 'erp';
export type ConnectorStatus = 'healthy' | 'degraded' | 'paused' | 'circuit-open' | 'pending-governance';
export type ConnectorTrust = 'verified' | 'restricted' | 'requires-review';
export type IntegrationEventType = 'sync' | 'webhook' | 'credential_rotation' | 'retry' | 'governance_review' | 'external_validation';

export interface IntegrationAdapterContract {
  id: string;
  provider: string;
  category: ConnectorCategory;
  capabilities: string[];
  credentialMode: 'vault-reference' | 'oauth-token' | 'service-account' | 'manual-attestation';
  lifecycle: 'discover' | 'configure' | 'validate' | 'operate' | 'retire';
}

export interface FederatedConnector {
  id: string;
  name: string;
  adapterId: string;
  targetSystem: string;
  category: ConnectorCategory;
  status: ConnectorStatus;
  trust: ConnectorTrust;
  healthScore: number;
  syncSuccessRate: number;
  latencyMs: number;
  lastSync: string;
  rateLimit: string;
  credentialRef: string;
  ownerRole: UserRole;
  governanceLineage: string[];
}

export interface IntegrationGovernancePolicy {
  id: string;
  title: string;
  appliesTo: ConnectorCategory[];
  allowedRoles: UserRole[];
  requiresApprovalFor: string[];
  credentialRule: string;
  rationale: string;
}

export interface IntegrationEvent {
  id: string;
  type: IntegrationEventType;
  sourceWorkflow: string;
  targetSystem: string;
  detail: string;
  status: ConnectorStatus;
  time: string;
  trace: string[];
}

export interface IntegrationRuntimeSafeguard {
  id: string;
  label: string;
  state: 'active' | 'watching' | 'triggered';
  purpose: string;
}

export interface IntegrationAnalytics {
  syncSuccessRate: number;
  avgLatencyMs: number;
  externalThroughput: number;
  reliabilityScore: number;
  dependencyRisk: number;
}

export interface EcosystemFederationSnapshot {
  generatedAt: string;
  adapters: IntegrationAdapterContract[];
  connectors: FederatedConnector[];
  policies: IntegrationGovernancePolicy[];
  events: IntegrationEvent[];
  safeguards: IntegrationRuntimeSafeguard[];
  analytics: IntegrationAnalytics;
  recommendations: string[];
}
