import { supabase } from '../../../lib/supabase';

export const workflowIntegrityRepository = {
  async loadIntegrityInputs(firmId: string, sevenDaysAgoIso: string) {
    const [tasksRes, noticesRes, approvalsRes, payrollRes, invoicesRes, reassignRes, auditRes] = await Promise.all([
      supabase.from('tasks').select('id, status, assigned_to, updated_at, deadline, description, client_id').eq('firm_id', firmId),
      supabase.from('notices').select('id, status, assigned_to, updated_at, deadline, client_id, notice_number').eq('firm_id', firmId),
      supabase.from('approval_tasks').select('id, status, assigned_to, updated_at, created_at').eq('firm_id', firmId),
      supabase.from('payroll_runs').select('id, payout_status, approved_by, approved_at, created_at, updated_at').eq('firm_id', firmId),
      supabase.from('invoices').select('id, status, client_id, pending_amount, due_date').eq('firm_id', firmId),
      supabase.from('task_reassignments').select('id, task_id, created_at, previous_assignee, new_assignee').eq('firm_id', firmId),
      supabase.from('audit_logs').select('id, action, entity_type, entity_id, user_role, details, before_state, after_state, created_at').eq('firm_id', firmId).gte('created_at', sevenDaysAgoIso),
    ]);

    if (tasksRes.error) throw tasksRes.error;
    if (noticesRes.error) throw noticesRes.error;
    if (approvalsRes.error) throw approvalsRes.error;
    if (payrollRes.error) throw payrollRes.error;
    if (invoicesRes.error) throw invoicesRes.error;
    if (reassignRes.error) throw reassignRes.error;
    if (auditRes.error) throw auditRes.error;

    return {
      tasks: tasksRes.data || [],
      notices: noticesRes.data || [],
      approvals: approvalsRes.data || [],
      payrollRuns: payrollRes.data || [],
      invoices: invoicesRes.data || [],
      reassignments: reassignRes.data || [],
      auditLogs: auditRes.data || [],
    };
  },
};
