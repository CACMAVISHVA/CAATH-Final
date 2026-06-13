import { UserRole } from '../types';

export type QuickAccessPinType = 'module' | 'workflow' | 'client' | 'task' | 'notice' | 'document' | 'automation' | 'approval';

export interface QuickAccessPin {
  id: string;
  type: QuickAccessPinType;
  label: string;
  target: string;
  subtitle?: string;
}

export interface WorkspacePreferences {
  pinned: QuickAccessPin[];
  recentNavigation: string[];
  recentSearches: string[];
}

const basePrefs: WorkspacePreferences = {
  pinned: [],
  recentNavigation: [],
  recentSearches: [],
};

const roleDefaults: Record<UserRole, QuickAccessPin[]> = {
  GodAdmin: [
    { id: 'pin-platform', type: 'module', label: 'Control Tower', target: 'platform', subtitle: 'Platform governance' },
    { id: 'pin-firms', type: 'module', label: 'Firm Operations', target: 'firms' },
  ],
  SuperAdmin: [
    { id: 'pin-workspace', type: 'module', label: 'Realtime Workspace', target: 'workspace', subtitle: 'Persistent operational cockpit' },
    { id: 'pin-learning', type: 'module', label: 'Learning', target: 'learning', subtitle: 'Organizational intelligence' },
    { id: 'pin-governance', type: 'module', label: 'Governance', target: 'governance', subtitle: 'Operational trust' },
    { id: 'pin-collaboration', type: 'module', label: 'Team Coordination', target: 'collaboration', subtitle: 'Collaborative operations' },
    { id: 'pin-eox', type: 'module', label: 'Command Center', target: 'eox', subtitle: 'Operational home' },
    { id: 'pin-approvals', type: 'workflow', label: 'Approval Queue', target: 'approvals', subtitle: 'Governance workflow' },
    { id: 'pin-gst', type: 'module', label: 'GST Intelligence', target: 'gst' },
  ],
  Admin: [
    { id: 'pin-workspace', type: 'module', label: 'Realtime Workspace', target: 'workspace', subtitle: 'Persistent operational cockpit' },
    { id: 'pin-learning', type: 'module', label: 'Learning', target: 'learning', subtitle: 'Organizational intelligence' },
    { id: 'pin-governance', type: 'module', label: 'Governance', target: 'governance', subtitle: 'Operational trust' },
    { id: 'pin-collaboration', type: 'module', label: 'Team Coordination', target: 'collaboration', subtitle: 'Collaborative operations' },
    { id: 'pin-eox', type: 'module', label: 'Command Center', target: 'eox', subtitle: 'Operational home' },
    { id: 'pin-tasks', type: 'workflow', label: 'Task Board', target: 'tasks', subtitle: 'Operational lane' },
    { id: 'pin-automation', type: 'workflow', label: 'Automation Center', target: 'automation' },
  ],
  Staff: [
    { id: 'pin-workspace', type: 'module', label: 'Realtime Workspace', target: 'workspace', subtitle: 'Persistent operational cockpit' },
    { id: 'pin-learning', type: 'module', label: 'Learning', target: 'learning', subtitle: 'Organizational intelligence' },
    { id: 'pin-governance', type: 'module', label: 'Governance', target: 'governance', subtitle: 'Operational trust' },
    { id: 'pin-collaboration', type: 'module', label: 'Team Coordination', target: 'collaboration', subtitle: 'Collaborative operations' },
    { id: 'pin-eox', type: 'module', label: 'Command Center', target: 'eox', subtitle: 'Operational home' },
    { id: 'pin-my-tasks', type: 'workflow', label: 'Assigned Tasks', target: 'tasks', subtitle: 'Personal workload' },
    { id: 'pin-notices', type: 'module', label: 'Notice Center', target: 'notices' },
  ],
  Client: [
    { id: 'pin-client-compliance', type: 'module', label: 'Compliance', target: 'compliance' },
    { id: 'pin-client-docs', type: 'module', label: 'Documents', target: 'documents' },
  ],
};

const getStorageKey = (userId: string) => `caath:workspace:${userId}`;

export const loadWorkspacePreferences = (userId?: string, role?: UserRole): WorkspacePreferences => {
  if (!userId) return basePrefs;
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) {
      return {
        ...basePrefs,
        pinned: role ? roleDefaults[role] : [],
      };
    }
    const parsed = JSON.parse(raw) as WorkspacePreferences;
    return {
      pinned: parsed.pinned || (role ? roleDefaults[role] : []),
      recentNavigation: parsed.recentNavigation || [],
      recentSearches: parsed.recentSearches || [],
    };
  } catch {
    return {
      ...basePrefs,
      pinned: role ? roleDefaults[role] : [],
    };
  }
};

export const saveWorkspacePreferences = (userId: string, prefs: WorkspacePreferences) => {
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(prefs));
};

export const togglePin = (pins: QuickAccessPin[], pin: QuickAccessPin) => {
  const exists = pins.some((item) => item.id === pin.id);
  if (exists) return pins.filter((item) => item.id !== pin.id);
  return [pin, ...pins].slice(0, 12);
};
