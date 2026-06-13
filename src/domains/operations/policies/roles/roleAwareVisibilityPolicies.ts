import { UserRole } from '../../../../types';

interface AlertLike {
  group: string;
}

export const filterAlertsForRole = <TAlert extends AlertLike>(role: UserRole, alerts: TAlert[]): TAlert[] => {
  if (role === 'SuperAdmin') return alerts;
  if (role === 'Admin') return alerts.filter((a) => ['workload', 'approvals', 'workflow', 'document'].includes(a.group));
  if (role === 'Staff') return alerts.filter((a) => ['workflow', 'approvals', 'workload', 'notice'].includes(a.group));
  return alerts.filter((a) => ['notice', 'document', 'workflow'].includes(a.group));
};

export const getRoleHeadline = (role: UserRole) => {
  if (role === 'SuperAdmin') return 'Executive Operational Command Center';
  if (role === 'Admin') return 'Team Operations Command Center';
  if (role === 'Staff') return 'Personal Workflow Command Center';
  return 'Client Operations Command Center';
};
