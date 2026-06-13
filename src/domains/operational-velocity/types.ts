import { CommandAction } from '../../services/commandPaletteService';

export type OperationalMode = 'deep-work' | 'compact-execution' | 'rapid-triage' | 'executive-monitoring';

export interface VelocityActionRecord {
  action: CommandAction | string;
  label: string;
  count: number;
  lastUsedAt: string;
}

export interface VelocityMetrics {
  clickDepth: number;
  queueThroughput: number;
  restoredContexts: number;
  frictionScore: number;
}

export interface VelocityMemory {
  favoriteActions: VelocityActionRecord[];
  lastWorkflow?: string;
  repeatedPatterns: string[];
  metrics: VelocityMetrics;
}

