import { UserRole } from '../../types';
import { WorkspaceSessionState } from './types';

const defaults: WorkspaceSessionState = {
  activeLayout: 'triage',
  activePanel: 'tasks',
  openTabs: ['GST variance', 'Notice response', 'Approval release'],
  pinnedViews: ['SLA risks', 'My urgent tasks', 'GST notices'],
  recentSessions: ['Aarav Exports GST review', 'Nexus Foods notice room', 'Q1 approval release'],
  mode: 'standard',
  density: 'compact',
  splitView: true,
  focusedPanelId: undefined,
  panelStates: {},
};

const roleLayouts: Partial<Record<UserRole, WorkspaceSessionState['activeLayout']>> = {
  SuperAdmin: 'executive',
  Admin: 'triage',
  Staff: 'execution',
};

const storageKey = (userId: string) => `caath:realtime-workspace:${userId}`;

export const loadWorkspaceSession = (userId?: string, role?: UserRole): WorkspaceSessionState => {
  if (!userId) return { ...defaults, activeLayout: roleLayouts[role || 'Staff'] || defaults.activeLayout };
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return { ...defaults, activeLayout: roleLayouts[role || 'Staff'] || defaults.activeLayout };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults, activeLayout: roleLayouts[role || 'Staff'] || defaults.activeLayout };
  }
};

export const saveWorkspaceSession = (userId: string, state: WorkspaceSessionState) => {
  window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
};
