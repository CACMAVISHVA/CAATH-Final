/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, FileText, Clock, CheckCircle2, Download, ArrowLeft, Loader2, BrainCircuit, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';
import { downloadVaultDocument } from '../services/documents/documentStorageService';
import { cn } from '../lib/utils';
import { ClientPortalOverviewCards } from './client-portal/ClientPortalOverviewCards';
import {
  ClientPortalSnapshot,
  getClientPortalSnapshot,
  uploadClientPortalDocument,
} from '../services/clientPortalCollaborationService';

interface ClientPortalProps {
  user: User;
  activeTab: 'overview' | 'documents' | 'messages' | 'compliance';
  setActiveTab: (tab: string) => void;
}

type ServiceType = 'GST' | 'Income Tax' | 'MCA';

export const ClientPortal: React.FC<ClientPortalProps> = ({ user, activeTab, setActiveTab }) => {
  const [activeService, setActiveService] = useState<ServiceType | null>(null);
  const [snapshot, setSnapshot] = useState<ClientPortalSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableServices: ServiceType[] = user.services || ['GST', 'Income Tax'];

  const loadSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClientPortalSnapshot(user);
      setSnapshot(data);
      if (!data) setError('No client context mapped for this portal account.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load portal data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshot();
  }, [user.id, user.firmId]);

  const filteredTasks = useMemo(() => {
    if (!snapshot) return [];
    if (!activeService) return snapshot.tasks;
    return snapshot.tasks.filter((task) => (task.title || '').toLowerCase().includes(activeService.toLowerCase()));
  }, [snapshot, activeService]);

  const filteredNotices = useMemo(() => {
    if (!snapshot) return [];
    if (!activeService) return snapshot.notices;
    return snapshot.notices.filter((notice) => (notice.source || '').toLowerCase().includes(activeService.toLowerCase()));
  }, [snapshot, activeService]);

  const filteredDocuments = useMemo(() => {
    if (!snapshot) return [];
    if (!activeService) return snapshot.documents;
    return snapshot.documents.filter((doc) => (doc.category || '').toLowerCase().includes(activeService.toLowerCase()));
  }, [snapshot, activeService]);

  const filteredInvoices = snapshot?.invoices || [];
  const pendingFilings = filteredTasks.filter((item) => !['Completed', 'Archived'].includes(item.status || '')).length;
  const filedThisMonth = filteredTasks.filter((item) => ['Completed'].includes(item.status || '')).length;
  const activeNotices = filteredNotices.filter((n) => !['Filed', 'Closed', 'Archived'].includes(n.status || '')).length;
  const totalDocuments = filteredDocuments.length;

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !snapshot || !activeService) return;
    setUploading(true);
    setError(null);
    try {
      await uploadClientPortalDocument(user, snapshot.context, file, activeService);
      await loadSnapshot();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (!activeService) {
    return (
      <div className="caath-page h-full overflow-y-auto bg-matte-black p-4 flex flex-col items-center justify-center gap-4 sm:p-8">
        <h1 className="text-center text-2xl font-bold gold-text-gradient sm:text-3xl">Client Collaboration Portal</h1>
        <p className="text-sm text-slate-500">Secure workflow-linked visibility for your own notices, tasks, invoices, and documents.</p>
        <div className="mt-2 w-full max-w-3xl rounded-2xl border border-gold/25 bg-gold/[0.06] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold"><BrainCircuit className="h-5 w-5" /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black gold-text-gradient">SERA</h2><span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">Coming later</span></div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Self Evolving Revolutionary Assistant</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Planned AI help for compliance doubts, practice questions, notifications, judgments and case-study research inside CAATH.</p>
            </div>
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mt-4">
          {availableServices.map((service) => (
            <button key={service} onClick={() => { setActiveService(service); setActiveTab('overview'); }} className="p-6 bg-matte-black-light border border-slate-800 rounded-2xl text-left hover:border-gold/40">
              <p className="text-lg font-bold text-white">{service}</p>
              <p className="text-xs text-slate-500 mt-1">Open client workflow workspace</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-matte-black text-slate-300">
      <header className="flex shrink-0 flex-col gap-3 border-b border-slate-800 bg-matte-black-light/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => setActiveService(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-white sm:text-xl"><span className="gold-text-gradient">{activeService}</span> Client Portal</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Client: {snapshot?.context.clientName || user.name}
            </p>
          </div>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button onClick={loadSnapshot} className="flex-1 px-3 py-2 text-xs border border-slate-800 rounded-xl text-slate-400 hover:text-gold sm:flex-none">Refresh</button>
          <button onClick={() => fileInputRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-gold text-matte-black rounded-xl font-bold text-xs sm:flex-none">
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
        </div>
      </header>

      <main className="caath-page flex-1 overflow-y-auto p-4 space-y-6 sm:p-6 lg:p-8">
        {(loading || uploading) && (
          <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading collaboration data...</div>
        )}
        {error && <div className="text-sm text-red-400">{error}</div>}

        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <ClientPortalOverviewCards pendingFilings={pendingFilings} filedThisMonth={filedThisMonth} activeNotices={activeNotices} totalDocuments={totalDocuments} />
            <div className="rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/[0.08] to-matte-black-light p-5">
              <div className="flex items-start gap-4">
                <BrainCircuit className="mt-1 h-6 w-6 shrink-0 text-gold" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-white">SERA is evolving for CAATH clients</h3><Sparkles className="h-4 w-4 text-gold" /></div>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-gold">Self Evolving Revolutionary Assistant</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">A future AI assistant for compliance questions, regulatory notifications, judgments, case studies and other practice-related guidance. SERA will be developed from real user needs and market feedback.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-matte-black-light rounded-2xl border border-slate-800 p-5">
                <h3 className="text-sm font-bold text-white mb-3">Notice Workflows</h3>
                <div className="space-y-3">
                  {filteredNotices.slice(0, 6).map((n) => (
                    <div key={n.id} className="p-3 bg-matte-black border border-slate-800 rounded-xl">
                      <p className="text-sm font-bold text-white">{n.notice_number || 'Notice'}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{n.source} | {n.status}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-matte-black-light rounded-2xl border border-slate-800 p-5">
                <h3 className="text-sm font-bold text-white mb-3">Operational Timeline</h3>
                <div className="space-y-3">
                  {(snapshot?.timeline || []).slice(0, 8).map((item) => (
                    <div key={item.id} className="p-3 bg-matte-black border border-slate-800 rounded-xl">
                      <p className="text-sm text-white">{item.title}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.type} | {new Date(item.at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'compliance' && (
          <div className="bg-matte-black-light rounded-2xl border border-slate-800 p-5">
            <h3 className="text-sm font-bold text-white mb-4">Assigned Workflow Tasks</h3>
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-3 p-4 bg-matte-black border border-slate-800 rounded-xl sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{task.title}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Due: {task.deadline || 'N/A'} | Priority: {task.priority || 'N/A'}</p>
                  </div>
                  <span className={cn('text-xs font-bold', ['Completed', 'Archived'].includes(task.status || '') ? 'text-emerald-400' : 'text-amber-300')}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="p-4 bg-matte-black-light rounded-xl border border-slate-800">
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 text-gold flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <p className="text-sm text-white font-bold truncate">{doc.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{doc.category} | {doc.document_type}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</span>
                  <button aria-label={`Download ${doc.name}`} onClick={() => downloadVaultDocument(doc.file_path, doc.name).catch((err) => setError(err instanceof Error ? err.message : 'Download failed.'))} className="text-slate-400 hover:text-gold">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div className="bg-matte-black-light rounded-2xl border border-slate-800 p-5">
              <h3 className="text-sm font-bold text-white mb-3">Invoice & Payment Visibility</h3>
              <div className="space-y-3">
                {filteredInvoices.map((inv) => (
                  <div key={inv.id} className="flex flex-col gap-3 p-4 bg-matte-black border border-slate-800 rounded-xl sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-white font-bold">{inv.invoice_number || 'Invoice'}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Due: {inv.due_date || 'N/A'} | Pending: Rs {Number(inv.pending_amount || 0).toLocaleString()}</p>
                    </div>
                    <span className={cn('text-xs font-bold', inv.status === 'Paid' ? 'text-emerald-400' : 'text-amber-300')}>{inv.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-matte-black-light rounded-2xl border border-slate-800 p-5">
              <h3 className="text-sm font-bold text-white mb-3">Coordination Timeline</h3>
              <div className="space-y-3">
                {(snapshot?.timeline || []).slice(0, 12).map((item) => (
                  <div key={item.id} className="p-3 bg-matte-black border border-slate-800 rounded-xl flex items-center gap-3">
                    {item.status && ['Completed', 'Filed', 'Paid'].includes(item.status) ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-amber-300" />}
                    <div>
                      <p className="text-sm text-white">{item.title}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.type} | {item.status || 'update'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
