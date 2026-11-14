/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { LogOut, User as UserIcon, LayoutDashboard, FileText, MessageSquare, Clock, CreditCard, ShieldCheck, Users, CheckSquare, Bell, UserCog, History as HistoryIcon, FileCheck2, FolderLock, Building2, Activity, Database, Settings, Megaphone, ExternalLink, ChevronRight, Newspaper, FileKey2, BookOpenCheck, LibraryBig, Landmark, CircleHelp, FileSpreadsheet } from 'lucide-react';
import { User } from '../types';
import { getUserFullName, getUserDisplayRole } from '../lib/userHelpers';
import { Logo } from './Logo';
import { canAccessTab, ROLE_HOME } from '../lib/permissions';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: User;
  onLogout?: () => void;
  onProfileOpen?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

type SidebarNavItem = {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
};

type SidebarSection = {
  label: string;
  items: SidebarNavItem[];
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onLogout = () => {},
  onProfileOpen = () => {},
  isOpen = false,
  onClose = () => {},
}) => {
  const storageKey = `caath-sidebar-section-${user?.id || user?.role || 'guest'}`;
  const getNavSections = (): SidebarSection[] => {
    if (user?.role === 'GodAdmin') {
      return [
        {
          label: 'Overview',
          items: [
            { id: 'firms', label: 'Registrations & Firms', icon: Building2 },
            { id: 'provisioning', label: 'Provisioning', icon: UserCog },
          ],
        },
        {
          label: 'Control',
          items: [
            { id: 'usage', label: 'Usage Monitoring', icon: Database },
            { id: 'notifications', label: 'Approval Alerts', icon: Bell },
            { id: 'platform-audit', label: 'Global Audit', icon: Activity },
            { id: 'settings', label: 'Platform Config', icon: Settings },
          ],
        },
        {
          label: 'Commercial',
          items: [
            { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
            { id: 'accounting-addons', label: 'Accounting Add-ons', icon: BookOpenCheck },
            { id: 'system-notices', label: 'System Notices', icon: Megaphone },
          ],
        },
        {
          label: 'Platform Intelligence',
          items: [
            { id: 'platform-regulatory-updates', label: 'Regulatory Publisher', icon: Newspaper },
          ],
        },
        { label: 'Support', items: [{ id: 'help', label: 'Help Centre', icon: CircleHelp }] },
      ];
    }

    if (user?.role === 'Client') {
      return [
        {
          label: 'Overview',
          items: [
            { id: 'compliance', label: 'Compliance', icon: Clock },
          ],
        },
        {
          label: 'Workspace',
          items: [
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'messages', label: 'Messages', icon: MessageSquare },
          ],
        },
        { label: 'Support', items: [{ id: 'help', label: 'Help Centre', icon: CircleHelp }] },
      ];
    }

    const baseItems: SidebarNavItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'tasks', label: 'Task Board', icon: CheckSquare },
      { id: 'clients', label: 'Client Master', icon: Users },
      { id: 'documents', label: 'Document Vault', icon: FolderLock },
      { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
      { id: 'gst-practice-hub', label: 'GST Practice Hub', icon: Landmark },
      { id: 'gst-filing-matrix', label: 'GST Filing Matrix', icon: FileSpreadsheet },
      { id: 'portal-login', label: 'Portal Login Desk', icon: ExternalLink },
      { id: 'practice-tools', label: 'Time & DSC Control', icon: FileKey2 },
      { id: 'template-studio', label: 'Template Studio', icon: LibraryBig },
      { id: 'accounting-addon', label: 'Accounting', icon: BookOpenCheck },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'notices', label: 'Notice Center', icon: Bell },
      { id: 'approvals', label: 'Approvals', icon: FileCheck2 },
      { id: 'billing', label: 'Billing & Revenue', icon: CreditCard },
      { id: 'subscription', label: 'Subscription', icon: CreditCard },
      { id: 'user-management', label: 'User Management', icon: UserCog },
      { id: 'workspace-settings', label: 'Workspace Settings', icon: Settings },
      { id: 'firm-profile', label: 'Firm Profile', icon: Building2 },
      { id: 'login-activity', label: 'Login Activity', icon: Activity },
      { id: 'help', label: 'Help Centre', icon: CircleHelp },
    ];

    const items = [...baseItems];

    if (user?.role === 'SuperAdmin') {
      items.push({ id: 'regulatory-updates', label: 'Regulatory Updates', icon: Newspaper });
      items.push({ id: 'staff', label: 'Staff Management', icon: UserCog });
      items.push({ id: 'auditlog', label: 'Audit Log', icon: HistoryIcon });
      items.push({ id: 'security', label: 'Security', icon: ShieldCheck });
    }

    let visibleItems = items;
    if (user?.role === 'Admin') {
      visibleItems = items.filter(item => !['billing', 'subscription', 'staff', 'security', 'workspace-settings', 'firm-profile'].includes(item.id)).concat([
        { id: 'auditlog', label: 'Audit Log', icon: HistoryIcon },
      ]);
    }

    if (user?.role === 'Staff') {
      visibleItems = items.filter(item => !['billing', 'subscription', 'user-management', 'workspace-settings', 'firm-profile', 'login-activity', 'staff', 'auditlog', 'security', 'approvals'].includes(item.id));
    }

    const byId = new Map(visibleItems.filter((item) => canAccessTab(user, item.id)).map((item) => [item.id, item]));
    const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((item): item is SidebarNavItem => Boolean(item));

    return [
      { label: 'Work', items: pick(['tasks', 'clients', 'documents', 'template-studio', 'practice-tools', 'accounting-addon']) },
      { label: 'Compliance', items: pick(['gst-filing-matrix', 'gst-practice-hub', 'compliance', 'regulatory-updates', 'notifications', 'notices']) },
      { label: 'Government Portals', items: pick(['portal-login']) },
      { label: 'Approvals', items: pick(['approvals']) },
      { label: 'Workspace Administration', items: pick(['user-management', 'billing', 'subscription', 'workspace-settings', 'firm-profile', 'security', 'login-activity']) },
      { label: 'Administration', items: pick(['staff', 'auditlog']) },
      { label: 'Support', items: pick(['help']) },
    ].filter((section) => section.items.length > 0);
  };

  const sections = getNavSections();
  const sectionForActiveTab = React.useMemo(() => sections.find((section) => section.items.some((item) => item.id === activeTab))?.label || sections[0]?.label || '', [activeTab, sections]);
  const [openSection, setOpenSection] = React.useState(() => {
    if (typeof window === 'undefined') return sectionForActiveTab;
    return window.localStorage.getItem(storageKey) || sectionForActiveTab;
  });

  React.useEffect(() => {
    if (!sectionForActiveTab) return;
    setOpenSection((current) => current || sectionForActiveTab);
  }, [sectionForActiveTab]);

  React.useEffect(() => {
    if (!openSection) return;
    try {
      window.localStorage.setItem(storageKey, openSection);
    } catch {
      // Local persistence is a convenience only.
    }
  }, [openSection, storageKey]);

  React.useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, onClose]);

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-40 flex h-[100dvh] w-[min(20rem,88vw)] flex-col bg-matte-black-light text-slate-400 shadow-2xl ring-1 ring-white/[0.04] transition-transform duration-200 lg:static lg:z-20 lg:w-64 lg:translate-x-0",
      isOpen ? "visible translate-x-0" : "invisible -translate-x-full lg:visible",
    )}>
      <div className="flex items-center gap-3 px-5 py-6">
        <Logo size="md" />
        <div>
          <h1 className="text-lg font-semibold leading-tight text-white">CAATH OS</h1>
          <p className="text-[11px] font-medium tracking-normal text-slate-600">Premium operations</p>
        </div>
        <button onClick={onClose} aria-label="Close menu" className="ml-auto min-h-11 px-3 text-xl text-slate-300 lg:hidden">×</button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {user && (
          <button
            type="button"
            onClick={() => { setActiveTab(ROLE_HOME[user.role]); onClose(); }}
            className={cn(
              "group relative flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-3 text-left transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-gold/60",
              activeTab === ROLE_HOME[user.role]
                ? "bg-white/[0.07] text-white shadow-sm ring-1 ring-white/[0.055]"
                : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
            )}
          >
            <LayoutDashboard className={cn("h-4 w-4 shrink-0", activeTab === ROLE_HOME[user.role] ? "text-gold" : "text-slate-500 group-hover:text-slate-300")} />
            <span className="text-sm font-semibold">Home</span>
            {activeTab === ROLE_HOME[user.role] && <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r bg-gold/80" />}
          </button>
        )}
        {sections.map((section) => (
          <div key={section.label} className="space-y-1.5">
            <button
              type="button"
              aria-expanded={openSection === section.label}
              onClick={() => setOpenSection((current) => current === section.label ? '' : section.label)}
              className="group flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition-colors hover:bg-white/[0.035] hover:text-slate-200"
            >
              <span>{section.label}</span>
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", openSection === section.label && "rotate-90 text-gold")} />
            </button>
            <motion.div
              inert={openSection !== section.label}
              initial={false}
              animate={{ height: openSection === section.label ? 'auto' : 0, opacity: openSection === section.label ? 1 : 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-1 py-1">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); onClose(); }}
                    className={cn(
                      "group relative flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-2.5 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-gold/60",
                      activeTab === item.id
                        ? "bg-white/[0.07] text-white shadow-sm ring-1 ring-white/[0.055]"
                        : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"
                    )}
                  >
                    <item.icon className={cn(
                      "h-4 w-4 shrink-0 transition-colors duration-200",
                      activeTab === item.id ? "text-gold" : "text-slate-600 group-hover:text-slate-300"
                    )} />
                    <span className="truncate text-sm font-medium">{item.label}</span>
                    {activeTab === item.id && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r bg-gold/80"
                      />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ))}

      </nav>

      <div className="bg-matte-black/24 p-3 ring-1 ring-white/[0.04]">
        <button
          type="button"
          onClick={() => { onProfileOpen(); onClose(); }}
          className="group mb-3 flex w-full items-center gap-3 rounded-md bg-white/[0.035] p-2.5 text-left transition-all hover:bg-white/[0.06]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.045] text-slate-400 transition-colors group-hover:text-white">
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-white">{getUserFullName(user)}</p>
            <p className="text-[11px] font-medium text-slate-500">{getUserDisplayRole(user)}</p>
          </div>
        </button>
        <button
          onClick={() => { onLogout?.(); onClose(); }}
          className="flex w-full items-center gap-3 rounded-md px-4 py-2 text-sm font-medium text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
