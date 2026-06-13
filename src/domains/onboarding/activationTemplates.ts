import { UserRole } from '../../types';
import { RoleActivationFlow, WorkspaceProvisioningPack } from './types';

const commonWorkflowSteps = [
  { id: 'first-task', title: 'Run First Task Assignment', description: 'Create and assign the first operational task.', kind: 'workflow' as const, targetTab: 'tasks' },
  { id: 'first-notice', title: 'Process First Notice', description: 'Open notice center and action first notice workflow.', kind: 'workflow' as const, targetTab: 'notices' },
];

export const ROLE_ACTIVATION_FLOWS: Record<UserRole, RoleActivationFlow> = {
  GodAdmin: {
    role: 'GodAdmin',
    title: 'Platform Activation',
    subtitle: 'Provision tenants, governance, and platform operations.',
    setupSteps: [
      { id: 'firm-segmentation', title: 'Configure Firm Segmentation', description: 'Validate tenant grouping and operational governance.', kind: 'setup', targetTab: 'dashboard' },
      { id: 'platform-security', title: 'Validate Security Monitoring', description: 'Review audit and anomaly posture before rollout.', kind: 'setup', targetTab: 'security' },
      ...commonWorkflowSteps,
    ],
    tourSteps: [
      { id: 'tour-control', title: 'Control Tower Tour', description: 'Walk through global operations and usage controls.', kind: 'tour', targetTab: 'dashboard' },
    ],
    templates: ['platform-governance', 'firm-operations'],
  },
  SuperAdmin: {
    role: 'SuperAdmin',
    title: 'Firm Operational Activation',
    subtitle: 'Launch your firm workspace and workflows quickly.',
    setupSteps: [
      { id: 'setup-clients', title: 'Add First Client', description: 'Create your first client profile with service mapping.', kind: 'setup', targetTab: 'clients' },
      { id: 'setup-gst', title: 'Configure GST Workspace', description: 'Initialize GST intelligence and filing context.', kind: 'setup', targetTab: 'gst' },
      { id: 'setup-automation', title: 'Enable Workflow Automation', description: 'Activate reminder and escalation automation.', kind: 'setup', targetTab: 'automation' },
      ...commonWorkflowSteps,
      { id: 'first-intelligence', title: 'Generate First Intelligence Scan', description: 'Run GST intelligence preset for risk posture.', kind: 'workflow', targetTab: 'gst' },
    ],
    tourSteps: [
      { id: 'tour-dashboard', title: 'Operational Dashboard Tour', description: 'Understand workload, SLA, and risk overview.', kind: 'tour', targetTab: 'dashboard' },
      { id: 'tour-command', title: 'Command Experience Tour', description: 'Use quick actions and command shortcuts.', kind: 'tour', targetTab: 'dashboard' },
    ],
    templates: ['gst-workflow-starter', 'audit-workflow-starter', 'notice-response-starter'],
  },
  Admin: {
    role: 'Admin',
    title: 'Team Operations Activation',
    subtitle: 'Route work, monitor workflows, and enforce timelines.',
    setupSteps: [
      { id: 'admin-queue', title: 'Setup Approval Queue', description: 'Enable governance approvals and escalation reviews.', kind: 'setup', targetTab: 'approvals' },
      { id: 'admin-notify', title: 'Configure Notification Preferences', description: 'Set operational alert priorities and reminders.', kind: 'setup', targetTab: 'notifications' },
      ...commonWorkflowSteps,
    ],
    tourSteps: [
      { id: 'tour-operations', title: 'Operations Workspace Tour', description: 'Discover bottlenecks, workloads, and action lanes.', kind: 'tour', targetTab: 'dashboard' },
    ],
    templates: ['ops-manager-starter', 'team-productivity-starter'],
  },
  Staff: {
    role: 'Staff',
    title: 'Execution Workspace Activation',
    subtitle: 'Get your task, GST, and collaboration flows ready.',
    setupSteps: [
      { id: 'staff-task-lane', title: 'Configure My Task Lane', description: 'Pin your workload board and due-date views.', kind: 'setup', targetTab: 'tasks' },
      { id: 'staff-gst', title: 'Open GST Filing Workflow', description: 'Load GST context and review compliance cues.', kind: 'setup', targetTab: 'gst' },
      ...commonWorkflowSteps,
    ],
    tourSteps: [
      { id: 'tour-staff', title: 'Staff Workflow Tour', description: 'Navigate task, document, and notice execution paths.', kind: 'tour', targetTab: 'tasks' },
    ],
    templates: ['staff-delivery-starter', 'gst-filing-starter'],
  },
  Client: {
    role: 'Client',
    title: 'Client Portal Activation',
    subtitle: 'Start tracking compliance and document collaboration.',
    setupSteps: [
      { id: 'client-docs', title: 'Upload First Document', description: 'Share source documents for workflow processing.', kind: 'setup', targetTab: 'documents' },
      { id: 'client-compliance', title: 'Review Compliance Timeline', description: 'Understand filing status and deadlines.', kind: 'setup', targetTab: 'compliance' },
      { id: 'client-messages', title: 'Open Collaboration Feed', description: 'Check alerts, comments, and workflow updates.', kind: 'setup', targetTab: 'messages' },
    ],
    tourSteps: [
      { id: 'tour-client', title: 'Client Portal Walkthrough', description: 'Guided tour for portal workflows and notifications.', kind: 'tour', targetTab: 'overview' },
    ],
    templates: ['client-portal-starter'],
  },
};

export const WORKSPACE_PROVISIONING_PACKS: Record<UserRole, WorkspaceProvisioningPack> = {
  GodAdmin: {
    role: 'GodAdmin',
    dashboards: ['control-tower', 'platform-risk'],
    widgets: ['firm-health', 'subscription-heatmap', 'security-signals'],
    workflows: ['firm-onboarding', 'subscription-governance'],
    commandPresets: ['open-firms', 'open-approvals'],
    notificationDefaults: ['critical_platform_alerts', 'security_events'],
    quickPins: [
      { id: 'pin-platform', type: 'module', label: 'Control Tower', target: 'dashboard', subtitle: 'Platform governance' },
      { id: 'pin-security', type: 'module', label: 'Security Center', target: 'security' },
    ],
  },
  SuperAdmin: {
    role: 'SuperAdmin',
    dashboards: ['firm-command', 'workflow-health'],
    widgets: ['sla-risk', 'gst-risk', 'revenue-pressure'],
    workflows: ['gst-core', 'audit-assignment', 'notice-escalation'],
    commandPresets: ['create-client', 'create-task', 'trigger-workflow'],
    notificationDefaults: ['escalation_alerts', 'workflow_reminders'],
    quickPins: [
      { id: 'pin-gst', type: 'module', label: 'GST Intelligence', target: 'gst' },
      { id: 'pin-tasks', type: 'workflow', label: 'Task Board', target: 'tasks', subtitle: 'Operational lane' },
    ],
  },
  Admin: {
    role: 'Admin',
    dashboards: ['ops-overview', 'approval-queue'],
    widgets: ['workload-balance', 'approval-bottleneck', 'deadline-risk'],
    workflows: ['task-approvals', 'ops-routing'],
    commandPresets: ['assign-work', 'reassign-work', 'open-approvals'],
    notificationDefaults: ['approval_alerts', 'workload_nudges'],
    quickPins: [
      { id: 'pin-approvals', type: 'workflow', label: 'Approval Queue', target: 'approvals' },
      { id: 'pin-automation', type: 'automation', label: 'Automation Center', target: 'automation' },
    ],
  },
  Staff: {
    role: 'Staff',
    dashboards: ['execution-board'],
    widgets: ['my-sla', 'my-overdues', 'gst-reminders'],
    workflows: ['task-execution', 'filing-prep'],
    commandPresets: ['open-tasks', 'open-notices'],
    notificationDefaults: ['task_due_alerts', 'workflow_updates'],
    quickPins: [
      { id: 'pin-my-tasks', type: 'workflow', label: 'Assigned Tasks', target: 'tasks' },
      { id: 'pin-notices', type: 'module', label: 'Notice Center', target: 'notices' },
    ],
  },
  Client: {
    role: 'Client',
    dashboards: ['client-overview'],
    widgets: ['document-status', 'compliance-timeline', 'firm-updates'],
    workflows: ['document-collaboration', 'compliance-tracking'],
    commandPresets: ['open-documents'],
    notificationDefaults: ['document_updates', 'deadline_reminders'],
    quickPins: [
      { id: 'pin-client-overview', type: 'module', label: 'Overview', target: 'overview' },
      { id: 'pin-client-documents', type: 'document', label: 'Documents', target: 'documents' },
    ],
  },
};
