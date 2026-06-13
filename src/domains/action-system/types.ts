import { CommandAction } from '../../services/commandPaletteService';
import { UserRole } from '../../types';

export type OperationalActionStatus = 'idle' | 'loading' | 'success' | 'failure' | 'permission-denied' | 'disabled';

export interface OperationalActionContext {
  action: CommandAction | string;
  userId: string;
  role?: UserRole;
  label: string;
  source: string;
  undoable?: boolean;
}

export interface OperationalActionTelemetry {
  id: string;
  action: string;
  label: string;
  source: string;
  status: OperationalActionStatus;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface OperationalActionResult {
  status: Exclude<OperationalActionStatus, 'idle' | 'loading'>;
  message: string;
  undo?: () => void;
}

export interface RegisteredOperationalAction {
  id: CommandAction | string;
  label: string;
  allowedRoles?: UserRole[];
  cooldownMs?: number;
  undoable?: boolean;
}
