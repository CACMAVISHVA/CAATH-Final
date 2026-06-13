import { CognitiveExecutionOutput } from '../cognitive-execution';

export interface CognitiveExecutionHeatmapCell {
  lane: string;
  intensity: number;
  status: 'stable' | 'watch' | 'critical';
}

export interface CognitiveCommandCenterPanel {
  id: string;
  title: string;
  value: string;
  tone: 'stable' | 'watch' | 'critical';
}

export interface CognitiveCommandCenterViewModel {
  generatedAt: string;
  objectiveTrackingScore: number;
  heatmap: CognitiveExecutionHeatmapCell[];
  panels: CognitiveCommandCenterPanel[];
  topActions: Array<{
    id: string;
    title: string;
    priority: string;
    confidence: number;
    governanceStatus: string;
  }>;
  timeline: Array<{
    id: string;
    summary: string;
    createdAt: string;
  }>;
}

export interface CognitiveCommandCenterInput {
  output: CognitiveExecutionOutput;
}
