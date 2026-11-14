-- Reconcile older CAATH databases with workflow activity and observability tables.
-- This creates only missing tables and indexes; existing business records are unchanged.

CREATE TABLE IF NOT EXISTS public.task_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_role text NOT NULL,
  activity_type text NOT NULL,
  details text NOT NULL,
  previous_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_reassignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  previous_assignee uuid,
  previous_assignee_name text,
  new_assignee uuid,
  new_assignee_name text,
  reassigned_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reassigned_by_name text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enterprise_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_subtype text,
  reference_id uuid,
  reference_table text,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name text,
  actor_role text,
  details jsonb DEFAULT '{}',
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'notice', 'warning', 'critical')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON public.task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_created_at ON public.task_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_reassignments_task_id ON public.task_reassignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reassignments_firm_id ON public.task_reassignments(firm_id);
CREATE INDEX IF NOT EXISTS idx_task_reassignments_created_at ON public.task_reassignments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_activities_firm_id ON public.enterprise_activities(firm_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_activities_event_type ON public.enterprise_activities(event_type);
CREATE INDEX IF NOT EXISTS idx_enterprise_activities_created_at ON public.enterprise_activities(created_at DESC);

ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reassignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_activities_tenant_scope ON public.task_activities;
CREATE POLICY task_activities_tenant_scope ON public.task_activities
FOR ALL TO authenticated
USING (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_activities.task_id
      AND tasks.firm_id = public.current_user_firm_id()
  )
)
WITH CHECK (
  public.is_god_admin()
  OR EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_activities.task_id
      AND tasks.firm_id = public.current_user_firm_id()
  )
);

DROP POLICY IF EXISTS task_reassignments_tenant_scope ON public.task_reassignments;
CREATE POLICY task_reassignments_tenant_scope ON public.task_reassignments
FOR ALL TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id())
WITH CHECK (public.is_god_admin() OR firm_id = public.current_user_firm_id());

DROP POLICY IF EXISTS enterprise_activities_tenant_scope ON public.enterprise_activities;
CREATE POLICY enterprise_activities_tenant_scope ON public.enterprise_activities
FOR ALL TO authenticated
USING (public.is_god_admin() OR firm_id = public.current_user_firm_id())
WITH CHECK (public.is_god_admin() OR firm_id = public.current_user_firm_id());

REVOKE ALL ON TABLE public.task_activities, public.task_reassignments, public.enterprise_activities FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.task_activities, public.task_reassignments, public.enterprise_activities TO authenticated;
