import { supabase } from '../../../lib/supabase';

export type AutomationTaskRow = { id: string; title: string | null; status: string | null; priority: string | null; deadline: string | null; assigned_to: string | null };
export type AutomationApprovalRow = { id: string; title: string | null; status: string | null; updated_at: string | null };
export type AutomationFilingRow = { id: string; status: string | null; due_date: string | null; return_type: string | null };
export type AutomationNoticeRow = { id: string; status: string | null; created_at: string | null };
export type AutomationRunRow = { id: string; status: string; created_at: string };

export const workflowAutomationRepository = {
  async loadWorkflowInputs(firmId: string) {
    const [tasksResult, approvalsResult, filingsResult, noticesResult] = await Promise.all([
      supabase.from('tasks').select('id, title, status, priority, deadline, assigned_to').eq('firm_id', firmId),
      supabase.from('approval_tasks').select('id, title, status, updated_at').eq('firm_id', firmId),
      supabase.from('filings').select('id, status, due_date, return_type').eq('firm_id', firmId),
      supabase.from('notices').select('id, status, created_at').eq('firm_id', firmId),
    ]);

    if (tasksResult.error) throw tasksResult.error;
    if (approvalsResult.error) throw approvalsResult.error;
    if (filingsResult.error) throw filingsResult.error;
    if (noticesResult.error) throw noticesResult.error;

    return {
      tasks: (tasksResult.data || []) as AutomationTaskRow[],
      approvals: (approvalsResult.data || []) as AutomationApprovalRow[],
      filings: (filingsResult.data || []) as AutomationFilingRow[],
      notices: (noticesResult.data || []) as AutomationNoticeRow[],
    };
  },
};
