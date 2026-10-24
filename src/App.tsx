/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, CreditCard, Eye, EyeOff, Loader2, Menu, Search, ShieldCheck } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { PasswordRecoveryScreen } from './components/PasswordRecoveryScreen';
import { recoveryPending } from './lib/passwordRecovery';
import { Dashboard } from './components/Dashboard';
const ClientMaster = lazy(() => import('./components/ClientMaster').then((module) => ({ default: module.ClientMaster })));
const BillingRevenue = lazy(() => import('./components/BillingRevenue').then((module) => ({ default: module.BillingRevenue })));
const ClientPortal = lazy(() => import('./components/ClientPortal').then((module) => ({ default: module.ClientPortal })));
const StaffManagement = lazy(() => import('./components/StaffManagement').then((module) => ({ default: module.StaffManagement })));
const AuditCenter = React.lazy(() => import('./components/AuditCenter').then((module) => ({ default: module.AuditCenter })));
const EnterpriseCommandCenter = lazy(() => import('./domains/command-center').then((module) => ({ default: module.EnterpriseCommandCenter })));
const RealtimeWorkspaceShell = lazy(() => import('./domains/workspace-shell').then((module) => ({ default: module.RealtimeWorkspaceShell })));
const CollaborativeWorkspace = lazy(() => import('./domains/collaborative-workspace').then((module) => ({ default: module.CollaborativeWorkspace })));
const GovernanceDashboard = lazy(() => import('./domains/governance-dashboard').then((module) => ({ default: module.GovernanceDashboard })));
const LearningDashboard = lazy(() => import('./domains/learning-dashboard').then((module) => ({ default: module.LearningDashboard })));
const AutomationDashboard = lazy(() => import('./domains/automation-dashboard').then((module) => ({ default: module.AutomationDashboard })));
const IntegrationDashboard = lazy(() => import('./domains/integration-dashboard').then((module) => ({ default: module.IntegrationDashboard })));
const AnalyticsDashboard = lazy(() => import('./domains/analytics-dashboard').then((module) => ({ default: module.AnalyticsDashboard })));
const AICommandCenter = lazy(() => import('./domains/ai-command-center').then((module) => ({ default: module.AICommandCenter })));
import { GlobalSearch, SearchResult } from './components/GlobalSearch';
import { Logo } from './components/Logo';
import { Modal } from './components/Modal';
import { SubscriptionSettingsPage } from './components/SubscriptionSettingsPage';
import { useAuth } from './context/AuthContext';
import { normalizeAuthError } from './lib/authErrorNormalizer';
import { getUserFullName, getUserDisplayRole } from './lib/userHelpers';
import { formatWorkspaceAlias } from './lib/tenantIdentity';
import { ROLE_ACCESS, ROLE_HOME, canAccessTab } from './lib/permissions';
import { supabase } from './lib/supabase';
import { createWorkspaceOwnerAccount, getWorkspaceOnboardingErrorMessage, WorkspaceOnboardingError } from './services/accountOnboardingService';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { DashboardLoader } from './components/loaders/DashboardLoader';
import { PageLoader } from './components/loaders/PageLoader';
import { OnboardingModal } from './components/OnboardingModal';
import { CommandAction } from './services/commandPaletteService';
import { ContextualOperationsDrawer } from './components/ContextualOperationsDrawer';
import { useCommandCenterShortcuts } from './domains/command-center';
import { authService } from './domains/auth/services/authService';
import {
  WorkspacePreferences,
  loadWorkspacePreferences,
  saveWorkspacePreferences,
} from './services/workspacePreferencesService';
import { authSecurityService, AuthSecuritySettings } from './services/authSecurityService';
import { PublicMarketingSite } from './components/PublicMarketingSite';
import { PublicLegalPage, PublicLegalPageKind } from './components/PublicLegalPage';
import { firstValidationError, validateEmail, validateGSTIN, validateIndianMobile, validateRequiredName } from './lib/fieldValidation';
import { validatePasswordStrength } from './lib/authSecurityUtils';
import { clearSessionDraft, readSessionDraft, writeSessionDraft } from './hooks/useSessionDraft';

const ComplianceTracker = lazy(() => import('./components/ComplianceTracker'));
const GSTPracticeHub = lazy(() => import('./components/GSTPracticeHub'));
const GSTIntelligenceCenter = lazy(() => import('./components/GSTIntelligenceCenter'));
const GSTComplianceLifecycle = lazy(() => import('./components/GSTComplianceLifecycle'));
const TaskBoard = lazy(() => import('./components/TaskBoard').then((module) => ({ default: module.TaskBoard })));
const NoticeCenter = lazy(() => import('./components/NoticeCenter').then((module) => ({ default: module.NoticeCenter })));
const DocumentVault = lazy(() => import('./components/DocumentVault'));
const NotificationRuntimeCenter = lazy(() => import('./components/NotificationRuntimeCenter'));
const ProfileGovernance = lazy(() => import('./components/ProfileGovernance').then((module) => ({ default: module.ProfileGovernance })));
const GodAdminDashboard = lazy(() => import('./components/GodAdminDashboard').then((module) => ({ default: module.GodAdminDashboard })));
const ApprovalEngine = lazy(() => import('./components/ArchitectureModules').then((module) => ({ default: module.ApprovalEngine })));
const AutomationCenter = lazy(() => import('./components/ArchitectureModules').then((module) => ({ default: module.AutomationCenter })));
const AiFoundation = lazy(() => import('./components/ArchitectureModules').then((module) => ({ default: module.AiFoundation })));
const OperationalQaInspector = lazy(() => import('./components/OperationalQaInspector'));
const PayrollWorkspace = lazy(() => import('./components/PayrollWorkspace'));
const GovernmentPortalHub = lazy(() => import('./components/GovernmentPortalHub'));
const PracticeTools = lazy(() => import('./components/PracticeTools'));
const TemplateStudio = lazy(() => import('./components/TemplateStudio'));
const AccountingAddon = lazy(() => import('./components/AccountingAddon'));
const PublishedRegulatoryUpdates = lazy(() => import('./components/PublishedRegulatoryUpdates'));
const HelpCenter = lazy(() => import('./components/HelpCenter').then((module) => ({ default: module.HelpCenter })));

export default function App() {
  const { user, session, isLoading, error, login, verifyEmailOtp, resendEmailOtp, logout, refreshUser, subscriptionLocked, isPasswordRecovery } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOperationsDrawerOpen, setIsOperationsDrawerOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [workspacePrefs, setWorkspacePrefs] = useState<WorkspacePreferences>({
    pinned: [],
    recentNavigation: [],
    recentSearches: [],
  });
  const [firmName, setFirmName] = useState<string>('');
  const isRecoveryFlow = isPasswordRecovery || recoveryPending();
  const isPublicHome = location.pathname === '/' && !isRecoveryFlow;
  const publicLegalPage = ({
    '/privacy': 'privacy',
    '/terms': 'terms',
    '/refund-policy': 'refund-policy',
    '/cookie-policy': 'cookie-policy',
    '/data-deletion': 'data-deletion',
    '/contact': 'contact',
  } as Record<string, PublicLegalPageKind | undefined>)[location.pathname];

  const triggerQuickAction = useCallback((action: CommandAction | string) => {
    const dispatch = (name: string) => window.dispatchEvent(new CustomEvent('caath:quick-action', { detail: { action: name } }));
    switch (action) {
      case 'open-realtime-workspace':
        setActiveTab('workspace');
        break;
      case 'open-analytics':
        setActiveTab('analytics');
        break;
      case 'open-ai-copilot':
        setActiveTab('ai-copilot');
        break;
      case 'open-collaboration':
      case 'create-handoff':
      case 'mention-operator':
      case 'open-team-queue':
        setActiveTab('collaboration');
        break;
      case 'open-governance':
      case 'explain-permission':
      case 'open-audit-trail':
      case 'open-approval-chain':
        setActiveTab('governance');
        break;
      case 'open-autonomous-operations':
        setActiveTab('autonomous');
        break;
      case 'open-integrations':
        setActiveTab('integrations');
        break;
      case 'open-automation':
      case 'trigger-workflow':
        setActiveTab('automation');
        break;
      case 'open-learning':
      case 'open-playbooks':
      case 'show-similar-resolution':
      case 'open-knowledge-graph':
        setActiveTab('learning');
        break;
      case 'enter-deep-work':
        setActiveTab('workspace');
        setTimeout(() => window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { mode: 'focus' } })), 50);
        break;
      case 'enter-rapid-triage':
        setActiveTab('workspace');
        setTimeout(() => window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { layout: 'triage' } })), 50);
        break;
      case 'enter-executive-monitoring':
        setActiveTab('workspace');
        setTimeout(() => window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { layout: 'executive' } })), 50);
        break;
      case 'restore-last-workflow':
        setActiveTab('workspace');
        setTimeout(() => window.dispatchEvent(new CustomEvent('caath:workspace-hotkey', { detail: { panel: 'timeline' } })), 50);
        break;
      case 'open-command-center':
        setActiveTab('eox');
        break;
      case 'create-task':
        setActiveTab('tasks');
        setTimeout(() => dispatch('create-task'), 50);
        break;
      case 'create-client':
        setActiveTab('clients');
        setTimeout(() => dispatch('create-client'), 50);
        break;
      case 'assign-work':
        setActiveTab('tasks');
        setTimeout(() => dispatch('assign-work'), 50);
        break;
      case 'reassign-work':
        setActiveTab('tasks');
        setTimeout(() => dispatch('reassign-work'), 50);
        break;
      case 'open-approvals':
        setActiveTab('approvals');
        break;
      case 'open-gst':
        setActiveTab('gst-practice-hub');
        break;
      case 'open-clients':
        setActiveTab('clients');
        break;
      case 'open-tasks':
        setActiveTab('tasks');
        break;
      case 'open-documents':
        setActiveTab('documents');
        break;
      case 'open-notices':
        setActiveTab('notices');
        break;
      case 'open-notification-center':
        setActiveTab('notifications');
        break;
      case 'bulk-resolve':
        setActiveTab('tasks');
        setTimeout(() => dispatch('bulk-resolve'), 50);
        break;
      case 'quick-approve':
        setActiveTab('approvals');
        setTimeout(() => dispatch('quick-approve'), 50);
        break;
      case 'dispatch-ai-nudges':
        setTimeout(() => dispatch('dispatch-ai-nudges'), 50);
        break;
      default:
        break;
    }
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    if (!user?.id) return;
    localStorage.setItem(`caath-onboarding-completed-${user.id}`, 'true');
    localStorage.removeItem(`caath-onboarding-hidden-${user.id}`);
    setOnboardingCompleted(true);
    setShowOnboarding(false);
  }, [user?.id]);

  const handleOnboardingDismiss = useCallback(() => {
    if (!user?.id) return;
    localStorage.setItem(`caath-onboarding-hidden-${user.id}`, 'true');
    setShowOnboarding(false);
  }, [user?.id]);

  const handleOnboardingResume = useCallback(() => {
    if (onboardingCompleted) return;
    if (!user?.id) return;
    localStorage.removeItem(`caath-onboarding-hidden-${user.id}`);
    setShowOnboarding(true);
  }, [onboardingCompleted, user?.id]);

  const handleLogout = useCallback(async () => {
    console.warn('[AUTH] Logout requested by src/App.tsx:220');
    await logout();
    setActiveTab('dashboard');
    navigate('/');
  }, [logout, navigate]);

  const navigateToTab = useCallback((tab: string) => {
    setActiveTab(tab);
    setIsMobileNavOpen(false);
    if (tab === 'subscription') {
      navigate('/settings/subscription');
      return;
    }
    if (location.pathname === '/settings/subscription') {
      navigate('/app');
    }
  }, [location.pathname, navigate]);

  const openSubscriptionPage = useCallback(() => {
    navigateToTab('subscription');
  }, [navigateToTab]);

  const handleProfileOpen = useCallback(() => {
    setIsProfileOpen(true);
  }, []);

  const handleProfileClose = useCallback(() => {
    setIsProfileOpen(false);
  }, []);

  const allowedTabs = useMemo(() => (user ? ROLE_ACCESS[user.role] : []), [user]);

  useEffect(() => {
    if (!user || location.pathname !== '/app' || new URLSearchParams(location.search).has('tab')) return;
    try {
      const restoredTab = window.sessionStorage.getItem(`caath:last-tab:${user.id}`);
      if (restoredTab && allowedTabs.includes(restoredTab)) setActiveTab(restoredTab);
    } catch {
      // Navigation recovery is a convenience; storage restrictions must not block the workspace.
    }
  }, [allowedTabs, location.pathname, location.search, user]);

  useEffect(() => {
    if (!user || !allowedTabs.includes(activeTab)) return;
    try {
      window.sessionStorage.setItem(`caath:last-tab:${user.id}`, activeTab);
    } catch {
      // The active workspace remains usable when session storage is unavailable.
    }
  }, [activeTab, allowedTabs, user]);

  useEffect(() => {
    if (!user) return;
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(ROLE_HOME[user.role]);
    }
  }, [activeTab, allowedTabs, user]);

  useEffect(() => {
    if (location.pathname === '/settings/subscription') {
      setActiveTab('subscription');
      return;
    }
    if (location.pathname === '/app') {
      const requestedTab = new URLSearchParams(location.search).get('tab');
      if (requestedTab && user && allowedTabs.includes(requestedTab)) setActiveTab(requestedTab);
    }
  }, [allowedTabs, location.pathname, location.search, user]);

  useEffect(() => {
    if (!user || location.pathname !== '/login' || isRecoveryFlow) return;
    const next = new URLSearchParams(location.search).get('next');
    navigate(next === 'subscription' ? '/settings/subscription' : '/app', { replace: true });
  }, [isRecoveryFlow, location.pathname, location.search, navigate, user]);

  useEffect(() => {
    if (!user?.id) return;
    const completed = localStorage.getItem(`caath-onboarding-completed-${user.id}`) === 'true';
    const hidden = localStorage.getItem(`caath-onboarding-hidden-${user.id}`) === 'true';
    setOnboardingCompleted(completed);
    setShowOnboarding(!completed && !hidden);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setWorkspacePrefs(loadWorkspacePreferences(user.id, user.role));
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user?.id) return;
    saveWorkspacePreferences(user.id, workspacePrefs);
  }, [user?.id, workspacePrefs]);

  useEffect(() => {
    const loadFirmIdentity = async () => {
      if (!user?.firmId || user.role === 'GodAdmin') {
        setFirmName('');
        return;
      }

      const { data } = await supabase
        .from('firms')
        .select('*')
        .eq('id', user.firmId)
        .maybeSingle();

      setFirmName(data?.firm_name || data?.name || '');
    };

    loadFirmIdentity();
  }, [user?.firmId, user?.role]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSearchOpen(false);
      if (event.altKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  useCommandCenterShortcuts({
    openPalette: () => setIsSearchOpen(true),
    executeAction: triggerQuickAction,
  });

  useEffect(() => {
    const handleNavigateTab = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab?: string }>;
      const tab = customEvent.detail?.tab;
      if (!tab) return;
      setActiveTab(tab);
    };
    window.addEventListener('caath:navigate-tab', handleNavigateTab);
    return () => window.removeEventListener('caath:navigate-tab', handleNavigateTab);
  }, []);

  const wrap = (node: React.ReactNode, fallback: React.ReactNode = <PageLoader />) => (
    <Suspense fallback={fallback}>{node}</Suspense>
  );

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const rememberMe = formData.get('rememberMe') === 'on';
    return login(email, password, rememberMe);
  };

  if (isRecoveryFlow) return <PasswordRecoveryScreen />;

  if (publicLegalPage) {
    return <PublicLegalPage page={publicLegalPage} onHome={() => navigate('/')} onLogin={() => navigate('/login')} />;
  }

  if (isPublicHome) {
    return (
      <PublicMarketingSite
        isSignedIn={Boolean(user)}
        onLogin={() => navigate('/login')}
        onOpenWorkspace={() => navigate('/app')}
        onChoosePlan={(plan) => navigate(user
          ? `/settings/subscription?plan=${encodeURIComponent(plan)}`
          : `/login?auth=signup&plan=${encodeURIComponent(plan)}`)}
        onRenew={() => navigate('/login?next=subscription')}
      />
    );
  }

  const renderContent = () => {
    if (user && activeTab === 'help') {
      return wrap(<HelpCenter user={user} onNavigate={setActiveTab} />, <PageLoader />);
    }

    if (user && activeTab === 'subscription') {
      return <ProtectedRoute roles={['GodAdmin', 'SuperAdmin']}><SubscriptionSettingsPage user={user} onSubscriptionChanged={refreshUser} /></ProtectedRoute>;
    }

    if (!user || !canAccessTab(user, activeTab)) {
      return <ProtectedRoute roles={[]}><Dashboard /></ProtectedRoute>;
    }

    const subscriptionAllowedTabs = ['dashboard', 'billing', 'subscription', 'firm-profile', 'workspace-settings', 'help'];
    if (subscriptionLocked && !subscriptionAllowedTabs.includes(activeTab)) {
      return <LockedModuleOverlay onActivate={openSubscriptionPage} />;
    }

    if (user.role === 'GodAdmin') {
      return (
        <ProtectedRoute roles={['GodAdmin']}>
          {wrap(<GodAdminDashboard activeTab={activeTab} />, <DashboardLoader />)}
        </ProtectedRoute>
      );
    }

    if (user.role === 'Client') {
      return (
        <ProtectedRoute roles={['Client']}>
          {wrap(<ClientPortal user={user} activeTab={activeTab as 'overview' | 'documents' | 'messages' | 'compliance'} setActiveTab={setActiveTab} />)}
        </ProtectedRoute>
      );
    }

    switch (activeTab) {
      case 'learning':
        return (
          <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>
            {wrap(
              <LearningDashboard
                onNavigate={setActiveTab}
                onCommandAction={triggerQuickAction}
              />,
              <DashboardLoader />,
            )}
          </ProtectedRoute>
        );
      case 'governance':
        return (
          <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>
            {wrap(
              <GovernanceDashboard
                user={user}
                onNavigate={setActiveTab}
                onCommandAction={triggerQuickAction}
              />,
              <DashboardLoader />,
            )}
          </ProtectedRoute>
        );
      case 'collaboration':
        return (
          <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>
            {wrap(
              <CollaborativeWorkspace
                user={user}
                pins={workspacePrefs.pinned}
                recentNavigation={workspacePrefs.recentNavigation}
                onNavigate={setActiveTab}
                onCommandAction={triggerQuickAction}
              />,
              <DashboardLoader />,
            )}
          </ProtectedRoute>
        );
      case 'workspace':
        return (
          <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>
            {wrap(
              <RealtimeWorkspaceShell
                user={user}
                pins={workspacePrefs.pinned}
                recentNavigation={workspacePrefs.recentNavigation}
                onNavigate={setActiveTab}
                onOpenSearch={() => setIsSearchOpen(true)}
                onCommandAction={triggerQuickAction}
              />,
              <DashboardLoader />,
            )}
          </ProtectedRoute>
        );
      case 'eox':
        return (
          <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>
            {wrap(
              <EnterpriseCommandCenter
                user={user}
                pins={workspacePrefs.pinned}
                recentNavigation={workspacePrefs.recentNavigation}
                onNavigate={setActiveTab}
                onOpenSearch={() => setIsSearchOpen(true)}
                onCommandAction={triggerQuickAction}
              />,
              <DashboardLoader />,
            )}
          </ProtectedRoute>
        );
      case 'dashboard':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}><Dashboard /></ProtectedRoute>;
      case 'analytics':
        return (
          <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>
            {wrap(
              <AnalyticsDashboard
                user={user}
                onNavigate={setActiveTab}
                onCommandAction={triggerQuickAction}
              />,
              <DashboardLoader />,
            )}
          </ProtectedRoute>
        );
      case 'ai-copilot':
        return (
          <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>
            {wrap(
              <AICommandCenter
                user={user}
                onNavigate={setActiveTab}
                onCommandAction={triggerQuickAction}
              />,
              <DashboardLoader />,
            )}
          </ProtectedRoute>
        );
      case 'clients':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>{wrap(<ClientMaster assignedOnly={user.role === 'Staff'} assignedClients={user.assignedClients} />)}</ProtectedRoute>;
      case 'compliance':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>{wrap(<ComplianceTracker />)}</ProtectedRoute>;
      case 'gst-practice-hub':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>{wrap(<GSTPracticeHub onNavigate={setActiveTab} />)}</ProtectedRoute>;
      case 'gst-filing-matrix':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>{wrap(<GSTPracticeHub onNavigate={setActiveTab} initialView="matrix" />)}</ProtectedRoute>;
      case 'gst':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}><GSTIntelligenceCenter /></ProtectedRoute>;
      case 'gst-lifecycle':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>{wrap(<GSTComplianceLifecycle />)}</ProtectedRoute>;
      case 'regulatory-updates':
        return <ProtectedRoute roles={['SuperAdmin']}>{wrap(<PublishedRegulatoryUpdates />)}</ProtectedRoute>;
      case 'portal-gst':
      case 'portal-income-tax':
      case 'portal-mca':
      case 'portal-traces':
      case 'portal-login':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>{wrap(<GovernmentPortalHub initialPortalTab={activeTab} />)}</ProtectedRoute>;
      case 'tasks':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>{wrap(<TaskBoard />)}</ProtectedRoute>;
      case 'documents':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>{wrap(<DocumentVault />)}</ProtectedRoute>;
      case 'approvals':
        return <ProtectedRoute roles={['GodAdmin', 'SuperAdmin', 'Admin']}>{wrap(<ApprovalEngine />)}</ProtectedRoute>;
      case 'notices':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>{wrap(<NoticeCenter />)}</ProtectedRoute>;
      case 'autonomous':
        return (
          <ProtectedRoute roles={['SuperAdmin', 'Admin']}>
            {wrap(
              <AutomationDashboard
                user={user}
                onNavigate={setActiveTab}
                onCommandAction={triggerQuickAction}
              />,
              <DashboardLoader />,
            )}
          </ProtectedRoute>
        );
      case 'integrations':
        return (
          <ProtectedRoute roles={['SuperAdmin', 'Admin']}>
            {wrap(
              <IntegrationDashboard
                user={user}
                onNavigate={setActiveTab}
                onCommandAction={triggerQuickAction}
              />,
              <DashboardLoader />,
            )}
          </ProtectedRoute>
        );
      case 'automation':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin']}>{wrap(<AutomationCenter />)}</ProtectedRoute>;
      case 'notifications':
        return <ProtectedRoute roles={['GodAdmin', 'SuperAdmin', 'Admin', 'Staff']}>{wrap(<NotificationRuntimeCenter />)}</ProtectedRoute>;
      case 'ai':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin']}>{wrap(<AiFoundation />)}</ProtectedRoute>;
      case 'payroll':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>{wrap(<PayrollWorkspace />)}</ProtectedRoute>;
      case 'practice-tools':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>{wrap(<PracticeTools />)}</ProtectedRoute>;
      case 'template-studio':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>{wrap(<TemplateStudio />)}</ProtectedRoute>;
      case 'accounting-addon':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin', 'Staff']}>{wrap(<AccountingAddon />)}</ProtectedRoute>;
      case 'billing':
        return <ProtectedRoute roles={['SuperAdmin']}>{wrap(<BillingRevenue onActivateSubscription={openSubscriptionPage} />)}</ProtectedRoute>;
      case 'subscription':
        return <ProtectedRoute roles={['SuperAdmin']}><SubscriptionSettingsPage user={user} onSubscriptionChanged={refreshUser} /></ProtectedRoute>;
      case 'user-management':
      case 'staff':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin']}>{wrap(<StaffManagement />)}</ProtectedRoute>;
      case 'workspace-settings':
        return <ProtectedRoute roles={['SuperAdmin']}>{<WorkspaceSettingsPanel user={user} />}</ProtectedRoute>;
      case 'firm-profile':
        return <ProtectedRoute roles={['SuperAdmin']}>{<FirmProfilePanel user={user} />}</ProtectedRoute>;
      case 'login-activity':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin']}>{<LoginActivityPanel user={user} />}</ProtectedRoute>;
      case 'auditlog':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin']}>{wrap(<AuditCenter />)}</ProtectedRoute>;
      case 'security':
        return <ProtectedRoute roles={['SuperAdmin']}>{<SecuritySettingsPanel user={user} />}</ProtectedRoute>;
      case 'qa':
        return <ProtectedRoute roles={['SuperAdmin', 'Admin']}>{wrap(<OperationalQaInspector />)}</ProtectedRoute>;
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-matte-black text-white">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.82, 1, 0.82] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-6"
        >
          <Logo size="xl" />
        </motion.div>
        <h2 className="text-xl font-bold tracking-tight gold-text-gradient">CAATH Practice OS</h2>
        <p className="text-slate-500 text-sm mt-1">Loading secure practice workspace...</p>
      </div>
    );
  }

  if (session && !user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-matte-black text-white p-6">
        <div className="max-w-lg rounded-3xl border border-slate-800 bg-matte-black-light p-8 text-center shadow-2xl">
          <ShieldCheck className="mx-auto h-12 w-12 text-gold" />
          <h2 className="mt-5 text-2xl font-bold gold-text-gradient">Workspace Setup Needs Attention</h2>
          <p className="mt-3 text-sm text-slate-400">
            Your sign-in is secure, but the workspace could not be loaded completely. Try loading it again.
          </p>
          {error && <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">{error}</p>}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={refreshUser}
              className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-black transition hover:bg-gold-light"
            >
              Try Again
            </button>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-gold/50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} onVerifyOtp={verifyEmailOtp} onResendOtp={resendEmailOtp} error={error} onSignupSuccess={refreshUser} />;
  }

  return (
    <div className="flex h-[100dvh] min-h-0 bg-matte-black text-white">
      {isMobileNavOpen && <button type="button" aria-label="Close navigation" onClick={() => setIsMobileNavOpen(false)} className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden" />}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        user={user}
        onLogout={handleLogout}
        onProfileOpen={handleProfileOpen}
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="min-h-14 shrink-0 border-b border-slate-800 bg-matte-black-light/40 px-3 py-2 sm:px-5 flex items-center gap-3">
          <button type="button" aria-label="Open navigation" onClick={() => setIsMobileNavOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center border border-slate-800 text-slate-300 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.18em] font-bold">Protected Workspace</p>
            <p className="truncate text-xs text-slate-300 sm:text-sm">
              {getUserFullName(user, session)} | {getUserDisplayRole(user)} | {user.role === 'GodAdmin' ? 'CAATH Platform' : `${firmName || 'Enterprise Workspace'} (${formatWorkspaceAlias(user.firmId)})`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!onboardingCompleted && (
              <button
                onClick={handleOnboardingResume}
                className="hidden border border-slate-800 px-3 py-2 text-xs font-bold text-gold transition-colors hover:border-gold/40 sm:block"
              >
                Resume Tour
              </button>
            )}
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
              className="flex h-11 items-center gap-2 border border-slate-800 px-3 text-xs font-bold text-slate-400 transition-colors hover:border-gold/40 hover:text-white"
            >
              <Search className="h-4 w-4" /><span className="hidden md:inline">Search (Ctrl+K)</span>
            </button>
            {user.role !== 'Client' && (
              <button
                onClick={() => setIsOperationsDrawerOpen(true)}
                className="hidden items-center gap-2 border border-slate-800 px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:border-gold/40 hover:text-white sm:flex"
              >
                Operations
              </button>
            )}
          </div>
        </header>
        {subscriptionLocked && (
          <div className="flex flex-col gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span>Your subscription is inactive. Please activate a subscription plan to continue using CAATH PMS.</span>
            <button
              onClick={openSubscriptionPage}
              className="shrink-0 bg-gold px-3 py-1.5 text-xs font-bold text-matte-black"
            >
              Activate Subscription
            </button>
          </div>
        )}
        {user.firm?.status === 'Suspended' && user.firm.suspensionMode === 'Grace Period' && user.firm.suspensionEffectiveAt && new Date(user.firm.suspensionEffectiveAt).getTime() > Date.now() && (
          <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100 sm:px-5" role="status">
            This workspace is in a suspension grace period. Access will be blocked after {new Date(user.firm.suspensionEffectiveAt).toLocaleDateString('en-IN')}. Your stored data is not being deleted. Contact CAATH support to resolve the suspension.
          </div>
        )}
        <section className="caath-workspace-content min-h-0 flex-1 overflow-hidden">
          {renderContent()}
        </section>
      </main>
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        activeTab={activeTab}
        onCommandAction={triggerQuickAction}
        pins={workspacePrefs.pinned}
        onPinsChange={(pins) => setWorkspacePrefs((prev) => ({ ...prev, pinned: pins }))}
        recentSearchesProp={workspacePrefs.recentSearches}
        recentNavigationProp={workspacePrefs.recentNavigation}
        onRecentSearchesChange={(searches) => setWorkspacePrefs((prev) => ({ ...prev, recentSearches: searches }))}
        onRecentNavigationChange={(items) => setWorkspacePrefs((prev) => ({ ...prev, recentNavigation: items }))}
        onResultClick={(result: SearchResult) => {
          if (result.type === 'clients') setActiveTab('clients');
          if (result.type === 'tasks') setActiveTab('tasks');
          if (result.type === 'documents') setActiveTab('documents');
          if (result.type === 'notices') setActiveTab('notices');
          if (result.type === 'automations') setActiveTab('automation');
          if (result.type === 'approvals') setActiveTab('approvals');
          if (result.type === 'workflows') setActiveTab('automation');
        }}
      />
      {user.role !== 'Client' && (
        <ContextualOperationsDrawer
          activeTab={activeTab}
          isOpen={isOperationsDrawerOpen}
          onClose={() => setIsOperationsDrawerOpen(false)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onCommandAction={triggerQuickAction}
        />
      )}

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={handleOnboardingDismiss}
        onComplete={handleOnboardingComplete}
        user={user}
        workspacePrefs={workspacePrefs}
        onWorkspacePrefsChange={setWorkspacePrefs}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      <Modal isOpen={isProfileOpen} onClose={handleProfileClose} title="Profile Governance" size="xl">
        <Suspense fallback={<PageLoader />}>
          <ProfileGovernance variant="modal" />
        </Suspense>
      </Modal>
    </div>
  );
}

const LockedModuleOverlay: React.FC<{ onActivate: () => void }> = ({ onActivate }) => (
  <div className="h-full bg-matte-black p-8 text-slate-300">
    <div className="flex h-full items-center justify-center border border-amber-500/20 bg-matte-black-light">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center bg-amber-500/10 text-amber-300">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-white">Operational Module Locked</h2>
        <p className="mt-3 text-sm text-slate-400">
          Your subscription is inactive.
          <br />
          Please activate a subscription plan to continue using CAATH PMS.
        </p>
        <button
          onClick={onActivate}
          className="mt-6 inline-flex items-center gap-2 bg-gold px-5 py-3 text-sm font-bold text-matte-black"
        >
          <CreditCard className="h-4 w-4" />
          Activate Subscription
        </button>
      </div>
    </div>
  </div>
);

const WorkspaceSettingsPanel: React.FC<{ user: NonNullable<ReturnType<typeof useAuth>['user']> }> = ({ user }) => (
  <div className="h-full overflow-y-auto bg-matte-black p-8 text-slate-300">
    <h2 className="text-2xl font-bold gold-text-gradient">Workspace Settings</h2>
    <p className="mt-1 text-sm text-slate-500">Manage ownership, subscription access, and workspace defaults.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      <div className="border border-slate-800 bg-matte-black-light p-5">
        <p className="text-xs uppercase text-slate-500">Owner</p>
        <p className="mt-2 text-lg font-bold text-white">{user.name}</p>
        <p className="text-xs text-slate-500">{user.email}</p>
      </div>
      <div className="border border-slate-800 bg-matte-black-light p-5">
        <p className="text-xs uppercase text-slate-500">Workspace Code</p>
        <p className="mt-2 text-lg font-bold text-white">{user.firm?.workspaceCode || user.firmId}</p>
      </div>
      <div className="border border-slate-800 bg-matte-black-light p-5">
        <p className="text-xs uppercase text-slate-500">Subscription</p>
        <p className="mt-2 text-lg font-bold text-white">{user.firm?.subscriptionStatus || 'Pending Payment'}</p>
      </div>
    </div>
  </div>
);

const displayCapacityLimit = (value: number | null | undefined, fallback: number) => value !== null && value !== undefined && value < 0 ? 'Unlimited' : String(value ?? fallback);

const FirmProfilePanel: React.FC<{ user: NonNullable<ReturnType<typeof useAuth>['user']> }> = ({ user }) => (
  <div className="h-full overflow-y-auto bg-matte-black p-8 text-slate-300">
    <h2 className="text-2xl font-bold gold-text-gradient">Firm Profile</h2>
    <p className="mt-1 text-sm text-slate-500">Core tenant profile and plan capacity.</p>
    <div className="mt-6 border border-slate-800 bg-matte-black-light p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <ProfileField label="Firm Name" value={user.firm?.name || 'Workspace'} />
        <ProfileField label="Plan" value={user.firm?.subscriptionPlan || 'CAATH Practice OS'} />
        <ProfileField label="Max Admins" value={displayCapacityLimit(user.firm?.maxAdmins, 1)} />
        <ProfileField label="Max Staff" value={displayCapacityLimit(user.firm?.maxStaff, 3)} />
        <ProfileField label="Max Clients" value={displayCapacityLimit(user.firm?.maxClients, 25)} />
        <ProfileField label="Renewal Date" value={user.firm?.subscriptionExpiryDate ? new Date(user.firm.subscriptionExpiryDate).toLocaleDateString() : 'Not scheduled'} />
      </div>
    </div>
  </div>
);

const SecuritySettingsPanel: React.FC<{ user: NonNullable<ReturnType<typeof useAuth>['user']> }> = ({ user }) => {
  const [settings, setSettings] = React.useState<AuthSecuritySettings | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      if (!user.firmId) return;
      setSettings(await authSecurityService.getSettings(user.firmId));
    };
    load();
  }, [user.firmId]);

  const update = <K extends keyof AuthSecuritySettings>(key: K, value: AuthSecuritySettings[K]) => {
    setSettings((current) => current ? { ...current, [key]: value } : current);
  };

  const save = async () => {
    if (!settings || !user.firmId) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      await authSecurityService.updateSettings(user.firmId, settings);
      setNotice('Security settings updated.');
    } catch (saveError) {
      setError(normalizeAuthError(saveError).userMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <div className="h-full bg-matte-black p-8 text-slate-500">Loading security settings...</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-8 text-slate-300">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold gold-text-gradient">Security Settings</h2>
          <p className="mt-1 text-sm text-slate-500">Configure OTP, lockout, and session policies for this workspace.</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-gold px-4 py-2 text-sm font-bold text-matte-black disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Settings
        </button>
      </div>

      {notice && <div className="mt-5 border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}
      {error && <div className="mt-5 border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="border border-slate-800 bg-matte-black-light p-5">
          <h3 className="font-bold text-white">Email OTP Policy</h3>
          <div className="mt-5 space-y-4">
            <label className="flex items-center justify-between gap-4 text-sm">
              <span>Enable Email OTP</span>
              <input type="checkbox" checked={settings.otpEnabled} onChange={(event) => update('otpEnabled', event.target.checked)} className="h-5 w-5 accent-gold" />
            </label>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500">Mandatory For</label>
              <select value={settings.otpRequirementMode} onChange={(event) => update('otpRequirementMode', event.target.value as AuthSecuritySettings['otpRequirementMode'])} className="mt-2 w-full border border-slate-800 bg-matte-black px-3 py-2 text-sm text-white">
                <option value="admins">Super Admin and Admin</option>
                <option value="staff">All internal users</option>
                <option value="all">All users</option>
              </select>
            </div>
            <NumberSetting label="OTP Expiry (minutes)" value={settings.otpExpiryMinutes} onChange={(value) => update('otpExpiryMinutes', value)} />
            <NumberSetting label="OTP Attempt Limit" value={settings.otpAttemptLimit} onChange={(value) => update('otpAttemptLimit', value)} />
            <NumberSetting label="Resend Limit" value={settings.otpResendLimit} onChange={(value) => update('otpResendLimit', value)} />
            <NumberSetting label="Resend Cooldown (seconds)" value={settings.otpResendCooldownSeconds} onChange={(value) => update('otpResendCooldownSeconds', value)} />
          </div>
        </div>

        <div className="border border-slate-800 bg-matte-black-light p-5">
          <h3 className="font-bold text-white">Account & Session Protection</h3>
          <div className="mt-5 space-y-4">
            <NumberSetting label="Failed Password Limit" value={settings.failedPasswordLimit} onChange={(value) => update('failedPasswordLimit', value)} />
            <NumberSetting label="Lockout Duration (minutes)" value={settings.lockoutMinutes} onChange={(value) => update('lockoutMinutes', value)} />
            <NumberSetting label="Session Timeout (minutes)" value={settings.sessionTimeoutMinutes} onChange={(value) => update('sessionTimeoutMinutes', value)} />
            <NumberSetting label="Remember Me Duration (days)" value={settings.rememberMeSessionDays} onChange={(value) => update('rememberMeSessionDays', value)} />
            <div className="border border-slate-800 bg-matte-black p-4 text-xs text-slate-400">
              Future-ready hooks are reserved for CAPTCHA, SMS OTP, authenticator apps, Microsoft 365, Google Sign-In, WebAuthn/FIDO2, and biometric mobile authentication.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NumberSetting: React.FC<{ label: string; value: number; onChange: (value: number) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs uppercase tracking-wider text-slate-500">{label}</label>
    <input
      type="number"
      min={1}
      value={value}
      onChange={(event) => onChange(Math.max(1, Number(event.target.value)))}
      className="mt-2 w-full border border-slate-800 bg-matte-black px-3 py-2 text-sm text-white"
    />
  </div>
);

const LoginActivityPanel: React.FC<{ user: NonNullable<ReturnType<typeof useAuth>['user']> }> = ({ user }) => {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      if (!user.firmId) return;
      setLoading(true);
      try {
        const orgWide = user.role === 'SuperAdmin';
        setRows(await authSecurityService.listLoginActivity(user.firmId, user.id, orgWide));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.firmId, user.id, user.role]);

  return (
    <div className="h-full overflow-y-auto bg-matte-black p-8 text-slate-300">
      <h2 className="text-2xl font-bold gold-text-gradient">Login Activity</h2>
      <p className="mt-1 text-sm text-slate-500">{user.role === 'SuperAdmin' ? 'Organization-wide authentication audit trail.' : 'Your authentication audit trail.'}</p>
      <div className="mt-6 overflow-x-auto border border-slate-800 bg-matte-black-light">
        <table className="min-w-[760px] w-full table-fixed text-left text-sm">
          <thead className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">OTP</th>
              <th className="px-4 py-3">Device</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading activity...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No login activity recorded yet.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-white">{row.email}</td>
                <td className="px-4 py-3 text-xs text-slate-300">{row.event_type}</td>
                <td className={`px-4 py-3 text-xs font-bold ${row.status === 'Success' ? 'text-emerald-300' : 'text-red-300'}`}>{row.status}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{row.otp_status || '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{row.device_label || 'Unknown device'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ProfileField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-bold text-white">{value}</p>
  </div>
);

const AuthPasswordField: React.FC<{
  name: string;
  label: string;
  placeholder: string;
  autoComplete?: string;
}> = ({ name, label, placeholder, autoComplete }) => {
  const [visible, setVisible] = React.useState(false);
  const inputId = `auth-${name}`;

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">{label}</label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={visible ? 'text' : 'password'}
          required
          minLength={8}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full px-4 py-2 pr-11 bg-matte-black border border-slate-800 text-sm text-white focus:ring-1 focus:ring-gold outline-none placeholder:text-slate-600"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 transition-colors hover:text-gold"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

const LoginScreen: React.FC<{
  onLogin: (event: React.FormEvent<HTMLFormElement>) => Promise<{ requiresOtp: boolean; email?: string } | void>;
  onVerifyOtp: (email: string, otp: string) => Promise<void>;
  onResendOtp: (email: string) => Promise<void>;
  error: string | null;
  onSignupSuccess: () => void;
}> = ({ onLogin, onVerifyOtp, onResendOtp, error, onSignupSuccess }) => {
  const signupDraftKey = 'caath:draft:workspace-registration';
  const signupDraft = React.useMemo(() => readSessionDraft(signupDraftKey, {
    firmName: '',
    fullName: '',
    mobile: '',
    email: '',
    gstin: '',
    termsConsent: false,
    ageConsent: false,
  }), []);
  const initialMode = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'signup') return 'signup';
    if (params.get('auth') === 'forgot') return 'forgot';
    return 'signin';
  }, []);
  const [authMode, setAuthMode] = React.useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(() => new URLSearchParams(window.location.search).get('password') === 'updated' ? 'Password reset successfully. Please sign in with your new password.' : null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [otpEmail, setOtpEmail] = React.useState<string | null>(null);
  const [otpValue, setOtpValue] = React.useState('');
  const [resendNotice, setResendNotice] = React.useState<string | null>(null);
  const otpInputRef = React.useRef<HTMLInputElement | null>(null);
  const { isDevMode } = React.useMemo(() => ({
    isDevMode: import.meta.env.DEV
  }), []);

  const devUsers: Array<{ role: string; email: string }> = [];
  const isCreateAccount = authMode === 'signup';
  const isForgotPassword = authMode === 'forgot';
  const isResetPassword = false;
  const visibleAuthError = localError || (authMode === 'signin' ? error : null);

  React.useEffect(() => {
    if (otpEmail) {
      window.setTimeout(() => otpInputRef.current?.focus(), 50);
    }
  }, [otpEmail]);

  const saveSignupDraft = (event: React.FormEvent<HTMLFormElement>) => {
    if (!isCreateAccount) return;
    const data = new FormData(event.currentTarget);
    writeSessionDraft(signupDraftKey, {
      firmName: String(data.get('firmName') ?? ''),
      fullName: String(data.get('fullName') ?? ''),
      mobile: String(data.get('mobile') ?? ''),
      email: String(data.get('email') ?? ''),
      gstin: String(data.get('gstin') ?? ''),
      termsConsent: data.get('termsConsent') === 'on',
      ageConsent: data.get('ageConsent') === 'on',
    });
  };

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setNotice(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const fullName = String(formData.get('fullName') ?? '').trim();
    const firmName = String(formData.get('firmName') ?? '').trim();
    const mobile = String(formData.get('mobile') ?? '').trim();
    const gstin = String(formData.get('gstin') ?? '').trim();
    const termsConsent = formData.get('termsConsent') === 'on';
    const ageConsent = formData.get('ageConsent') === 'on';

    const emailValidation = validateEmail(email);
    if (!isResetPassword && !emailValidation.valid) {
      setLocalError(emailValidation.error || 'Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    if (isCreateAccount) {
      if (!termsConsent) {
        setLocalError('Please confirm that you are authorised and agree to the Terms and Privacy Policy before creating the workspace.');
        setIsLoading(false);
        return;
      }
      if (!ageConsent) {
        setLocalError('Please confirm that you are at least 18 years old before creating the workspace.');
        setIsLoading(false);
        return;
      }
      const registrationError = firstValidationError(
        validateRequiredName(firmName, 'Firm name'),
        validateRequiredName(fullName, 'Full name'),
        validateIndianMobile(mobile),
        validateGSTIN(gstin),
      );
      if (registrationError) {
        setLocalError(registrationError);
        setIsLoading(false);
        return;
      }
    }

    if (isCreateAccount) {
      const passwordStrength = validatePasswordStrength(password);
      if (!passwordStrength.isValid) {
        setLocalError(`${passwordStrength.errors[0]}. Use uppercase, lowercase, a number, and a symbol.`);
        setIsLoading(false);
        return;
      }
    } else if (!isForgotPassword && password.length < 8) {
      setLocalError('Password should be at least 8 characters.');
      setIsLoading(false);
      return;
    }

    if (isForgotPassword) {
      try {
        const redirectTo = `${window.location.origin}/login?auth=recovery`;
        await authService.sendPasswordReset(email, redirectTo);
        setNotice('If an account exists for this email, a secure reset link has been sent.');
        setAuthMode('signin');
      } catch (resetError) {
        setLocalError(normalizeAuthError(resetError).userMessage);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (isCreateAccount) {
      try {
        await createWorkspaceOwnerAccount({
          firmName,
          email,
          password,
          fullName: fullName || email.split('@')[0] || 'New User',
          mobile,
          gstin,
        });
        clearSessionDraft(signupDraftKey);
        await onSignupSuccess();
      } catch (signupError) {
        setLocalError(signupError instanceof WorkspaceOnboardingError
          ? getWorkspaceOnboardingErrorMessage(signupError)
          : normalizeAuthError(signupError).userMessage);
        setIsLoading(false);
        return;
      }

      setNotice('Workspace created. Your 15-day free trial is active and CAATH is loading your workspace.');
    } else {
      try {
        const result = await onLogin(event);
        if (result?.requiresOtp && result.email) {
          setOtpEmail(result.email);
          setNotice('We sent a secure one-time password to your registered email.');
        }
      } catch (loginError) {
        setLocalError(normalizeAuthError(loginError).userMessage);
      }
    }
    setIsLoading(false);
  };

  const handleOtpVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!otpEmail) return;
    const cleanOtp = otpValue.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setLocalError('Enter the 6-digit OTP sent to your email.');
      return;
    }
    setIsLoading(true);
    setLocalError(null);
    try {
      await onVerifyOtp(otpEmail, cleanOtp);
      setNotice('OTP verified. Loading your secure workspace...');
    } catch (otpError) {
      setLocalError(normalizeAuthError(otpError).userMessage || 'The OTP is invalid or expired. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpEmail) return;
    setIsLoading(true);
    setLocalError(null);
    setResendNotice(null);
    try {
      await onResendOtp(otpEmail);
      setResendNotice('A new OTP has been sent. Previous codes are no longer valid.');
    } catch (resendError) {
      setLocalError(normalizeAuthError(resendError).userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredential = (email: string) => {
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
    if (emailInput) emailInput.value = email;
  };

  return (
  <div className="min-h-screen bg-matte-black text-white flex items-center justify-center p-6">
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center gap-3 mb-4">
          <Logo size="lg" />
        </div>
        <h1 className="text-3xl font-bold gold-text-gradient mb-1">CAATH PMS</h1>
        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Secure Practice OS</p>
      </div>

      <div className="bg-matte-black-light border border-slate-800 p-6 shadow-2xl shadow-black/30">
        {otpEmail ? (
          <>
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-gold/10 text-gold">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Verify Email OTP</h2>
                <p className="mt-1 text-sm text-slate-500">Enter the 6-digit code sent to {otpEmail}. It expires in 5 minutes.</p>
              </div>
            </div>

            {(error || localError) && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-sm text-red-300">
                {error || localError}
              </div>
            )}
            {(notice || resendNotice) && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-200">
                {resendNotice || notice}
              </div>
            )}

            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">One-Time Password</label>
                <input
                  ref={otpInputRef}
                  value={otpValue}
                  onChange={(event) => setOtpValue(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="w-full border border-slate-800 bg-matte-black px-4 py-3 text-center text-2xl font-bold tracking-[0.35em] text-white outline-none focus:ring-1 focus:ring-gold"
                />
              </div>
              <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 py-2.5 bg-gold text-matte-black font-bold hover:bg-gold-light disabled:opacity-50 transition-colors">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify & Continue
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setOtpEmail(null)} className="text-xs text-slate-500 hover:text-gold">
                Back to sign in
              </button>
              <button type="button" onClick={handleResendOtp} disabled={isLoading} className="text-xs font-bold text-gold disabled:opacity-50">
                Resend OTP
              </button>
            </div>
          </>
        ) : (
        <>
        <h2 className="text-xl font-bold text-white mb-1">
          {isCreateAccount ? 'Create Your CAATH Workspace' : isForgotPassword ? 'Reset Password' : isResetPassword ? 'Set New Password' : 'Sign In'}
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {isCreateAccount ? 'Start a 15-day free trial immediately. No plan, payment or God Admin approval is required.' : isForgotPassword ? 'Request a secure account recovery link' : isResetPassword ? 'Choose a new password for your account' : 'Secure access to your practice workspace'}
        </p>

        {isCreateAccount && (
          <div className="mb-6 grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-wider">
            {['Account Details', 'Workspace Created', '15-Day Trial'].map((step, index) => (
              <div key={step} className="border border-slate-800 bg-matte-black p-2 text-slate-400">
                <div className="mx-auto mb-1 flex h-5 w-5 items-center justify-center bg-gold/10 text-gold">
                  {index === 0 ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                </div>
                {step}
              </div>
            ))}
          </div>
        )}
        {visibleAuthError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-sm text-red-300">
            {visibleAuthError}
          </div>
        )}
        {notice && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-200">
            {notice}
          </div>
        )}

        <form key={authMode} onSubmit={handleAuth} onInput={saveSignupDraft} onChange={saveSignupDraft} noValidate className="space-y-4">
          {!isResetPassword && (
            <div>
              {isCreateAccount && (
                <>
                  <label htmlFor="signup-firm-name" className="block text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Firm Name</label>
                  <input
                    id="signup-firm-name"
                    name="firmName"
                    type="text"
                    required
                    defaultValue={signupDraft.firmName}
                    placeholder="Your firm name"
                    className="w-full px-4 py-2 bg-matte-black border border-slate-800 text-sm text-white focus:ring-1 focus:ring-gold outline-none placeholder:text-slate-600 mb-4"
                  />
                  <label htmlFor="signup-full-name" className="block text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Full Name</label>
                  <input
                    id="signup-full-name"
                    name="fullName"
                    type="text"
                    required
                    defaultValue={signupDraft.fullName}
                    placeholder="Your full name"
                    className="w-full px-4 py-2 bg-matte-black border border-slate-800 text-sm text-white focus:ring-1 focus:ring-gold outline-none placeholder:text-slate-600 mb-4"
                  />
                  <label htmlFor="signup-mobile" className="block text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Mobile Number (account security and payment support)</label>
                  <input
                    id="signup-mobile"
                    name="mobile"
                    type="tel"
                    required
                    defaultValue={signupDraft.mobile}
                    placeholder="+91 9876543210"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={14}
                    pattern="(?:\+91[ -]?)?[6-9][0-9]{9}"
                    title="Enter a valid 10-digit Indian mobile number"
                    className="w-full px-4 py-2 bg-matte-black border border-slate-800 text-sm text-white focus:ring-1 focus:ring-gold outline-none placeholder:text-slate-600 mb-4"
                  />
                  <p className="-mt-2 mb-4 text-xs leading-5 text-slate-500">We use this only for account security and payment support. GSTIN is optional, and client data is not requested during signup.</p>
                </>
              )}
              <label htmlFor="auth-email" className="block text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Email</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                required
                defaultValue={isCreateAccount ? signupDraft.email : ''}
                placeholder="you@firm.com"
                className="w-full px-4 py-2 bg-matte-black border border-slate-800 text-sm text-white focus:ring-1 focus:ring-gold outline-none placeholder:text-slate-600"
              />
            </div>
          )}
          {!isForgotPassword && isCreateAccount && (
            <div>
              <label htmlFor="signup-gstin" className="block text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">GSTIN (Optional)</label>
                <input
                  id="signup-gstin"
                  name="gstin"
                  type="text"
                  defaultValue={signupDraft.gstin}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  autoCapitalize="characters"
                  pattern="(?:[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z]Z[0-9A-Za-z])?"
                  title="Enter a valid 15-character GSTIN"
                className="w-full px-4 py-2 bg-matte-black border border-slate-800 text-sm text-white focus:ring-1 focus:ring-gold outline-none placeholder:text-slate-600"
              />
            </div>
          )}
          {!isForgotPassword && (
            <>
              <AuthPasswordField
                name="password"
                label={isResetPassword ? 'New Password' : 'Password'}
                placeholder={isResetPassword ? 'Enter new password' : 'Enter password'}
                autoComplete={isResetPassword || isCreateAccount ? 'new-password' : 'current-password'}
              />
              {isCreateAccount && <p className="text-xs leading-5 text-slate-500">Use a unique 12+ character password with uppercase, lowercase, a number, and a symbol. Avoid names, years, and commonly used passwords.</p>}
            </>
          )}
          {isResetPassword && (
            <>
              <AuthPasswordField name="confirmPassword" label="Confirm New Password" placeholder="Re-enter new password" autoComplete="new-password" />
              <p className="text-xs leading-5 text-slate-500">Use 12+ characters with uppercase, lowercase, a number, and a symbol.</p>
            </>
          )}
          {!isCreateAccount && !isForgotPassword && !isResetPassword && (
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                name="rememberMe"
                type="checkbox"
                className="h-4 w-4 accent-gold"
              />
              Remember this device
            </label>
          )}
          {isCreateAccount && (
            <div className="space-y-3">
              <label className="flex items-start gap-3 text-xs leading-5 text-slate-300">
                <input name="termsConsent" type="checkbox" required defaultChecked={signupDraft.termsConsent} className="mt-1 h-4 w-4 shrink-0 accent-gold" />
                <span>I am authorised to create this workspace and agree to the <a href="/terms" className="font-bold text-gold hover:underline">Terms</a> and <a href="/privacy" className="font-bold text-gold hover:underline">Privacy Policy</a>. I understand that paid access requires a subscription after the free trial.</span>
              </label>
              <label className="flex items-start gap-3 text-xs leading-5 text-slate-300">
                <input name="ageConsent" type="checkbox" required defaultChecked={signupDraft.ageConsent} className="mt-1 h-4 w-4 shrink-0 accent-gold" />
                <span>I confirm that I am at least 18 years old and legally able to create this business workspace.</span>
              </label>
              <p className="text-xs leading-5 text-slate-400">We use your registration details only to create and secure the workspace, provide support, and handle billing. We do not add you to marketing email without a separate choice.</p>
            </div>
          )}
          <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 py-2.5 bg-gold text-matte-black font-bold hover:bg-gold-light disabled:opacity-50 transition-colors">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Processing...' : isCreateAccount ? 'Create Workspace & Start Trial' : isForgotPassword ? 'Send Reset Link' : isResetPassword ? 'Update Password' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2">
          {!isResetPassword && (
            <button
              type="button"
              onClick={() => { setAuthMode(isCreateAccount ? 'signin' : 'signup'); setLocalError(null); setNotice(null); }}
              className="w-full py-2 text-sm text-slate-400 hover:text-gold transition-colors"
            >
              {isCreateAccount ? 'Already have an account? Sign In' : 'Create your CAATH workspace'}
            </button>
          )}
          {!isCreateAccount && !isForgotPassword && !isResetPassword && (
            <button
              type="button"
              onClick={() => { setAuthMode('forgot'); setLocalError(null); setNotice(null); }}
              className="w-full py-1 text-xs text-slate-500 hover:text-gold transition-colors"
            >
              Forgot password?
            </button>
          )}
          {(isForgotPassword || isResetPassword) && (
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setLocalError(null); setNotice(null); }}
              className="w-full py-1 text-xs text-slate-500 hover:text-gold transition-colors"
            >
              Back to sign in
            </button>
          )}
        </div>
        </>
        )}
      </div>

      {isDevMode && devUsers.length > 0 && (
        <div className="mt-6 p-4 bg-slate-900/50 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Dev Mode</span>
          </div>
          <div className="space-y-2">
            {devUsers.map((cred) => (
              <div key={cred.role} className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">{cred.role}:</span>
                <button
                  type="button"
                  onClick={() => fillCredential(cred.email)}
                  className="flex items-center gap-1 hover:bg-slate-800 px-1 py-0.5 transition-colors"
                >
                  <code className="text-slate-300">{cred.email}</code>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
  </div>
);};
