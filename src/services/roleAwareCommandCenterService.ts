import { User } from '../types';
import {
  roleAwareCommandCenterOrchestrator,
  PrioritizedAlert,
  CommandCenterSummary,
  RoleCommandCenterSnapshot,
} from '../domains/operations/services/roleAwareCommandCenterOrchestrator';

export type { PrioritizedAlert, CommandCenterSummary, RoleCommandCenterSnapshot };

export const getRoleAwareCommandCenterSnapshot = async (user: User): Promise<RoleCommandCenterSnapshot> =>
  roleAwareCommandCenterOrchestrator.getSnapshot(user);
