import { DensityMode } from '../../design-system';

export type WorkspacePanelId = 'tasks' | 'notices' | 'intelligence' | 'escalations' | 'activity' | 'alerts' | 'collaboration' | 'timeline';
export type WorkspaceMode = 'standard' | 'focus';
export type WorkspaceLayout = 'triage' | 'execution' | 'executive';

export interface WorkspacePanelState {
  collapsed?: boolean;
  docked?: boolean;
  maximized?: boolean;
  detached?: boolean;
}

export interface WorkspaceSessionState {
  activeLayout: WorkspaceLayout;
  activePanel: WorkspacePanelId;
  openTabs: string[];
  pinnedViews: string[];
  recentSessions: string[];
  mode: WorkspaceMode;
  density: DensityMode;
  splitView: boolean;
  focusedPanelId?: string;
  panelStates: Record<string, WorkspacePanelState>;
}
