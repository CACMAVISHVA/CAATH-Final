import type React from 'react';
import { Building2, CheckSquare, ClipboardCheck, CreditCard, FileText, Users, Bell, Layers3 } from 'lucide-react';
import { getClients } from './clientService';
import { getTasks } from './taskService';
import { getDocuments } from './documentVaultService';
import { getMyNotifications } from './notificationService';
import { supabase } from '../lib/supabase';

export type EnterpriseSearchCategory =
  | 'all'
  | 'clients'
  | 'tasks'
  | 'invoices'
  | 'compliances'
  | 'notices'
  | 'staff'
  | 'documents'
  | 'subscriptions'
  | 'automations'
  | 'approvals'
  | 'workflows';

export type EnterpriseSearchResult = {
  id: string;
  type: Exclude<EnterpriseSearchCategory, 'all'>;
  title: string;
  subtitle?: string;
  icon: React.FC<{ className?: string }>;
  entityId: string;
  score: number;
};

const normalize = (value: string) => value.toLowerCase().trim();

const fuzzyScore = (query: string, value: string) => {
  const q = normalize(query);
  const v = normalize(value);
  if (!q || !v) return 0;
  if (v === q) return 100;
  if (v.startsWith(q)) return 80;
  if (v.includes(q)) return 60;

  let cursor = 0;
  for (const char of q) {
    cursor = v.indexOf(char, cursor);
    if (cursor === -1) return 0;
    cursor += 1;
  }
  return 35;
};

const rank = (items: EnterpriseSearchResult[]) =>
  items.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);

export const searchEnterprise = async ({
  firmId,
  userId,
  query,
  category = 'all',
}: {
  firmId?: string;
  userId?: string;
  query: string;
  category?: EnterpriseSearchCategory;
}) => {
  if (!query.trim()) return [];

  const results: EnterpriseSearchResult[] = [];
  const include = (value: EnterpriseSearchCategory) => category === 'all' || category === value;

  if (firmId && include('clients')) {
    const clients = await getClients(firmId);
    results.push(...clients.map((client) => ({
      id: `clients-${client.id}`,
      entityId: client.id,
      type: 'clients' as const,
      title: client.name,
      subtitle: client.type || 'Client',
      icon: Building2,
      score: fuzzyScore(query, `${client.name} ${client.pan || ''} ${client.gstin || ''}`),
    })));
  }

  if (firmId && include('tasks')) {
    const tasks = await getTasks(firmId);
    results.push(...tasks.map((task) => ({
      id: `tasks-${task.id}`,
      entityId: task.id,
      type: 'tasks' as const,
      title: task.title,
      subtitle: `${task.status} | ${task.priority}`,
      icon: CheckSquare,
      score: fuzzyScore(query, `${task.title} ${task.description || ''}`),
    })));
  }

  if (firmId && include('documents')) {
    const documents = await getDocuments({ firmId, query, limit: 8 });
    results.push(...documents.map((document) => ({
      id: `documents-${document.id}`,
      entityId: document.id,
      type: 'documents' as const,
      title: document.name,
      subtitle: `${document.category} | ${document.document_type}`,
      icon: FileText,
      score: fuzzyScore(query, `${document.name} ${document.category} ${document.document_type}`),
    })));
  }

  if (userId && include('notices')) {
    const notifications = await getMyNotifications(userId, firmId);
    results.push(...notifications.map((notification) => ({
      id: `notices-${notification.id}`,
      entityId: notification.id,
      type: 'notices' as const,
      title: notification.title,
      subtitle: notification.message,
      icon: Bell,
      score: fuzzyScore(query, `${notification.title} ${notification.message}`),
    })));
  }

  if (firmId && include('staff')) {
    const { data } = await supabase.from('users').select('id, name, role').eq('firm_id', firmId);
    results.push(...(data || []).map((staff) => ({
      id: `staff-${staff.id}`,
      entityId: staff.id,
      type: 'staff' as const,
      title: staff.name,
      subtitle: staff.role,
      icon: Users,
      score: fuzzyScore(query, `${staff.name} ${staff.role}`),
    })));
  }

  if (firmId && include('subscriptions')) {
    const { data } = await supabase.from('subscriptions').select('id, plan, status').eq('firm_id', firmId);
    results.push(...(data || []).map((subscription) => ({
      id: `subscriptions-${subscription.id}`,
      entityId: subscription.id,
      type: 'subscriptions' as const,
      title: subscription.plan,
      subtitle: subscription.status,
      icon: Layers3,
      score: fuzzyScore(query, `${subscription.plan} ${subscription.status}`),
    })));
  }

  if (firmId && include('invoices')) {
    const { data } = await supabase.from('invoices').select('id, invoice_number, status').eq('firm_id', firmId);
    results.push(...(data || []).map((invoice) => ({
      id: `invoices-${invoice.id}`,
      entityId: invoice.id,
      type: 'invoices' as const,
      title: invoice.invoice_number,
      subtitle: invoice.status,
      icon: CreditCard,
      score: fuzzyScore(query, `${invoice.invoice_number} ${invoice.status}`),
    })));
  }

  if (firmId && include('compliances')) {
    const { data } = await supabase.from('filings').select('id, status').eq('firm_id', firmId);
    results.push(...(data || []).map((filing) => ({
      id: `compliances-${filing.id}`,
      entityId: filing.id,
      type: 'compliances' as const,
      title: 'Compliance Filing',
      subtitle: filing.status,
      icon: ClipboardCheck,
      score: fuzzyScore(query, filing.status),
    })));
  }

  if (firmId && include('automations')) {
    const { data } = await supabase.from('reminders').select('id, title, status, reminder_type').eq('firm_id', firmId).limit(25);
    results.push(...(data || []).map((automation) => ({
      id: `automations-${automation.id}`,
      entityId: automation.id,
      type: 'automations' as const,
      title: automation.title || 'Automation Rule',
      subtitle: `${automation.status || 'ACTIVE'} | ${automation.reminder_type || 'Rule'}`,
      icon: Layers3,
      score: fuzzyScore(query, `${automation.title || ''} ${automation.status || ''} ${automation.reminder_type || ''}`),
    })));
  }

  if (firmId && include('approvals')) {
    const { data } = await supabase.from('approval_tasks').select('id, title, status, module').eq('firm_id', firmId).limit(25);
    results.push(...(data || []).map((approval) => ({
      id: `approvals-${approval.id}`,
      entityId: approval.id,
      type: 'approvals' as const,
      title: approval.title || 'Approval Task',
      subtitle: `${approval.module || 'Governance'} | ${approval.status || 'Pending'}`,
      icon: ClipboardCheck,
      score: fuzzyScore(query, `${approval.title || ''} ${approval.status || ''} ${approval.module || ''}`),
    })));
  }

  if (firmId && include('workflows')) {
    const workflowSeeds = [
      { id: 'wf-gst', title: 'GST Filing Workflow', subtitle: 'Compliance orchestration lane' },
      { id: 'wf-notice', title: 'Notice Response Workflow', subtitle: 'Escalation + response cycle' },
      { id: 'wf-approval', title: 'Document Approval Workflow', subtitle: 'Review and release pipeline' },
    ];
    results.push(...workflowSeeds.map((workflow) => ({
      id: `workflows-${workflow.id}`,
      entityId: workflow.id,
      type: 'workflows' as const,
      title: workflow.title,
      subtitle: workflow.subtitle,
      icon: Layers3,
      score: fuzzyScore(query, `${workflow.title} ${workflow.subtitle}`),
    })));
  }

  return rank(results);
};
