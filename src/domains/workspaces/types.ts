import { UserRole } from '../../types';

export type WorkspaceType = 'admin' | 'audit' | 'gst' | 'client' | 'operations' | 'ai_assistant';

export interface WorkspaceContext {
  workspaceId: string;
  workspaceType: WorkspaceType;
  tenantId?: string;
  role: UserRole;
  focusMode: 'standard' | 'focus' | 'triage';
  activeModule: string;
  filters: Record<string, string | number | boolean>;
  lastVisitedAt: string;
}

export interface WorkspaceLayout {
  workspaceType: WorkspaceType;
  widgets: string[];
  primaryNavigation: string[];
}

