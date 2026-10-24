/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
  Users,
  Bell,
  CreditCard,
  Clock,
  Activity,
  FileText,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardMetrics,
  getRecentActivity,
  DashboardMetrics,
  ActivityItem
} from '../services/dashboardService';
import { getGSTDashboardSummary, GSTDashboardSummary } from '../services/gstAnalyticsService';
import { getUserFirstName } from '../lib/userHelpers';
import { format } from 'date-fns';
import { getRevenueIntelligenceSnapshot, RevenueIntelligenceSnapshot } from '../services/revenueIntelligenceService';
const DashboardCharts = lazy(() => import('./DashboardCharts'));

const emptyMetrics: DashboardMetrics = {
  activeClients: 0,
  adminCount: 0,
  staffCount: 0,
  documentCount: 0,
  pendingApprovals: 0,
  overdueTasks: 0,
  filingCount: 0,
  revenue: 0,
  noticesPending: 0,
  totalTasks: 0,
  completedTasks: 0,
  inProgressTasks: 0,
  rejectedItems: 0,
  escalationAlerts: 0,
  overloadedStaff: 0,
  reassignmentEvents: 0,
  pendingWorkloads: 0,
  bottleneckTasks: 0,
  stalledApprovals: 0,
  overdueClusters: 0,
  ignoredEscalations: 0,
  noticeBacklogs: 0,
  orphanWorkflowCount: 0,
  noticeTaskSyncFailures: 0,
  billingContinuityGaps: 0,
  integrityHealthScore: 100,
};

const optionalResult = <T, F>(result: PromiseSettledResult<T>, fallback: F, label: string): T | F => {
  if (result.status === 'fulfilled') return result.value;
  console.warn(`[AUTH] Optional dashboard module unavailable: ${label}`, result.reason);
  return fallback;
};

export const Dashboard: React.FC = () => {
  const { user, session } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [gstSummary, setGstSummary] = useState<GSTDashboardSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [revenueSnapshot, setRevenueSnapshot] = useState<RevenueIntelligenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user?.firmId) return;

    setLoading(true);
    try {
      console.info('[AUTH] Dashboard bootstrap started', { firmId: user.firmId });
      const [metricsData, activityData, gstSummaryData, revenueData] = await Promise.allSettled([
        getDashboardMetrics(user.firmId),
        getRecentActivity(user.firmId, 10),
        getGSTDashboardSummary(user.firmId),
        getRevenueIntelligenceSnapshot(user.firmId),
      ] as const);
      const safeMetrics = optionalResult(metricsData, emptyMetrics, 'metrics');
      const safeActivity = optionalResult(activityData, [], 'recent activity');
      const safeGstSummary = optionalResult(gstSummaryData, null, 'GST summary');
      const safeRevenue = optionalResult(revenueData, null, 'revenue intelligence');
      setMetrics(safeMetrics);
      setActivity(safeActivity);
      setGstSummary(safeGstSummary);
      setRevenueSnapshot(safeRevenue);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.firmId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toFixed(0)}`;
  };

  const stats = metrics ? [
    {
      label: 'Active Clients',
      value: metrics.activeClients.toString(),
      icon: Users,
      color: 'text-gold',
      bg: 'bg-gold/10',
    },
    {
      label: 'Admins',
      value: metrics.adminCount.toString(),
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Staff',
      value: metrics.staffCount.toString(),
      icon: Users,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'Documents',
      value: metrics.documentCount.toString(),
      icon: FileText,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Pending Filings',
      value: metrics.filingCount.toString(),
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Active Notices',
      value: metrics.noticesPending.toString(),
      icon: Bell,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Revenue (MTD)',
      value: formatCurrency(metrics.revenue),
      icon: CreditCard,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
  ] : [
    { label: 'Active Clients', value: '-', icon: Users, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Admins', value: '-', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Staff', value: '-', icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Documents', value: '-', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Pending Filings', value: '-', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Active Notices', value: '-', icon: Bell, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Revenue (MTD)', value: '-', icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  const taskStats = metrics ? [
    { label: 'Total Tasks', value: metrics.totalTasks },
    { label: 'Completed', value: metrics.completedTasks },
    { label: 'In Progress', value: metrics.inProgressTasks },
    { label: 'Overdue', value: metrics.overdueTasks },
  ] : [
    { label: 'Total Tasks', value: 0 },
    { label: 'Completed', value: 0 },
    { label: 'In Progress', value: 0 },
    { label: 'Overdue', value: 0 },
  ];

  const revenueData = [
    { name: 'Jan', value: 0 },
    { name: 'Feb', value: 0 },
    { name: 'Mar', value: 0 },
    { name: 'Apr', value: 0 },
    { name: 'May', value: 0 },
    { name: 'Jun', value: 0 },
  ];

  if (metrics?.revenue) {
    revenueData[5].value = metrics.revenue / 100000;
  }

  return (
    <div className="caath-page h-full space-y-6 overflow-y-auto bg-matte-black p-4 text-slate-300 sm:p-6 lg:space-y-8 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text-gradient">
            Welcome back, {getUserFirstName(user, session)}
          </h2>
          <p className="mt-1 text-slate-500">Your clients, work, compliance and collections at a glance.</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Stats Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 shadow-xl hover:border-gold/30 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} border border-gold/10`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-bold text-white mt-1 group-hover:gold-text-gradient transition-all">{stat.value}</h3>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Suspense fallback={
              <div className="grid gap-8">
                <div className="h-[300px] bg-slate-900/30 rounded-2xl animate-pulse" />
                <div className="h-[200px] bg-slate-900/30 rounded-2xl animate-pulse" />
              </div>
            }>
              <DashboardCharts metrics={metrics || ({} as DashboardMetrics)} />
            </Suspense>
          </div>

          <div className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4">Task Summary</h3>
            <div className="space-y-3">
              {taskStats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{stat.label}</span>
                  <span className="text-sm font-bold text-white">{stat.value}</span>
                </div>
              ))}
            </div>
            {metrics?.pendingApprovals !== undefined && metrics.pendingApprovals > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-400 font-bold">Pending Approvals</span>
                  <span className="text-sm font-bold text-amber-400">{metrics.pendingApprovals}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
          <div className="rounded-3xl border border-slate-800 bg-matte-black-light p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">GST Overview</p>
                <h3 className="mt-2 text-2xl font-bold text-white">Returns and reconciliation</h3>
              </div>
              <div className="rounded-full border border-slate-800 bg-slate-950/80 px-4 py-2 text-xs uppercase tracking-widest text-slate-300">
                {gstSummary ? `${gstSummary.totalClientsWithGST} GST clients` : 'Loading...'}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Pending filings</p>
                <p className="mt-3 text-3xl font-bold text-white">{gstSummary?.pendingFilings ?? '-'}</p>
                <p className="text-xs text-slate-400 mt-2">GST returns still waiting for action across your ledger clients.</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Overdue filings</p>
                <p className="mt-3 text-3xl font-bold text-white">{gstSummary?.overdueFilings ?? '-'}</p>
                <p className="text-xs text-slate-400 mt-2">Late returns and filing delays increasing notice exposure.</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Mismatch exposure</p>
                <p className="mt-3 text-3xl font-bold text-white">{gstSummary ? `₹${gstSummary.totalTaxExposed.toLocaleString()}` : '-'}</p>
                  <p className="text-xs text-slate-400 mt-2">Amount currently flagged by reconciliation records.</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Clients with mismatches</p>
                <p className="mt-3 text-3xl font-bold text-white">{gstSummary?.clientsWithMismatches ?? '-'}</p>
                  <p className="text-xs text-slate-400 mt-2">Clients with reconciliation items requiring review.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-matte-black-light p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">GST Filing Status</p>
                  <h3 className="mt-2 text-2xl font-bold text-white">Client filing summary</h3>
                </div>
                <div className="rounded-full bg-slate-900/80 px-3 py-2 text-xs uppercase tracking-widest text-slate-300">Live</div>
              </div>
              <div className="mt-6 grid gap-3">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">GST clients filing on time</p>
                  <p className="mt-2 text-xl font-bold text-white">{gstSummary?.clientsFilingOnTime ?? '-'}</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total GST clients</p>
                  <p className="mt-2 text-xl font-bold text-white">{gstSummary?.totalClientsWithGST ?? '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div>
          <div className="rounded-2xl border border-slate-800 bg-matte-black-light p-4">
              <h3 className="text-lg font-bold text-white">Recent Activity</h3>
              <div className="mt-4 space-y-3">
                {activity.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No recent activity. Start by creating tasks or adding clients.</p>
                ) : (
                  activity.slice(0, 8).map((item) => (
                    <div key={item.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-matte-black transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">
                          <span className="font-bold text-gold">{item.userName}</span>
                          {' '}
                          <span className="text-slate-300">{item.action}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1 truncate">{item.details}</p>
                        <p className="text-[10px] text-slate-600 mt-1 uppercase">
                          {format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-matte-black-light rounded-2xl border border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Receivables Pending</p>
            <p className="text-2xl font-bold text-white mt-2">
              {revenueSnapshot ? formatCurrency(revenueSnapshot.kpis.receivablesPending) : '-'}
            </p>
          </div>
          <div className="p-5 bg-matte-black-light rounded-2xl border border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue Collections</p>
            <p className="text-2xl font-bold text-red-400 mt-2">
              {revenueSnapshot ? formatCurrency(revenueSnapshot.kpis.overdueCollections) : '-'}
            </p>
          </div>
          <div className="p-5 bg-matte-black-light rounded-2xl border border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Awaiting Billing</p>
            <p className="text-2xl font-bold text-amber-400 mt-2">
              {revenueSnapshot?.kpis.completedTasksAwaitingBilling ?? '-'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
