import { WorkspaceLayoutPreference } from '../contracts/platformUiContracts';
import { workspacePolicies } from '../policies/workspacePolicies';

export const commandWorkspaceService = {
  getDefaultPreference(tenantId: string, userId: string, role: string): WorkspaceLayoutPreference {
    return {
      tenantId,
      userId,
      role,
      layout: workspacePolicies.defaultLayoutForRole(role),
      shortcuts: ['open_command_palette', 'quick_assign_task', 'open_operational_timeline'],
    };
  },
};

