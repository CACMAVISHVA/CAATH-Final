import { UserRole } from '../types';

export type CommandAction =
  | 'open-realtime-workspace'
  | 'open-analytics'
  | 'open-ai-copilot'
  | 'open-learning'
  | 'open-governance'
  | 'open-autonomous-operations'
  | 'open-integrations'
  | 'open-collaboration'
  | 'open-command-center'
  | 'open-clients'
  | 'open-tasks'
  | 'open-gst'
  | 'open-approvals'
  | 'open-documents'
  | 'open-automation'
  | 'open-notices'
  | 'create-client'
  | 'create-task'
  | 'assign-work'
  | 'reassign-work'
  | 'trigger-workflow'
  | 'bulk-resolve'
  | 'quick-approve'
  | 'open-notification-center'
  | 'open-ai-queue'
  | 'dispatch-ai-nudges'
  | 'enter-deep-work'
  | 'enter-rapid-triage'
  | 'enter-executive-monitoring'
  | 'restore-last-workflow'
  | 'create-handoff'
  | 'mention-operator'
  | 'open-team-queue'
  | 'explain-permission'
  | 'open-audit-trail'
  | 'open-approval-chain'
  | 'open-playbooks'
  | 'show-similar-resolution'
  | 'open-knowledge-graph'
  | 'validate-integration'
  | 'rotate-integration-credential'
  | 'reset-integration-circuit';

export interface CommandItem {
  id: CommandAction;
  title: string;
  subtitle: string;
  tab?: string;
  roles: UserRole[];
  keywords: string;
  pinDefault?: boolean;
}

const ALL_COMMANDS: CommandItem[] = [
  { id: 'open-realtime-workspace', title: 'Open Realtime Workspace', subtitle: 'Enter persistent multi-panel workflow shell', tab: 'workspace', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'realtime workspace shell panels live operational cockpit multitask', pinDefault: true },
  { id: 'open-analytics', title: 'Open Operational Analytics', subtitle: 'Review executive intelligence, predictive workflow analytics and realtime telemetry', tab: 'analytics', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'analytics intelligence telemetry predictive executive kpi workflow trends', pinDefault: true },
  { id: 'open-ai-copilot', title: 'Open AI Copilot', subtitle: 'Review workflow-aware AI recommendations and executive decision assistance', tab: 'ai-copilot', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'ai copilot decision assistance recommendations reasoning governance confidence workflow executive', pinDefault: true },
  { id: 'open-learning', title: 'Open Learning Dashboard', subtitle: 'Review organizational memory, playbooks and learning signals', tab: 'learning', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'learning organizational memory knowledge intelligence playbooks', pinDefault: true },
  { id: 'open-governance', title: 'Open Governance Dashboard', subtitle: 'Review trust, permissions, auditability and accountability', tab: 'governance', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'governance audit trust permission accountability dashboard', pinDefault: true },
  { id: 'open-autonomous-operations', title: 'Open Autonomous Operations', subtitle: 'Review governed automation, approval gates and runtime-safe execution', tab: 'autonomous', roles: ['SuperAdmin', 'Admin'], keywords: 'autonomous operations automation governed runtime approval gates ai execution', pinDefault: true },
  { id: 'open-integrations', title: 'Open Integration Fabric', subtitle: 'Review connectors, government systems, webhooks and connectivity governance', tab: 'integrations', roles: ['SuperAdmin', 'Admin'], keywords: 'integrations ecosystem federation government gst mca income tax webhooks communication connector', pinDefault: true },
  { id: 'open-collaboration', title: 'Open Team Coordination', subtitle: 'Enter collaborative operations workspace', tab: 'collaboration', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'collaboration team coordination presence handoff shared workspace', pinDefault: true },
  { id: 'open-command-center', title: 'Open Command Center', subtitle: 'Return to unified operational home', tab: 'eox', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'command center home eox operations control', pinDefault: true },
  { id: 'open-clients', title: 'Open Clients', subtitle: 'Navigate to Client Master', tab: 'clients', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'client master crm navigation', pinDefault: true },
  { id: 'open-tasks', title: 'Open Task Board', subtitle: 'Navigate to tasks and workflows', tab: 'tasks', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'task board workflow assignment', pinDefault: true },
  { id: 'open-gst', title: 'Open GST Intelligence', subtitle: 'Navigate to GST intelligence center', tab: 'gst', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'gst intelligence compliance filings' },
  { id: 'open-approvals', title: 'Open Approval Queue', subtitle: 'Review pending approvals', tab: 'approvals', roles: ['GodAdmin', 'SuperAdmin', 'Admin'], keywords: 'approvals queue governance' },
  { id: 'open-documents', title: 'Open Document Vault', subtitle: 'Search and manage documents', tab: 'documents', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'documents vault dms upload' },
  { id: 'open-automation', title: 'Open Automation Center', subtitle: 'Manage automation workflows', tab: 'automation', roles: ['SuperAdmin', 'Admin'], keywords: 'automation workflow reminders' },
  { id: 'open-notices', title: 'Open Notice Center', subtitle: 'Track notices and deadlines', tab: 'notices', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'notices alerts deadlines' },
  { id: 'create-client', title: 'Create Client', subtitle: 'Launch new client intake flow', tab: 'clients', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'add create client onboarding', pinDefault: true },
  { id: 'create-task', title: 'Create Task', subtitle: 'Launch new task workflow', tab: 'tasks', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'add create task workflow', pinDefault: true },
  { id: 'assign-work', title: 'Assign Work', subtitle: 'Open task workflow assignment view', tab: 'tasks', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'assign work allocation tasks' },
  { id: 'reassign-work', title: 'Reassign Work', subtitle: 'Open bulk reassignment workflow', tab: 'tasks', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'reassign workload transfer tasks' },
  { id: 'trigger-workflow', title: 'Trigger Workflow', subtitle: 'Open automation workflow trigger panel', tab: 'automation', roles: ['SuperAdmin', 'Admin'], keywords: 'trigger workflow automation' },
  { id: 'bulk-resolve', title: 'Bulk Resolve', subtitle: 'Resolve selected workflow items together', tab: 'tasks', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'bulk action resolve close complete tasks' },
  { id: 'quick-approve', title: 'Quick Approve', subtitle: 'Approve selected governance-ready records', tab: 'approvals', roles: ['GodAdmin', 'SuperAdmin', 'Admin'], keywords: 'quick approve approval release documents' },
  { id: 'open-notification-center', title: 'Open Notification Center', subtitle: 'Review grouped action-ready alerts', tab: 'notifications', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'notifications alerts priority inbox center' },
  { id: 'open-ai-queue', title: 'Open AI Task Queue', subtitle: 'Focus highest urgency AI-ranked workflows', tab: 'tasks', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'ai queue sla urgency prioritize', pinDefault: true },
  { id: 'dispatch-ai-nudges', title: 'Dispatch AI Nudges', subtitle: 'Trigger governed AI operational reminders', tab: 'dashboard', roles: ['SuperAdmin', 'Admin'], keywords: 'ai nudge reminder escalation' },
  { id: 'enter-deep-work', title: 'Enter Deep Work Mode', subtitle: 'Switch workspace into distraction-free execution', tab: 'workspace', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'deep work focus mode compact execution' },
  { id: 'enter-rapid-triage', title: 'Enter Rapid Triage', subtitle: 'Prioritize queue traversal and SLA handling', tab: 'workspace', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'rapid triage queue navigation sla sorting' },
  { id: 'enter-executive-monitoring', title: 'Enter Executive Monitoring', subtitle: 'Switch to operational monitoring layout', tab: 'workspace', roles: ['SuperAdmin', 'Admin'], keywords: 'executive monitoring mode kpi live workspace' },
  { id: 'restore-last-workflow', title: 'Restore Last Workflow', subtitle: 'Recover the last remembered operational context', tab: 'workspace', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'restore context memory last workflow continuation' },
  { id: 'create-handoff', title: 'Create Workflow Handoff', subtitle: 'Prepare contextual transfer summary for another operator', tab: 'collaboration', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'handoff transfer owner reassignment narrative continuity' },
  { id: 'mention-operator', title: 'Mention Operator', subtitle: 'Attach a coordination mention to active workflow context', tab: 'collaboration', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'mention comment operator workflow coordination note' },
  { id: 'open-team-queue', title: 'Open Team Queue', subtitle: 'Review workload ownership and SLA accountability', tab: 'collaboration', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'team queue workload ownership sla accountability coordination' },
  { id: 'explain-permission', title: 'Explain Permission Decision', subtitle: 'Show reasoning, context, workflow state and lineage', tab: 'governance', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'permission explanation context lineage governance decision' },
  { id: 'open-audit-trail', title: 'Open Audit Trail', subtitle: 'Review governance event stream and workflow lineage', tab: 'governance', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'audit trail lineage event stream traceability' },
  { id: 'open-approval-chain', title: 'Open Approval Chain', subtitle: 'Review governance checkpoints and delegated approvals', tab: 'governance', roles: ['SuperAdmin', 'Admin'], keywords: 'approval chain delegated checkpoint governance gate' },
  { id: 'open-playbooks', title: 'Open Workflow Playbooks', subtitle: 'Use institutional playbooks for guided operational execution', tab: 'learning', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'playbook workflow template best practice guidance' },
  { id: 'show-similar-resolution', title: 'Show Similar Resolution', subtitle: 'Find similar case memory and remediation guidance', tab: 'learning', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'similar resolution historical remediation memory' },
  { id: 'open-knowledge-graph', title: 'Open Knowledge Graph', subtitle: 'Explore cross-domain operational relationships', tab: 'learning', roles: ['SuperAdmin', 'Admin', 'Staff'], keywords: 'knowledge graph relationships federation organizational intelligence' },
];

export const getRoleAwareCommands = (role?: UserRole) => {
  if (!role) return [];
  return ALL_COMMANDS.filter((command) => command.roles.includes(role));
};

export const filterCommands = (commands: CommandItem[], query: string) => {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return commands;
  return commands.filter((command) => {
    const haystack = `${command.title} ${command.subtitle} ${command.keywords}`.toLowerCase();
    return haystack.includes(normalized);
  });
};
