import { User } from '../../types';

export type FabricDomain =
  | 'gst'
  | 'ai_orchestration'
  | 'predictive_operations'
  | 'workflows'
  | 'operational_memory'
  | 'notifications'
  | 'tasks'
  | 'dashboards'
  | 'compliance'
  | 'telemetry'
  | 'vendor_intelligence'
  | 'escalations';

export interface FabricEvent<TPayload = Record<string, unknown>> {
  id: string;
  name: string;
  domain: FabricDomain;
  tenantId: string;
  correlationId: string;
  timestamp: string;
  payload: TPayload;
  tags?: string[];
}

export interface OperationalContextEnvelope {
  tenantId: string;
  entityId?: string;
  workflowId?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  activeDomains: FabricDomain[];
  kpis: Record<string, number>;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface OperationalMemoryRecord {
  id: string;
  tenantId: string;
  type:
    | 'historical_intelligence'
    | 'workflow_lineage'
    | 'ai_recommendation'
    | 'vendor_intelligence'
    | 'telemetry'
    | 'predictive_signal'
    | 'escalation_history';
  title: string;
  summary: string;
  sourceDomain: FabricDomain;
  relatedEntityIds: string[];
  linkedEventIds: string[];
  createdAt: string;
}

export interface CorrelationInsight {
  id: string;
  tenantId: string;
  signal: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  relatedDomains: FabricDomain[];
  evidence: string[];
  recommendation: string;
  createdAt: string;
}

export interface OperationalGraphNode {
  id: string;
  tenantId: string;
  type: 'workflow' | 'vendor' | 'escalation' | 'compliance' | 'task' | 'telemetry';
  label: string;
  metadata?: Record<string, unknown>;
}

export interface OperationalGraphEdge {
  from: string;
  to: string;
  type: 'depends_on' | 'escalates_to' | 'violates' | 'related_to' | 'feeds';
  strength: number;
}

export interface UnifiedTimelineItem {
  id: string;
  tenantId: string;
  timestamp: string;
  category:
    | 'workflow'
    | 'ai_action'
    | 'predictive_event'
    | 'escalation'
    | 'reconciliation'
    | 'resolution'
    | 'telemetry'
    | 'notification';
  title: string;
  description: string;
  domains: FabricDomain[];
}

export interface FabricSearchQuery {
  tenantId: string;
  actor: Pick<User, 'id' | 'role' | 'firmId'>;
  text: string;
  entityId?: string;
  domains?: FabricDomain[];
  limit?: number;
}

export interface FabricSearchResult {
  id: string;
  type: 'event' | 'memory' | 'timeline' | 'correlation';
  title: string;
  summary: string;
  score: number;
  domain: FabricDomain;
  timestamp: string;
}

export interface ExecutiveOperationalSnapshot {
  tenantId: string;
  generatedAt: string;
  kpis: Record<string, number>;
  heatmap: Array<{ domain: FabricDomain; intensity: number }>;
  topRisks: CorrelationInsight[];
  aiSummary: string;
  predictiveInsights: string[];
}
