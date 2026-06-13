import { WorkspaceLayoutPreference } from '../contracts/platformUiContracts';

export const workspacePolicies = {
  defaultLayoutForRole(role: string): WorkspaceLayoutPreference['layout'] {
    if (role === 'SuperAdmin') return 'executive';
    if (role === 'Admin') return 'operations';
    if (role === 'Staff') return 'analyst';
    return 'default';
  },
};

