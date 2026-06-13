import { useCallback, useEffect, useState } from 'react';
import { ClientRow } from '../services/clientService';
import { TaskRow, getTasks } from '../services/taskService';
import { ClientComplianceSnapshot, getClientComplianceSnapshot } from '../services/clientComplianceService';

export interface ClientStats {
  totalBilled: number;
  pendingPayments: number;
  overdueAmount: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingFilings: number;
  overdueFilings: number;
  documentsCount: number;
  noticesCount: number;
}

export interface ClientProfileDataResult {
  tasks: TaskRow[];
  stats: ClientStats | null;
  complianceSnapshot: ClientComplianceSnapshot | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const useClientProfileData = (
  client: ClientRow | null,
  firmId: string | undefined
): ClientProfileDataResult => {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [complianceSnapshot, setComplianceSnapshot] = useState<ClientComplianceSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const loadClientData = useCallback(async () => {
    if (!client || !firmId) return;

    setLoading(true);
    try {
      const allTasks = await getTasks(firmId);
      const clientTasks = allTasks.filter((task) => task.client_id === client.id);
      setTasks(clientTasks);

      const today = new Date();
      const overdueTasks = clientTasks.filter((task) =>
        task.status !== 'Completed' && task.deadline && new Date(task.deadline) < today
      ).length;

      setStats({
        totalBilled: 1250000,
        pendingPayments: 185000,
        overdueAmount: 45000,
        activeTasks: clientTasks.filter((task) => task.status !== 'Completed').length,
        completedTasks: clientTasks.filter((task) => task.status === 'Completed').length,
        overdueTasks,
        upcomingFilings: 4,
        overdueFilings: 1,
        documentsCount: 28,
        noticesCount: 2,
      });

      setComplianceSnapshot(await getClientComplianceSnapshot(client.id, firmId));
    } catch (error) {
      console.error('Failed to load client data:', error);
    } finally {
      setLoading(false);
    }
  }, [client, firmId]);

  useEffect(() => {
    loadClientData();
  }, [client, loadClientData]);

  return {
    tasks,
    stats,
    complianceSnapshot,
    loading,
    refresh: loadClientData,
  };
};
