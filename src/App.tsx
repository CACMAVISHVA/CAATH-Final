/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ClientMaster } from './components/ClientMaster';
import { ComplianceTracker } from './components/ComplianceTracker';
import { TaskBoard } from './components/TaskBoard';
import { NoticeCenter } from './components/NoticeCenter';
import { BillingRevenue } from './components/BillingRevenue';
import { ClientPortal } from './components/ClientPortal';
import { StaffManagement } from './components/StaffManagement';
import { GodAdminDashboard } from './components/GodAdminDashboard';
import { AuditLog } from './components/AuditLog';
import { LandingPage } from './components/LandingPage';
import { Logo } from './components/Logo';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, ShieldCheck, Zap, Globe, Lock, AlertTriangle, CreditCard, ShieldAlert, Crown, History as HistoryIcon } from 'lucide-react';
import { UserRole, User } from './types';
import { supabase } from './lib/supabase'

export default function App() {
  useEffect(() => {
  const testConnection = async () => {
    const { data, error } = await supabase
      .from('CLIENT LIST')
      .select('*')

    console.log('SUPABASE DATA:', data)
    console.log('SUPABASE ERROR:', error)
  }

  testConnection()
}, [])
  const [view, setView] = useState<'landing' | 'app'>('app');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(true); // Default to true for demo
  const [user, setUser] = useState<User>({ 
    uid: 'sa1', 
    name: 'CA Vishva', 
    email: 'ca.vishva@firm.com', 
    role: 'SuperAdmin', 
    firmId: 'f1' 
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const emailInput = (e.target as any).elements[0].value;
    
    // Specific login for GodAdmin
    if (emailInput === 'vishva.030303@gmail.com') {
      setUser({ 
        uid: 'god1', 
        name: 'SaaS Owner', 
        email: 'vishva.030303@gmail.com', 
        role: 'GodAdmin' 
      });
    } else {
      // Default to SuperAdmin for other logins in this demo
      setUser({ 
        uid: 'sa1', 
        name: 'CA Vishva', 
        email: emailInput, 
        role: 'SuperAdmin', 
        firmId: 'f1' 
      });
    }
    
    setIsAuthenticated(true);
  };

  const cycleRole = () => {
    // Only allow GodAdmin to cycle roles for testing/demo purposes
    if (user.role !== 'GodAdmin' && user.email !== 'vishva.030303@gmail.com') return;

    const roles: UserRole[] = ['GodAdmin', 'SuperAdmin', 'Admin', 'Staff', 'Client'];
    const currentIndex = roles.indexOf(user.role);
    const nextIndex = (currentIndex + 1) % roles.length;
    const nextRole = roles[nextIndex];
    
    setUser({ 
      ...user, 
      role: nextRole,
      name: nextRole === 'GodAdmin' ? 'SaaS Owner' : nextRole === 'Client' ? 'Reliance Industries' : nextRole === 'Staff' ? 'CA Rahul' : 'CA Vishva',
      assignedClients: nextRole === 'Staff' ? ['c1', 'c2'] : undefined,
      firmId: nextRole === 'GodAdmin' ? undefined : 'f1',
      services: nextRole === 'Client' ? ['GST', 'Income Tax', 'MCA'] : undefined
    } as any);

    if (nextRole === 'Client') setActiveTab('overview');
    else setActiveTab('dashboard');
  };

  if (view === 'landing') {
    return <LandingPage onEnterApp={() => setView('app')} />;
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-matte-black text-white">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8"
        >
          <Logo size="xl" />
        </motion.div>
        <h2 className="text-xl font-bold tracking-tight gold-text-gradient">CAATH Practice OS</h2>
        <p className="text-slate-500 text-sm mt-2">Initializing your premium workspace...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen grid grid-cols-1 lg:grid-cols-2 bg-matte-black">
        <div className="flex flex-col items-center justify-center p-8 lg:p-24">
          <div className="w-full max-w-md space-y-8">
            <div className="flex items-center gap-3 mb-12">
              <Logo size="md" />
              <h1 className="text-2xl font-bold text-white gold-text-gradient">CAATH Practice OS</h1>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white">Sign in to your practice</h2>
              <p className="text-slate-500">Welcome back! Please enter your details.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-matte-black-light border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">Password</label>
                  <button type="button" className="text-xs font-bold text-gold hover:underline">Forgot Password?</button>
                </div>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-matte-black-light border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-gold focus:border-transparent transition-all"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-gold text-matte-black rounded-xl font-bold hover:bg-gold-light transition-all shadow-lg shadow-gold/20 active:scale-[0.98]"
              >
                Sign In
              </button>
            </form>

            <p className="text-center text-sm text-slate-500">
              Don't have an account? <button className="font-bold text-gold hover:underline">Start free trial</button>
            </p>
          </div>
        </div>

        <div className="hidden lg:flex flex-col justify-center p-24 bg-matte-black-light text-white relative overflow-hidden border-l border-slate-800">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-gold rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 space-y-12">
            <div className="space-y-4">
              <span className="px-3 py-1 bg-gold/20 text-gold rounded-full text-xs font-bold uppercase tracking-wider border border-gold/30">
                New Feature: AI Document Extraction
              </span>
              <h3 className="text-5xl font-bold leading-tight">
                The Premium Operating System <br />
                <span className="gold-text-gradient">of your Practice.</span>
              </h3>
              <p className="text-xl text-slate-400 max-w-lg">
                Stop juggling between Excel sheets and portal logins. Manage your entire practice from one unified platform.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gold">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="font-bold">Bank-Grade Security</span>
                </div>
                <p className="text-sm text-slate-500">Your client data is encrypted and backed up daily.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-400">
                  <Zap className="w-5 h-5" />
                  <span className="font-bold">AI Data Extraction</span>
                </div>
                <p className="text-sm text-slate-500">Automatically extract data from invoices and receipts.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isSubscribed && user.role === 'SuperAdmin') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-matte-black text-white p-8">
        <div className="w-full max-w-md p-8 bg-matte-black-light rounded-3xl border border-slate-800 text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Subscription Expired</h2>
            <p className="text-slate-500 text-sm">Your monthly subscription has ended. Please renew to continue accessing your practice data.</p>
          </div>
          <button 
            onClick={() => setIsSubscribed(true)}
            className="w-full py-4 bg-gold text-matte-black rounded-2xl font-bold hover:bg-gold-light transition-all flex items-center justify-center gap-3"
          >
            <CreditCard className="w-5 h-5" />
            Renew Subscription
          </button>
          <button className="text-sm text-slate-500 hover:text-white transition-colors">Contact Support</button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (user.role === 'GodAdmin') {
      return <GodAdminDashboard />;
    }

    if (user.role === 'Client') {
      return <ClientPortal user={user} activeTab={activeTab as any} setActiveTab={setActiveTab} />;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'clients': return <ClientMaster assignedOnly={user.role === 'Staff'} assignedClients={user.assignedClients} />;
      case 'compliance': return <ComplianceTracker />;
      case 'tasks': return <TaskBoard />;
      case 'notices': return <NoticeCenter />;
      case 'billing': return <BillingRevenue />;
      case 'staff': return <StaffManagement />;
      case 'auditlog': return <AuditLog />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-matte-black overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute top-4 right-8 z-30 flex gap-4">
          {(user.role === 'GodAdmin' || user.email === 'vishva.030303@gmail.com') && (
            <button 
              onClick={cycleRole}
              className="px-4 py-2 bg-gold/10 text-gold border border-gold/20 rounded-xl text-xs font-bold hover:bg-gold/20 transition-all flex items-center gap-2"
            >
              {user.role === 'GodAdmin' ? <Crown className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              Role: {user.role}
            </button>
          )}
          {user.role === 'SuperAdmin' && (
            <button 
              onClick={() => setIsSubscribed(false)}
              className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all"
            >
              Simulate Expired Sub
            </button>
          )}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${user.role}-${activeTab}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full w-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
