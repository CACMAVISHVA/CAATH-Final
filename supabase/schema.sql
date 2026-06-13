-- =============================================================================
-- CAATH OS Database Migration v2.2.0
-- Apply this migration in Supabase SQL Editor
-- IMPORTANT: Run this as a SINGLE batch - all statements execute together
-- =============================================================================

-- =============================================================================
-- SECTION 0: EXTENSIONS
-- Enable UUID generation
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- SECTION 1: FIRMS (Base table - no dependencies)
-- =============================================================================
DROP TABLE IF EXISTS public.firms CASCADE;

CREATE TABLE public.firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Pending', 'Blocked')),
  suspension_reason text,
  suspended_at timestamptz,
  suspended_by uuid,
  reactivated_at timestamptz,
  reactivated_by uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT firms_fk_suspended_by FOREIGN KEY (suspended_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT firms_fk_reactivated_by FOREIGN KEY (reactivated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION 2: USERS (Depends on: auth.users, firms)
-- Note: GodAdmin has NULL firm_id, all others require firm_id
-- =============================================================================
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE NOT NULL,
  firm_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('GodAdmin', 'SuperAdmin', 'Admin', 'Staff', 'Client')),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT users_fk_auth FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT users_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE SET NULL,
  CONSTRAINT users_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT users_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT users_firm_required CHECK (
    (role = 'GodAdmin' AND firm_id IS NULL)
    OR (role != 'GodAdmin' AND firm_id IS NOT NULL)
  )
);

-- =============================================================================
-- SECTION 3: SUBSCRIPTIONS (Depends on: firms, users)
-- =============================================================================
DROP TABLE IF EXISTS public.subscriptions CASCADE;

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  plan text NOT NULL CHECK (plan IN ('Trial', 'Starter', 'Professional', 'Enterprise')),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Trial', 'Active', 'Expired', 'Cancelled', 'Suspended')),
  amount numeric NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'Monthly' CHECK (billing_cycle IN ('Monthly', 'Yearly')),
  trial_ends_at timestamptz,
  starts_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  features jsonb DEFAULT '{}',
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT subscriptions_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT subscriptions_fk_approver FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT subscriptions_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT subscriptions_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION 4: CLIENTS (Depends on: firms, users)
-- =============================================================================
DROP TABLE IF EXISTS public.clients CASCADE;

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  pan text NOT NULL,
  gstin text,
  contact_person text,
  email text,
  phone text,
  risk_level text NOT NULL DEFAULT 'Low',
  services text[] NOT NULL DEFAULT '{}',
  assigned_staff_id uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT clients_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT clients_fk_staff FOREIGN KEY (assigned_staff_id) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT clients_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT clients_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION 5: CLIENT CONTACTS (Depends on: firms, clients, users)
-- =============================================================================
DROP TABLE IF EXISTS public.client_contacts CASCADE;

CREATE TABLE public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  client_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT cc_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT cc_fk_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT cc_fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT cc_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT cc_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT cc_unique UNIQUE (client_id, user_id)
);

-- =============================================================================
-- SECTION 6: TASKS (Depends on: firms, clients, users)
-- =============================================================================
DROP TABLE IF EXISTS public.tasks CASCADE;

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  client_id uuid,
  assigned_to uuid,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Todo',
  category text,
  deadline timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT tasks_fk_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL,
  CONSTRAINT tasks_fk_assignee FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT tasks_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT tasks_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS public.task_activities CASCADE;
CREATE TABLE public.task_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_role text NOT NULL,
  activity_type text NOT NULL,
  details text NOT NULL,
  previous_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT task_activities_fk_task FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_activities_fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON public.task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_created_at ON public.task_activities(created_at DESC);

DROP TABLE IF EXISTS public.task_comments CASCADE;
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT task_comments_fk_task FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_comments_fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_updated_at ON public.task_comments(updated_at DESC);

DROP TABLE IF EXISTS public.task_reassignments CASCADE;
CREATE TABLE public.task_reassignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  firm_id uuid NOT NULL,
  previous_assignee uuid,
  previous_assignee_name text,
  new_assignee uuid,
  new_assignee_name text,
  reassigned_by uuid NOT NULL,
  reassigned_by_name text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT task_reassignments_fk_task FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_reassignments_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT task_reassignments_fk_user FOREIGN KEY (reassigned_by) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_reassignments_task_id ON public.task_reassignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reassignments_firm_id ON public.task_reassignments(firm_id);
CREATE INDEX IF NOT EXISTS idx_task_reassignments_created_at ON public.task_reassignments(created_at DESC);

-- =============================================================================
-- SECTION: ENTERPRISE OBSERVABILITY (Enterprise activity timeline, automation runs)
-- =============================================================================
DROP TABLE IF EXISTS public.enterprise_activities CASCADE;
CREATE TABLE public.enterprise_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  event_type text NOT NULL,
  event_subtype text,
  reference_id uuid,
  reference_table text,
  actor_id uuid,
  actor_name text,
  actor_role text,
  details jsonb DEFAULT '{}',
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','notice','warning','critical')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT enterprise_activities_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT enterprise_activities_fk_actor FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_enterprise_activities_firm_id ON public.enterprise_activities(firm_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_activities_event_type ON public.enterprise_activities(event_type);
CREATE INDEX IF NOT EXISTS idx_enterprise_activities_created_at ON public.enterprise_activities(created_at DESC);

DROP TABLE IF EXISTS public.automation_runs CASCADE;
CREATE TABLE public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  automation_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('scheduled','running','completed','failed','skipped')),
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  run_payload jsonb DEFAULT '{}',
  result jsonb,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT automation_runs_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT automation_runs_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_automation_runs_firm_id ON public.automation_runs(firm_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_key ON public.automation_runs(automation_key);
CREATE INDEX IF NOT EXISTS idx_automation_runs_created_at ON public.automation_runs(created_at DESC);


-- =============================================================================
-- SECTION 7: APPROVAL TASKS (Depends on: firms, users)
-- =============================================================================
DROP TABLE IF EXISTS public.approval_tasks CASCADE;

CREATE TABLE public.approval_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  module text NOT NULL,
  record_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('DRAFT', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REWORK', 'CLIENT_VISIBLE', 'ARCHIVED')),
  workflow_stage text NOT NULL DEFAULT 'PENDING' CHECK (workflow_stage IN ('DRAFT', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REWORK', 'CLIENT_VISIBLE', 'ARCHIVED')),
  assigned_to uuid,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  rework_owner uuid,
  updated_by uuid,
  reassigned_by uuid,
  escalated_by uuid,
  escalated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT at_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT at_fk_assignee FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT at_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT at_fk_approver FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT at_fk_reworker FOREIGN KEY (rework_owner) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT at_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT at_fk_reassigner FOREIGN KEY (reassigned_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT at_fk_escalator FOREIGN KEY (escalated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION 8: DOCUMENTS (Depends on: firms, clients, users)
-- =============================================================================
DROP TABLE IF EXISTS public.documents CASCADE;

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  client_id uuid NOT NULL,
  name text NOT NULL,
  storage_path text NOT NULL,
  category text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  uploaded_by uuid,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REWORK', 'CLIENT_VISIBLE')),
  workflow_stage text NOT NULL DEFAULT 'ADMIN_REVIEW' CHECK (workflow_stage IN ('DRAFT', 'STAFF_PROCESSED', 'ADMIN_REVIEW', 'SUPERADMIN_APPROVAL', 'CLIENT_VISIBLE', 'ARCHIVED', 'REJECTED', 'REWORK')),
  visible_to_client boolean NOT NULL DEFAULT false,
  admin_reviewed_by uuid,
  admin_reviewed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  rework_owner uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT docs_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT docs_fk_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT docs_fk_uploader FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT docs_fk_admin_reviewer FOREIGN KEY (admin_reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT docs_fk_approver FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT docs_fk_reworker FOREIGN KEY (rework_owner) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT docs_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT docs_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION 9: APPROVALS (Depends on: firms, users)
-- Legacy approval table for document workflows
-- =============================================================================
DROP TABLE IF EXISTS public.approvals CASCADE;

CREATE TABLE public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  module text NOT NULL,
  record_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REWORK', 'CLIENT_VISIBLE')),
  workflow_stage text NOT NULL DEFAULT 'ADMIN_REVIEW',
  assigned_to uuid,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  rework_owner uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT apr_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT apr_fk_assignee FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT apr_fk_approver FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT apr_fk_reworker FOREIGN KEY (rework_owner) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT apr_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT apr_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION 10: COMPLIANCE TASKS (Depends on: firms, clients, users)
-- =============================================================================
DROP TABLE IF EXISTS public.compliance_tasks CASCADE;

CREATE TABLE public.compliance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  client_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  period text,
  due_date date NOT NULL,
  filing_status text NOT NULL DEFAULT 'Pending',
  assigned_to uuid,
  filed_date date,
  penalty_amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ct_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT ct_fk_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT ct_fk_assignee FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT ct_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT ct_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION 11: NOTICES (Depends on: firms, clients, users)
-- =============================================================================
DROP TABLE IF EXISTS public.notices CASCADE;

CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  client_id uuid NOT NULL,
  source text NOT NULL,
  notice_number text NOT NULL,
  received_date date NOT NULL,
  deadline date NOT NULL,
  status text NOT NULL DEFAULT 'Received',
  assigned_to uuid,
  reply_draft text,
  client_response text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT ntc_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT ntc_fk_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT ntc_fk_assignee FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT ntc_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT ntc_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION 12: BILLING (Depends on: firms, clients, users)
-- =============================================================================
DROP TABLE IF EXISTS public.billing CASCADE;

CREATE TABLE public.billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  client_id uuid,
  invoice_number text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'Unpaid',
  date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  paid_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT bill_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT bill_fk_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL,
  CONSTRAINT bill_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT bill_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION 13: WORKFLOWS (Depends on: firms, users)
-- =============================================================================
DROP TABLE IF EXISTS public.workflows CASCADE;

CREATE TABLE public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  name text NOT NULL,
  trigger_type text NOT NULL,
  action_type text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT wf_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT wf_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT wf_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION 14: NOTIFICATIONS (Depends on: firms, users)
-- =============================================================================
DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid,
  recipient_user_id uuid,
  audience_role text,
  title text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'READ', 'ARCHIVED')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT notif_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT notif_fk_recipient FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT notif_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT notif_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION 15: AUDIT LOGS (Depends on: firms, users)
-- =============================================================================
DROP TABLE IF EXISTS public.audit_logs CASCADE;

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid,
  user_id uuid,
  user_name text NOT NULL,
  user_role text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  ip_address text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT audit_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE SET NULL,
  CONSTRAINT audit_fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT audit_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT audit_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION X: GST / RECONCILIATION TABLES
-- Stores GST invoices (ingested), reconciliation runs, and mismatch events
-- =============================================================================

DROP TABLE IF EXISTS public.gst_invoices CASCADE;
CREATE TABLE public.gst_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  client_id uuid NOT NULL,
  invoice_no text NOT NULL,
  invoice_date date NOT NULL,
  supplier_gstin text,
  recipient_gstin text,
  taxable_value numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('OUTWARD', 'INWARD')),
  source text NOT NULL,
  original_payload jsonb,
  imported_at timestamptz NOT NULL DEFAULT NOW(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT gst_invoices_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT gst_invoices_fk_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS public.gstr_filings CASCADE;
CREATE TABLE public.gstr_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  client_id uuid NOT NULL,
  gstin text NOT NULL,
  return_type text NOT NULL CHECK (return_type IN ('GSTR1', 'GSTR3B', 'GSTR2A', 'GSTR2B')),
  period text NOT NULL,
  filing_date date,
  due_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('Filed', 'Pending', 'Late', 'Not Filed')),
  taxable_value numeric NOT NULL DEFAULT 0,
  igst numeric NOT NULL DEFAULT 0,
  cgst numeric NOT NULL DEFAULT 0,
  sgst numeric NOT NULL DEFAULT 0,
  cess numeric NOT NULL DEFAULT 0,
  tax_collected numeric NOT NULL DEFAULT 0,
  tax_claimed numeric NOT NULL DEFAULT 0,
  late_fee numeric NOT NULL DEFAULT 0,
  interest numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT gstr_filings_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT gstr_filings_fk_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gstr_filings_client_due_date ON public.gstr_filings(client_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_gstr_filings_client_period ON public.gstr_filings(client_id, period);

DROP TABLE IF EXISTS public.gst_reconciliations CASCADE;
CREATE TABLE public.gst_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  client_id uuid NOT NULL,
  period text NOT NULL, -- yyyy-mm
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  status text NOT NULL DEFAULT 'PENDING', -- PENDING | COMPLETED | FAILED
  summary jsonb
);

DROP TABLE IF EXISTS public.gst_mismatches CASCADE;
CREATE TABLE public.gst_mismatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id uuid NOT NULL,
  invoice_id uuid,
  invoice_no text,
  gstin text,
  mismatch_type text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT gst_mismatches_fk_rec FOREIGN KEY (reconciliation_id) REFERENCES public.gst_reconciliations(id) ON DELETE CASCADE,
  CONSTRAINT gst_mismatches_fk_inv FOREIGN KEY (invoice_id) REFERENCES public.gst_invoices(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gst_invoices_client_date ON public.gst_invoices(client_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_invoice_no ON public.gst_invoices(invoice_no);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_gstin ON public.gst_invoices(supplier_gstin, recipient_gstin);
CREATE INDEX IF NOT EXISTS idx_gst_reconciliations_client_period ON public.gst_reconciliations(client_id, period);
CREATE INDEX IF NOT EXISTS idx_gst_mismatches_rec ON public.gst_mismatches(reconciliation_id);

-- RPC: monthly tax trends (returns month, outward_tax, inward_tax)
DROP FUNCTION IF EXISTS public.gst_monthly_tax_trends;
CREATE OR REPLACE FUNCTION public.gst_monthly_tax_trends(p_client_id uuid, p_months integer DEFAULT 6)
RETURNS TABLE(period text, outward_tax numeric, inward_tax numeric)
LANGUAGE sql
STABLE
AS $$
  WITH months AS (
    SELECT to_char(date_trunc('month', current_date) - (s.a || ' months')::interval, 'YYYY-MM') AS period
    FROM generate_series(0, GREATEST(p_months - 1, 0)) AS s(a)
  )
  SELECT m.period,
    COALESCE(SUM(CASE WHEN gi.type = 'OUTWARD' THEN gi.tax_amount END),0) AS outward_tax,
    COALESCE(SUM(CASE WHEN gi.type = 'INWARD' THEN gi.tax_amount END),0) AS inward_tax
  FROM months m
  LEFT JOIN public.gst_invoices gi ON to_char(gi.invoice_date, 'YYYY-MM') = m.period AND gi.client_id = p_client_id
  GROUP BY m.period
  ORDER BY m.period DESC;
$$;

-- =============================================================================
-- SECTION 16: CLIENT PORTALS (Depends on: firms, clients, users)
-- =============================================================================
DROP TABLE IF EXISTS public.client_portals CASCADE;

CREATE TABLE public.client_portals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  client_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  token_expires_at timestamptz,
  enabled boolean NOT NULL DEFAULT true,
  last_accessed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT cp_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT cp_fk_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT cp_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION 17: REMINDERS (Depends on: firms, users)
-- =============================================================================
DROP TABLE IF EXISTS public.reminders CASCADE;

CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  user_id uuid NOT NULL,
  entity_type text,
  entity_id uuid,
  reminder_type text NOT NULL CHECK (reminder_type IN ('TASK_DEADLINE', 'COMPLIANCE_DUE', 'NOTICE_DEADLINE', 'APPROVAL_PENDING', 'BILLING_DUE', 'CUSTOM')),
  title text NOT NULL,
  message text NOT NULL,
  trigger_at timestamptz NOT NULL,
  frequency text NOT NULL DEFAULT 'ONCE' CHECK (frequency IN ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT rem_fk_firm FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE,
  CONSTRAINT rem_fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT rem_fk_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT rem_fk_updater FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- SECTION 18: INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_firm_id ON public.users(firm_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_clients_firm_id ON public.clients(firm_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_user ON public.client_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON public.client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_firm_id ON public.tasks(firm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_approval_tasks_firm ON public.approval_tasks(firm_id);
CREATE INDEX IF NOT EXISTS idx_approval_tasks_status ON public.approval_tasks(status);
CREATE INDEX IF NOT EXISTS idx_documents_firm_id ON public.documents(firm_id);
CREATE INDEX IF NOT EXISTS idx_documents_client ON public.documents(client_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_firm_id ON public.approvals(firm_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_firm ON public.compliance_tasks(firm_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_client ON public.compliance_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_notices_firm_id ON public.notices(firm_id);
CREATE INDEX IF NOT EXISTS idx_notices_client ON public.notices(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_firm_id ON public.billing(firm_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_firm_id ON public.subscriptions(firm_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_workflows_firm_id ON public.workflows(firm_id);
CREATE INDEX IF NOT EXISTS idx_notifications_firm_id ON public.notifications(firm_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_firm_id ON public.audit_logs(firm_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_client_portals_client ON public.client_portals(client_id);
CREATE INDEX IF NOT EXISTS idx_client_portals_token ON public.client_portals(token);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_firm ON public.reminders(firm_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_trigger ON public.reminders(trigger_at);

-- =============================================================================
-- SECTION 21: AUDIT AGGREGATION VIEWS & HELPERS
-- Materialized views and helper functions for enterprise-scale audit analytics
-- =============================================================================

-- Useful indexes to accelerate filtering and range queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_firm_created_at ON public.audit_logs(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_role ON public.audit_logs(user_role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);

-- Materialized view: daily activity counts by action/entity/role/severity
CREATE MATERIALIZED VIEW IF NOT EXISTS public.audit_activity_counts AS
SELECT
  date_trunc('day', created_at) AS day,
  action,
  entity_type,
  user_role,
  COALESCE(severity, 'info') AS severity,
  COUNT(*) AS event_count
FROM public.audit_logs
GROUP BY 1,2,3,4,5
WITH NO DATA;

CREATE INDEX IF NOT EXISTS idx_audit_activity_counts_day ON public.audit_activity_counts(day DESC);

-- Materialized view: top actions and user counts
CREATE MATERIALIZED VIEW IF NOT EXISTS public.audit_action_summary AS
SELECT
  action,
  COUNT(*) AS total_count,
  COUNT(DISTINCT user_id) AS distinct_users,
  MAX(created_at) AS last_seen
FROM public.audit_logs
GROUP BY action
WITH NO DATA;

CREATE INDEX IF NOT EXISTS idx_audit_action_summary_last ON public.audit_action_summary(last_seen DESC);

-- Materialized view: user activity summary (last 30 days frequently used by dashboards)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_activity_30d AS
SELECT
  user_id,
  user_name,
  user_role,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS cnt_30d,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS cnt_7d,
  MAX(created_at) AS last_activity
FROM public.audit_logs
GROUP BY user_id, user_name, user_role
WITH NO DATA;

CREATE INDEX IF NOT EXISTS idx_user_activity_30d_last ON public.user_activity_30d(last_activity DESC);

-- Recent events materialized view (merge of audit_logs and portal_audit_logs when available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'portal_audit_logs') THEN
    EXECUTE $$
      CREATE MATERIALIZED VIEW IF NOT EXISTS public.recent_audit_events AS
      SELECT id, firm_id, user_id, user_name, user_role, action, entity_type, details, created_at
      FROM public.audit_logs
      UNION ALL
      SELECT id, client_id AS firm_id, user_id, user_name, user_role, action, 'Portal' AS entity_type, details, timestamp AS created_at
      FROM public.portal_audit_logs
      ORDER BY created_at DESC
      WITH NO DATA;
    $$;
    EXECUTE $$ CREATE INDEX IF NOT EXISTS idx_recent_audit_events_time ON public.recent_audit_events(created_at DESC); $$;
    EXECUTE $$ CREATE INDEX IF NOT EXISTS idx_portal_audit_logs_client ON public.portal_audit_logs(client_id); $$;
    EXECUTE $$ CREATE INDEX IF NOT EXISTS idx_portal_audit_logs_timestamp ON public.portal_audit_logs(timestamp DESC); $$;
    EXECUTE $$ CREATE INDEX IF NOT EXISTS idx_portal_audit_logs_portal_type ON public.portal_audit_logs(portal_type); $$;
  ELSE
    EXECUTE $$
      CREATE MATERIALIZED VIEW IF NOT EXISTS public.recent_audit_events AS
      SELECT id, firm_id, user_id, user_name, user_role, action, entity_type, details, created_at
      FROM public.audit_logs
      ORDER BY created_at DESC
      WITH NO DATA;
    $$;
    EXECUTE $$ CREATE INDEX IF NOT EXISTS idx_recent_audit_events_time ON public.recent_audit_events(created_at DESC); $$;
  END IF;
END$$;

-- Function: refresh key audit materialized views (safe to call from scheduler)
CREATE OR REPLACE FUNCTION public.refresh_audit_materialized_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1; -- placeholder
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.audit_activity_counts;
  EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'audit_activity_counts view missing'; END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.audit_action_summary;
  EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'audit_action_summary view missing'; END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_activity_30d;
  EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'user_activity_30d view missing'; END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.recent_audit_events;
  EXCEPTION WHEN undefined_table THEN RAISE NOTICE 'recent_audit_events view missing'; END;
END;
$$;

-- =============================================================================
-- SECTION 22: SCHEDULER / REFRESH SAFETY
-- Advisory lock + run logging + optional pg_cron scheduling
-- =============================================================================

DROP TABLE IF EXISTS public.audit_refresh_runs;
CREATE TABLE IF NOT EXISTS public.audit_refresh_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT NOW(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'running', -- running|success|failed
  details text
);

CREATE OR REPLACE FUNCTION public.safe_refresh_audit_materialized_views()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  got_lock boolean;
  run_id uuid := gen_random_uuid();
BEGIN
  -- try to acquire an advisory lock to prevent concurrent refreshes
  got_lock := pg_try_advisory_lock(hashtext('refresh_audit_materialized_views'));
  IF NOT got_lock THEN
    RAISE NOTICE 'Another refresh is in progress, skipping.';
    RETURN;
  END IF;

  INSERT INTO public.audit_refresh_runs(id, started_at, status) VALUES (run_id, NOW(), 'running');

  BEGIN
    PERFORM public.refresh_audit_materialized_views();
    UPDATE public.audit_refresh_runs SET ended_at = NOW(), status = 'success' WHERE id = run_id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.audit_refresh_runs SET ended_at = NOW(), status = 'failed', details = SQLERRM WHERE id = run_id;
    RAISE;
  END;

  PERFORM pg_advisory_unlock(hashtext('refresh_audit_materialized_views'));
END;
$$;

-- Helper to view last refresh
CREATE OR REPLACE FUNCTION public.get_last_audit_refresh()
RETURNS TABLE(id uuid, started_at timestamptz, ended_at timestamptz, status text, details text)
LANGUAGE sql
AS $$
  SELECT id, started_at, ended_at, status, details FROM public.audit_refresh_runs ORDER BY started_at DESC LIMIT 1;
$$;

-- Optional: schedule the safe refresh via pg_cron if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- create cron job to run every 5 minutes if not exists
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh_audit_materialized_views_job') THEN
      PERFORM cron.schedule('refresh_audit_materialized_views_job', '*/5 * * * *', $$SELECT public.safe_refresh_audit_materialized_views();$$);
    END IF;
  ELSE
    RAISE NOTICE 'pg_cron not installed; please schedule public.safe_refresh_audit_materialized_views() via your scheduler.';
  END IF;
END$$;

-- =============================================================================
-- SECTION 23: OBSERVABILITY HELPERS (Monitoring + Alerting SQL)
-- Expose lightweight monitoring queries for Grafana/Prometheus
-- =============================================================================

-- indexes to speed monitoring queries
CREATE INDEX IF NOT EXISTS idx_audit_refresh_runs_started ON public.audit_refresh_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_refresh_runs_status ON public.audit_refresh_runs(status);

-- Recent failed refreshes
CREATE OR REPLACE FUNCTION public.get_recent_failed_refreshes(days integer DEFAULT 7)
RETURNS TABLE(id uuid, started_at timestamptz, ended_at timestamptz, status text, details text)
LANGUAGE sql
STABLE
AS $$
  SELECT id, started_at, ended_at, status, details
  FROM public.audit_refresh_runs
  WHERE status = 'failed' AND started_at >= NOW() - ($1 || ' days')::interval
  ORDER BY started_at DESC;
$$;

-- Is last refresh stale (returns true when last successful refresh older than threshold minutes)
CREATE OR REPLACE FUNCTION public.is_audit_refresh_stale(threshold_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  WITH last_success AS (
    SELECT ended_at FROM public.audit_refresh_runs WHERE status = 'success' ORDER BY ended_at DESC LIMIT 1
  )
  SELECT CASE WHEN EXISTS (SELECT 1 FROM last_success)
    THEN (SELECT NOW() - (SELECT ended_at FROM last_success) > ($1 || ' minutes')::interval)
    ELSE true END;
$$;

-- Long-running refresh runs (duration exceeds threshold seconds)
CREATE OR REPLACE FUNCTION public.get_long_running_refresh_runs(threshold_seconds integer DEFAULT 300)
RETURNS TABLE(id uuid, started_at timestamptz, ended_at timestamptz, duration_seconds numeric, status text, details text)
LANGUAGE sql
STABLE
AS $$
  SELECT id, started_at, ended_at, EXTRACT(EPOCH FROM COALESCE(ended_at, NOW()) - started_at) AS duration_seconds, status, details
  FROM public.audit_refresh_runs
  WHERE EXTRACT(EPOCH FROM COALESCE(ended_at, NOW()) - started_at) >= $1
  ORDER BY duration_seconds DESC
  LIMIT 100;
$$;

-- Aggregation latency stats (avg/min/max of successful refresh durations over N days)
CREATE OR REPLACE FUNCTION public.get_audit_aggregation_latency_stats(days integer DEFAULT 7)
RETURNS TABLE(avg_seconds numeric, min_seconds numeric, max_seconds numeric, runs integer)
LANGUAGE sql
STABLE
AS $$
  SELECT
    AVG(EXTRACT(EPOCH FROM (ended_at - started_at)))::numeric AS avg_seconds,
    MIN(EXTRACT(EPOCH FROM (ended_at - started_at)))::numeric AS min_seconds,
    MAX(EXTRACT(EPOCH FROM (ended_at - started_at)))::numeric AS max_seconds,
    COUNT(*) FILTER (WHERE status = 'success') AS runs
  FROM public.audit_refresh_runs
  WHERE status = 'success' AND started_at >= NOW() - ($1 || ' days')::interval;
$$;

-- Portal failure spikes: portals with count >= min_count in the given window (e.g., '1 hour')
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'portal_audit_logs') THEN
    CREATE OR REPLACE FUNCTION public.get_portal_failure_spikes(window_interval text DEFAULT '1 hour', min_count integer DEFAULT 50)
    RETURNS TABLE(portal_type text, failure_count bigint)
    LANGUAGE sql
    STABLE
    AS $$
      SELECT portal_type, COUNT(*) AS failure_count
      FROM public.portal_audit_logs
      WHERE success = false AND timestamp >= NOW() - ($1)::interval
      GROUP BY portal_type
      HAVING COUNT(*) >= $2
      ORDER BY failure_count DESC;
    $$;
  ELSE
    RAISE NOTICE 'portal_audit_logs table not present; skipping portal failure spike function';
  END IF;
END$$;

-- Abnormal activity candidates (action spikes): compare recent window vs baseline days average
CREATE OR REPLACE FUNCTION public.get_action_spike_candidates(window_interval text DEFAULT '1 hour', baseline_days integer DEFAULT 7, multiplier numeric DEFAULT 5)
RETURNS TABLE(action text, recent_count bigint, baseline_avg numeric, ratio numeric)
LANGUAGE sql
STABLE
AS $$
  WITH recent AS (
    SELECT action, COUNT(*) AS cnt
    FROM public.audit_logs
    WHERE created_at >= NOW() - ($1)::interval
    GROUP BY action
  ), baseline AS (
    SELECT action, (COUNT(*)::numeric / GREATEST($2::numeric,1)) AS avg_day
    FROM public.audit_logs
    WHERE created_at >= NOW() - ($2 || ' days')::interval
    GROUP BY action
  )
  SELECT r.action, r.cnt AS recent_count, COALESCE(b.avg_day,0) AS baseline_avg, CASE WHEN COALESCE(b.avg_day,0)>0 THEN r.cnt / b.avg_day ELSE NULL END AS ratio
  FROM recent r
  LEFT JOIN baseline b ON b.action = r.action
  WHERE (COALESCE(b.avg_day,0) = 0 AND r.cnt >= $3) OR (COALESCE(b.avg_day,0) > 0 AND (r.cnt / b.avg_day) >= $3)
  ORDER BY ratio DESC NULLS LAST, recent_count DESC;
$$;

-- Helper for Prometheus/Grafana: returns numeric metrics as a single-row result set
CREATE OR REPLACE FUNCTION public.metrics_audit_overview()
RETURNS TABLE(
  last_refresh_success_at timestamptz,
  last_refresh_status text,
  last_refresh_duration_seconds numeric,
  recent_failed_refreshes integer,
  portal_failures_1h bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH last_run AS (
    SELECT ended_at AS last_refresh_success_at, status AS last_refresh_status, EXTRACT(EPOCH FROM (ended_at - started_at)) AS last_refresh_duration_seconds
    FROM public.audit_refresh_runs
    ORDER BY started_at DESC LIMIT 1
  ), recent_failed AS (
    SELECT COUNT(*) AS cnt FROM public.audit_refresh_runs WHERE status = 'failed' AND started_at >= NOW() - INTERVAL '24 hours'
  ), portal_failures AS (
    SELECT COALESCE(SUM(CASE WHEN success = false AND timestamp >= NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END),0) AS portal_failures_1h
    FROM public.portal_audit_logs WHERE true
  )
  SELECT lr.last_refresh_success_at, lr.last_refresh_status, lr.last_refresh_duration_seconds, rf.cnt AS recent_failed_refreshes, pf.portal_failures_1h
  FROM (SELECT * FROM last_run) lr CROSS JOIN (SELECT * FROM recent_failed) rf CROSS JOIN (SELECT * FROM portal_failures) pf;
$$;

COMMENT ON FUNCTION public.metrics_audit_overview() IS 'Single-row metrics useful for Prometheus exporters and Grafana queries';


-- Helper: suggest indexes for large-scale tables (no-op if run as SQL - informational)
-- Recommended indexes for audit workload:
--   - (firm_id, created_at DESC)
--   - (entity_type, created_at DESC)
--   - (user_role, created_at DESC)
--   - (action)
--   - For portal_audit_logs: (client_id, timestamp DESC), (portal_type), (success)


-- =============================================================================
-- SECTION 18: HELPER FUNCTIONS
-- =============================================================================
DROP FUNCTION IF EXISTS public.current_user_profile_id();
CREATE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() AND status = 'Active' LIMIT 1
$$;

DROP FUNCTION IF EXISTS public.current_user_firm_id();
CREATE FUNCTION public.current_user_firm_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT firm_id FROM public.users WHERE auth_id = auth.uid() AND status = 'Active' LIMIT 1
$$;

DROP FUNCTION IF EXISTS public.current_user_role();
CREATE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() AND status = 'Active' LIMIT 1
$$;

DROP FUNCTION IF EXISTS public.is_god_admin();
CREATE FUNCTION public.is_god_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'GodAdmin'
$$;

DROP FUNCTION IF EXISTS public.is_subscription_active();
CREATE FUNCTION public.is_subscription_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE firm_id = public.current_user_firm_id()
    AND status IN ('Active', 'Trial')
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (trial_ends_at IS NULL OR trial_ends_at > NOW())
  )
$$;

DROP FUNCTION IF EXISTS public.get_subscription_features();
CREATE FUNCTION public.get_subscription_features()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT features FROM public.subscriptions
     WHERE firm_id = public.current_user_firm_id()
     AND status IN ('Active', 'Trial')
     AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1),
    '{}'::jsonb
  )
$$;

DROP FUNCTION IF EXISTS public.has_feature(text);
CREATE FUNCTION public.has_feature(feature_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.get_subscription_features() ->> feature_name)::boolean = true
$$;

-- =============================================================================
-- SECTION 19: ENABLE ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SECTION 20: RLS POLICIES
-- =============================================================================

-- Firms policies
DROP POLICY IF EXISTS firms_godadmin_all ON public.firms;
CREATE POLICY firms_godadmin_all ON public.firms FOR ALL
USING (public.is_god_admin())
WITH CHECK (public.is_god_admin());

DROP POLICY IF EXISTS firms_firm_users_select ON public.firms;
CREATE POLICY firms_firm_users_select ON public.firms FOR SELECT
USING (id = public.current_user_firm_id());

-- Users policies
DROP POLICY IF EXISTS users_select_scope ON public.users;
CREATE POLICY users_select_scope ON public.users FOR SELECT
USING (
  public.is_god_admin()
  OR auth_id = auth.uid()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
);

DROP POLICY IF EXISTS users_superadmin_manage ON public.users;
CREATE POLICY users_superadmin_manage ON public.users FOR ALL
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
);

-- Subscriptions policies
DROP POLICY IF EXISTS subscriptions_godadmin_all ON public.subscriptions;
CREATE POLICY subscriptions_godadmin_all ON public.subscriptions FOR ALL
USING (public.is_god_admin())
WITH CHECK (public.is_god_admin());

DROP POLICY IF EXISTS subscriptions_superadmin_scope ON public.subscriptions;
CREATE POLICY subscriptions_superadmin_scope ON public.subscriptions FOR ALL
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
);

-- Clients policies
DROP POLICY IF EXISTS clients_tenant_select ON public.clients;
CREATE POLICY clients_tenant_select ON public.clients FOR SELECT
USING (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND (
      public.current_user_role() != 'Client'
      OR EXISTS (
        SELECT 1 FROM public.client_contacts cc
        WHERE cc.client_id = clients.id
          AND cc.user_id = public.current_user_profile_id()
      )
    )
  )
);

DROP POLICY IF EXISTS clients_internal_write ON public.clients;
CREATE POLICY clients_internal_write ON public.clients FOR ALL
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
);

-- Client contacts policies
DROP POLICY IF EXISTS client_contacts_scope ON public.client_contacts;
CREATE POLICY client_contacts_scope ON public.client_contacts FOR ALL
USING (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
)
WITH CHECK (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
);

-- Tasks policies
DROP POLICY IF EXISTS tasks_internal_scope ON public.tasks;
CREATE POLICY tasks_internal_scope ON public.tasks FOR ALL
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff'))
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff'))
);

-- Approval tasks policies
DROP POLICY IF EXISTS approval_tasks_scope ON public.approval_tasks;
CREATE POLICY approval_tasks_scope ON public.approval_tasks FOR ALL
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff'))
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff'))
);

-- Documents policies
DROP POLICY IF EXISTS documents_select_scope ON public.documents;
CREATE POLICY documents_select_scope ON public.documents FOR SELECT
USING (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND (
      public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff')
      OR (
        status IN ('APPROVED', 'CLIENT_VISIBLE')
        AND visible_to_client = true
        AND EXISTS (
          SELECT 1 FROM public.client_contacts cc
          WHERE cc.client_id = documents.client_id
            AND cc.user_id = public.current_user_profile_id()
        )
      )
    )
  )
);

DROP POLICY IF EXISTS documents_insert_scope ON public.documents;
CREATE POLICY documents_insert_scope ON public.documents FOR INSERT
WITH CHECK (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND (
      public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff')
      OR (
        public.current_user_role() = 'Client'
        AND status = 'PENDING'
        AND workflow_stage = 'ADMIN_REVIEW'
        AND visible_to_client = false
        AND EXISTS (
          SELECT 1 FROM public.client_contacts cc
          WHERE cc.client_id = documents.client_id
            AND cc.user_id = public.current_user_profile_id()
        )
      )
    )
  )
);

DROP POLICY IF EXISTS documents_admin_review_update ON public.documents;
CREATE POLICY documents_admin_review_update ON public.documents FOR UPDATE
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'Admin')
)
WITH CHECK (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND public.current_user_role() = 'Admin'
    AND visible_to_client = false
    AND (
      (status = 'UNDER_REVIEW' AND workflow_stage = 'SUPERADMIN_APPROVAL')
      OR (status IN ('REJECTED', 'REWORK') AND workflow_stage IN ('REJECTED', 'REWORK'))
    )
  )
);

DROP POLICY IF EXISTS documents_superadmin_final_update ON public.documents;
CREATE POLICY documents_superadmin_final_update ON public.documents FOR UPDATE
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
);

-- Approvals policies
DROP POLICY IF EXISTS approvals_scope ON public.approvals;
CREATE POLICY approvals_scope ON public.approvals FOR ALL
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff'))
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff'))
);

-- Compliance tasks policies
DROP POLICY IF EXISTS compliance_scope ON public.compliance_tasks;
CREATE POLICY compliance_scope ON public.compliance_tasks FOR ALL
USING (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND (
      public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff')
      OR EXISTS (
        SELECT 1 FROM public.client_contacts cc
        WHERE cc.client_id = compliance_tasks.client_id
          AND cc.user_id = public.current_user_profile_id()
      )
    )
  )
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff'))
);

-- Notices policies
DROP POLICY IF EXISTS notices_scope ON public.notices;
CREATE POLICY notices_scope ON public.notices FOR ALL
USING (
  public.is_god_admin()
  OR (
    firm_id = public.current_user_firm_id()
    AND (
      public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff')
      OR EXISTS (
        SELECT 1 FROM public.client_contacts cc
        WHERE cc.client_id = notices.client_id
          AND cc.user_id = public.current_user_profile_id()
      )
    )
  )
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin', 'Staff', 'Client'))
);

-- Billing policies
DROP POLICY IF EXISTS billing_superadmin_scope ON public.billing;
CREATE POLICY billing_superadmin_scope ON public.billing FOR ALL
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() = 'SuperAdmin')
);

-- Workflows policies
DROP POLICY IF EXISTS workflows_scope ON public.workflows;
CREATE POLICY workflows_scope ON public.workflows FOR ALL
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
);

-- Notifications policies
DROP POLICY IF EXISTS notifications_scope ON public.notifications;
CREATE POLICY notifications_scope ON public.notifications FOR ALL
USING (
  public.is_god_admin()
  OR firm_id IS NULL
  OR firm_id = public.current_user_firm_id()
  OR recipient_user_id = public.current_user_profile_id()
)
WITH CHECK (
  public.is_god_admin()
  OR firm_id IS NULL
  OR firm_id = public.current_user_firm_id()
);

-- Audit logs policies
DROP POLICY IF EXISTS audit_logs_select_scope ON public.audit_logs;
CREATE POLICY audit_logs_select_scope ON public.audit_logs FOR SELECT
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
);

DROP POLICY IF EXISTS audit_logs_insert_scope ON public.audit_logs;
CREATE POLICY audit_logs_insert_scope ON public.audit_logs FOR INSERT
WITH CHECK (
  public.is_god_admin()
  OR firm_id = public.current_user_firm_id()
);

-- Client portals policies
DROP POLICY IF EXISTS client_portals_superadmin_scope ON public.client_portals;
CREATE POLICY client_portals_superadmin_scope ON public.client_portals FOR ALL
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
);

-- Reminders policies
DROP POLICY IF EXISTS reminders_user_scope ON public.reminders;
CREATE POLICY reminders_user_scope ON public.reminders FOR ALL
USING (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND user_id = auth.uid())
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
)
WITH CHECK (
  public.is_god_admin()
  OR (firm_id = public.current_user_firm_id() AND user_id = auth.uid())
  OR (firm_id = public.current_user_firm_id() AND public.current_user_role() IN ('SuperAdmin', 'Admin'))
);

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
SELECT 'CAATH OS Migration v2.2.0 completed successfully' AS status;
