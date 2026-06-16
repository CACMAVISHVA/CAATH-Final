-- CAATH production schema synchronization script.
-- Safe for Supabase SQL Editor. Idempotent and data-preserving.
--
-- Source inventory from application code:
-- approval_tasks, approvals, audit_logs, auth_security_settings, automation_runs,
-- billing, client_interactions, clients, compensation_change_history, completions,
-- compliance_tasks, document_audit_logs, document_vault, documents,
-- enterprise_activities, expenses, filings, firms, gst_invoices, gst_mismatches,
-- gst_reconciliations, gstr_filings, gstr1_data, gstr3b_data, invoice_payments,
-- invoices, login_activity, notices, notifications, payroll_runs,
-- portal_audit_logs, portal_credentials, purchase_register, reminders,
-- salary_structures, security_rate_limits, subscriptions, subtasks,
-- support_tickets, task_activities, task_comments, task_reassignments, tasks,
-- trusted_devices, user_preferences, users, workforce_profiles.
--
-- RPC expected by application: public.gst_monthly_tax_trends(uuid, integer)
-- Storage bucket expected by application: documents

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  firm_name text,
  workspace_code text,
  status text NOT NULL DEFAULT 'Active',
  subscription_status text NOT NULL DEFAULT 'Trial',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'User',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'Client',
  status text NOT NULL DEFAULT 'Active',
  is_workspace_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_firm_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT firm_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_god_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'GodAdmin' FROM public.users WHERE auth_id = auth.uid() LIMIT 1), false);
$$;

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Client',
  email text,
  phone text,
  status text NOT NULL DEFAULT 'Active',
  gstin text,
  pan text,
  tan text,
  cin_llpin text,
  portal_username text,
  risk_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Task',
  description text,
  status text NOT NULL DEFAULT 'Todo',
  priority text NOT NULL DEFAULT 'Medium',
  category text,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  deadline timestamptz,
  due_date date,
  portal_type text,
  portal_workflow_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'Trial',
  status text NOT NULL DEFAULT 'Trial',
  amount numeric NOT NULL DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  trial_ends_at timestamptz,
  start_date timestamptz,
  end_date timestamptz,
  next_billing_date timestamptz,
  trial_end_date timestamptz,
  grace_period_end_date timestamptz,
  client_limit integer NOT NULL DEFAULT 10,
  staff_limit integer NOT NULL DEFAULT 3,
  storage_limit_gb integer NOT NULL DEFAULT 5,
  auto_renew boolean NOT NULL DEFAULT false,
  payment_method text,
  last_payment_date timestamptz,
  last_payment_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_name text,
  user_role text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details text,
  severity text NOT NULL DEFAULT 'info',
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_name text,
  user_role text,
  activity_type text NOT NULL,
  previous_value text,
  new_value text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  user_name text,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_reassignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  previous_assignee uuid REFERENCES public.users(id) ON DELETE SET NULL,
  new_assignee uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reassigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approval_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Approval',
  module text,
  record_id uuid,
  status text NOT NULL DEFAULT 'PENDING',
  workflow_stage text,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  rework_owner uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reassigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  escalated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  escalated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  module text,
  record_id uuid,
  title text NOT NULL DEFAULT 'Approval',
  status text NOT NULL DEFAULT 'Pending',
  requested_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compliance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT 'Compliance task',
  return_type text,
  period text,
  due_date date,
  filing_status text NOT NULL DEFAULT 'Pending',
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  notice_number text,
  source text,
  status text NOT NULL DEFAULT 'Received',
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  received_date date,
  deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number text NOT NULL DEFAULT '',
  type text,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Unpaid',
  date date NOT NULL DEFAULT current_date,
  due_date date,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT 'Document',
  category text NOT NULL DEFAULT 'General',
  storage_path text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Uploaded',
  workflow_stage text,
  version integer NOT NULL DEFAULT 1,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  audience_role text,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  type text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  reminder_type text,
  status text NOT NULL DEFAULT 'Pending',
  trigger_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  automation_key text NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name text,
  actor_role text,
  event_type text NOT NULL,
  event_subtype text,
  reference_table text,
  reference_id uuid,
  severity text NOT NULL DEFAULT 'info',
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.auth_security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid UNIQUE REFERENCES public.firms(id) ON DELETE CASCADE,
  otp_enabled boolean NOT NULL DEFAULT true,
  otp_requirement_mode text NOT NULL DEFAULT 'admins',
  otp_expiry_minutes integer NOT NULL DEFAULT 5,
  otp_attempt_limit integer NOT NULL DEFAULT 5,
  otp_resend_limit integer NOT NULL DEFAULT 3,
  otp_resend_window_minutes integer NOT NULL DEFAULT 10,
  otp_resend_cooldown_seconds integer NOT NULL DEFAULT 30,
  failed_password_limit integer NOT NULL DEFAULT 5,
  lockout_minutes integer NOT NULL DEFAULT 15,
  session_timeout_minutes integer NOT NULL DEFAULT 60,
  remember_me_session_days integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.login_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  status text NOT NULL,
  event_type text NOT NULL,
  otp_status text,
  device_fingerprint text,
  device_label text,
  ip_address inet,
  user_agent text,
  approximate_location text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  logout_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  device_label text,
  user_agent text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (user_id, device_fingerprint)
);

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint text,
  device_label text,
  user_agent text,
  remember_me boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  terminated_at timestamptz,
  termination_reason text
);

CREATE TABLE IF NOT EXISTS public.document_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'General',
  document_type text NOT NULL DEFAULT 'Other',
  name text NOT NULL DEFAULT 'Document',
  file_path text NOT NULL DEFAULT '',
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  linked_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  linked_compliance_id uuid,
  linked_invoice_id uuid,
  linked_notice_id uuid,
  linked_approval_id uuid,
  parent_document_id uuid REFERENCES public.document_vault(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  is_archived boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_by_name text NOT NULL DEFAULT 'Unknown',
  ocr_status text,
  expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT 'Unknown',
  user_role text NOT NULL DEFAULT 'Unknown',
  document_id uuid REFERENCES public.document_vault(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  action text NOT NULL,
  details text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number text NOT NULL DEFAULT '',
  financial_year text NOT NULL DEFAULT '',
  issue_date date NOT NULL DEFAULT current_date,
  due_date date NOT NULL DEFAULT current_date,
  billing_category text NOT NULL DEFAULT 'Professional Services',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  cgst_amount numeric NOT NULL DEFAULT 0,
  sgst_amount numeric NOT NULL DEFAULT 0,
  igst_amount numeric NOT NULL DEFAULT 0,
  total_gst numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  pending_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft',
  notes text,
  terms text,
  line_items jsonb NOT NULL DEFAULT '[]',
  paid_date timestamptz,
  sent_date timestamptz,
  viewed_date timestamptz,
  cancelled_date timestamptz,
  cancelled_reason text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_date timestamptz NOT NULL DEFAULT now(),
  payment_mode text NOT NULL DEFAULT 'Other',
  reference text,
  received_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'General',
  description text NOT NULL DEFAULT '',
  vendor text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  gst_rate numeric NOT NULL DEFAULT 0,
  gst_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT current_date,
  payment_date timestamptz,
  payment_mode text,
  status text NOT NULL DEFAULT 'Pending',
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  receipt_document_id uuid REFERENCES public.document_vault(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workforce_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  employee_code text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  team text NOT NULL DEFAULT '',
  designation text NOT NULL DEFAULT '',
  joining_date date NOT NULL DEFAULT current_date,
  reporting_manager_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  compensation_status text NOT NULL DEFAULT 'Draft',
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salary_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  employee_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  base_salary numeric(14,2) NOT NULL DEFAULT 0,
  incentives numeric(14,2) NOT NULL DEFAULT 0,
  bonus numeric(14,2) NOT NULL DEFAULT 0,
  deductions numeric(14,2) NOT NULL DEFAULT 0,
  reimbursements numeric(14,2) NOT NULL DEFAULT 0,
  effective_from date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'Active',
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  payroll_period text NOT NULL DEFAULT '',
  employee_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  gross_amount numeric(14,2) NOT NULL DEFAULT 0,
  net_amount numeric(14,2) NOT NULL DEFAULT 0,
  payout_status text NOT NULL DEFAULT 'Draft',
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compensation_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  employee_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  salary_structure_id uuid REFERENCES public.salary_structures(id) ON DELETE SET NULL,
  changed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  previous_payload jsonb,
  next_payload jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gstr_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  return_type text NOT NULL DEFAULT 'GSTR-1',
  period text NOT NULL DEFAULT '',
  due_date date,
  filing_date date,
  status text NOT NULL DEFAULT 'Pending',
  taxable_value numeric NOT NULL DEFAULT 0,
  tax_collected numeric NOT NULL DEFAULT 0,
  tax_claimed numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gst_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'GSTR1',
  invoice_no text NOT NULL DEFAULT '',
  invoice_date date NOT NULL DEFAULT current_date,
  supplier_gstin text,
  recipient_gstin text,
  taxable_value numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gst_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  period text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  summary jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gst_mismatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id uuid REFERENCES public.gst_reconciliations(id) ON DELETE CASCADE,
  gst_invoice_id uuid REFERENCES public.gst_invoices(id) ON DELETE SET NULL,
  mismatch_type text NOT NULL DEFAULT 'UNKNOWN',
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gstr1_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  period text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  taxable_value numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gstr3b_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  period text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  taxable_value numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_no text NOT NULL DEFAULT '',
  invoice_date date NOT NULL DEFAULT current_date,
  supplier_gstin text,
  taxable_value numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  original_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ui_style text,
  sound_enabled boolean,
  sound_volume numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  completed boolean NOT NULL DEFAULT false,
  due_date date,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'note',
  subject text NOT NULL,
  description text NOT NULL DEFAULT '',
  outcome text,
  next_followup date,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_name text NOT NULL DEFAULT 'Unknown',
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Completed',
  completed_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  subject text NOT NULL DEFAULT 'Support request',
  description text,
  status text NOT NULL DEFAULT 'Open',
  priority text NOT NULL DEFAULT 'Medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portal_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  portal_name text,
  portal_type text,
  username text,
  encrypted_payload text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portal_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  portal_type text NOT NULL,
  action text NOT NULL,
  related_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  actor text NOT NULL,
  window_start timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Compatibility view expected by workflow/search services.
CREATE OR REPLACE VIEW public.filings
WITH (security_invoker = true) AS
SELECT id, firm_id, client_id, return_type, period, due_date, filing_date, status,
       taxable_value, tax_collected, tax_claimed, created_at
FROM public.gstr_filings;

CREATE OR REPLACE FUNCTION public.gst_monthly_tax_trends(p_client_id uuid, p_months integer DEFAULT 6)
RETURNS TABLE(month text, taxable_value numeric, tax_amount numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    to_char(date_trunc('month', invoice_date), 'YYYY-MM') AS month,
    COALESCE(sum(taxable_value), 0) AS taxable_value,
    COALESCE(sum(tax_amount), 0) AS tax_amount
  FROM public.gst_invoices
  WHERE client_id = p_client_id
    AND invoice_date >= date_trunc('month', current_date) - ((GREATEST(p_months, 1) - 1) || ' months')::interval
  GROUP BY date_trunc('month', invoice_date)
  ORDER BY month;
$$;

-- Add columns introduced by later application modules if a table already existed.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS pan text,
  ADD COLUMN IF NOT EXISTS tan text,
  ADD COLUMN IF NOT EXISTS cin_llpin text,
  ADD COLUMN IF NOT EXISTS portal_username text,
  ADD COLUMN IF NOT EXISTS risk_level text;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS portal_type text,
  ADD COLUMN IF NOT EXISTS portal_workflow_type text;

ALTER TABLE public.portal_audit_logs
  ADD COLUMN IF NOT EXISTS user_name text,
  ADD COLUMN IF NOT EXISTS user_role text,
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS success boolean NOT NULL DEFAULT true;

ALTER TABLE public.enterprise_activities
  ADD COLUMN IF NOT EXISTS event_subtype text,
  ADD COLUMN IF NOT EXISTS reference_table text,
  ADD COLUMN IF NOT EXISTS reference_id uuid,
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS billing_category text NOT NULL DEFAULT 'Professional Services',
  ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_items jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS issue_date date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS due_date date NOT NULL DEFAULT current_date;

ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'Draft',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS net_amount numeric(14,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_firm_id ON public.users(firm_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_firm_id ON public.subscriptions(firm_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_clients_firm_id ON public.clients(firm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_firm_id ON public.tasks(firm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_logs_firm_id ON public.audit_logs(firm_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON public.task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reassignments_task_id ON public.task_reassignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reassignments_firm_id ON public.task_reassignments(firm_id);
CREATE INDEX IF NOT EXISTS idx_approval_tasks_firm ON public.approval_tasks(firm_id);
CREATE INDEX IF NOT EXISTS idx_approval_tasks_status ON public.approval_tasks(status);
CREATE INDEX IF NOT EXISTS idx_approvals_firm_id ON public.approvals(firm_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_firm ON public.compliance_tasks(firm_id);
CREATE INDEX IF NOT EXISTS idx_notices_firm_id ON public.notices(firm_id);
CREATE INDEX IF NOT EXISTS idx_billing_firm_id ON public.billing(firm_id);
CREATE INDEX IF NOT EXISTS idx_documents_firm_id ON public.documents(firm_id);
CREATE INDEX IF NOT EXISTS idx_notifications_firm_id ON public.notifications(firm_id);
CREATE INDEX IF NOT EXISTS idx_reminders_firm ON public.reminders(firm_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_firm_id ON public.automation_runs(firm_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_activities_firm_id ON public.enterprise_activities(firm_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_activities_created_at ON public.enterprise_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_firm_created ON public.login_activity(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_user_created ON public.login_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON public.trusted_devices(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON public.auth_sessions(user_id, terminated_at);
CREATE INDEX IF NOT EXISTS idx_document_vault_firm_created ON public.document_vault(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_vault_client_active ON public.document_vault(client_id, is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_firm_created ON public.invoices(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_client_due ON public.invoices(client_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON public.invoice_payments(invoice_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_firm_date ON public.expenses(firm_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_workforce_profiles_firm ON public.workforce_profiles(firm_id);
CREATE INDEX IF NOT EXISTS idx_salary_structures_firm_employee ON public.salary_structures(firm_id, employee_user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_firm_period ON public.payroll_runs(firm_id, payroll_period);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_client_date ON public.gst_invoices(client_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_gstr_filings_client_period ON public.gstr_filings(client_id, period);
CREATE INDEX IF NOT EXISTS idx_gstr1_data_client_period ON public.gstr1_data(client_id, period);
CREATE INDEX IF NOT EXISTS idx_gstr3b_data_client_period ON public.gstr3b_data(client_id, period);
CREATE INDEX IF NOT EXISTS idx_purchase_register_client_date ON public.purchase_register(client_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_client_interactions_client ON public.client_interactions(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_completions_client ON public.completions(client_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_credentials_client ON public.portal_credentials(client_id, portal_type);
CREATE INDEX IF NOT EXISTS idx_portal_audit_logs_firm_portal_ts ON public.portal_audit_logs(firm_id, portal_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_rate_limits_scope_actor_window ON public.security_rate_limits(scope, actor, window_start DESC);

DO $$
DECLARE
  rel text;
BEGIN
  FOREACH rel IN ARRAY ARRAY[
    'firms','users','subscriptions','clients','tasks','audit_logs','task_activities',
    'task_comments','task_reassignments','approval_tasks','approvals','compliance_tasks',
    'notices','billing','documents','notifications','reminders','automation_runs',
    'enterprise_activities',
    'auth_security_settings','login_activity','trusted_devices','auth_sessions',
    'document_vault','document_audit_logs','invoices','invoice_payments','expenses',
    'workforce_profiles','salary_structures','payroll_runs','compensation_change_history',
    'gstr_filings','gst_invoices','gst_reconciliations','gst_mismatches','gstr1_data',
    'gstr3b_data','purchase_register','user_preferences','subtasks','client_interactions',
    'completions','support_tickets','portal_credentials','portal_audit_logs',
    'security_rate_limits'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rel);
  END LOOP;
END $$;

-- Tenant-scoped generic policies for tables with firm_id.
DO $$
DECLARE
  rel text;
  policy_name text;
BEGIN
  FOREACH rel IN ARRAY ARRAY[
    'subscriptions','clients','tasks','audit_logs','task_reassignments',
    'approval_tasks','approvals','compliance_tasks','notices','billing','documents',
    'notifications','reminders','automation_runs','enterprise_activities',
    'auth_security_settings','login_activity','trusted_devices','auth_sessions',
    'document_vault','document_audit_logs','invoices','expenses',
    'workforce_profiles','salary_structures','payroll_runs','compensation_change_history',
    'gstr_filings','gst_invoices','gst_reconciliations','gstr1_data','gstr3b_data',
    'purchase_register','completions','support_tickets','portal_credentials',
    'portal_audit_logs'
  ]
  LOOP
    policy_name := rel || '_tenant_sync_scope';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, rel);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_god_admin() OR firm_id = public.current_user_firm_id()) WITH CHECK (public.is_god_admin() OR firm_id = public.current_user_firm_id())',
      policy_name,
      rel
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS users_sync_scope ON public.users;
CREATE POLICY users_sync_scope ON public.users
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR auth_id = auth.uid()
  OR firm_id = public.current_user_firm_id()
)
WITH CHECK (
  public.is_god_admin()
  OR auth_id = auth.uid()
  OR firm_id = public.current_user_firm_id()
);

DROP POLICY IF EXISTS firms_sync_scope ON public.firms;
CREATE POLICY firms_sync_scope ON public.firms
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR id = public.current_user_firm_id()
)
WITH CHECK (
  public.is_god_admin()
  OR id = public.current_user_firm_id()
);

DROP POLICY IF EXISTS task_activities_sync_scope ON public.task_activities;
CREATE POLICY task_activities_sync_scope ON public.task_activities
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND t.firm_id = public.current_user_firm_id()
  )
)
WITH CHECK (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND t.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS task_comments_sync_scope ON public.task_comments;
CREATE POLICY task_comments_sync_scope ON public.task_comments
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND t.firm_id = public.current_user_firm_id()
  )
)
WITH CHECK (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND t.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS subtasks_sync_scope ON public.subtasks;
CREATE POLICY subtasks_sync_scope ON public.subtasks
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND t.firm_id = public.current_user_firm_id()
  )
)
WITH CHECK (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND t.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS client_interactions_sync_scope ON public.client_interactions;
CREATE POLICY client_interactions_sync_scope ON public.client_interactions
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.firm_id = public.current_user_firm_id()
  )
)
WITH CHECK (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS gst_mismatches_sync_scope ON public.gst_mismatches;
CREATE POLICY gst_mismatches_sync_scope ON public.gst_mismatches
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.gst_reconciliations r
    WHERE r.id = reconciliation_id AND r.firm_id = public.current_user_firm_id()
  )
)
WITH CHECK (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.gst_reconciliations r
    WHERE r.id = reconciliation_id AND r.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS invoice_payments_sync_scope ON public.invoice_payments;
CREATE POLICY invoice_payments_sync_scope ON public.invoice_payments
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND i.firm_id = public.current_user_firm_id()
  )
)
WITH CHECK (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND i.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS user_preferences_sync_scope ON public.user_preferences;
CREATE POLICY user_preferences_sync_scope ON public.user_preferences
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS login_activity_insert_authenticated ON public.login_activity;
CREATE POLICY login_activity_insert_authenticated
ON public.login_activity
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public.is_god_admin()
  OR firm_id IS NULL
  OR firm_id = public.current_user_firm_id()
  OR auth_id = auth.uid()
);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.login_activity TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gst_monthly_tax_trends(uuid, integer) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;
