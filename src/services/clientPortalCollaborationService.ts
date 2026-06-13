import { supabase } from '../lib/supabase';
import { User } from '../types';
import { uploadDocument } from './documents/documentCoreService';
import { publishEnterpriseEvent } from './enterpriseEventBusService';

export interface ClientPortalContext {
  clientId: string;
  clientName: string;
}

export interface ClientPortalTask {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  priority: string | null;
  created_at: string;
}

export interface ClientPortalNotice {
  id: string;
  notice_number: string | null;
  source: string;
  status: string;
  deadline: string | null;
  created_at: string;
}

export interface ClientPortalInvoice {
  id: string;
  invoice_number: string | null;
  status: string;
  total: number | null;
  pending_amount: number | null;
  due_date: string | null;
  created_at: string;
}

export interface ClientPortalDocument {
  id: string;
  name: string;
  category: string;
  document_type: string;
  file_path: string;
  created_at: string;
}

export interface ClientPortalTimelineItem {
  id: string;
  type: 'task' | 'notice' | 'invoice' | 'document' | 'event';
  title: string;
  at: string;
  status?: string | null;
}

export interface ClientPortalSnapshot {
  context: ClientPortalContext;
  tasks: ClientPortalTask[];
  notices: ClientPortalNotice[];
  invoices: ClientPortalInvoice[];
  documents: ClientPortalDocument[];
  timeline: ClientPortalTimelineItem[];
}

export const resolveClientPortalContext = async (user: User): Promise<ClientPortalContext | null> => {
  if (!user.firmId || user.role !== 'Client') return null;

  const { data: direct } = await supabase
    .from('clients')
    .select('id, name')
    .eq('firm_id', user.firmId)
    .eq('email', user.email)
    .maybeSingle();
  if (direct?.id) return { clientId: direct.id, clientName: direct.name };

  const { data: fallback } = await supabase
    .from('clients')
    .select('id, name')
    .eq('firm_id', user.firmId)
    .order('created_at', { ascending: true })
    .limit(1);
  const first = fallback?.[0];
  return first ? { clientId: first.id, clientName: first.name } : null;
};

export const getClientPortalSnapshot = async (user: User): Promise<ClientPortalSnapshot | null> => {
  const context = await resolveClientPortalContext(user);
  if (!context || !user.firmId) return null;

  const [tasksRes, noticesRes, invoicesRes, docsRes, eventsRes] = await Promise.all([
    supabase.from('tasks').select('id,title,status,deadline,priority,created_at').eq('firm_id', user.firmId).eq('client_id', context.clientId).order('created_at', { ascending: false }).limit(50),
    supabase.from('notices').select('id,notice_number,source,status,deadline,created_at').eq('firm_id', user.firmId).eq('client_id', context.clientId).order('created_at', { ascending: false }).limit(50),
    supabase.from('invoices').select('id,invoice_number,status,total,pending_amount,due_date,created_at').eq('firm_id', user.firmId).eq('client_id', context.clientId).order('created_at', { ascending: false }).limit(50),
    supabase.from('document_vault').select('id,name,category,document_type,file_path,created_at').eq('firm_id', user.firmId).eq('client_id', context.clientId).eq('is_deleted', false).order('created_at', { ascending: false }).limit(100),
    supabase.from('enterprise_activities').select('id,event_type,event_subtype,details,created_at').eq('firm_id', user.firmId).order('created_at', { ascending: false }).limit(120),
  ]);

  if (tasksRes.error) throw tasksRes.error;
  if (noticesRes.error) throw noticesRes.error;
  if (invoicesRes.error) throw invoicesRes.error;
  if (docsRes.error) throw docsRes.error;
  if (eventsRes.error) throw eventsRes.error;

  const tasks = (tasksRes.data || []) as ClientPortalTask[];
  const notices = (noticesRes.data || []) as ClientPortalNotice[];
  const invoices = (invoicesRes.data || []) as ClientPortalInvoice[];
  const documents = (docsRes.data || []) as ClientPortalDocument[];

  const clientEvents = (eventsRes.data || []).filter((event: any) => {
    const details = (event.details || {}) as Record<string, unknown>;
    const payload = ((details.payload || {}) as Record<string, unknown>);
    return payload.clientId === context.clientId || details.clientVisible === true;
  });

  const timeline: ClientPortalTimelineItem[] = [
    ...tasks.slice(0, 10).map((t) => ({ id: `task-${t.id}`, type: 'task' as const, title: t.title, at: t.created_at, status: t.status })),
    ...notices.slice(0, 10).map((n) => ({ id: `notice-${n.id}`, type: 'notice' as const, title: n.notice_number || 'Notice', at: n.created_at, status: n.status })),
    ...invoices.slice(0, 10).map((i) => ({ id: `invoice-${i.id}`, type: 'invoice' as const, title: i.invoice_number || 'Invoice', at: i.created_at, status: i.status })),
    ...documents.slice(0, 10).map((d) => ({ id: `document-${d.id}`, type: 'document' as const, title: d.name, at: d.created_at, status: null })),
    ...clientEvents.slice(0, 10).map((e: any) => ({ id: `event-${e.id}`, type: 'event' as const, title: `${e.event_type}:${e.event_subtype || 'update'}`, at: e.created_at, status: null })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 40);

  return { context, tasks, notices, invoices, documents, timeline };
};

export const uploadClientPortalDocument = async (
  user: User,
  context: ClientPortalContext,
  file: File,
  service: 'GST' | 'Income Tax' | 'MCA'
) => {
  if (!user.firmId) throw new Error('Firm context missing.');
  const category = service === 'GST' ? 'GST' : service === 'Income Tax' ? 'Income Tax' : 'ROC';
  const documentType = service === 'GST' ? 'GST Return' : service === 'Income Tax' ? 'ITR' : 'ROC Filing';
  const uploaded = await uploadDocument({
    firmId: user.firmId,
    clientId: context.clientId,
    category,
    documentType,
    file,
    tags: ['client_portal_upload', 'external_collaboration'],
    user,
  });

  await publishEnterpriseEvent({
    eventName: 'document_uploaded',
    firmId: user.firmId,
    sourceService: 'clientPortalCollaborationService.uploadClientPortalDocument',
    actor: { id: user.id, name: user.name, role: user.role },
    workflowType: 'document_vault',
    workflowId: uploaded.id,
    payload: {
      clientId: context.clientId,
      clientPortal: true,
      service,
    },
  });

  return uploaded;
};
