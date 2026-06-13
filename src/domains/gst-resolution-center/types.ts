import { GSTAIInsight } from '../gst-intelligence';

export type ComplianceIssueState =
  | 'detected'
  | 'assigned'
  | 'investigating'
  | 'awaiting_response'
  | 'resolved'
  | 'escalated'
  | 'closed';

export interface ComplianceIssue {
  id: string;
  title: string;
  summary: string;
  source: 'reconciliation' | 'variance' | 'vendor_risk' | 'audit_risk' | 'anomaly';
  severity: 'low' | 'medium' | 'high';
  state: ComplianceIssueState;
  ownerRole: 'gst_staff' | 'senior_reviewer' | 'audit_lead' | 'operations_manager';
  slaHours: number;
  detectedAt: string;
}

export interface ResolutionWorkflow {
  workflowId: string;
  issueId: string;
  workflowType:
    | 'itc_mismatch_resolution'
    | 'vendor_reconciliation'
    | 'filing_discrepancy_correction'
    | 'anomaly_investigation'
    | 'audit_preparation'
    | 'compliance_remediation';
  state: ComplianceIssueState;
  assignedToRole: ComplianceIssue['ownerRole'];
  approvalRequired: boolean;
  escalationPath: ComplianceIssue['ownerRole'][];
  notes: string[];
}

export interface AIResolutionRecommendation {
  issueId: string;
  recommendation: string;
  rationale: string;
  suggestedAction: 'assign' | 'escalate' | 'review' | 'notify' | 'request_vendor_response';
  confidence: number;
  governanceNote: string;
}

export interface ResolutionTaskIntent {
  title: string;
  priority: 'low' | 'medium' | 'high';
  taskType: 'reconciliation' | 'vendor_followup' | 'compliance_review' | 'audit_investigation' | 'escalation' | 'approval';
  issueId: string;
}

export interface VendorCollaborationItem {
  issueId: string;
  vendorName: string;
  status: 'requested' | 'responded' | 'pending_followup';
  lastUpdate: string;
  requestedDocuments: string[];
}

export interface ResolutionSLAInsight {
  issueId: string;
  deadlineAt: string;
  agingHours: number;
  urgencyScore: number;
  breachRisk: 'low' | 'medium' | 'high';
}

export interface ResolutionTimelineEvent {
  issueId: string;
  message: string;
  timestamp: string;
}

export interface GSTResolutionCenterResult {
  issues: ComplianceIssue[];
  workflows: ResolutionWorkflow[];
  aiRecommendations: AIResolutionRecommendation[];
  taskIntents: ResolutionTaskIntent[];
  vendorCollaboration: VendorCollaborationItem[];
  slaInsights: ResolutionSLAInsight[];
  timeline: ResolutionTimelineEvent[];
  executiveSummary: {
    openIssues: number;
    highRiskOpenIssues: number;
    slaBreachesLikely: number;
    remediationEfficiencyScore: number;
  };
  governance: {
    auditable: boolean;
    permissionAware: boolean;
    explainable: boolean;
    lineageLinked: boolean;
  };
  aiNarratives: GSTAIInsight[];
  runtime: {
    queueAwareExecution: boolean;
    throttledNotifications: boolean;
    asyncWorkflowHandling: boolean;
    gracefulDegradation: boolean;
  };
}
