const collaborationKey = (userId: string) => `caath:collaboration-memory:${userId}`;

export interface CollaborationMemory {
  mutedSignals: string[];
  batchedAlerts: number;
  lastHandoff?: string;
  preferredWorkspace: string;
}

const defaults: CollaborationMemory = {
  mutedSignals: [],
  batchedAlerts: 6,
  lastHandoff: 'Nexus Foods notice room',
  preferredWorkspace: 'GST coordination pod',
};

export const loadCollaborationMemory = (userId?: string): CollaborationMemory => {
  if (!userId) return defaults;
  try {
    const raw = window.localStorage.getItem(collaborationKey(userId));
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
};

export const saveCollaborationMemory = (userId: string, memory: CollaborationMemory) => {
  window.localStorage.setItem(collaborationKey(userId), JSON.stringify(memory));
};

