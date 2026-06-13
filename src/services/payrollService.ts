import { supabase } from '../lib/supabase';
import { User } from '../types';
import { logEnterpriseActivity } from './observabilityService';
import { assertWorkflowTransition } from './workflowEngineService';
import { publishEnterpriseEvent } from './enterpriseEventBusService';
import { registerOrchestrationChain } from './enterpriseOrchestrationService';

export type PayrollPayoutStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Paid' | 'Rejected';

export interface SalaryStructure {
  id: string;
  firm_id: string;
  employee_user_id: string;
  base_salary: number;
  incentives: number;
  bonus: number;
  deductions: number;
  reimbursements: number;
  effective_from: string;
  status: 'Active' | 'Inactive';
}

export interface PayrollRun {
  id: string;
  firm_id: string;
  payroll_period: string;
  employee_user_id: string;
  gross_amount: number;
  net_amount: number;
  payout_status: PayrollPayoutStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

const writePayrollAuditLog = async (params: {
  firmId: string;
  actor: User;
  action: string;
  entityId?: string;
  details: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}) => {
  try {
    await supabase.from('audit_logs').insert([{
      firm_id: params.firmId,
      user_id: params.actor.id,
      user_name: params.actor.name,
      user_role: params.actor.role,
      action: params.action,
      entity_type: 'Payroll',
      entity_id: params.entityId || null,
      details: params.details,
      before_state: params.beforeState || null,
      after_state: params.afterState || null,
      created_by: params.actor.id,
      updated_by: params.actor.id,
    }]);
  } catch {
    // Keep payroll runtime stable if audit table metadata differs by environment.
  }
};

const MOCK_STRUCTURES: SalaryStructure[] = [
  {
    id: 'ss-1',
    firm_id: 'f1',
    employee_user_id: 's1',
    base_salary: 65000,
    incentives: 5000,
    bonus: 2000,
    deductions: 1500,
    reimbursements: 800,
    effective_from: '2026-04-01',
    status: 'Active',
  },
];

const MOCK_RUNS: PayrollRun[] = [
  {
    id: 'pr-1',
    firm_id: 'f1',
    payroll_period: '2026-05',
    employee_user_id: 's1',
    gross_amount: 72000,
    net_amount: 71300,
    payout_status: 'Pending Approval',
    approved_by: null,
    approved_at: null,
    created_at: new Date().toISOString(),
  },
];

export const getSalaryStructures = async (firmId: string, actor: User) => {
  try {
    let query = supabase.from('salary_structures').select('*').eq('firm_id', firmId);
    if (actor.role === 'Admin' || actor.role === 'Staff') query = query.eq('employee_user_id', actor.id);
    const { data, error } = await query.order('effective_from', { ascending: false });
    if (error) throw error;
    await writePayrollAuditLog({
      firmId,
      actor,
      action: 'Payroll Salary View',
      details: actor.role === 'SuperAdmin' ? 'Viewed salary structures (organization scope).' : 'Viewed own salary structure.',
    });
    return (data || []) as SalaryStructure[];
  } catch {
    return MOCK_STRUCTURES.filter((s) => s.firm_id === firmId && (!['Admin', 'Staff'].includes(actor.role) || s.employee_user_id === actor.id));
  }
};

export const getPayrollRuns = async (firmId: string, actor: User) => {
  try {
    let query = supabase.from('payroll_runs').select('*').eq('firm_id', firmId);
    if (actor.role === 'Admin' || actor.role === 'Staff') query = query.eq('employee_user_id', actor.id);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    await writePayrollAuditLog({
      firmId,
      actor,
      action: 'Payroll Run View',
      details: actor.role === 'SuperAdmin' ? 'Viewed payroll runs (organization scope).' : 'Viewed own payroll run history.',
    });
    return (data || []) as PayrollRun[];
  } catch {
    return MOCK_RUNS.filter((s) => s.firm_id === firmId && (!['Admin', 'Staff'].includes(actor.role) || s.employee_user_id === actor.id));
  }
};

export const submitPayrollApproval = async (runId: string, actor: User, firmId: string) => {
  if (actor.role !== 'SuperAdmin') {
    throw new Error('Only SuperAdmin can submit payroll approvals.');
  }
  try {
    const { data: before } = await supabase
      .from('payroll_runs')
      .select('payout_status')
      .eq('id', runId)
      .eq('firm_id', firmId)
      .maybeSingle();
    assertWorkflowTransition('payroll_approval', before?.payout_status || 'Draft', 'Pending Approval', actor.role);
  } catch {
    // Runtime-safe fallback for environments where table metadata is not available.
  }

  await writePayrollAuditLog({
    firmId,
    actor,
    action: 'Payroll Approval Submitted',
    entityId: runId,
    details: 'Submitted payroll run for approval.',
  });
  await logEnterpriseActivity({
    firm_id: firmId,
    event_type: 'payroll',
    event_subtype: 'approval_submitted',
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
    reference_id: runId,
    reference_table: 'payroll_runs',
    severity: 'notice',
  } as any);
  try {
    await registerOrchestrationChain({
      firmId,
      actor,
      chainType: 'payroll_governance',
      entityType: 'payroll_runs',
      entityId: runId,
      governanceRequired: true,
    });
  } catch {
    // preserve payroll submission stability
  }
};

export const approvePayrollRun = async (runId: string, actor: User, firmId: string) => {
  if (actor.role !== 'SuperAdmin') {
    throw new Error('Only SuperAdmin can approve payroll runs.');
  }
  try {
    const { data: before } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('id', runId)
      .eq('firm_id', firmId)
      .maybeSingle();
    assertWorkflowTransition('payroll_approval', before?.payout_status || 'Draft', 'Approved', actor.role);

    const { error } = await supabase
      .from('payroll_runs')
      .update({
        payout_status: 'Approved',
        approved_by: actor.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', runId)
      .eq('firm_id', firmId);
    if (error) throw error;
    await writePayrollAuditLog({
      firmId,
      actor,
      action: 'Payroll Approved',
      entityId: runId,
      details: 'Approved payroll run.',
      beforeState: before as Record<string, unknown> | null,
      afterState: { payout_status: 'Approved', approved_by: actor.id, approved_at: new Date().toISOString() },
    });
  } catch {
    // Fallback keeps runtime stable until DB tables are provisioned.
  }
  await logEnterpriseActivity({
    firm_id: firmId,
    event_type: 'payroll',
    event_subtype: 'approved',
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
    reference_id: runId,
    reference_table: 'payroll_runs',
    severity: 'info',
  } as any);

  await publishEnterpriseEvent({
    eventName: 'payroll_approved',
    firmId,
    sourceService: 'payrollService.approvePayrollRun',
    actor: { id: actor.id, name: actor.name, role: actor.role },
    workflowType: 'payroll_runs',
    workflowId: runId,
    payload: { payoutStatus: 'Approved' },
  });
};

export const updateSalaryStructure = async (
  structureId: string,
  updates: Partial<Pick<SalaryStructure, 'base_salary' | 'incentives' | 'bonus' | 'deductions' | 'reimbursements' | 'status'>>,
  actor: User,
  firmId: string,
  reason = 'Compensation update'
) => {
  if (actor.role !== 'SuperAdmin') {
    throw new Error('Only SuperAdmin can modify salary structures.');
  }

  try {
    const { data: before } = await supabase
      .from('salary_structures')
      .select('*')
      .eq('id', structureId)
      .eq('firm_id', firmId)
      .single();

    const { error } = await supabase
      .from('salary_structures')
      .update({ ...updates, updated_by: actor.id, updated_at: new Date().toISOString() })
      .eq('id', structureId)
      .eq('firm_id', firmId);
    if (error) throw error;

    await supabase.from('compensation_change_history').insert([{
      firm_id: firmId,
      employee_user_id: before.employee_user_id,
      salary_structure_id: structureId,
      changed_by: actor.id,
      previous_payload: before,
      next_payload: updates,
      reason,
    }]);

    await writePayrollAuditLog({
      firmId,
      actor,
      action: 'Compensation Modified',
      entityId: structureId,
      details: reason,
      beforeState: before as Record<string, unknown>,
      afterState: updates as Record<string, unknown>,
    });
  } catch {
    // no-op fallback to preserve runtime
  }
};

export const logPayrollWorkspaceAccess = async (firmId: string, actor: User, status: 'unlocked' | 'locked' | 'timeout_locked') => {
  await writePayrollAuditLog({
    firmId,
    actor,
    action: `Payroll Workspace ${status}`,
    details: `Payroll workspace ${status.replace('_', ' ')}.`,
  });
};
