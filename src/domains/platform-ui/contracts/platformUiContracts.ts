export interface WorkspaceLayoutPreference {
  tenantId: string;
  userId: string;
  role: string;
  layout: 'default' | 'analyst' | 'operations' | 'executive';
  shortcuts: string[];
}

