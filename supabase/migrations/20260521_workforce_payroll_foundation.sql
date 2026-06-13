-- CAATH OS: Workforce + Payroll foundation architecture
-- Scope: foundational structures only (no advanced compliance calculations).

CREATE TABLE IF NOT EXISTS public.workforce_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_code text NOT NULL,
  department text NOT NULL,
  team text NOT NULL,
  designation text NOT NULL,
  joining_date date NOT NULL,
  reporting_manager_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  compensation_status text NOT NULL DEFAULT 'Draft' CHECK (compensation_status IN ('Draft', 'Active', 'Paused')),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(firm_id, user_id),
  UNIQUE(firm_id, employee_code)
);

CREATE TABLE IF NOT EXISTS public.salary_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  employee_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  base_salary numeric(14,2) NOT NULL DEFAULT 0,
  incentives numeric(14,2) NOT NULL DEFAULT 0,
  bonus numeric(14,2) NOT NULL DEFAULT 0,
  deductions numeric(14,2) NOT NULL DEFAULT 0,
  reimbursements numeric(14,2) NOT NULL DEFAULT 0,
  effective_from date NOT NULL,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  payroll_period text NOT NULL,
  employee_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  gross_amount numeric(14,2) NOT NULL DEFAULT 0,
  net_amount numeric(14,2) NOT NULL DEFAULT 0,
  payout_status text NOT NULL DEFAULT 'Draft' CHECK (payout_status IN ('Draft', 'Pending Approval', 'Approved', 'Paid', 'Rejected')),
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payroll_approval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('Submitted', 'Approved', 'Rejected')),
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.compensation_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  employee_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  salary_structure_id uuid REFERENCES public.salary_structures(id) ON DELETE SET NULL,
  changed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  previous_payload jsonb,
  next_payload jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workforce_profiles_firm ON public.workforce_profiles(firm_id);
CREATE INDEX IF NOT EXISTS idx_workforce_profiles_manager ON public.workforce_profiles(reporting_manager_id);
CREATE INDEX IF NOT EXISTS idx_salary_structures_firm_employee ON public.salary_structures(firm_id, employee_user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_firm_period ON public.payroll_runs(firm_id, payroll_period);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_employee ON public.payroll_runs(employee_user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_approval_logs_run ON public.payroll_approval_logs(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_comp_change_history_employee ON public.compensation_change_history(employee_user_id);

