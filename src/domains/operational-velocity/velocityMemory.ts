import { CommandAction } from '../../services/commandPaletteService';
import { VelocityMemory } from './types';

const defaults: VelocityMemory = {
  favoriteActions: [],
  lastWorkflow: 'GST variance review',
  repeatedPatterns: ['Assign owner after SLA warning', 'Open GST context after notice alert', 'Quick approve clean document batch'],
  metrics: {
    clickDepth: 2,
    queueThroughput: 18,
    restoredContexts: 3,
    frictionScore: 91,
  },
};

const storageKey = (userId: string) => `caath:velocity-memory:${userId}`;

export const loadVelocityMemory = (userId?: string): VelocityMemory => {
  if (!userId) return defaults;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
};

export const saveVelocityMemory = (userId: string, memory: VelocityMemory) => {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(memory));
};

export const rememberVelocityAction = (memory: VelocityMemory, action: CommandAction | string, label: string): VelocityMemory => {
  const existing = memory.favoriteActions.find((item) => item.action === action);
  const nextActions = existing
    ? memory.favoriteActions.map((item) =>
        item.action === action ? { ...item, count: item.count + 1, lastUsedAt: new Date().toISOString(), label } : item,
      )
    : [{ action, label, count: 1, lastUsedAt: new Date().toISOString() }, ...memory.favoriteActions];

  return {
    ...memory,
    favoriteActions: nextActions.sort((a, b) => b.count - a.count).slice(0, 8),
    metrics: {
      ...memory.metrics,
      queueThroughput: memory.metrics.queueThroughput + 1,
      frictionScore: Math.min(99, memory.metrics.frictionScore + 1),
    },
  };
};

