import { GSTIntelligenceEngineResult } from '../gst-intelligence';
import { GSTResolutionCenterResult } from '../gst-resolution-center';

export type KnowledgeEntityType =
  | 'client'
  | 'vendor'
  | 'filing'
  | 'reconciliation'
  | 'workflow'
  | 'audit_risk'
  | 'anomaly'
  | 'resolution';

export interface KnowledgeEntity {
  id: string;
  type: KnowledgeEntityType;
  label: string;
  metadata: Record<string, string | number | boolean>;
}

export interface KnowledgeRelation {
  id: string;
  from: string;
  to: string;
  relationType:
    | 'filed_for'
    | 'has_vendor_risk'
    | 'triggered_anomaly'
    | 'resolved_by_workflow'
    | 'escalated_to'
    | 'linked_to_audit_risk';
  weight: number;
}

export interface VendorIntelligenceHistory {
  vendorName: string;
  mismatchFrequency: number;
  riskTrend: 'improving' | 'stable' | 'deteriorating';
  trustScore: number;
  complianceStability: number;
}

export interface HistoricalRiskPattern {
  id: string;
  pattern: string;
  periods: string[];
  recurringCount: number;
  severity: 'low' | 'medium' | 'high';
  explanation: string;
}

export interface FilingCycleIntelligence {
  filingPeriod: string;
  workloadPressure: number;
  consistencyScore: number;
  bottleneckSignal: boolean;
}

export interface AILearningMemory {
  recommendationId: string;
  recommendation: string;
  outcome: 'effective' | 'mixed' | 'ineffective';
  effectivenessScore: number;
}

export interface ComplianceTimelineEvent {
  id: string;
  category: 'filing' | 'reconciliation' | 'ai' | 'workflow' | 'escalation' | 'resolution' | 'audit';
  message: string;
  timestamp: string;
}

export interface ComplianceKnowledgeGraphResult {
  entities: KnowledgeEntity[];
  relations: KnowledgeRelation[];
  riskPatterns: HistoricalRiskPattern[];
  vendorHistory: VendorIntelligenceHistory[];
  filingCycles: FilingCycleIntelligence[];
  aiLearningMemory: AILearningMemory[];
  intelligenceTimeline: ComplianceTimelineEvent[];
  crossDomainCorrelations: Array<{ title: string; score: number; context: string }>;
  governance: {
    immutableLineage: boolean;
    auditable: boolean;
    explainable: boolean;
    permissionAware: boolean;
  };
  performance: {
    indexedView: boolean;
    cachedInsights: boolean;
    incrementalProcessing: boolean;
    partitionedStorage: boolean;
  };
}

export interface ComplianceKnowledgeInput {
  clientName: string;
  filingPeriod: string;
  engine: GSTIntelligenceEngineResult;
  resolution: GSTResolutionCenterResult;
}
