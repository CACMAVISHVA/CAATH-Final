import { supabase } from '../lib/supabase';

export type EnterpriseDomain =
  | 'payroll'
  | 'workflow'
  | 'governance'
  | 'billing'
  | 'revenue'
  | 'intelligence'
  | 'notification';

export interface ServiceBoundaryDefinition {
  service: string;
  domain: EnterpriseDomain;
  responsibilities: string[];
  allowedDependencies: EnterpriseDomain[];
}

export interface ServiceBoundaryFinding {
  service: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  recommendation: string;
}

export interface ServiceBoundaryGovernanceReport {
  checkedAt: string;
  totalServices: number;
  findings: ServiceBoundaryFinding[];
  healthy: boolean;
}

const SERVICE_BOUNDARIES: ServiceBoundaryDefinition[] = [
  {
    service: 'payrollService',
    domain: 'payroll',
    responsibilities: ['Payroll runs', 'Payroll records', 'Payroll compliance state'],
    allowedDependencies: ['governance', 'notification', 'intelligence'],
  },
  {
    service: 'taskService',
    domain: 'workflow',
    responsibilities: ['Task lifecycle', 'Task assignment', 'Workflow status transitions'],
    allowedDependencies: ['governance', 'notification', 'intelligence'],
  },
  {
    service: 'approvalService',
    domain: 'governance',
    responsibilities: ['Approval state machine', 'Approval ownership', 'Approval auditability'],
    allowedDependencies: ['workflow', 'notification', 'intelligence'],
  },
  {
    service: 'workflowAutomationService',
    domain: 'workflow',
    responsibilities: ['Workflow triggers', 'Automation recommendations', 'Execution continuity'],
    allowedDependencies: ['workflow', 'governance', 'notification', 'intelligence'],
  },
  {
    service: 'dashboardService',
    domain: 'intelligence',
    responsibilities: ['Read-model dashboards', 'Cross-domain summaries', 'Operational snapshots'],
    allowedDependencies: ['workflow', 'governance', 'billing', 'revenue', 'notification', 'payroll', 'intelligence'],
  },
  {
    service: 'invoiceCoreService',
    domain: 'billing',
    responsibilities: ['Invoice lifecycle', 'Invoice persistence', 'Invoice state updates'],
    allowedDependencies: ['governance', 'notification', 'intelligence'],
  },
  {
    service: 'revenueIntelligenceService',
    domain: 'revenue',
    responsibilities: ['Revenue realization', 'Receivables health', 'Workflow-to-billing continuity'],
    allowedDependencies: ['workflow', 'billing', 'intelligence', 'governance'],
  },
  {
    service: 'notificationService',
    domain: 'notification',
    responsibilities: ['Notification delivery', 'Audience targeting', 'Notification persistence'],
    allowedDependencies: ['governance', 'workflow', 'billing', 'intelligence'],
  },
];

const REQUIRED_SERVICES = new Set([
  'payrollService',
  'taskService',
  'approvalService',
  'workflowAutomationService',
  'dashboardService',
  'invoiceCoreService',
  'revenueIntelligenceService',
  'notificationService',
]);

const duplicateServices = (services: ServiceBoundaryDefinition[]) => {
  const seen = new Map<string, number>();
  services.forEach((item) => {
    seen.set(item.service, (seen.get(item.service) || 0) + 1);
  });
  return Array.from(seen.entries()).filter(([, count]) => count > 1).map(([name]) => name);
};

const hasCircularDomainDependency = (services: ServiceBoundaryDefinition[]) => {
  const direct = new Set<string>();
  services.forEach((svc) => {
    svc.allowedDependencies.forEach((dep) => {
      direct.add(`${svc.domain}->${dep}`);
    });
  });

  const cycles: Array<{ from: EnterpriseDomain; to: EnterpriseDomain }> = [];
  services.forEach((svc) => {
    svc.allowedDependencies.forEach((dep) => {
      if (svc.domain !== dep && direct.has(`${dep}->${svc.domain}`)) {
        cycles.push({ from: svc.domain, to: dep });
      }
    });
  });

  return cycles;
};

export const getServiceBoundaryGovernanceReport = async (): Promise<ServiceBoundaryGovernanceReport> => {
  const findings: ServiceBoundaryFinding[] = [];

  const duplicates = duplicateServices(SERVICE_BOUNDARIES);
  duplicates.forEach((service) => {
    findings.push({
      service,
      severity: 'critical',
      message: 'Duplicate service boundary definition detected.',
      recommendation: 'Keep a single canonical owner and remove duplicates to avoid responsibility leakage.',
    });
  });

  const missing = Array.from(REQUIRED_SERVICES).filter((service) => !SERVICE_BOUNDARIES.some((s) => s.service === service));
  missing.forEach((service) => {
    findings.push({
      service,
      severity: 'warning',
      message: 'Required service boundary is missing.',
      recommendation: 'Add a boundary definition with domain, responsibilities, and allowed dependencies.',
    });
  });

  const circularPairs = hasCircularDomainDependency(SERVICE_BOUNDARIES);
  circularPairs.forEach((cycle) => {
    findings.push({
      service: `${cycle.from}<->${cycle.to}`,
      severity: 'warning',
      message: 'Bidirectional domain coupling is allowed and may grow into circular dependency risk.',
      recommendation: 'Favor one-way dependency through contracts/read-models where possible.',
    });
  });

  try {
    const { data: tasks, error: taskError } = await supabase
      .from('tasks')
      .select('id, client_id, assigned_to, status, created_by')
      .limit(1000);
    if (taskError) throw taskError;

    const orphaned = (tasks || []).filter((task) => !task.created_by || (!task.client_id && !task.assigned_to));
    if (orphaned.length > 0) {
      findings.push({
        service: 'taskService',
        severity: 'warning',
        message: `${orphaned.length} workflow records have weak ownership chains (missing creator or assignment/client anchor).`,
        recommendation: 'Enforce ownership invariants during task creation and migration.',
      });
    }
  } catch {
    findings.push({
      service: 'taskService',
      severity: 'info',
      message: 'Ownership-chain verification skipped due to data-access limitations.',
      recommendation: 'Run this check in an environment with task table access.',
    });
  }

  if (findings.length === 0) {
    findings.push({
      service: 'governance',
      severity: 'info',
      message: 'Service boundary definitions are stable with no immediate governance anomalies.',
      recommendation: 'Continue periodic boundary checks during each platform growth phase.',
    });
  }

  return {
    checkedAt: new Date().toISOString(),
    totalServices: SERVICE_BOUNDARIES.length,
    findings,
    healthy: !findings.some((finding) => finding.severity === 'critical'),
  };
};

export const getServiceBoundaryDefinitions = () => SERVICE_BOUNDARIES;
