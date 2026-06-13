/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { LogOut, User as UserIcon, LayoutDashboard, FileText, MessageSquare, Clock, CreditCard, ShieldCheck, Users, CheckSquare, Bell, UserCog, History as HistoryIcon, FileCheck2, FolderLock, Building2, Activity, Database, Settings, Megaphone, BarChart3, Bug, PanelsTopLeft, Scale } from 'lucide-react';
import { User } from '../types';
import { getUserFullName, getUserDisplayRole } from '../lib/userHelpers';
import { Logo } from './Logo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: User;
  onLogout?: () => void;
  onProfileOpen?: () => void;
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
}) => {
  const getNavSections = (): SidebarSection[] => {
    if (user?.role === 'GodAdmin') {
      return [
        {
          label: 'Overview',
          items: [
            { id: 'platform', label: 'Control Tower', icon: LayoutDashboard },
            { id: 'firms', label: 'Firm Operations', icon: Building2 },
            { id: 'provisioning', label: 'Provisioning', icon: UserCog },
          ],
        },
        {
          label: 'Control',
          items: [
            { id: 'usage', label: 'Usage Monitoring', icon: Database },
            { id: 'platform-audit', label: 'Global Audit', icon: Activity },
            { id: 'settings', label: 'Platform Config', icon: Settings },
          ],
        },
        {
          label: 'Commercial',
          items: [
            { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
            { id: 'system-notices', label: 'System Notices', icon: Megaphone },
          ],
        },
      ];
    }

    if (user?.role === 'Client') {
      return [
        {
          label: 'Overview',
          items: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
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
      ];
    }

    const baseItems: SidebarNavItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'workspace', label: 'Live Workspace', icon: PanelsTopLeft },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'tasks', label: 'Task Board', icon: CheckSquare },
      { id: 'clients', label: 'Client Master', icon: Users },
      { id: 'documents', label: 'Document Vault', icon: FolderLock },
      { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
      { id: 'gst', label: 'GST Intelligence', icon: BarChart3 },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'notices', label: 'Notice Center', icon: Bell },
      { id: 'approvals', label: 'Approvals', icon: FileCheck2 },
      { id: 'governance', label: 'Governance', icon: Scale },
      { id: 'billing', label: 'Billing & Revenue', icon: CreditCard },
    ];

    const items = [...baseItems];

    if (user?.role === 'SuperAdmin') {
      items.push({ id: 'staff', label: 'Staff Management', icon: UserCog });
      items.push({ id: 'auditlog', label: 'Audit Log', icon: HistoryIcon });
      items.push({ id: 'security', label: 'Security', icon: ShieldCheck });
      items.push({ id: 'qa', label: 'Operational QA', icon: Bug });
    }

    let visibleItems = items;
    if (user?.role === 'Admin') {
      visibleItems = items.filter(item => !['billing', 'staff', 'security'].includes(item.id)).concat([
        { id: 'auditlog', label: 'Audit Log', icon: HistoryIcon },
        { id: 'qa', label: 'Operational QA', icon: Bug },
      ]);
    }

    if (user?.role === 'Staff') {
      visibleItems = items.filter(item => !['billing', 'staff', 'auditlog', 'security', 'approvals'].includes(item.id));
    }

    const byId = new Map(visibleItems.map((item) => [item.id, item]));
    const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((item): item is SidebarNavItem => Boolean(item));

    return [
      { label: 'Focus', items: pick(['workspace', 'dashboard', 'analytics']) },
      { label: 'Work', items: pick(['tasks', 'clients', 'documents']) },
      { label: 'Compliance', items: pick(['gst', 'compliance', 'notifications', 'notices']) },
      { label: 'Control', items: pick(['approvals', 'governance']) },
      { label: 'Administration', items: pick(['billing', 'staff', 'auditlog', 'security', 'qa']) },
    ].filter((section) => section.items.length > 0);
  };

  const sections = getNavSections();

  return (
    <div className="flex h-screen w-64 flex-col bg-matte-black-light/72 text-slate-400 shadow-2xl ring-1 ring-white/[0.04] z-20">
      <div className="flex items-center gap-3 px-5 py-6">
        <Logo size="md" />
        <div>
          <h1 className="text-lg font-semibold leading-tight text-white">CAATH OS</h1>
          <p className="text-[11px] font-medium tracking-normal text-slate-600">Premium operations</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.label} className="space-y-1.5">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{section.label}</p>
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "group relative flex w-full items-center gap-3 overflow-hidden rounded-md px-3 py-2.5 transition-all duration-200",
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
        ))}

      </nav>

      <div className="bg-matte-black/24 p-3 ring-1 ring-white/[0.04]">
        <button
          type="button"
          onClick={onProfileOpen}
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
          onClick={() => onLogout?.()}
          className="flex w-full items-center gap-3 rounded-md px-4 py-2 text-sm font-medium text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
