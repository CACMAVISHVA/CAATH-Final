/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NAV_ITEMS } from '../constants';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { LogOut, User as UserIcon, LayoutDashboard, FileText, MessageSquare, Clock, Globe, Briefcase, CreditCard, Zap, Settings, ShieldCheck, Users, CheckSquare, Bell, UserCog, History as HistoryIcon } from 'lucide-react';
import { Logo } from './Logo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user?: { name: string; role: string };
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user }) => {
  const getNavItems = () => {
    if (user?.role === 'GodAdmin') {
      return [
        { id: 'dashboard', label: 'Global Console', icon: Globe },
        { id: 'firms', label: 'Firm Management', icon: Briefcase },
        { id: 'revenue', label: 'SaaS Revenue', icon: CreditCard },
        { id: 'system', label: 'System Health', icon: Zap },
        { id: 'settings', label: 'Global Settings', icon: Settings },
      ];
    }

    if (user?.role === 'Client') {
      return [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
        { id: 'compliance', label: 'Compliance', icon: Clock },
      ];
    }

    const items = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'clients', label: 'Client Master', icon: Users },
      { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
      { id: 'tasks', label: 'Task Board', icon: CheckSquare },
      { id: 'notices', label: 'Notice Center', icon: Bell },
      { id: 'billing', label: 'Billing & Revenue', icon: CreditCard },
    ];

    if (user?.role === 'SuperAdmin' || user?.role === 'Admin') {
      items.push({ id: 'staff', label: 'Staff Management', icon: UserCog });
      items.push({ id: 'auditlog', label: 'Audit Log', icon: HistoryIcon });
    }

    if (user?.role === 'Staff') {
      // Staff can't see Billing
      return items.filter(item => !['billing'].includes(item.id));
    }

    return items;
  };

  const items = getNavItems();

  return (
    <div className="flex flex-col h-screen w-64 bg-matte-black text-slate-400 border-r border-slate-800 shadow-2xl z-20">
      <div className="p-6 flex items-center gap-3">
        <Logo size="md" />
        <div>
          <h1 className="text-white font-bold text-lg leading-tight gold-text-gradient">CAATH OS</h1>
          <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Premium Edition</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
              activeTab === item.id 
                ? "bg-gold/10 text-gold font-bold border border-gold/20" 
                : "hover:bg-slate-800/50 hover:text-slate-200"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-colors duration-300",
              activeTab === item.id ? "text-gold" : "text-slate-600 group-hover:text-gold/70"
            )} />
            <span className="text-sm">{item.label}</span>
            {activeTab === item.id && (
              <motion.div 
                layoutId="active-pill"
                className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-gold rounded-r-full shadow-[0_0_10px_rgba(212,175,55,0.8)]" 
              />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-matte-black-light/30">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-matte-black border border-slate-800 mb-4 group cursor-pointer hover:border-gold/30 transition-all">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-gold transition-colors">
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.name || 'CA Vishva'}</p>
            <p className="text-[10px] text-gold font-bold uppercase tracking-wider">{user?.role || 'Admin'}</p>
          </div>
        </div>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all font-bold text-sm">
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
