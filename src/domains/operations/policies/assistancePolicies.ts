import { UserRole } from '../../../types';

export type AssistancePriority = 'critical' | 'high' | 'medium' | 'low';

export const toAssistancePriority = (score: number): AssistancePriority => {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
};

export const canRoleViewAssistance = (visibility: UserRole[], role: UserRole) => visibility.includes(role);

export const assistancePriorityRank: Record<AssistancePriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};
