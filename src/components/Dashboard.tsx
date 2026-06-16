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
  Cpu,
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
import GSTReconciliationSummary from './GSTReconciliationSummary';
import { getUserFirstName } from '../lib/userHelpers';
import OperationalPanel from './OperationalPanel';
import { format } from 'date-fns';
import { getRevenueIntelligenceSnapshot, RevenueIntelligenceSnapshot } from '../services/revenueIntelligenceService';
import { getServiceBoundaryGovernanceReport, ServiceBoundaryGovernanceReport } from '../services/architectureGovernanceService';
import { aiOperationsOrchestrator, AIOpsDashboardIntelligence } from '../domains/ai-operations';
import { AIOperationalInsightsPanel } from './AIOperationalInsightsPanel';
import { enterpriseCognitionOrchestrator, EnterpriseCognitiveInput } from '../domains/cognitive-operations';
import {
  enterpriseCognitiveDashboardOrchestrator,
  EnterpriseCognitiveDashboardViewModel,
} from '../domains/cognitive-dashboard';
import { EnterpriseCognitiveDashboardPanel } from './EnterpriseCognitiveDashboardPanel';
const DashboardCharts = lazy(() => import('./DashboardCharts'));

const emptyMetrics: DashboardMetrics = {
  activeClients: 0,
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
  const [governanceReport, setGovernanceReport] = useState<ServiceBoundaryGovernanceReport | null>(null);
  const [aiIntelligence, setAiIntelligence] = useState<AIOpsDashboardIntelligence | null>(null);
  const [cognitiveViewModel, setCognitiveViewModel] = useState<EnterpriseCognitiveDashboardViewModel | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user?.firmId) return;

    setLoading(true);
    try {
      console.info('[AUTH] Dashboard bootstrap started', { firmId: user.firmId });
      const [metricsData, activityData, gstSummaryData, revenueData, governanceData] = await Promise.allSettled([
        getDashboardMetrics(user.firmId),
        getRecentActivity(user.firmId, 10),
        getGSTDashboardSummary(user.firmId),
        getRevenueIntelligenceSnapshot(user.firmId),
        getServiceBoundaryGovernanceReport(),
      ] as const);
      const safeMetrics = optionalResult(metricsData, emptyMetrics, 'metrics');
      const safeActivity = optionalResult(activityData, [], 'recent activity');
      const safeGstSummary = optionalResult(gstSummaryData, null, 'GST summary');
      const safeRevenue = optionalResult(revenueData, null, 'revenue intelligence');
      const safeGovernance = optionalResult(governanceData, null, 'service boundary governance');
      setMetrics(safeMetrics);
      setActivity(safeActivity);
      setGstSummary(safeGstSummary);
      setRevenueSnapshot(safeRevenue);
      setGovernanceReport(safeGovernance);
      if (safeGstSummary) {
        const cognitiveInput = buildCognitiveInput(user.firmId, safeMetrics, safeGstSummary);
        const cognitiveOutput = enterpriseCognitionOrchestrator.evaluate(cognitiveInput);
        setCognitiveViewModel(
          enterpriseCognitiveDashboardOrchestrator.toViewModel({ cognitiveOutput }),
        );
      } else {
        setCognitiveViewModel(null);
      }
      if (user) {
        try {
          const aiData = await aiOperationsOrchestrator.getDashboardIntelligence(user);
          setAiIntelligence(aiData);
        } catch (aiError) {
          console.warn('[AUTH] Optional dashboard module unavailable: AI operations intelligence', aiError);
          setAiIntelligence(null);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.firmId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const dispatchNudges = async () => {
      if (!user) return;
      const dayKey = `caath:aiops:nudges:${user.id}:${new Date().toISOString().slice(0, 10)}`;
      if (window.localStorage.getItem(dayKey)) return;
      try {
        await aiOperationsOrchestrator.dispatchOperationalNudges(user);
        window.localStorage.setItem(dayKey, 'true');
      } catch (error) {
        console.warn('[AUTH] Optional dashboard module unavailable: AI operational nudges', error);
      }
    };
    dispatchNudges();
  }, [user]);

  useEffect(() => {
    const onQuickAction = async (event: Event) => {
      const custom = event as CustomEvent<{ action?: string }>;
      if (!user || custom.detail?.action !== 'dispatch-ai-nudges') return;
      try {
        await aiOperationsOrchestrator.dispatchOperationalNudges(user);
      } catch (error) {
        console.warn('[AUTH] Optional dashboard module unavailable: AI operational nudges', error);
      }
      await loadDashboardData();
    };
    window.addEventListener('caath:quick-action', onQuickAction);
    return () => window.removeEventListener('caath:quick-action', onQuickAction);
  }, [user, loadDashboardData]);

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
      trend: '+0%',
    },
    {
      label: 'Pending Filings',
      value: metrics.filingCount.toString(),
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      trend: '+0',
    },
    {
      label: 'Active Notices',
      value: metrics.noticesPending.toString(),
      icon: Bell,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      trend: '+0',
    },
    {
      label: 'Revenue (MTD)',
      value: formatCurrency(metrics.revenue),
      icon: CreditCard,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      trend: '+0%',
    },
  ] : [
    { label: 'Active Clients', value: '-', icon: Users, color: 'text-gold', bg: 'bg-gold/10', trend: '-0%' },
    { label: 'Pending Filings', value: '-', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', trend: '-0' },
    { label: 'Active Notices', value: '-', icon: Bell, color: 'text-red-500', bg: 'bg-red-500/10', trend: '-0' },
    { label: 'Revenue (MTD)', value: '-', icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: '-0%' },
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

  const showCognitivePanel = !loading && cognitiveViewModel !== null;

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full bg-matte-black text-slate-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text-gradient">
            Welcome back, {getUserFirstName(user, session)}
          </h2>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-slate-500">Here's what's happening in your practice today.</p>
            <div className="flex items-center gap-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <Activity className="w-3 h-3" />
              Portal Sync: Online
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-matte-black-light border border-slate-800 rounded-xl">
            <Cpu className="w-4 h-4 text-gold" />
            <span className="text-xs font-bold text-slate-400">AI Engine: <span className="text-emerald-500 uppercase">Active</span></span>
          </div>
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

      {/* Main Content Grid */}
      {!loading && (
        <AIOperationalInsightsPanel intelligence={aiIntelligence} loading={loading} />
      )}

      {showCognitivePanel && cognitiveViewModel && (
        <EnterpriseCognitiveDashboardPanel viewModel={cognitiveViewModel} />
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
            <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Escalation Alerts</span>
                <span className="font-bold text-amber-400">{metrics?.escalationAlerts ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Overloaded Staff</span>
                <span className="font-bold text-red-400">{metrics?.overloadedStaff ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Reassignment Events</span>
                <span className="font-bold text-gold">{metrics?.reassignmentEvents ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Pending Workloads</span>
                <span className="font-bold text-white">{metrics?.pendingWorkloads ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Workflow Integrity Score</span>
                <span className="font-bold text-emerald-300">{metrics?.integrityHealthScore ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Orphan Workflows</span>
                <span className="font-bold text-amber-300">{metrics?.orphanWorkflowCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Notice/Task Sync Failures</span>
                <span className="font-bold text-red-300">{metrics?.noticeTaskSyncFailures ?? 0}</span>
              </div>
            </div>          </div>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
          <div className="rounded-3xl border border-slate-800 bg-matte-black-light p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">GST Notice-Risk Intelligence</p>
                <h3 className="mt-2 text-2xl font-bold text-white">Reconciliation & compliance health</h3>
              </div>
              <div className="rounded-full border border-slate-800 bg-slate-950/80 px-4 py-2 text-xs uppercase tracking-widest text-slate-300">
                {gstSummary ? `${gstSummary.totalClientsWithGST} GST clients` : 'Loading intelligence...'}
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
                <p className="text-xs text-slate-400 mt-2">Projected tax exposure from notice-risk and reconciliation mismatches.</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Clients with mismatches</p>
                <p className="mt-3 text-3xl font-bold text-white">{gstSummary?.clientsWithMismatches ?? '-'}</p>
                <p className="text-xs text-slate-400 mt-2">Clients flagged with potential GST reconciliation or filing drift.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <GSTReconciliationSummary />
            <div className="rounded-3xl border border-slate-800 bg-matte-black-light p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">GST Practice Signals</p>
                  <h3 className="mt-2 text-2xl font-bold text-white">Notice risk pulse</h3>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OperationalPanel />
          </div>
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
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div className="p-5 bg-matte-black-light rounded-2xl border border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Boundary Integrity</p>
            <p className={`text-2xl font-bold mt-2 ${governanceReport?.healthy ? 'text-emerald-400' : 'text-red-400'}`}>
              {governanceReport ? (governanceReport.healthy ? 'Healthy' : 'Attention') : '-'}
            </p>
            {governanceReport && (
              <p className="text-xs text-slate-500 mt-1">
                {governanceReport.findings.length} governance finding(s)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function buildCognitiveInput(
  firmId: string,
  metricsData: DashboardMetrics,
  gstSummaryData: GSTDashboardSummary,
): EnterpriseCognitiveInput {
  return {
    tenantId: firmId,
    objectives: [
      {
        id: 'sla-stability',
        name: 'SLA Stabilization',
        domain: 'operations',
        targetValue: 95,
        currentValue: Math.max(0, 100 - Math.min(metricsData.overdueTasks * 4, 100)),
        weight: 0.35,
        status: metricsData.overdueTasks > 8 ? 'off-track' : metricsData.overdueTasks > 3 ? 'at-risk' : 'on-track',
      },
      {
        id: 'gst-workload-harmony',
        name: 'GST Workload Distribution',
        domain: 'gst-intelligence',
        targetValue: 90,
        currentValue: Math.max(0, 100 - Math.min(gstSummaryData.pendingFilings + gstSummaryData.overdueFilings, 100)),
        weight: 0.3,
        status:
          gstSummaryData.overdueFilings > 10
            ? 'off-track'
            : gstSummaryData.overdueFilings > 4
              ? 'at-risk'
              : 'on-track',
      },
      {
        id: 'escalation-reduction',
        name: 'Escalation Reduction',
        domain: 'coordination',
        targetValue: 92,
        currentValue: Math.max(0, 100 - Math.min(metricsData.escalationAlerts * 10, 100)),
        weight: 0.2,
        status: metricsData.escalationAlerts > 4 ? 'off-track' : metricsData.escalationAlerts > 1 ? 'at-risk' : 'on-track',
      },
      {
        id: 'governance-consistency',
        name: 'Governance Consistency',
        domain: 'governance',
        targetValue: 98,
        currentValue: metricsData.integrityHealthScore,
        weight: 0.15,
        status: metricsData.integrityHealthScore < 75 ? 'off-track' : metricsData.integrityHealthScore < 90 ? 'at-risk' : 'on-track',
      },
    ],
    workloadSignals: [
      {
        id: 'gst-reconciliation-friction',
        type: 'bottleneck',
        domain: 'gst-intelligence',
        description: 'Peak filing window is concentrating reconciliation queues.',
        impactScore: Math.min(100, gstSummaryData.pendingFilings * 3 + gstSummaryData.overdueFilings * 5),
        recurrenceScore: Math.min(100, gstSummaryData.overdueFilings * 6),
      },
      {
        id: 'escalation-pressure',
        type: 'coordination-friction',
        domain: 'operations-center',
        description: 'Escalation alerts indicate workflow handoff stress between pods.',
        impactScore: Math.min(100, metricsData.escalationAlerts * 14),
        recurrenceScore: Math.min(100, metricsData.reassignmentEvents * 10),
      },
    ],
    intentSignals: [
      {
        id: 'intent-sla',
        workflow: 'SLA-critical task routing',
        inferredIntent: 'Protect due-date commitments for high-risk clients',
        confidence: metricsData.overdueTasks > 8 ? 0.58 : 0.78,
        objectiveLinks: ['sla-stability', 'escalation-reduction'],
      },
      {
        id: 'intent-gst',
        workflow: 'GST reconciliation triage',
        inferredIntent: 'Stabilize compliance backlog without adding escalation load',
        confidence: gstSummaryData.overdueFilings > 8 ? 0.61 : 0.81,
        objectiveLinks: gstSummaryData.overdueFilings > 12 ? [] : ['gst-workload-harmony'],
      },
    ],
    simulationScenarios: [
      {
        id: 'reconciliation-pod-reshape',
        name: 'Temporary reconciliation pod restructuring',
        scope: 'GST peak filing operations',
        expectedEfficiencyDelta: 11.5,
        expectedSlaDelta: 8.2,
        investmentLevel: 'medium',
      },
      {
        id: 'cross-team-escalation-buffer',
        name: 'Cross-team escalation buffer lane',
        scope: 'Operations center handoff load',
        expectedEfficiencyDelta: 7.1,
        expectedSlaDelta: 6.4,
        investmentLevel: 'low',
      },
    ],
  };
}
