/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { playSound } from '../services/soundService';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { usePortalActivity } from '../hooks/usePortalActivity';
import { FirmOperationsPanel, FirmRow } from './god-admin/FirmOperationsPanel';
import { SubscriptionManagementPanel, SubscriptionRow } from './god-admin/SubscriptionManagementPanel';
import { AuditLogsPanel, AuditRow } from './god-admin/AuditLogsPanel';
import { SystemNoticePublisher } from './god-admin/SystemNoticePublisher';
import { FirmConfirmationModal } from './god-admin/FirmConfirmationModal';
import { DrilldownModals } from './god-admin/DrilldownModals';
import { sanitizeAuditDetailsForPlatform } from '../services/dataSovereigntyService';
import { ControlTowerModule } from './god-admin/ControlTowerModule';
import { UsageMonitoringModule } from './god-admin/UsageMonitoringModule';
import { PlatformConfigModule } from './god-admin/PlatformConfigModule';
import { FirmProvisioningPanel } from './god-admin/FirmProvisioningPanel';
import { RuntimeHealthSnapshot, runtimeKernel } from '../runtime/production';
import {
  loadControlTowerSnapshot,
  loadUsageMonitoringSnapshot,
  loadPlatformConfigSnapshot,
  ControlTowerSnapshot,
  UsageMonitoringSnapshot,
  PlatformConfigSnapshot,
} from '../services/godAdminPlatformSegmentationService';
import { formatTenantDisplayId } from '../lib/tenantIdentity';

interface GodAdminDashboardProps {
  activeTab: string;
}

export const GodAdminDashboard: React.FC<GodAdminDashboardProps> = ({ activeTab }) => {
  const { user } = useAuth();
  const toast = useToast();

  // Data state
  const [firms, setFirms] = useState<FirmRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [controlTowerSnapshot, setControlTowerSnapshot] = useState<ControlTowerSnapshot>({
    activeFirms: 0,
    suspendedFirms: 0,
    pendingSubscriptions: 0,
    activeRevenue: 0,
    criticalAlerts: 0,
    orchestrationHealth: 'healthy',
  });
  const [usageSnapshot, setUsageSnapshot] = useState<UsageMonitoringSnapshot>({
    workflowVolume30d: 0,
    telemetryLoad30d: 0,
    automationUsage30d: 0,
    connectorEvents30d: 0,
    activeUsersEstimate: 0,
    storageUsageEstimateMb: 0,
  });
  const [configSnapshot, setConfigSnapshot] = useState<PlatformConfigSnapshot>({
    activePlans: 0,
    pendingEntitlements: 0,
    governanceEvents7d: 0,
    featureActivationRate: 0,
  });
  const [runtimeHealth, setRuntimeHealth] = useState<RuntimeHealthSnapshot>(runtimeKernel.health());

  // Portal activity
  const { loading: portalLoading, summary: portalSummary, recent: portalRecent } = usePortalActivity();

  // UI state
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [noticeText, setNoticeText] = useState('');

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; firm: FirmRow | null; action: 'suspend' | 'reactivate'; reason: string }>({
    isOpen: false,
    firm: null,
    action: 'suspend',
    reason: '',
  });

  const [drilldownModal, setDrilldownModal] = useState<{
    isOpen: boolean;
    type: 'active' | 'suspended' | 'pending' | 'revenue';
    title: string;
  }>({
    isOpen: false,
    type: 'active',
    title: '',
  });

  const [drilldownSearch, setDrilldownSearch] = useState('');

  // Computed metrics
  // Portal metrics
  const portalTop = Object.entries(portalSummary?.byPortal || {}).sort((a: any, b: any) => b[1] - a[1])[0];

  // Load platform data
  const loadPlatformData = async () => {
    setIsLoading(true);
    setMessage(null);

    const [firmResult, subscriptionResult, auditResult, controlTower, usage, config] = await Promise.all([
      supabase.from('firms').select('id, status, created_at').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('id, firm_id, plan, status, amount, starts_at, expires_at').order('created_at', { ascending: false }),
      supabase.from('audit_logs').select('id, firm_id, user_name, user_role, action, entity_type, details, created_at').order('created_at', { ascending: false }).limit(20),
      loadControlTowerSnapshot(),
      loadUsageMonitoringSnapshot(),
      loadPlatformConfigSnapshot(),
    ]);

    if (firmResult.error) setMessage(firmResult.error.message);
    else setFirms((firmResult.data || []) as FirmRow[]);

    if (!subscriptionResult.error) {
      setSubscriptions((subscriptionResult.data || []) as unknown as SubscriptionRow[]);
    }

    if (!auditResult.error) {
      const sanitizedAuditLogs = (auditResult.data || []).map((log) => ({
        ...log,
        details: sanitizeAuditDetailsForPlatform(typeof log.details === 'string' ? log.details : ''),
      }));
      setAuditLogs(sanitizedAuditLogs as AuditRow[]);
    }
    setControlTowerSnapshot(controlTower);
    setUsageSnapshot(usage);
    setConfigSnapshot(config);

    setIsLoading(false);
  };

  useEffect(() => {
    loadPlatformData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setRuntimeHealth(runtimeKernel.health()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  // Audit logging
  const writePlatformAudit = async (params: { firmId?: string; action: string; entityType: string; entityId?: string; details: string }) => {
    if (!user) return;

    await supabase.from('audit_logs').insert([{
      firm_id: params.firmId ?? null,
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      details: params.details,
    }]);
  };

  // Firm operations
  const handleConfirmAction = async () => {
    if (!user || !confirmModal.firm) return;
    const { firm, action, reason } = confirmModal;
    const nextStatus = action === 'suspend' ? 'Suspended' : 'Active';
    setBusyAction(`firm-${firm.id}`);

    try {
      const updateData: Record<string, unknown> = {
        status: nextStatus,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (action === 'suspend') {
        updateData.suspension_reason = reason || 'No reason provided';
        updateData.suspended_at = new Date().toISOString();
        updateData.suspended_by = user.id;
        updateData.reactivated_at = null;
        updateData.reactivated_by = null;
      } else {
        updateData.reactivated_at = new Date().toISOString();
        updateData.reactivated_by = user.id;
        updateData.suspension_reason = null;
        updateData.suspended_at = null;
        updateData.suspended_by = null;
      }

      const { error } = await supabase.from('firms').update(updateData).eq('id', firm.id);
      if (error) throw error;

      await writePlatformAudit({
        firmId: firm.id,
        action: nextStatus === 'Suspended' ? 'Firm Suspended' : 'Firm Reactivated',
        entityType: 'Firm',
        entityId: firm.id,
        details: `Tenant ${formatTenantDisplayId(firm.id)} marked as ${nextStatus} by GodAdmin.`,
      });

      setFirms((current) => current.map((item) => item.id === firm.id ? { ...item, status: nextStatus } : item));
      setConfirmModal({ isOpen: false, firm: null, action: 'suspend', reason: '' });
      toast.success(
        action === 'suspend' ? 'Firm Suspended' : 'Firm Reactivated',
        `Tenant ${formatTenantDisplayId(firm.id)} has been ${nextStatus.toLowerCase()}.`
      );
    } catch (error) {
      toast.error('Update Failed', error instanceof Error ? error.message : 'Firm status update failed.');
    } finally {
      setBusyAction(null);
    }
  };

  // Subscription operations
  const approveSubscription = async (subscription: SubscriptionRow) => {
    if (!user) return;
    playSound('success');
    setBusyAction(`subscription-${subscription.id}`);
    setMessage(null);

    try {
      const now = new Date();
      const expiry = new Date(now);
      expiry.setFullYear(expiry.getFullYear() + 1);

      const { error } = await supabase.from('subscriptions').update({
        status: 'Active',
        starts_at: now.toISOString(),
        expires_at: expiry.toISOString(),
        approved_by: user.id,
        approved_at: now.toISOString(),
        updated_by: user.id,
        updated_at: now.toISOString(),
      }).eq('id', subscription.id);

      if (error) throw error;

      await supabase.from('notifications').insert([{
        firm_id: subscription.firm_id,
        created_by: user.id,
        title: 'Subscription approved',
        message: `${subscription.plan} subscription has been approved by CAATH.`,
        audience_role: 'SuperAdmin',
        status: 'UNREAD',
      }]);

      await writePlatformAudit({
        firmId: subscription.firm_id,
        action: 'Subscription Approved',
        entityType: 'Subscription',
        entityId: subscription.id,
        details: `${subscription.plan} subscription approved by GodAdmin.`,
      });

      setSubscriptions((current) => current.map((item) => (
        item.id === subscription.id
          ? { ...item, status: 'Active', starts_at: now.toISOString(), expires_at: expiry.toISOString() }
          : item
      )));
      setMessage('Subscription approved and firm notified.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Subscription approval failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const markPaymentReceived = async (subscription: SubscriptionRow) => {
    if (!user) return;
    setBusyAction(`payment-${subscription.id}`);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('subscriptions').update({
        status: 'Active',
        last_payment_date: now,
        last_payment_status: 'Success',
        updated_by: user.id,
        updated_at: now,
      }).eq('id', subscription.id);

      if (error) throw error;

      await writePlatformAudit({
        firmId: subscription.firm_id,
        action: 'Payment Marked Received',
        entityType: 'Subscription',
        entityId: subscription.id,
        details: `Manual payment receipt recorded for ${subscription.plan} subscription.`,
      });

      setSubscriptions((current) => current.map((item) => item.id === subscription.id ? { ...item, status: 'Active' } : item));
      toast.success('Payment Recorded', 'Subscription payment marked as received manually.');
    } catch (error) {
      toast.error('Manual Update Failed', error instanceof Error ? error.message : 'Could not record payment.');
    } finally {
      setBusyAction(null);
    }
  };

  const updateSubscriptionStatus = async (subscriptionId: string, newStatus: string, action: string, details: string) => {
    if (!user) return;
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (!subscription) return;

    setBusyAction(`${action}-${subscriptionId}`);
    setMessage(null);
    try {
      const { error } = await supabase.from('subscriptions').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', subscriptionId);
      if (error) throw error;

      await writePlatformAudit({
        firmId: subscription.firm_id,
        action,
        entityType: 'Subscription',
        entityId: subscriptionId,
        details,
      });

      setMessage(`Subscription ${newStatus.toLowerCase()} successfully`);
      loadPlatformData();
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Operation failed'}`);
    } finally {
      setBusyAction(null);
    }
  };

  const publishSystemNotice = async () => {
    if (!user || !noticeText.trim()) return;
    setBusyAction('system-notice');
    setMessage(null);

    try {
      const { error } = await supabase.from('notifications').insert([{
        firm_id: null,
        created_by: user.id,
        title: 'CAATH platform notice',
        message: noticeText.trim(),
        audience_role: 'SuperAdmin',
        status: 'UNREAD',
      }]);

      if (error) throw error;

      await writePlatformAudit({
        action: 'System Notice Published',
        entityType: 'Notification',
        details: noticeText.trim(),
      });

      setNoticeText('');
      setMessage('System notice published to firm owners.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'System notice failed.');
    } finally {
      setBusyAction(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const type = drilldownModal.type;
    const data = type === 'revenue'
      ? subscriptions.filter(s => s.status === 'Active').map(s => ({ TenantID: formatTenantDisplayId(s.firm_id), Plan: s.plan, Amount: s.amount, Status: s.status }))
      : type === 'pending'
      ? subscriptions.filter(s => s.status === 'Pending').map(s => ({ TenantID: formatTenantDisplayId(s.firm_id), Plan: s.plan, Amount: s.amount, Submitted: s.created_at }))
      : firms.filter(f => f.status === (type === 'active' ? 'Active' : 'Suspended')).map(f => ({ TenantID: formatTenantDisplayId(f.id), Status: f.status, Created: f.created_at }));

    const csv = data.length > 0 ? Object.keys(data[0]).join(',') + '\n' + data.map(row => Object.values(row).join(',')).join('\n') : '';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render main content based on active tab
  const renderMainContent = () => {
    if (activeTab === 'platform') {
      return (
        <ControlTowerModule
          snapshot={controlTowerSnapshot}
          portalLoading={portalLoading}
          portalSummary={portalSummary}
          portalRecent={portalRecent}
          portalTop={portalTop}
          onMetricClick={(type) => setDrilldownModal({ isOpen: true, type, title: type === 'active' ? 'Active Firms' : type === 'suspended' ? 'Suspended Firms' : type === 'pending' ? 'Pending Subscriptions' : 'Revenue Analytics' })}
        />
      );
    }
    if (activeTab === 'usage') {
      return <UsageMonitoringModule snapshot={usageSnapshot} runtimeHealth={runtimeHealth} />;
    }
    if (activeTab === 'settings') {
      return <PlatformConfigModule snapshot={configSnapshot} />;
    }
    if (activeTab === 'firms') {
      return <FirmOperationsPanel firms={firms} busyAction={busyAction} onSuspendClick={(firm, action) => setConfirmModal({ isOpen: true, firm, action, reason: '' })} />;
    }
    if (activeTab === 'provisioning') {
      return <FirmProvisioningPanel onProvisioned={loadPlatformData} />;
    }
    if (activeTab === 'subscriptions') {
      return (
        <SubscriptionManagementPanel
          subscriptions={subscriptions}
          busyAction={busyAction}
          onApprove={approveSubscription}
          onMarkPaid={markPaymentReceived}
          onPause={(sub) => updateSubscriptionStatus(sub.id, 'Paused', 'Subscription Paused', `${sub.plan} subscription paused manually by GodAdmin.`)}
          onResume={(sub) => updateSubscriptionStatus(sub.id, 'Active', 'Subscription Resumed', `${sub.plan} subscription resumed manually by GodAdmin.`)}
          onReactivate={(sub) => updateSubscriptionStatus(sub.id, 'Active', 'Subscription Reactivated', `${sub.plan} subscription reactivated manually by GodAdmin.`)}
          onSuspend={(sub) => {
            const firm = firms.find(f => f.id === sub.firm_id);
            if (firm) setConfirmModal({ isOpen: true, firm, action: 'suspend', reason: '' });
          }}
        />
      );
    }
    if (activeTab === 'platform-audit') return <AuditLogsPanel auditLogs={auditLogs} />;
    if (activeTab === 'system-notices') {
      return <SystemNoticePublisher noticeText={noticeText} onNoticeTextChange={setNoticeText} onPublish={publishSystemNotice} isLoading={busyAction === 'system-notice'} />;
    }

    return (
      <ControlTowerModule
        snapshot={controlTowerSnapshot}
        portalLoading={portalLoading}
        portalSummary={portalSummary}
        portalRecent={portalRecent}
        portalTop={portalTop}
        onMetricClick={(type) => setDrilldownModal({ isOpen: true, type, title: type === 'active' ? 'Active Firms' : type === 'suspended' ? 'Suspended Firms' : type === 'pending' ? 'Pending Subscriptions' : 'Revenue Analytics' })}
      />
    );
  };

  return (
    <div className="p-8 space-y-8 h-full bg-matte-black text-slate-300 overflow-y-auto">
      <div className="flex items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-3xl font-bold gold-text-gradient">CAATH Platform Control Tower</h2>
              <p className="text-sm text-slate-500">Multi-firm SaaS operations, subscriptions, usage, and platform governance.</p>
            </div>
          </div>
        </div>
        <button
          onClick={loadPlatformData}
          disabled={isLoading}
          className="px-4 py-2 bg-matte-black-light border border-slate-800 rounded-xl text-sm font-bold text-slate-400 hover:text-gold disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="p-4 bg-gold/10 border border-gold/20 rounded-xl text-sm text-gold">
          {message}
        </div>
      )}

      {isLoading ? (
        <div className="p-12 bg-matte-black-light border border-slate-800 rounded-2xl text-center text-slate-500">
          Loading platform operations...
        </div>
      ) : (
        renderMainContent()
      )}

      <FirmConfirmationModal
        isOpen={confirmModal.isOpen}
        firm={confirmModal.firm}
        action={confirmModal.action}
        reason={confirmModal.reason}
        onReasonChange={(reason) => setConfirmModal({ ...confirmModal, reason })}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal({ isOpen: false, firm: null, action: 'suspend', reason: '' })}
        isLoading={busyAction !== null}
      />

      <DrilldownModals
        isOpen={drilldownModal.isOpen}
        drilldownType={drilldownModal.type}
        title={drilldownModal.title}
        searchQuery={drilldownSearch}
        onSearchChange={setDrilldownSearch}
        onClose={() => setDrilldownModal({ isOpen: false, type: 'active', title: '' })}
        onExportCSV={handleExportCSV}
        onReactivate={(firm) => {
          setConfirmModal({ isOpen: true, firm, action: 'reactivate', reason: '' });
          setDrilldownModal({ isOpen: false, type: 'active', title: '' });
        }}
        onApprove={approveSubscription}
        firms={firms}
        subscriptions={subscriptions}
      />
    </div>
  );
};
