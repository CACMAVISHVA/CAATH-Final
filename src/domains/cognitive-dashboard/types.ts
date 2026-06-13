import { EnterpriseCognitiveOutput, RecommendationPriority } from '../cognitive-operations';

export interface CognitiveHeatmapCell {
  lane: string;
  intensity: number;
  status: 'stable' | 'watch' | 'critical';
}

export interface ExecutiveCognitionPanel {
  id: string;
  title: string;
  value: string;
  tone: 'stable' | 'watch' | 'critical';
}

export interface AIStrategicInsightPanel {
  id: string;
  recommendation: string;
  priority: RecommendationPriority;
  confidence: number;
  reasoning: string;
}

export interface EnterpriseCognitiveDashboardViewModel {
  generatedAt: string;
  objectiveAlignmentScore: number;
  heatmap: CognitiveHeatmapCell[];
  panels: ExecutiveCognitionPanel[];
  insights: AIStrategicInsightPanel[];
  governancePassRate: number;
}

export interface EnterpriseCognitiveDashboardInput {
  cognitiveOutput: EnterpriseCognitiveOutput;
}
