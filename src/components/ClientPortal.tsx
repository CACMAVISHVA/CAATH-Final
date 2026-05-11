/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Send, 
  Download, 
  Plus,
  Search,
  Filter,
  ChevronRight,
  ShieldCheck,
  Zap,
  Globe,
  Briefcase,
  User as UserIcon,
  Calendar,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { extractDataFromDocument } from '../services/aiService';
import { Document, User } from '../types';

interface ClientPortalProps {
  user: User;
  activeTab: 'overview' | 'documents' | 'messages' | 'compliance';
  setActiveTab: (tab: string) => void;
}

type ServiceType = 'GST' | 'Income Tax' | 'MCA';

export const ClientPortal: React.FC<ClientPortalProps> = ({ user, activeTab, setActiveTab }) => {
  const [activeService, setActiveService] = useState<ServiceType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock data based on user's services
  const availableServices: ServiceType[] = (user as any).services || ['GST', 'Income Tax'];

  const MOCK_COMPLIANCE = [
    { id: '1', title: 'GSTR-3B Filing', service: 'GST', status: 'Pending', deadline: '20 Mar 2026', priority: 'High' },
    { id: '2', title: 'Income Tax Return', service: 'Income Tax', status: 'In Progress', deadline: '31 Jul 2026', priority: 'Medium' },
    { id: '3', title: 'Annual Return (MGT-7)', service: 'MCA', status: 'Filed', deadline: '30 Oct 2026', priority: 'Low' },
    { id: '4', title: 'GSTR-1 Filing', service: 'GST', status: 'Filed', deadline: '11 Mar 2026', priority: 'Medium' },
  ];

  const MOCK_DOCUMENTS: Document[] = [
    { id: 'd1', clientId: 'c1', name: 'Purchase_Invoice_Mar.pdf', url: '#', category: 'GST', version: 1, uploadedBy: 'Client', timestamp: '2026-03-15T10:00:00Z' },
    { id: 'd2', clientId: 'c1', name: 'Bank_Statement_Feb.csv', url: '#', category: 'Income Tax', version: 1, uploadedBy: 'Client', timestamp: '2026-03-10T14:30:00Z' },
  ];

  const MOCK_MESSAGES = [
    { id: 'm1', sender: 'CA Rahul', content: 'Hi, please upload your purchase invoices for March.', timestamp: '10:30 AM', isMe: false },
    { id: 'm2', sender: 'You', content: 'Sure, I will upload them by evening.', timestamp: '10:45 AM', isMe: true },
    { id: 'm3', sender: 'CA Rahul', content: 'Great, thanks!', timestamp: '11:00 AM', isMe: false },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 100);

    try {
      // Simulate AI extraction if it's an invoice
      if (file.name.toLowerCase().includes('invoice')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          await extractDataFromDocument(base64, file.type);
        };
        reader.readAsDataURL(file);
      }
      
      setTimeout(() => {
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      }, 1000);
    } catch (error) {
      console.error('Upload failed', error);
      setIsUploading(false);
    }
  };

  const filteredCompliance = MOCK_COMPLIANCE.filter(item => 
    !activeService || item.service === activeService
  );

  const filteredDocs = MOCK_DOCUMENTS.filter(doc => 
    !activeService || doc.category === activeService
  );

  if (!activeService) {
    return (
      <div className="h-full bg-matte-black p-8 flex flex-col items-center justify-center overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="mb-8 flex justify-center">
            <Logo size="xl" />
          </div>
          <h1 className="text-4xl font-bold gold-text-gradient mb-4">Welcome to CAATH Portal</h1>
          <p className="text-slate-500 max-w-md mx-auto">
            Select a service to view your compliance status, documents, and communicate with your CA team.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          {availableServices.map((service, idx) => (
            <motion.button
              key={service}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => {
                setActiveService(service);
                setActiveTab('overview');
              }}
              className="group relative p-8 bg-matte-black-light border border-slate-800 rounded-3xl hover:border-gold/50 transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                {service === 'GST' && <Globe className="w-24 h-24 text-gold" />}
                {service === 'Income Tax' && <ShieldCheck className="w-24 h-24 text-gold" />}
                {service === 'MCA' && <Briefcase className="w-24 h-24 text-gold" />}
              </div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center text-gold mb-6 border border-gold/20">
                  {service === 'GST' && <Globe className="w-6 h-6" />}
                  {service === 'Income Tax' && <ShieldCheck className="w-6 h-6" />}
                  {service === 'MCA' && <Briefcase className="w-6 h-6" />}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-gold transition-colors">{service}</h3>
                <p className="text-sm text-slate-500 mb-6">Manage your {service} compliance, filings, and documents.</p>
                <div className="flex items-center gap-2 text-gold font-bold text-sm">
                  Access Portal
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-matte-black text-slate-300">
      {/* Header */}
      <header className="h-20 border-b border-slate-800 px-8 flex items-center justify-between bg-matte-black-light/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveService(null)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Switch Service</span>
          </button>
          <div className="h-8 w-[1px] bg-slate-800 mx-2" />
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="gold-text-gradient">{activeService}</span> Portal
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Client: {user.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-matte-black rounded-xl font-bold text-xs hover:bg-gold-light transition-all shadow-lg shadow-gold/20"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Pending Filings', value: filteredCompliance.filter(i => i.status === 'Pending').length, icon: Clock, color: 'text-amber-500' },
                  { label: 'Filed This Month', value: filteredCompliance.filter(i => i.status === 'Filed').length, icon: CheckCircle2, color: 'text-emerald-500' },
                  { label: 'Active Notices', value: '0', icon: AlertCircle, color: 'text-red-500' },
                  { label: 'Total Documents', value: filteredDocs.length, icon: FileText, color: 'text-gold' },
                ].map((stat) => (
                  <div key={stat.label} className="p-6 bg-matte-black-light rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <stat.icon className={cn("w-5 h-5", stat.color)} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Compliance List */}
                <div className="bg-matte-black-light rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Compliance Status</h3>
                    <button onClick={() => setActiveTab('compliance')} className="text-xs text-gold font-bold hover:underline">View All</button>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {filteredCompliance.slice(0, 3).map((item) => (
                      <div key={item.id} className="p-6 flex items-center justify-between hover:bg-matte-black transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border",
                            item.status === 'Filed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          )}>
                            {item.status === 'Filed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-gold transition-colors">{item.title}</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Deadline: {item.deadline}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-gold transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Messages */}
                <div className="bg-matte-black-light rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Recent Messages</h3>
                    <button onClick={() => setActiveTab('messages')} className="text-xs text-gold font-bold hover:underline">Open Chat</button>
                  </div>
                  <div className="p-6 space-y-4">
                    {MOCK_MESSAGES.slice(0, 2).map((msg) => (
                      <div key={msg.id} className="p-4 rounded-xl bg-matte-black border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gold">{msg.sender}</span>
                          <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-2">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'compliance' && (
            <motion.div
              key="compliance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-matte-black-light rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-800">
                  <h3 className="text-lg font-bold text-white">All Compliance Tasks</h3>
                </div>
                <div className="divide-y divide-slate-800">
                  {filteredCompliance.map((item) => (
                    <div key={item.id} className="p-6 flex items-center justify-between hover:bg-matte-black transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border",
                          item.status === 'Filed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>
                          {item.status === 'Filed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-gold transition-colors">{item.title}</h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Deadline: {item.deadline}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border",
                          item.status === 'Filed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>
                          {item.status}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-gold transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'documents' && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search documents..." 
                    className="w-full pl-10 pr-4 py-2 bg-matte-black-light border border-slate-800 rounded-xl text-sm text-white focus:ring-1 focus:ring-gold outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button className="p-2 bg-matte-black-light border border-slate-800 rounded-lg text-slate-500 hover:text-gold transition-colors">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 hover:border-gold/30 transition-all group">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-gold mb-4 border border-slate-800 group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white truncate mb-1">{doc.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">Uploaded: {new Date(doc.timestamp).toLocaleDateString()}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gold uppercase tracking-widest">{doc.category}</span>
                      <button className="p-1.5 text-slate-500 hover:text-gold transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 bg-matte-black-light border border-dashed border-slate-800 rounded-2xl hover:border-gold/50 transition-all flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-gold group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest">Add Document</span>
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-[calc(100vh-16rem)] flex flex-col bg-matte-black-light rounded-3xl border border-slate-800 overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-matte-black/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 text-gold flex items-center justify-center font-bold border border-gold/20">
                    CR
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">CA Rahul</h4>
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Online</p>
                  </div>
                </div>
                <button className="p-2 text-slate-500 hover:text-gold transition-colors">
                  <Calendar className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {MOCK_MESSAGES.map((msg) => (
                  <div key={msg.id} className={cn(
                    "flex flex-col max-w-[70%]",
                    msg.isMe ? "ml-auto items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "p-4 rounded-2xl text-sm",
                      msg.isMe ? "bg-gold text-matte-black font-medium rounded-tr-none" : "bg-matte-black text-slate-300 border border-slate-800 rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">{msg.timestamp}</span>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-matte-black/30 border-t border-slate-800">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Type your message..." 
                    className="w-full pl-6 pr-14 py-4 bg-matte-black border border-slate-800 rounded-2xl text-sm text-white focus:ring-1 focus:ring-gold outline-none"
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-gold text-matte-black rounded-xl flex items-center justify-center hover:bg-gold-light transition-all shadow-lg shadow-gold/20">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Upload Overlay */}
      <AnimatePresence>
        {isUploading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-matte-black/80 backdrop-blur-sm"
          >
            <div className="w-full max-w-md p-8 bg-matte-black-light rounded-3xl border border-slate-800 text-center space-y-6 shadow-2xl">
              <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center text-gold mx-auto relative">
                <Loader2 className="w-10 h-10 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                  {uploadProgress}%
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Uploading Document</h3>
                <p className="text-sm text-slate-500">Our AI is extracting data from your document...</p>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  className="h-full bg-gold rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
