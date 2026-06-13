import { UserRole } from '../../types';

export interface CommandSuggestion {
  id: string;
  title: string;
  subtitle: string;
  action: string;
  confidence: number;
}

export interface CommandExecutionContext {
  userId: string;
  role: UserRole;
  tenantId?: string;
}

