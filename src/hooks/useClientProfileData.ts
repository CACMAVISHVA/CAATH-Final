import { useCallback, useEffect, useState } from 'react';
import { ClientRow } from '../services/clientService';
import { TaskRow, getTasks } from '../services/taskService';
import { ClientComplianceSnapshot, getClientComplianceSnapshot } from '../services/clientComplianceService';
import { getClientFinancialSummary } from '../services/invoice/invoiceQueries';

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
      const [allTasks, financialSummary, snapshot] = await Promise.all([
        getTasks(firmId),
        getClientFinancialSummary(client.id),
        getClientComplianceSnapshot(client.id, firmId),
      ]);
      const clientTasks = allTasks.filter((task) => task.client_id === client.id);
      setTasks(clientTasks);

      const today = new Date();
      const overdueTasks = clientTasks.filter((task) =>
        task.status !== 'Completed' && task.deadline && new Date(task.deadline) < today
      ).length;

      setStats({
        totalBilled: financialSummary.totalBilled,
        pendingPayments: financialSummary.totalPending,
        overdueAmount: financialSummary.overdueInvoices > 0
          ? financialSummary.totalPending
          : 0,
        activeTasks: clientTasks.filter((task) => task.status !== 'Completed').length,
        completedTasks: clientTasks.filter((task) => task.status === 'Completed').length,
        overdueTasks,
        upcomingFilings: snapshot.items.filter((item) => item.status === 'upcoming').length,
        overdueFilings: snapshot.items.filter((item) => item.status === 'overdue').length,
        documentsCount: 0,
        noticesCount: snapshot.items.find((item) => item.domain === 'Notices')?.pendingActions || 0,
      });

      setComplianceSnapshot(snapshot);
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
