import { UserRole } from '../../types';
import { GSTOperationalIntelligenceSnapshot } from '../../services/gst/gstOperationalIntelligenceService';
import type { GSTIntelligenceExecutionResult } from './execution-engine';

export type GSTIntelligenceCategory =
  | 'compliance'
  | 'itc'
  | 'sales'
  | 'vendor_risk'
  | 'audit'
  | 'cash_flow'
  | 'operational'
  | 'eway_bill'
  | 'ai';

export type GSTFilingMode = 'monthly' | 'quarterly' | 'annual' | 'custom';

export interface GSTClientProfileContext {
  clientId: string;
  clientName: string;
  gstin: string;
  pan: string;
  legalName: string;
  tradeName: string;
  state: string;
  registrationType: string;
  filingFrequency: 'Monthly' | 'Quarterly' | 'Annual';
}

export interface GSTIntelligenceModule {
  id: string;
  title: string;
  category: GSTIntelligenceCategory;
  description: string;
}

export interface GSTIntelligencePreset {
  id: string;
  title: string;
  description: string;
  moduleIds: string[];
}

export interface GSTRiskScores {
  compliance: number;
  audit: number;
  vendor: number;
  operationalEfficiency: number;
  filingConsistency: number;
  itcRisk?: number;
  auditExposure?: number;
  operationalRisk?: number;
}

export interface GSTAIInsight {
  id: string;
  title: string;
  summary: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
  governanceNote: string;
}

export interface GSTIntelligenceEngineResult {
  context: {
    clientProfile: GSTClientProfileContext | null;
    financialYear: string;
    filingMode: GSTFilingMode;
    filingPeriod: string;
    presetId: string;
    selectedModuleIds: string[];
  };
  snapshot: GSTOperationalIntelligenceSnapshot;
  riskScores: GSTRiskScores;
  aiInsights: GSTAIInsight[];
  indicators: {
    confidence: number;
    trend: 'improving' | 'stable' | 'deteriorating';
    realtimeConnected: boolean;
    generatedAt: string;
  };
  executionTrail: {
    actorRole?: UserRole;
    auditReady: boolean;
    telemetryRecorded: boolean;
  };
  execution: GSTIntelligenceExecutionResult;
}
