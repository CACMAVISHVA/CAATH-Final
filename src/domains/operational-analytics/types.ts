export type AnalyticsDomain = 'workflow' | 'sla' | 'governance' | 'automation' | 'collaboration' | 'integration' | 'gst' | 'memory' | 'interaction';
export type PredictionRisk = 'low' | 'medium' | 'high';

export interface TelemetrySignal {
  id: string;
  domain: AnalyticsDomain;
  metric: string;
  value: number;
  unit: string;
  sourceWorkflow: string;
  lineage: string[];
  sampledAt: string;
}

export interface WorkflowAnalytics {
  throughput: number;
  completionRate: number;
  slaAtRisk: number;
  queuePressure: number;
  escalationFrequency: number;
  operationalVelocity: number;
}

export interface PredictiveInsight {
  id: string;
  title: string;
  prediction: string;
  risk: PredictionRisk;
  confidence: number;
  rationale: string;
  sourceWorkflows: string[];
  trace: string[];
}

export interface ExecutiveKpi {
  id: string;
  label: string;
  value: string;
  trend: string;
  score: number;
  context: string;
}

export interface IntelligenceRecommendation {
  id: string;
  title: string;
  recommendation: string;
  impact: string;
  confidence: number;
  lineage: string[];
}

export interface AnalyticsRuntimeControl {
  id: string;
  label: string;
  state: 'active' | 'watching' | 'recalibrating';
  purpose: string;
}

export interface OperationalIntelligenceSnapshot {
  generatedAt: string;
  telemetry: TelemetrySignal[];
  workflow: WorkflowAnalytics;
  predictions: PredictiveInsight[];
  executiveKpis: ExecutiveKpi[];
  recommendations: IntelligenceRecommendation[];
  runtimeControls: AnalyticsRuntimeControl[];
  memory: Array<{ period: string; throughput: number; slaRisk: number; anomalyCount: number }>;
  summary: {
    operationalHealth: number;
    governanceHealth: number;
    automationImpact: number;
    intelligenceConfidence: number;
    telemetryFreshness: string;
  };
}
