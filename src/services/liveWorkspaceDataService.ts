import { getDashboardMetrics } from './dashboardService';
import { getClients, getStaffMembers, getTasks, TaskRow } from './taskService';

export type LiveWorkspaceTask = {
  id: string;
  title: string;
  client: string;
  owner: string;
  sla: string;
  risk: 'Low' | 'Medium' | 'High';
  status: string;
};

export type LiveWorkspaceSnapshot = {
  tasks: LiveWorkspaceTask[];
  summary: {
    openTasks: number;
    urgentTasks: number;
    slaRisks: number;
    pendingApprovals: number;
    activeTeam: number;
    governanceTrust: number;
  };
  sourceStatus: 'live' | 'limited';
};

const CLOSED_STATUSES = new Set(['Completed', 'Archived']);

const formatSla = (deadline: string | null) => {
  if (!deadline) return 'No deadline';
  const remaining = new Date(deadline).getTime() - Date.now();
  if (remaining <= 0) return 'Overdue';
  const hours = Math.ceil(remaining / 3_600_000);
  if (hours < 24) return `${hours}h`;
  const days = Math.ceil(hours / 24);
  return days === 1 ? 'Tomorrow' : `${days}d`;
};

const taskRisk = (task: TaskRow): LiveWorkspaceTask['risk'] => {
  const overdue = Boolean(task.deadline && new Date(task.deadline).getTime() < Date.now());
  if (overdue || task.priority === 'Urgent' || task.status === 'Escalated') return 'High';
  if (task.priority === 'High' || task.priority === 'Medium') return 'Medium';
  return 'Low';
};

export const getLiveWorkspaceSnapshot = async (firmId: string): Promise<LiveWorkspaceSnapshot> => {
  const [tasksResult, clientsResult, staffResult, metricsResult] = await Promise.allSettled([
    getTasks(firmId),
    getClients(firmId),
    getStaffMembers(firmId),
    getDashboardMetrics(firmId),
  ] as const);

  const tasks = tasksResult.status === 'fulfilled' ? tasksResult.value : [];
  const clients = clientsResult.status === 'fulfilled' ? clientsResult.value : [];
  const staff = staffResult.status === 'fulfilled' ? staffResult.value : [];
  const metrics = metricsResult.status === 'fulfilled' ? metricsResult.value : null;
  const clientNames = new Map(clients.map((client) => [client.id, client.name]));
  const staffNames = new Map(staff.map((member) => [member.id, member.name]));
  const openTasks = tasks.filter((task) => !CLOSED_STATUSES.has(task.status));
  const liveTasks = openTasks
    .map((task) => ({
      id: task.id,
      title: task.title,
      client: task.client_id ? clientNames.get(task.client_id) || 'Client record' : 'Internal practice',
      owner: task.assigned_to ? staffNames.get(task.assigned_to) || 'Assigned team member' : 'Unassigned',
      sla: formatSla(task.deadline),
      risk: taskRisk(task),
      status: task.status,
    }))
    .sort((left, right) => {
      const rank = { High: 0, Medium: 1, Low: 2 };
      return rank[left.risk] - rank[right.risk];
    })
    .slice(0, 8);

  return {
    tasks: liveTasks,
    summary: {
      openTasks: metrics?.pendingWorkloads ?? openTasks.length,
      urgentTasks: liveTasks.filter((task) => task.risk === 'High').length,
      slaRisks: metrics?.escalationAlerts ?? liveTasks.filter((task) => task.sla === 'Overdue').length,
      pendingApprovals: metrics?.pendingApprovals ?? 0,
      activeTeam: metrics ? metrics.adminCount + metrics.staffCount : staff.length,
      governanceTrust: metrics?.integrityHealthScore ?? 0,
    },
    sourceStatus: tasksResult.status === 'fulfilled' && metricsResult.status === 'fulfilled' ? 'live' : 'limited',
  };
};
