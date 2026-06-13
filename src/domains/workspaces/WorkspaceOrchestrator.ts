import { UserRole } from '../../types';
import { WorkspaceContext, WorkspaceLayout, WorkspaceType } from './types';

const LAYOUTS: Record<WorkspaceType, WorkspaceLayout> = {
  admin: { workspaceType: 'admin', widgets: ['kpis', 'approvals', 'alerts'], primaryNavigation: ['dashboard', 'tasks', 'approvals', 'automation'] },
  audit: { workspaceType: 'audit', widgets: ['audit_feed', 'risk_events', 'retention'], primaryNavigation: ['auditlog', 'documents', 'compliance'] },
  gst: { workspaceType: 'gst', widgets: ['filing_health', 'mismatch_risk', 'upcoming_due'], primaryNavigation: ['gst', 'clients', 'tasks'] },
  client: { workspaceType: 'client', widgets: ['client_timeline', 'documents', 'billing'], primaryNavigation: ['overview', 'documents', 'compliance'] },
  operations: { workspaceType: 'operations', widgets: ['workflow_health', 'queue_health', 'sla_breach'], primaryNavigation: ['dashboard', 'tasks', 'notices', 'automation'] },
  ai_assistant: { workspaceType: 'ai_assistant', widgets: ['recommendations', 'workload_balance', 'risk_hints'], primaryNavigation: ['ai', 'tasks', 'automation'] },
};

const STORAGE_PREFIX = 'caath:workspace-context';

export class WorkspaceOrchestrator {
  resolveWorkspace(role: UserRole): WorkspaceType {
    if (role === 'GodAdmin') return 'admin';
    if (role === 'SuperAdmin') return 'operations';
    if (role === 'Admin') return 'audit';
    if (role === 'Staff') return 'gst';
    return 'client';
  }

  getLayout(workspaceType: WorkspaceType): WorkspaceLayout {
    return LAYOUTS[workspaceType];
  }

  loadContext(userId: string): WorkspaceContext | null {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${userId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as WorkspaceContext;
    } catch {
      return null;
    }
  }

  saveContext(userId: string, context: WorkspaceContext): void {
    window.localStorage.setItem(`${STORAGE_PREFIX}:${userId}`, JSON.stringify(context));
  }
}

export const workspaceOrchestrator = new WorkspaceOrchestrator();

