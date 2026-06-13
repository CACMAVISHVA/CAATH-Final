import { DashboardMetrics } from '../../services/dashboardService';
import { OperationalHealthSummary } from '../../services/operationalIntelligenceService';
import { EnterpriseActivity } from '../../services/observabilityService';
import { AIOpsDashboardIntelligence, AIOperationalTimelineEvent } from '../ai-operations';
import { AIOperationsCenterSnapshot } from '../ai-operations-center';

export type GovernedOperationalAction = 'assign' | 'escalate' | 'review' | 'approve' | 'remind' | 'reconcile' | 'prioritize';

export interface OperationalActionExecutionResult {
  success: boolean;
  message: string;
  requiresApproval: boolean;
  auditLogged: boolean;
}

export interface OperationsCenterSnapshot {
  tenantId: string;
  generatedAt: string;
  runtimeHealth: any;
  executiveKpis: DashboardMetrics | null;
  operationalHealth: OperationalHealthSummary | null;
  aiCenter: AIOperationsCenterSnapshot | null;
  aiHub: AIOpsDashboardIntelligence | null;
  unifiedActivityStream: {
    events: EnterpriseActivity[];
    aiEvents: AIOperationalTimelineEvent[];
  };
  sla: {
    highRisk: number;
    mediumRisk: number;
    summary: string;
  };
}
