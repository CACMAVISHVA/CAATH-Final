/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  FolderLock,
  GitBranch,
  LockKeyhole,
  MessageSquare,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Workflow,
  XCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { canApproveDocuments, canReviewDocuments, canApproveOrReject, canManageAutomation } from '../lib/permissions';
import { supabase } from '../lib/supabase';
import { approveDocumentForClient, markAdminReviewed, rejectDocument } from '../services/documentWorkflowService';
import { getApprovalTasks, ApprovalTaskRow } from '../services/approvalTaskService';
import { approveProfileChangeRequest, rejectProfileChangeRequest } from '../services/profileService';
import {
  createReminder,
  getMyReminders,
  pauseReminder,
  resumeReminder,
  deleteReminder,
  ReminderRow,
  ReminderFrequency,
  ReminderType,
} from '../services/automationService';
import {
  evaluateWorkflowAutomation,
  WorkflowAutomationExecution,
} from '../services/workflowAutomationService';

const automations = [
  { id: 'auto-1', trigger: 'Client uploads sales data', action: 'Create GST task and assign staff', status: 'Active', runs: 42 },
  { id: 'auto-2', trigger: 'Notice deadline within 7 days', action: 'Notify owner and escalate admin', status: 'Active', runs: 18 },
  { id: 'auto-3', trigger: 'Document approved by partner', action: 'Enable client portal visibility', status: 'Draft', runs: 0 },
  { id: 'auto-4', trigger: 'Invoice overdue by 10 days', action: 'Send payment reminder', status: 'Active', runs: 9 },
];

const automationTemplates: Array<{
  id: string;
  label: string;
  reminderType: ReminderType;
  title: string;
  message: string;
  frequency: ReminderFrequency;
}> = [
  {
    id: 'gst-filing-reminder',
    label: 'GST Filing Reminder',
    reminderType: 'COMPLIANCE_DUE',
    title: 'GST filing due soon',
    message: 'A GST filing deadline is approaching. Review client data and complete filings.',
    frequency: 'ONCE',
  },
  {
    id: 'task-deadline-reminder',
    label: 'Task Deadline Alert',
    reminderType: 'TASK_DEADLINE',
    title: 'Task due soon',
    message: 'Your assigned task is approaching its deadline. Please update the status.',
    frequency: 'ONCE',
  },
  {
    id: 'notice-escalation',
    label: 'Notice Escalation',
    reminderType: 'NOTICE_DEADLINE',
    title: 'Notice response needed',
    message: 'A notice deadline is near. Escalate this to the responsible reviewer.',
    frequency: 'ONCE',
  },
  {
    id: 'renewal-reminder',
    label: 'Renewal Reminder',
    reminderType: 'BILLING_DUE',
    title: 'Subscription renewal reminder',
    message: 'Client subscription renewal is due soon. Confirm renewal details.',
    frequency: 'MONTHLY',
  },
];

const notifications = [
  { id: 'nt-1', channel: 'Email', title: 'GST due-date reminder', audience: 'Clients with pending GSTR-3B', state: 'Scheduled', time: '19 May 2026, 09:00' },
  { id: 'nt-2', channel: 'In-app', title: 'Partner approval required', audience: 'SuperAdmins and Admins', state: 'Live', time: 'Immediate' },
  { id: 'nt-3', channel: 'Client Portal', title: 'Document approved and released', audience: 'Selected client contacts', state: 'Live', time: 'On approval' },
];

const aiCapabilities = [
  { title: 'GST Notice AI', detail: 'Classifies notice type, extracts deadline, and drafts response points.', status: 'Foundation Ready' },
  { title: 'AI Compliance Tracker', detail: 'Detects missing data, late filing risk, and owner bottlenecks.', status: 'Design Ready' },
  { title: 'AI Document Classification', detail: 'Tags invoices, bank statements, acknowledgements, and audit papers.', status: 'Connected' },
  { title: 'AI Knowledge Engine', detail: 'Future knowledge base for Indian GST, MCA, ROC, tax, and audit workflows.', status: 'Planned' },
];

const statusTone: Record<string, string> = {
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CLIENT_VISIBLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  UNDER_REVIEW: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  REWORK: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
  Active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Draft: 'bg-slate-800 text-slate-400 border-slate-700',
  Live: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  Scheduled: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
};

type DocumentWorkflowRow = {
  id: string;
  firm_id: string;
  client_id: string;
  name: string;
  category: string;
  status: string;
  workflow_stage: string;
  visible_to_client: boolean;
  uploaded_by: string | null;
  updated_at: string;
  created_at: string;
};

const PageShell: React.FC<{ title: string; description: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, description, icon: Icon, children }) => (
  <div className="p-8 space-y-8 h-full bg-matte-black text-slate-300 overflow-y-auto">
    <div className="flex items-center justify-between gap-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-3xl font-bold gold-text-gradient">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
      </div>
    </div>
    {children}
  </div>
);

const Metric: React.FC<{ label: string; value: string; icon: React.ElementType; tone?: string }> = ({ label, value, icon: Icon, tone = 'text-gold' }) => (
  <div className="p-5 bg-matte-black-light rounded-2xl border border-slate-800">
    <div className="flex items-center justify-between mb-4">
      <Icon className={cn('w-5 h-5', tone)} />
    </div>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
    <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
  </div>
);

export const DocumentVault: React.FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState('All');
  const [liveDocuments, setLiveDocuments] = useState<DocumentWorkflowRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadDocuments = async () => {
    if (!user?.firmId) return;
    setIsLoading(true);
    setMessage(null);

    const { data, error } = await supabase
      .from('documents')
      .select('id, firm_id, client_id, name, category, status, workflow_stage, visible_to_client, uploaded_by, updated_at, created_at')
      .eq('firm_id', user.firmId)
      .order('updated_at', { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setLiveDocuments((data || []) as DocumentWorkflowRow[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, [user?.firmId]);

  const filtered = filter === 'All' ? liveDocuments : liveDocuments.filter((doc) => doc.status === filter);
  const pendingCount = liveDocuments.filter((doc) => doc.status === 'PENDING' || doc.status === 'UNDER_REVIEW').length;
  const visibleCount = liveDocuments.filter((doc) => doc.visible_to_client).length;

  return (
    <PageShell title="Document Vault" description="Internal DMS with approval gates before client visibility." icon={FolderLock}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Metric label="Total Documents" value={String(liveDocuments.length)} icon={FileText} />
        <Metric label="Pending Approval" value={String(pendingCount)} icon={Clock} tone="text-amber-400" />
        <Metric label="Client Visible" value={String(visibleCount)} icon={ShieldCheck} tone="text-emerald-400" />
        <Metric label="AI Classified" value="Ready" icon={Sparkles} tone="text-blue-300" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {['All', 'PENDING', 'UNDER_REVIEW', 'CLIENT_VISIBLE', 'REWORK', 'REJECTED'].map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={cn(
              'px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all',
              filter === item ? 'bg-gold/10 text-gold border-gold/30' : 'bg-matte-black-light text-slate-500 border-slate-800 hover:text-slate-200'
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {message && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
          {message}
        </div>
      )}

      <div className="bg-matte-black-light rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-matte-black border-b border-slate-800">
            <tr>
              {['Document', 'Client', 'Category', 'Owner', 'Status', 'Visibility'].map((head) => (
                <th key={head} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">Loading document workflow records...</td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">No documents found for this workflow state.</td>
              </tr>
            )}
            {!isLoading && filtered.map((doc, index) => (
              <motion.tr key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }} className="hover:bg-matte-black">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-white">{doc.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Updated {new Date(doc.updated_at || doc.created_at).toLocaleString()}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">{doc.client_id}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{doc.category}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{doc.uploaded_by ?? '-'}</td>
                <td className="px-6 py-4">
                  <span className={cn('px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider', statusTone[doc.status])}>{doc.status}</span>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-slate-400">{doc.visible_to_client ? 'Client Visible' : doc.workflow_stage}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
};

export const ApprovalEngine: React.FC = () => {
  const { user } = useAuth();
  const canReview = canReviewDocuments(user);
  const canApprove = canApproveDocuments(user);
  const canApproveReject = canApproveOrReject(user);
  const [approvalRows, setApprovalRows] = useState<DocumentWorkflowRow[]>([]);
  const [profileRequests, setProfileRequests] = useState<ApprovalTaskRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    item: DocumentWorkflowRow | ApprovalTaskRow;
    isOpen: boolean;
    type: 'document' | 'profile';
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadApprovals = async () => {
    if (!user?.firmId) return;
    setIsLoading(true);
    setMessage(null);

    const { data, error } = await supabase
      .from('documents')
      .select('id, firm_id, client_id, name, category, status, workflow_stage, visible_to_client, uploaded_by, updated_at, created_at')
      .eq('firm_id', user.firmId)
      .in('workflow_stage', ['ADMIN_REVIEW', 'SUPERADMIN_APPROVAL', 'REWORK'])
      .order('updated_at', { ascending: false });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setApprovalRows((data || []) as DocumentWorkflowRow[]);
    }

    setIsLoading(false);
  };

  const loadProfileRequests = async () => {
    if (!user?.firmId) return;
    try {
      const tasks = await getApprovalTasks(user.firmId);
      setProfileRequests(tasks.filter((task) => task.module === 'Profile'));
    } catch (error) {
      console.error('Failed to load profile requests:', error);
    }
  };

  useEffect(() => {
    loadApprovals();
    loadProfileRequests();
  }, [user?.firmId]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const runAction = async (documentId: string, action: () => Promise<void>, successMessage: string) => {
    setBusyId(documentId);
    setMessage(null);

    try {
      await action();
      await loadApprovals();
      await loadProfileRequests();
      showMessage('success', successMessage);
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Approval action failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAdminReview = (document: DocumentWorkflowRow) => {
    if (!user) return;
    runAction(document.id, () => markAdminReviewed(document.id, user), 'Document moved to SuperAdmin approval. Audit log created.');
  };

  const handleApprove = (document: DocumentWorkflowRow) => {
    if (!user) return;
    runAction(document.id, () => approveDocumentForClient(document.id, user), 'Document approved and made visible to client. Audit log created.');
  };

  const handleApproveProfileRequest = (request: ApprovalTaskRow) => {
    if (!user) return;
    runAction(request.id, () => approveProfileChangeRequest(request.id, user), 'Profile request approved and profile updated. Audit log created.');
  };

  const openRejectModal = (item: DocumentWorkflowRow | ApprovalTaskRow, type: 'document' | 'profile') => {
    setRejectModal({ item, isOpen: true, type });
    setRejectReason('');
  };

  const handleReject = () => {
    if (!user || !rejectModal || !rejectReason.trim()) return;

    if (rejectModal.type === 'document') {
      const document = rejectModal.item as DocumentWorkflowRow;
      runAction(
        document.id,
        () => rejectDocument(document.id, user, rejectReason.trim(), document.uploaded_by ?? undefined),
        `Document sent back for rework. Reason: "${rejectReason.trim()}". Audit log created.`
      );
    } else {
      const request = rejectModal.item as ApprovalTaskRow;
      runAction(
        request.id,
        () => rejectProfileChangeRequest(request.id, user, rejectReason.trim()),
        `Profile request rejected. Reason: "${rejectReason.trim()}". Audit log created.`
      );
    }

    setRejectModal(null);
    setRejectReason('');
  };

  const awaitingAdmin = approvalRows.filter((item) => item.workflow_stage === 'ADMIN_REVIEW').length;
  const awaitingSuperAdmin = approvalRows.filter((item) => item.workflow_stage === 'SUPERADMIN_APPROVAL').length;
  const reworkCount = approvalRows.filter((item) => item.workflow_stage === 'REWORK').length;
  const profileRequestCount = profileRequests.length;

  const parseProfileRequest = (request: ApprovalTaskRow) => {
    try {
      return JSON.parse(request.description || '{}');
    } catch {
      return { reason: request.description || '', beforeState: null, afterState: null };
    }
  };

  return (
  <PageShell title="Approval Governance" description="Admin and SuperAdmin review gates for filings, documents, profile requests, and client releases." icon={FileCheck2}>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
      <Metric label="Admin Review" value={String(awaitingAdmin)} icon={Clock} tone="text-amber-400" />
      <Metric label="SuperAdmin Approval" value={String(awaitingSuperAdmin)} icon={CheckCircle2} tone="text-emerald-400" />
      <Metric label="Rejected/Rework" value={String(reworkCount)} icon={XCircle} tone="text-red-400" />
      <Metric label="Profile Requests" value={String(profileRequestCount)} icon={UserCheck} tone="text-blue-300" />
    </div>

    {message && (
      <div className={cn(
        'p-4 border rounded-xl text-sm',
        message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
      )}>
        {message.text}
      </div>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {isLoading && (
        <div className="lg:col-span-3 p-12 bg-matte-black-light border border-slate-800 rounded-2xl text-center">
          <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading approval queue...</p>
        </div>
      )}
      {!isLoading && approvalRows.length === 0 && (
        <div className="lg:col-span-3 p-12 bg-matte-black-light border border-slate-800 rounded-2xl text-center text-slate-500">
          No documents are waiting in the approval workflow.
        </div>
      )}
      {!isLoading && approvalRows.map((item) => (
        <div key={item.id} className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">{item.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{item.client_id}</p>
            </div>
            <span className={cn('px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider', statusTone[item.status])}>{item.status}</span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-500">Stage</span><span className="font-bold text-gold">{item.workflow_stage}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Category</span><span className="text-slate-300">{item.category}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Updated</span><span className="text-slate-300">{new Date(item.updated_at || item.created_at).toLocaleDateString()}</span></div>
          </div>
          {item.workflow_stage === 'ADMIN_REVIEW' ? (
            <>
              <div className="flex gap-3">
                <button
                  onClick={() => handleAdminReview(item)}
                  disabled={!canReview || busyId === item.id}
                  className="flex-1 py-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {busyId === item.id ? (
                    <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  Send to SuperAdmin
                </button>
                <button
                  onClick={() => openRejectModal(item, 'document')}
                  disabled={!canReview || busyId === item.id}
                  className="flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {busyId === item.id ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  Reject
                </button>
              </div>
              {!canReview && (
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Admin review is restricted to Admin, SuperAdmin, and GodAdmin.</p>
              )}
            </>
          ) : item.workflow_stage === 'SUPERADMIN_APPROVAL' ? (
            <>
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(item)}
                  disabled={!canApprove || busyId === item.id}
                  className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {busyId === item.id ? (
                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  Approve for Client
                </button>
                <button
                  onClick={() => openRejectModal(item, 'document')}
                  disabled={!canApprove || busyId === item.id}
                  className="flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {busyId === item.id ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  Reject
                </button>
              </div>
              {!canApprove && (
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Final client visibility is restricted to SuperAdmin and GodAdmin.</p>
              )}
            </>
          ) : (
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Awaiting rework from responsible owner.</p>
          )}
        </div>
      ))}
    </div>

    <div className="mt-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Profile Requests</p>
          <h3 className="text-2xl font-bold text-white">Pending profile governance requests</h3>
        </div>
        <span className="rounded-full border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs uppercase tracking-widest text-slate-300">{profileRequestCount} pending</span>
      </div>

      {profileRequests.length === 0 ? (
        <div className="p-10 bg-matte-black-light rounded-3xl border border-slate-800 text-center text-slate-500">
          No profile change requests are pending review.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {profileRequests.map((request) => {
            const details = parseProfileRequest(request);
            const requestedFields = details.afterState ? Object.entries(details.afterState).filter(([key, value]) => value) : [];

            return (
              <div key={request.id} className="p-6 bg-matte-black-light rounded-2xl border border-slate-800 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{request.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">Requested by {details.requesterName || request.created_by}</p>
                  </div>
                  <span className={cn('px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider', statusTone[request.status])}>{request.status}</span>
                </div>
                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex items-center justify-between"><span>Stage</span><span className="font-semibold text-white">{request.workflow_stage}</span></div>
                  <div className="flex items-center justify-between"><span>Requester role</span><span>{details.requesterRole || 'Unknown'}</span></div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300">
                  <p className="font-semibold text-slate-200">Change reason</p>
                  <p className="mt-2 text-sm text-slate-400">{details.reason || 'No reason supplied.'}</p>
                </div>
                <div className="space-y-3 text-sm">
                  <p className="font-semibold text-slate-200">Requested updates</p>
                  {requestedFields.length > 0 ? (
                    <ul className="space-y-2">
                      {requestedFields.map(([key, value]) => (
                        <li key={key} className="flex items-center justify-between gap-2 text-slate-400">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-semibold text-white">{String(value)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">No field changes detected.</p>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleApproveProfileRequest(request)}
                    disabled={!canApprove || busyId === request.id}
                    className="w-full py-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold disabled:opacity-40"
                  >
                    {busyId === request.id ? 'Processing...' : 'Approve Request'}
                  </button>
                  <button
                    onClick={() => openRejectModal(request, 'profile')}
                    disabled={!canApprove || busyId === request.id}
                    className="w-full py-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 font-bold disabled:opacity-40"
                  >
                    Reject Request
                  </button>
                  {!canApprove && (
                    <p className="text-xs text-slate-500 uppercase tracking-wider">SuperAdmin review required for profile approvals.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {rejectModal?.isOpen && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-matte-black-light border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4">
          <h3 className="text-lg font-bold text-white">Reject Approval</h3>
          <p className="text-sm text-slate-400">Please provide a rejection reason. This action is recorded in audit logs and notifies the requester.</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="w-full h-32 bg-matte-black border border-slate-700 rounded-xl p-3 text-white text-sm placeholder:text-slate-500 focus:border-gold/50 focus:outline-none"
          />
          <div className="flex gap-3">
            <button
              onClick={() => { setRejectModal(null); setRejectReason(''); }}
              className="flex-1 py-2 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-sm font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectReason.trim() || busyId === rejectModal.item.id}
              className="flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold disabled:opacity-40"
            >
              Confirm Reject
            </button>
          </div>
        </div>
      </div>
    )}
  </PageShell>
  );
};

export const AutomationCenter: React.FC = () => {
  const { user } = useAuth();
  const canRunAutomationRules = canManageAutomation(user);
  const [automationRules, setAutomationRules] = useState<ReminderRow[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(automationTemplates[0]?.id || '');
  const [title, setTitle] = useState(automationTemplates[0]?.title || '');
  const [message, setMessage] = useState(automationTemplates[0]?.message || '');
  const [triggerAt, setTriggerAt] = useState<string>(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [frequency, setFrequency] = useState<ReminderFrequency>('ONCE');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [automationExecution, setAutomationExecution] = useState<WorkflowAutomationExecution | null>(null);
  const [runningEvaluator, setRunningEvaluator] = useState(false);

  const loadAutomations = async () => {
    if (!user?.id || !user?.firmId) {
      setAutomationRules([]);
      setLoadingRules(false);
      return;
    }

    setLoadingRules(true);
    try {
      const reminders = await getMyReminders(user.id, user.firmId);
      setAutomationRules(reminders);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to load automations.');
    } finally {
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    loadAutomations();
  }, [user?.id, user?.firmId]);

  const handleTemplateSelect = (templateId: string) => {
    const template = automationTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setSelectedTemplate(templateId);
    setTitle(template.title);
    setMessage(template.message);
    setFrequency(template.frequency);
  };

  const handleCreateAutomation = async () => {
    if (!user?.firmId || !user.id) return;
    const template = automationTemplates.find((item) => item.id === selectedTemplate);
    if (!template) return;

    setBusyId('create');
    setStatusMessage(null);

    try {
      await createReminder({
        firmId: user.firmId,
        userId: user.id,
        reminderType: template.reminderType,
        title: title.trim() || template.title,
        message: message.trim() || template.message,
        triggerAt: new Date(triggerAt).toISOString(),
        frequency,
      });
      setShowCreateModal(false);
      setStatusMessage('Automation created successfully.');
      await loadAutomations();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to create automation.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleRuleStatus = async (rule: ReminderRow) => {
    if (!user?.id) return;
    setBusyId(rule.id);
    try {
      if (rule.status === 'ACTIVE') {
        await pauseReminder(rule.id);
      } else {
        await resumeReminder(rule.id);
      }
      await loadAutomations();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to update automation status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    setBusyId(ruleId);
    try {
      await deleteReminder(ruleId);
      await loadAutomations();
      setStatusMessage('Automation removed.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to delete automation.');
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = automationRules.filter((rule) => rule.status === 'ACTIVE').length;
  const pausedCount = automationRules.filter((rule) => rule.status === 'PAUSED').length;

  const runRuleEvaluator = async () => {
    if (!user?.firmId || !canRunAutomationRules) return;
    setRunningEvaluator(true);
    setStatusMessage(null);
    try {
      const execution = await evaluateWorkflowAutomation(user.firmId, user);
      setAutomationExecution(execution);
      setStatusMessage('Workflow automation evaluator completed. Review trigger outcomes below.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Workflow automation evaluator failed.');
    } finally {
      setRunningEvaluator(false);
    }
  };

  return (
    <PageShell title="Workflow Automation" description="Rule engine for client uploads, due dates, reminders, escalations, and release actions." icon={Workflow}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Metric label="Active Automations" value={String(activeCount)} icon={Play} tone="text-emerald-400" />
        <Metric label="Paused Rules" value={String(pausedCount)} icon={GitBranch} tone="text-amber-400" />
        <Metric label="Total Automations" value={String(automationRules.length)} icon={FileCheck2} />
        <Metric label="Saved Templates" value={String(automationTemplates.length)} icon={AlertCircle} tone="text-blue-300" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Automation Dashboard</h3>
            <p className="text-sm text-slate-500">Create and manage workflow reminders for GST, compliance, notices, and client follow-ups.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={runRuleEvaluator}
              disabled={!canRunAutomationRules || runningEvaluator}
              className="inline-flex items-center gap-2 px-4 py-3 bg-matte-black border border-slate-700 text-slate-200 font-bold rounded-2xl disabled:opacity-50"
            >
              {runningEvaluator ? 'Running Rules...' : 'Run Rule Evaluator'}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-3 bg-gold text-matte-black font-bold rounded-2xl"
            >
              <Plus className="w-4 h-4" /> New Automation
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="rounded-3xl border border-slate-800 bg-matte-black p-4 text-sm text-slate-300">{statusMessage}</div>
        )}

        {automationExecution && (
          <div className="rounded-3xl border border-slate-800 bg-matte-black p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Automation Execution Visibility</h4>
              <span className="text-xs text-slate-500">Last run: {new Date(automationExecution.executedAt).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {automationExecution.triggers.map((trigger) => (
                <div key={trigger.id} className="rounded-2xl border border-slate-800 bg-matte-black-light p-3">
                  <p className="text-xs text-slate-500 uppercase">{trigger.type.replace(/_/g, ' ')}</p>
                  <p className="text-sm font-semibold text-white mt-1">{trigger.summary}</p>
                  <p className="text-xs text-slate-400 mt-1">{trigger.details}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left">
                <thead className="bg-matte-black border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-[10px] uppercase text-slate-500">Rule</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-slate-500">Status</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-slate-500">Outcome</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-slate-500">Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {automationExecution.rules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-3 py-3 text-sm text-white">{rule.name}</td>
                      <td className="px-3 py-3 text-xs text-slate-300">{rule.triggered ? 'Executed' : 'Skipped'}</td>
                      <td className="px-3 py-3 text-xs text-slate-400">{rule.recommendation || rule.skippedReason || rule.performedAction || '-'}</td>
                      <td className="px-3 py-3 text-xs text-emerald-400">{rule.reversible ? 'Reversible' : 'Manual Review Needed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-matte-black-light border border-slate-800">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Next scheduled automation</p>
            <p className="mt-4 text-xl font-bold text-white">
              {automationRules.length > 0
                ? new Date(automationRules[0].trigger_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'None planned'}
            </p>
          </div>
          <div className="p-5 rounded-3xl bg-matte-black-light border border-slate-800">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Estimated executions</p>
            <p className="mt-4 text-xl font-bold text-white">{automationRules.reduce((acc) => acc + 1, 0)}</p>
          </div>
          <div className="p-5 rounded-3xl bg-matte-black-light border border-slate-800">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Active automation ratio</p>
            <p className="mt-4 text-xl font-bold text-white">
              {automationRules.length > 0 ? `${Math.round((activeCount / automationRules.length) * 100)}%` : '0%'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-matte-black-light">
          <table className="w-full text-left">
            <thead className="bg-matte-black border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-500">Automation</th>
                <th className="px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-500">Next Run</th>
                <th className="px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-500">Frequency</th>
                <th className="px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loadingRules ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading automations...</td>
                </tr>
              ) : automationRules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No automations configured yet.</td>
                </tr>
              ) : (
                automationRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-matte-black/50">
                    <td className="px-4 py-4 text-sm text-white font-semibold">{rule.title}</td>
                    <td className="px-4 py-4 text-sm text-slate-400">{new Date(rule.trigger_at).toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm text-slate-400">{rule.frequency}</td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-[10px] font-bold uppercase',
                        rule.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      )}>
                        {rule.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <button
                        onClick={() => toggleRuleStatus(rule)}
                        disabled={busyId === rule.id}
                        className="px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:border-gold"
                      >
                        {rule.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        disabled={busyId === rule.id}
                        className="px-3 py-2 rounded-xl border border-red-500 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Automation" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.24em] text-slate-500">Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-matte-black-light px-4 py-3 text-sm text-white"
            >
              {automationTemplates.map((template) => (
                <option key={template.id} value={template.id}>{template.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.24em] text-slate-500">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-matte-black-light px-4 py-3 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.24em] text-slate-500">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-700 bg-matte-black-light px-4 py-3 text-sm text-white"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.24em] text-slate-500">Trigger time</label>
              <input
                type="datetime-local"
                value={triggerAt}
                onChange={(e) => setTriggerAt(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-matte-black-light px-4 py-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.24em] text-slate-500">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ReminderFrequency)}
                className="w-full rounded-2xl border border-slate-700 bg-matte-black-light px-4 py-3 text-sm text-white"
              >
                <option value="ONCE">Once</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-3 rounded-2xl bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateAutomation}
              disabled={busyId === 'create' || !title.trim()}
              className="px-4 py-3 rounded-2xl bg-gold text-matte-black font-bold disabled:opacity-50"
            >
              {busyId === 'create' ? 'Saving...' : 'Create Automation'}
            </button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
};

export const NotificationEngine: React.FC = () => (
  <PageShell title="Notification Engine" description="Email, portal, and in-app notifications for compliance, approvals, billing, and client requests." icon={Bell}>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <Metric label="Live Rules" value="18" icon={Bell} tone="text-blue-300" />
      <Metric label="Scheduled Sends" value="41" icon={Clock} tone="text-amber-400" />
      <Metric label="Escalation Alerts" value="7" icon={AlertCircle} tone="text-red-400" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {notifications.map((item) => (
        <div key={item.id} className="p-6 bg-matte-black-light rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-5">
            <MessageSquare className="w-5 h-5 text-gold" />
            <span className={cn('px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider', statusTone[item.state])}>{item.state}</span>
          </div>
          <h3 className="text-lg font-bold text-white">{item.title}</h3>
          <p className="text-sm text-slate-500 mt-2">{item.audience}</p>
          <div className="mt-5 pt-5 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-gold font-bold">{item.channel}</span>
            <span className="text-slate-500">{item.time}</span>
          </div>
        </div>
      ))}
    </div>
  </PageShell>
);

export const AiFoundation: React.FC = () => (
  <PageShell title="AI Foundation" description="CAATH intelligence layer for notices, document classification, workflow suggestions, and knowledge retrieval." icon={BrainCircuit}>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
      <Metric label="AI Modules" value="4" icon={Bot} />
      <Metric label="Documents Classified" value="976" icon={FileText} tone="text-blue-300" />
      <Metric label="Notice Drafts" value="18" icon={Sparkles} tone="text-emerald-400" />
      <Metric label="Credits Used" value="62%" icon={BrainCircuit} tone="text-amber-400" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {aiCapabilities.map((item) => (
        <div key={item.title} className="p-6 bg-matte-black-light rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="text-[10px] text-gold font-bold uppercase tracking-wider">{item.status}</span>
          </div>
          <h3 className="text-lg font-bold text-white">{item.title}</h3>
          <p className="text-sm text-slate-500 mt-2">{item.detail}</p>
        </div>
      ))}
    </div>
  </PageShell>
);

export const SecurityCenter: React.FC = () => {
  const controls = useMemo(() => [
    { label: 'Supabase Authentication', state: 'Connected', icon: LockKeyhole },
    { label: 'JWT Session Guard', state: 'Enabled', icon: ShieldCheck },
    { label: 'Role Restrictions', state: 'Mapped', icon: UserCheck },
    { label: 'Multi-tenant Isolation', state: 'Schema Ready', icon: FolderLock },
  ], []);

  return (
    <PageShell title="Security Architecture" description="RBAC, tenant boundaries, audit trail coverage, and protected product areas." icon={LockKeyhole}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {controls.map((item) => (
          <div key={item.label} className="p-6 bg-matte-black-light rounded-2xl border border-slate-800">
            <item.icon className="w-6 h-6 text-gold mb-5" />
            <h3 className="text-sm font-bold text-white">{item.label}</h3>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-3">{item.state}</p>
          </div>
        ))}
      </div>
      <div className="p-6 bg-matte-black-light rounded-2xl border border-slate-800">
        <h3 className="text-lg font-bold text-white mb-5">Role Access Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            ['SuperAdmin', 'All firm data, billing, staff, approvals, audit logs'],
            ['Admin', 'Clients, tasks, documents, approvals, notices'],
            ['Staff', 'Assigned clients, tasks, documents, notices'],
            ['Client', 'Own portal, own documents, own compliance, messages'],
          ].map(([role, scope]) => (
            <div key={role} className="p-4 rounded-xl bg-matte-black border border-slate-800">
              <p className="text-sm font-bold text-gold">{role}</p>
              <p className="text-xs text-slate-500 mt-2">{scope}</p>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

// Domain-segmented enterprise architecture exports
export const GovernanceArchitecture = ApprovalEngine;
export const WorkflowArchitecture = NotificationEngine;
export const IntelligenceArchitecture = AiFoundation;
export const AutomationArchitecture = AutomationCenter;
export const ComplianceArchitecture = DocumentVault;
export const AnalyticsArchitecture = SecurityCenter;
