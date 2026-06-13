import { ComplianceKnowledgeGraphResult } from '../compliance-knowledge';

export interface ComplianceHistoryDashboardModel {
  trendCards: Array<{ title: string; value: string; tone: 'neutral' | 'positive' | 'warning' }>;
  recurringRiskHeatmap: Array<{ label: string; intensity: number }>;
  vendorHistoryTable: Array<{ vendor: string; trustScore: number; trend: string }>;
  slaHistory: Array<{ label: string; value: number }>;
  timelineHighlights: Array<{ category: string; message: string; timestamp: string }>;
  explanatoryNarrative: string;
}

export interface ComplianceHistoryDashboardInput {
  knowledge: ComplianceKnowledgeGraphResult;
}
