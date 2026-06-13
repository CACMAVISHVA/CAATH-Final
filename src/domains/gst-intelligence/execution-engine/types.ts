import { GSTAIInsight, GSTIntelligenceModule } from '../types';
import { GSTIntelligenceStorageEnvelope } from '../storage/storageContracts';

export type GSTExecutionStage =
  | 'reconciliation'
  | 'variance_analysis'
  | 'vendor_risk'
  | 'audit_risk'
  | 'anomaly_detection'
  | 'ai_insights'
  | 'workflow_generation'
  | 'completed';

export interface ReconciliationFinding {
  invoiceKey: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface GSTR2BReconciliationResult {
  matchedInvoices: number;
  missingInvoices: ReconciliationFinding[];
  excessITCInvoices: ReconciliationFinding[];
  duplicateInvoices: ReconciliationFinding[];
  vendorMismatches: ReconciliationFinding[];
}

export interface GSTR1Vs3BVarianceResult {
  taxableTurnoverVariance: number;
  liabilityVariance: number;
  discrepancyFlags: ReconciliationFinding[];
}

export interface VendorRiskResult {
  score: number;
  highRiskVendors: Array<{ vendorName: string; riskScore: number; reason: string }>;
  fakeInvoiceIndicators: number;
  circularTradingIndicators: number;
}

export interface AuditRiskResult {
  auditRiskScore: number;
  scrutinyTriggers: string[];
  refundRiskScore: number;
  complianceWeaknesses: string[];
}

export interface GSTAnomalyResult {
  anomalyScore: number;
  anomalies: Array<{ code: string; summary: string; severity: 'low' | 'medium' | 'high' }>;
}

export interface GSTWorkflowAction {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  actionType: 'task' | 'escalation' | 'review' | 'reminder';
  reason: string;
}

export interface GSTExecutionTimelineEvent {
  stage: GSTExecutionStage;
  message: string;
  timestamp: string;
}

export interface GSTExecutionRuntime {
  queueAware: boolean;
  chunkedAnalysis: boolean;
  asyncProcessing: boolean;
  gracefulDegradation: boolean;
}

export interface GSTIntelligenceExecutionInput {
  storageEnvelope: GSTIntelligenceStorageEnvelope | null;
  modules: GSTIntelligenceModule[];
  existingInsights: GSTAIInsight[];
  baselineScores: {
    compliance: number;
    audit: number;
    vendor: number;
    operationalEfficiency: number;
    filingConsistency: number;
  };
}

export interface GSTIntelligenceExecutionResult {
  stages: GSTExecutionStage[];
  timeline: GSTExecutionTimelineEvent[];
  reconciliation: GSTR2BReconciliationResult;
  variance: GSTR1Vs3BVarianceResult;
  vendorRisk: VendorRiskResult;
  auditRisk: AuditRiskResult;
  anomalies: GSTAnomalyResult;
  workflowActions: GSTWorkflowAction[];
  riskScores: {
    compliance: number;
    itcRisk: number;
    vendorRisk: number;
    auditExposure: number;
    operationalRisk: number;
  };
  aiInsights: GSTAIInsight[];
  runtime: GSTExecutionRuntime;
  governance: {
    auditable: boolean;
    explainable: boolean;
    permissionAware: boolean;
    traceable: boolean;
  };
}
