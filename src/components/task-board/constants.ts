import { TaskPriority, TaskStatus } from '../../services/taskService';

export const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'Created', label: 'Created', color: 'bg-slate-100 text-slate-600' },
  { id: 'Assigned', label: 'Assigned', color: 'bg-blue-100 text-blue-600' },
  { id: 'In Progress', label: 'In Progress', color: 'bg-sky-100 text-sky-600' },
  { id: 'Under Review', label: 'Under Review', color: 'bg-amber-100 text-amber-600' },
  { id: 'Escalated', label: 'Escalated', color: 'bg-red-100 text-red-600' },
  { id: 'Completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-600' },
];

export const ALL_STATUS_OPTIONS: TaskStatus[] = [
  'Created',
  'Assigned',
  'Accepted',
  'In Progress',
  'Under Review',
  'Escalated',
  'Reassigned',
  'Completed',
  'Archived',
  'Todo',
  'Review',
];

export const normalizeStatusForColumns = (status: TaskStatus): TaskStatus => {
  if (status === 'Todo') return 'Created';
  if (status === 'Review') return 'Under Review';
  if (status === 'Reassigned') return 'Assigned';
  if (status === 'Archived') return 'Completed';
  return status;
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  Urgent: 'bg-red-500/10 text-red-500',
  High: 'bg-amber-500/10 text-amber-500',
  Medium: 'bg-blue-500/10 text-blue-500',
  Low: 'bg-slate-500/10 text-slate-500',
};
