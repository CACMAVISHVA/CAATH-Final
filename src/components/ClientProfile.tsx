/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  Mail,
  Phone,
  Calendar,
  FileText,
  CreditCard,
  CheckSquare,
  ClipboardCheck,
  AlertCircle,
  Clock,
  Users,
  Shield,
  Activity,
  FolderOpen,
  DollarSign,
  Bell,
  ExternalLink,
  Key,
  Plus,
  Trash2,
} from 'lucide-react';
import { ModalLoader } from './loaders/ModalLoader';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { ClientRow } from '../services/clientService';
import { TaskRow } from '../services/taskService';
import {
  PortalCredentialSummary,
  canUsePortalLauncher,
  getClientPortalCredentials,
  PORTAL_CONFIG,
  launchPortal,
} from '../services/portalLauncherService';
import { useClientProfileData } from '../hooks/useClientProfileData';
import { playSound } from '../services/soundService';
import {
  ClientComplianceSnapshot,
  getClientComplianceSnapshot,
} from '../services/clientComplianceService';
import { generateComplianceInsights } from '../services/complianceAIService';
import { AIInsightPanel } from './AIInsightPanel';
import { ClientProfileStats } from './client-profile/ClientProfileStats';
import { ClientProfileHeader } from './client-profile/ClientProfileHeader';

const DocumentVault = lazy(() => import('./DocumentVault'));

interface ClientProfileProps {
  client: ClientRow | null;
  isOpen: boolean;
  onClose: () => void;
}

type ProfileTab = 'overview' | 'gst' | 'mca' | 'documents' | 'notices' | 'tasks' | 'billing' | 'staff' | 'compliance' | 'portal' | 'timeline';

// Mock data types (would come from services in production)
interface ClientStats {
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

interface ClientTimelineEvent {
  id: string;
  type: 'compliance' | 'billing' | 'task' | 'document' | 'notice' | 'meeting';
  title: string;
  description: string;
  date: string;
  icon: string;
}

const RISK_COLORS = {
  Low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  High: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export const ClientProfile: React.FC<ClientProfileProps> = ({
  client,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const {
    tasks,
    stats,
    complianceSnapshot,
  } = useClientProfileData(client, user?.firmId);
  const [portalCredentials, setPortalCredentials] = useState<PortalCredentialSummary[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);

  const loadPortalCredentials = useCallback(async () => {
    if (!client) return;
    setPortalLoading(true);
    try {
      const creds = await getClientPortalCredentials(client.id);
      setPortalCredentials(creds);
    } catch (error) {
      console.error('Failed to load portal credentials:', error);
    } finally {
      setPortalLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (activeTab === 'portal' && client) {
      loadPortalCredentials();
    }
  }, [activeTab, client, loadPortalCredentials]);

  const canUsePortal = useMemo(() => canUsePortalLauncher(user), [user]);

  const handleLaunchPortal = useCallback(async (credentialId: string) => {
    if (!user || !client || !canUsePortal) return;
    const result = await launchPortal(credentialId, user, client.id);
    window.open(result.url, '_blank');
  }, [canUsePortal, client, user]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const healthScore = useMemo(() => {
    if (!stats) return 0;
    let score = 100;
    if (stats.overdueAmount > 0) score -= 20;
    if (stats.overdueTasks > 0) score -= 15;
    if (stats.overdueFilings > 0) score -= 25;
    if (stats.pendingPayments > 0) score -= 10;
    return Math.max(0, score);
  }, [stats]);

  const complianceInsights = useMemo(
    () => (complianceSnapshot ? generateComplianceInsights(complianceSnapshot) : []),
    [complianceSnapshot]
  );

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-[800px] max-w-full bg-matte-black-light border-l border-slate-800 flex flex-col h-full animate-in slide-in-from-right duration-300">
        <ClientProfileHeader
          client={client}
          stats={stats}
          healthScore={healthScore}
          onClose={onClose}
        />

        {/* Tabs */}
        <div className="flex border-b border-slate-800 overflow-x-auto">
          {([
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'gst', label: 'GST', icon: ClipboardCheck },
            { id: 'mca', label: 'MCA', icon: Building2 },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'notices', label: 'Notices', icon: Bell },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'billing', label: 'Billing', icon: CreditCard },
            { id: 'staff', label: 'Staff Allocation', icon: Users },
            { id: 'compliance', label: 'Compliance Timeline', icon: ClipboardCheck },
            { id: 'portal', label: 'Portal', icon: ExternalLink },
            { id: 'timeline', label: 'Activity History', icon: Clock },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "text-gold border-b-2 border-gold bg-matte-black/50"
                    : "text-slate-500 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {complianceSnapshot && (
                <>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="p-4 bg-matte-black rounded-xl border border-slate-800">
                      <p className="text-xs text-slate-500">Compliance Health</p>
                      <p className={cn(
                        'mt-2 text-2xl font-bold',
                        complianceSnapshot.riskScore >= 60 ? 'text-red-400' : complianceSnapshot.riskScore >= 30 ? 'text-amber-400' : 'text-emerald-400'
                      )}>
                        {100 - complianceSnapshot.riskScore}
                      </p>
                    </div>
                    <div className="p-4 bg-matte-black rounded-xl border border-slate-800">
                      <p className="text-xs text-slate-500">Pending Actions</p>
                      <p className="mt-2 text-2xl font-bold text-white">{complianceSnapshot.pendingActions}</p>
                    </div>
                    <div className="p-4 bg-matte-black rounded-xl border border-slate-800">
                      <p className="text-xs text-slate-500">Last Filing Activity</p>
                      <p className="mt-2 text-sm font-bold text-white">{formatDate(complianceSnapshot.lastActivity)}</p>
                    </div>
                    <div className="p-4 bg-matte-black rounded-xl border border-slate-800">
                      <p className="text-xs text-slate-500">Notice Alerts</p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        {complianceSnapshot.items.find((item) => item.domain === 'Notices')?.pendingActions || 0}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-matte-black rounded-xl border border-slate-800">
                    <h3 className="text-sm font-bold text-white mb-4">Compliance Command Center</h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {complianceSnapshot.items.map((item) => (
                        <div key={item.domain} className="flex items-center justify-between border border-slate-800 p-3">
                          <div>
                            <p className="text-sm font-bold text-white">{item.domain}</p>
                            <p className="text-xs text-slate-500">{item.label}</p>
                          </div>
                          <span className={cn(
                            'px-2 py-1 text-[10px] font-bold uppercase',
                            item.status === 'compliant' && 'bg-emerald-500/10 text-emerald-400',
                            item.status === 'upcoming' && 'bg-amber-500/10 text-amber-400',
                            item.status === 'overdue' && 'bg-red-500/10 text-red-400'
                          )}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <AIInsightPanel insights={complianceInsights} />
                </>
              )}
              {/* Contact Information */}
              <div className="p-4 bg-matte-black rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {client.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500">Email</p>
                        <p className="text-sm text-white">{client.email}</p>
                      </div>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500">Phone</p>
                        <p className="text-sm text-white">{client.phone}</p>
                      </div>
                    </div>
                  )}
                  {client.contact_person && (
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-xs text-slate-500">Contact Person</p>
                        <p className="text-sm text-white">{client.contact_person}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500">Created</p>
                      <p className="text-sm text-white">{formatDate(client.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="p-4 bg-matte-black rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-4">Active Services</h3>
                <div className="flex flex-wrap gap-2">
                  {(client.services || []).map((service) => (
                    <span
                      key={service}
                      className="px-3 py-1 bg-gold/10 text-gold rounded-lg text-xs font-bold"
                    >
                      {service}
                    </span>
                  ))}
                  {(client.services || []).length === 0 && (
                    <span className="text-sm text-slate-500">No services assigned</span>
                  )}
                </div>
              </div>

              {/* Alerts */}
              {(stats?.overdueFilings || 0) > 0 && (
                <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <div>
                      <p className="text-sm font-bold text-red-400">Compliance Overdue</p>
                      <p className="text-xs text-slate-400">{stats?.overdueFilings} filing(s) past due date</p>
                    </div>
                  </div>
                </div>
              )}

              {(stats?.overdueTasks || 0) > 0 && (
                <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-sm font-bold text-amber-400">Tasks Delayed</p>
                      <p className="text-xs text-slate-400">{stats?.overdueTasks} task(s) overdue</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Tasks ({tasks.length})</h3>
              </div>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No tasks for this client</div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-matte-black rounded-lg border border-slate-800 hover:border-gold/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">{task.title}</p>
                          <p className="text-xs text-slate-500">{task.category || 'Uncategorized'}</p>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            task.status === 'Completed' ? "bg-emerald-500/10 text-emerald-400" :
                            task.status === 'In Progress' ? "bg-blue-500/10 text-blue-400" :
                            task.status === 'Review' ? "bg-amber-500/10 text-amber-400" :
                            "bg-slate-500/10 text-slate-400"
                          )}>
                            {task.status}
                          </span>
                          {task.deadline && (
                            <p className={cn(
                              "text-[10px] mt-1",
                              new Date(task.deadline) < new Date() && task.status !== 'Completed'
                                ? "text-red-400"
                                : "text-slate-500"
                            )}>
                              Due: {formatDate(task.deadline)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-4">
              {complianceSnapshot && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="p-4 bg-matte-black rounded-lg border border-slate-800">
                      <p className="text-xs text-slate-500">Risk Score</p>
                      <p className="mt-1 text-2xl font-bold text-white">{complianceSnapshot.riskScore}</p>
                    </div>
                    <div className="p-4 bg-matte-black rounded-lg border border-slate-800">
                      <p className="text-xs text-slate-500">Upcoming Dues</p>
                      <p className="mt-1 text-2xl font-bold text-white">{complianceSnapshot.dueCalendar.length}</p>
                    </div>
                    <div className="p-4 bg-matte-black rounded-lg border border-slate-800">
                      <p className="text-xs text-slate-500">History Entries</p>
                      <p className="mt-1 text-2xl font-bold text-white">{complianceSnapshot.filingHistory.length}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="p-4 bg-matte-black rounded-lg border border-slate-800">
                      <h3 className="mb-4 text-sm font-bold text-white">Due Calendar</h3>
                      <div className="space-y-2">
                        {complianceSnapshot.dueCalendar.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-300">{item.title}</span>
                            <span className={item.status === 'overdue' ? 'text-red-400' : 'text-amber-400'}>
                              {formatDate(item.dueDate)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-matte-black rounded-lg border border-slate-800">
                      <h3 className="mb-4 text-sm font-bold text-white">Compliance Heatmap</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {complianceSnapshot.items.map((item) => (
                          <div
                            key={item.domain}
                            title={item.domain}
                            className={cn(
                              'h-12 border border-slate-800',
                              item.status === 'compliant' && 'bg-emerald-500/20',
                              item.status === 'upcoming' && 'bg-amber-500/20',
                              item.status === 'overdue' && 'bg-red-500/20'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-matte-black rounded-lg border border-slate-800">
                    <h3 className="mb-4 text-sm font-bold text-white">Filing History</h3>
                    <div className="space-y-2">
                      {complianceSnapshot.filingHistory.map((item) => (
                        <div key={item.id} className="flex items-center justify-between border-b border-slate-800 py-2 text-sm">
                          <span className="text-white">{item.title} {item.period}</span>
                          <span className="text-slate-500">{item.status} | Due {formatDate(item.dueDate)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'gst' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">GST Status</h3>
              <p className="text-sm text-slate-400">GST filing health and due activity are reflected in the compliance command center.</p>
            </div>
          )}

          {activeTab === 'mca' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">MCA Status</h3>
              <p className="text-sm text-slate-400">MCA obligations are tracked through assigned ROC tasks and portal activity.</p>
            </div>
          )}

          {activeTab === 'notices' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Notice Status</h3>
              <p className="text-sm text-slate-400">
                Active notices: {complianceSnapshot?.items.find((item) => item.domain === 'Notices')?.pendingActions || 0}
              </p>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Staff Allocation</h3>
              <p className="text-sm text-slate-400">Assigned staff and workload analytics will be shown here as allocation data matures.</p>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-matte-black rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Total Billed</p>
                  <p className="text-lg font-bold text-emerald-400">{formatINR(stats?.totalBilled || 0)}</p>
                </div>
                <div className="p-4 bg-matte-black rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Pending</p>
                  <p className="text-lg font-bold text-amber-400">{formatINR(stats?.pendingPayments || 0)}</p>
                </div>
                <div className="p-4 bg-matte-black rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Overdue</p>
                  <p className="text-lg font-bold text-red-400">{formatINR(stats?.overdueAmount || 0)}</p>
                </div>
              </div>
              <div className="text-center py-8 text-slate-500 text-sm">
                Billing history would be loaded from the billing service
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="h-full -m-4">
              <Suspense fallback={<ModalLoader label="Loading client documents" />}>
                <DocumentVault clientId={client.id} />
              </Suspense>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {complianceSnapshot?.timeline.map((event) => (
                <div key={event.id} className="border-l border-slate-700 pl-4">
                  <p className="text-sm font-bold text-white">{event.title}</p>
                  <p className="text-xs text-slate-500">{event.description}</p>
                  <p className="mt-1 text-[10px] text-slate-600">{formatDate(event.date)}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'portal' && (
            <div className="space-y-6">
              {/* Portal Quick Launch Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['GST', 'MCA', 'IncomeTax', 'ICEGATE'] as const).map((portalType) => {
                  const config = PORTAL_CONFIG[portalType];
                  const credential = portalCredentials.find(c => c.portal_type === portalType);
                  return (
                    <div
                      key={portalType}
                      className={cn(
                        "p-4 rounded-xl border transition-all hover:border-gold/50",
                        credential
                          ? "bg-matte-black border-slate-800 hover:shadow-lg hover:shadow-gold/5"
                          : "bg-matte-black/50 border-slate-800/50 border-dashed opacity-60",
                        !credential || !canUsePortal ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                      )}
                      onClick={async () => {
                        playSound('click');
                        if (credential && canUsePortal) {
                          await handleLaunchPortal(credential.id);
                        }
                      }}
                      title={!canUsePortal ? 'Insufficient portal access' : undefined}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.color.replace('bg-', 'bg-') + '/20')}>
                          <ExternalLink className={cn("w-4 h-4", config.color.replace('bg-', 'text-'))} />
                        </div>
                        {credential && (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase">Connected</span>
                        )}
                        {!credential && (
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Missing</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white">{config.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-1">{config.description}</p>
                      {credential?.last_login && (
                        <p className="text-[10px] text-slate-600 mt-2">
                          Last: {new Date(credential.last_login).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Portal Credentials Table */}
              <div className="bg-matte-black rounded-xl border border-slate-800">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-gold" />
                    Stored Credentials
                  </h3>
                  <button
                    className="px-3 py-1.5 bg-gold text-matte-black rounded-lg text-xs font-bold flex items-center gap-1"
                    onClick={() => playSound('click')}
                  >
                    <Plus className="w-3 h-3" />
                    Add Credential
                  </button>
                </div>
                {portalLoading ? (
                  <div className="p-8 text-center text-slate-500">Loading credentials...</div>
                ) : portalCredentials.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    No portal credentials stored. Add credentials to enable quick launch.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="border-b border-slate-800">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Portal</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Username</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">GSTIN/PAN</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Last Login</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Last Filing</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {portalCredentials.map((cred) => {
                        const config = PORTAL_CONFIG[cred.portal_type];
                        return (
                          <tr key={cred.id} className="hover:bg-matte-black/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-6 h-6 rounded flex items-center justify-center", config.color.replace('bg-', 'bg-') + '/20')}>
                                  <ExternalLink className={cn("w-3 h-3", config.color.replace('bg-', 'text-'))} />
                                </div>
                                <span className="text-sm font-bold text-white">{cred.portal_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400">{cred.username}</td>
                            <td className="px-4 py-3 text-sm text-slate-400">
                              {cred.gstin || cred.pan || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500">
                              {cred.last_login ? new Date(cred.last_login).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500">
                              {cred.last_filing_date ? new Date(cred.last_filing_date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={async () => {
                                    playSound('click');
                                    await handleLaunchPortal(cred.id);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-gold transition-colors"
                                  title="Launch Portal"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Security Notice */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-400">Security Notice</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Portal credentials are encrypted at rest. Passwords are masked by default.
                      Only authorized staff can access credentials for assigned clients.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;
