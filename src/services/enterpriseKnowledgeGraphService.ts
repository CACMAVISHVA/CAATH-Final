import { supabase } from '../lib/supabase';
import { User } from '../types';
import { recordOperationalTelemetry } from './operationalTelemetryPipelineService';

export type KnowledgeNodeType =
  | 'client'
  | 'notice'
  | 'task'
  | 'invoice'
  | 'receivable'
  | 'payroll'
  | 'approval'
  | 'document'
  | 'owner'
  | 'event';

export interface KnowledgeNode {
  id: string;
  type: KnowledgeNodeType;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeEdge {
  from: string;
  to: string;
  relation:
    | 'linked_client'
    | 'linked_task'
    | 'linked_notice'
    | 'linked_document'
    | 'linked_invoice'
    | 'owned_by'
    | 'escalated_by'
    | 'blocked_by'
    | 'impacts_revenue'
    | 'triggered_event'
    | 'depends_on';
  weight: number;
}

export interface RelationshipContextChain {
  rootEntity: string;
  summary: string;
  impactedEntities: string[];
  risk: 'low' | 'medium' | 'high';
}

export interface EnterpriseKnowledgeGraphSnapshot {
  generatedAt: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  metrics: {
    relationshipDensity: number;
    dependencyChains: number;
    workflowImpactPropagation: number;
    crossDomainPressure: number;
    dependencyClusters: number;
  };
  contextChains: RelationshipContextChain[];
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const optionalRows = <T>(
  result: PromiseSettledResult<{ data: T[] | null; error: unknown }>,
  tableName: string,
): T[] => {
  if (result.status === 'rejected') {
    if (tableName === 'enterprise_activities') {
      console.warn('[AUTH] enterprise_activities missing', result.reason);
    } else {
      console.warn(`[AUTH] Optional knowledge graph input unavailable: ${tableName}`, result.reason);
    }
    return [];
  }
  if (result.value.error) {
    if (tableName === 'enterprise_activities') {
      console.warn('[AUTH] enterprise_activities missing', result.value.error);
    } else {
      console.warn(`[AUTH] Optional knowledge graph input unavailable: ${tableName}`, result.value.error);
    }
    return [];
  }
  return result.value.data || [];
};

export const getEnterpriseKnowledgeGraphSnapshot = async (
  firmId: string,
  user: User
): Promise<EnterpriseKnowledgeGraphSnapshot> => {
  const [clientsRes, tasksRes, noticesRes, invoicesRes, approvalsRes, docsRes, usersRes, activitiesRes, payrollRes] = await Promise.allSettled([
    supabase.from('clients').select('id,name').eq('firm_id', firmId),
    supabase.from('tasks').select('id,title,status,client_id,assigned_to').eq('firm_id', firmId),
    supabase.from('notices').select('id,notice_number,status,client_id,assigned_to,deadline').eq('firm_id', firmId),
    supabase.from('invoices').select('id,invoice_number,status,client_id,pending_amount').eq('firm_id', firmId),
    supabase.from('approval_tasks').select('id,title,status,assigned_to,record_id,module').eq('firm_id', firmId),
    supabase.from('document_vault').select('id,name,client_id,linked_task_id,linked_notice_id,linked_invoice_id,linked_approval_id').eq('firm_id', firmId).eq('is_deleted', false),
    supabase.from('users').select('id,name,role').eq('firm_id', firmId),
    supabase.from('enterprise_activities').select('id,event_type,event_subtype,reference_id,reference_table,severity').eq('firm_id', firmId).order('created_at', { ascending: false }).limit(120),
    supabase.from('payroll_runs').select('id,payout_status,employee_user_id').eq('firm_id', firmId),
  ].map((query) => query as PromiseLike<{ data: any[] | null; error: unknown }>));

  const clients = optionalRows(clientsRes, 'clients');
  const tasks = optionalRows(tasksRes, 'tasks');
  const notices = optionalRows(noticesRes, 'notices');
  const invoices = optionalRows(invoicesRes, 'invoices');
  const approvals = optionalRows(approvalsRes, 'approval_tasks');
  const documents = optionalRows(docsRes, 'document_vault');
  const users = optionalRows(usersRes, 'users');
  const activities = optionalRows(activitiesRes, 'enterprise_activities');
  const payrollRuns = optionalRows(payrollRes, 'payroll_runs');

  const nodes: KnowledgeNode[] = [];
  const edges: KnowledgeEdge[] = [];

  clients.forEach((client) => nodes.push({ id: `client:${client.id}`, type: 'client', label: client.name }));
  users.forEach((owner) => nodes.push({ id: `owner:${owner.id}`, type: 'owner', label: owner.name, metadata: { role: owner.role } }));
  tasks.forEach((task) => nodes.push({ id: `task:${task.id}`, type: 'task', label: task.title, metadata: { status: task.status } }));
  notices.forEach((notice) => nodes.push({ id: `notice:${notice.id}`, type: 'notice', label: notice.notice_number || notice.id.slice(0, 8), metadata: { status: notice.status } }));
  invoices.forEach((invoice) => nodes.push({ id: `invoice:${invoice.id}`, type: 'invoice', label: invoice.invoice_number || invoice.id.slice(0, 8), metadata: { status: invoice.status } }));
  approvals.forEach((approval) => nodes.push({ id: `approval:${approval.id}`, type: 'approval', label: approval.title || approval.id.slice(0, 8), metadata: { status: approval.status } }));
  documents.forEach((doc) => nodes.push({ id: `document:${doc.id}`, type: 'document', label: doc.name }));
  activities.forEach((activity) => nodes.push({ id: `event:${activity.id}`, type: 'event', label: `${activity.event_type}:${activity.event_subtype || 'general'}` }));

  if (user.role !== 'Client') {
    payrollRuns.forEach((run) => nodes.push({ id: `payroll:${run.id}`, type: 'payroll', label: run.id.slice(0, 8), metadata: { payout_status: run.payout_status } }));
  }

  tasks.forEach((task) => {
    if (task.client_id) edges.push({ from: `task:${task.id}`, to: `client:${task.client_id}`, relation: 'linked_client', weight: 1 });
    if (task.assigned_to) edges.push({ from: `task:${task.id}`, to: `owner:${task.assigned_to}`, relation: 'owned_by', weight: task.status === 'Escalated' ? 3 : 1 });
  });

  notices.forEach((notice) => {
    if (notice.client_id) edges.push({ from: `notice:${notice.id}`, to: `client:${notice.client_id}`, relation: 'linked_client', weight: 1 });
    if (notice.assigned_to) edges.push({ from: `notice:${notice.id}`, to: `owner:${notice.assigned_to}`, relation: 'owned_by', weight: 1 });
    if (notice.status === 'Escalated') edges.push({ from: `notice:${notice.id}`, to: `notice:${notice.id}`, relation: 'escalated_by', weight: 4 });
  });

  invoices.forEach((invoice) => {
    if (invoice.client_id) edges.push({ from: `invoice:${invoice.id}`, to: `client:${invoice.client_id}`, relation: 'linked_client', weight: 1 });
    if ((invoice.pending_amount || 0) > 0) edges.push({ from: `invoice:${invoice.id}`, to: `receivable:${invoice.id}`, relation: 'impacts_revenue', weight: 3 });
  });

  documents.forEach((doc) => {
    if (doc.client_id) edges.push({ from: `document:${doc.id}`, to: `client:${doc.client_id}`, relation: 'linked_client', weight: 1 });
    if (doc.linked_task_id) edges.push({ from: `document:${doc.id}`, to: `task:${doc.linked_task_id}`, relation: 'linked_task', weight: 2 });
    if (doc.linked_notice_id) edges.push({ from: `document:${doc.id}`, to: `notice:${doc.linked_notice_id}`, relation: 'linked_notice', weight: 2 });
    if (doc.linked_invoice_id) edges.push({ from: `document:${doc.id}`, to: `invoice:${doc.linked_invoice_id}`, relation: 'linked_invoice', weight: 2 });
    if (doc.linked_approval_id) edges.push({ from: `document:${doc.id}`, to: `approval:${doc.linked_approval_id}`, relation: 'depends_on', weight: 2 });
  });

  approvals.forEach((approval) => {
    if (approval.assigned_to) edges.push({ from: `approval:${approval.id}`, to: `owner:${approval.assigned_to}`, relation: 'owned_by', weight: 2 });
    if (approval.record_id) {
      const maybeTask = tasks.find((task) => task.id === approval.record_id);
      const maybeInvoice = invoices.find((invoice) => invoice.id === approval.record_id);
      if (maybeTask) edges.push({ from: `approval:${approval.id}`, to: `task:${maybeTask.id}`, relation: 'depends_on', weight: 2 });
      if (maybeInvoice) edges.push({ from: `approval:${approval.id}`, to: `invoice:${maybeInvoice.id}`, relation: 'depends_on', weight: 2 });
    }
  });

  activities.forEach((activity) => {
    const refId = activity.reference_id;
    const refTable = (activity.reference_table || '').toLowerCase();
    if (!refId) return;
    if (refTable.includes('task')) edges.push({ from: `event:${activity.id}`, to: `task:${refId}`, relation: 'triggered_event', weight: 1 });
    if (refTable.includes('notice')) edges.push({ from: `event:${activity.id}`, to: `notice:${refId}`, relation: 'triggered_event', weight: 1 });
    if (refTable.includes('invoice')) edges.push({ from: `event:${activity.id}`, to: `invoice:${refId}`, relation: 'triggered_event', weight: 1 });
    if (refTable.includes('approval')) edges.push({ from: `event:${activity.id}`, to: `approval:${refId}`, relation: 'triggered_event', weight: 1 });
    if (refTable.includes('document')) edges.push({ from: `event:${activity.id}`, to: `document:${refId}`, relation: 'triggered_event', weight: 1 });
  });

  if (user.role !== 'Client' && user.role !== 'Staff') {
    payrollRuns.forEach((run) => {
      if (run.employee_user_id) {
        edges.push({ from: `payroll:${run.id}`, to: `owner:${run.employee_user_id}`, relation: 'linked_client', weight: 1 });
      }
    });
  }

  const uniqueNodeIds = new Set<string>();
  const dedupNodes = nodes.filter((node) => {
    if (uniqueNodeIds.has(node.id)) return false;
    uniqueNodeIds.add(node.id);
    return true;
  });

  const relationshipDensity = dedupNodes.length > 1 ? edges.length / dedupNodes.length : 0;
  const dependencyChains = edges.filter((edge) => ['depends_on', 'blocked_by', 'linked_document'].includes(edge.relation)).length;
  const workflowImpactPropagation = edges.filter((edge) => ['impacts_revenue', 'escalated_by', 'triggered_event'].includes(edge.relation)).length;
  const dependencyClusters = Math.round(edges.filter((edge) => edge.weight >= 2).length / 3);
  const crossDomainPressure = clamp(
    dependencyChains * 4 +
    workflowImpactPropagation * 2 +
    notices.filter((notice) => ['Escalated', 'Under_Review'].includes(notice.status)).length * 6 +
    invoices.filter((invoice) => ['Overdue', 'Unpaid', 'Partially Paid'].includes(invoice.status)).length * 5
  );

  const contextChains: RelationshipContextChain[] = [];
  notices
    .filter((notice) => !['Filed', 'Closed', 'Archived'].includes(notice.status))
    .slice(0, 6)
    .forEach((notice) => {
      const linkedDocs = documents.filter((doc) => doc.linked_notice_id === notice.id).length;
      const linkedTasks = tasks.filter((task) => task.client_id === notice.client_id && ['Escalated', 'In Progress', 'Under Review'].includes(task.status)).length;
      const clientInvoices = invoices.filter((invoice) => invoice.client_id === notice.client_id && ['Overdue', 'Partially Paid', 'Unpaid'].includes(invoice.status)).length;
      const risk: 'low' | 'medium' | 'high' =
        linkedTasks + clientInvoices >= 4 ? 'high' :
        linkedTasks + clientInvoices >= 2 ? 'medium' : 'low';

      contextChains.push({
        rootEntity: `notice:${notice.id}`,
        summary: `Notice ${notice.notice_number || notice.id.slice(0, 8)} links to ${linkedTasks} active tasks, ${linkedDocs} docs, and ${clientInvoices} billing pressure items.`,
        impactedEntities: [
          `client:${notice.client_id || 'unknown'}`,
          `notice:${notice.id}`,
          ...(linkedTasks > 0 ? ['task_cluster'] : []),
          ...(clientInvoices > 0 ? ['invoice_cluster'] : []),
        ],
        risk,
      });
    });

  try {
    await recordOperationalTelemetry({
      firmId,
      metric: 'event_propagation',
      eventName: 'enterprise_knowledge_graph_snapshot_generated',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      severity: crossDomainPressure >= 70 ? 'warning' : 'info',
      payload: {
        relationshipDensity,
        dependencyChains,
        workflowImpactPropagation,
        dependencyClusters,
        crossDomainPressure,
        nodeCount: dedupNodes.length,
        edgeCount: edges.length,
      },
    });
  } catch {
    // keep knowledge graph retrieval non-blocking
  }

  return {
    generatedAt: new Date().toISOString(),
    nodes: dedupNodes,
    edges,
    metrics: {
      relationshipDensity: Number(relationshipDensity.toFixed(2)),
      dependencyChains,
      workflowImpactPropagation,
      crossDomainPressure,
      dependencyClusters,
    },
    contextChains,
  };
};
