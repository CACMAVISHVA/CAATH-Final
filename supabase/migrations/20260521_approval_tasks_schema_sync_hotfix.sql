-- CAATH OS: approval_tasks schema synchronization hotfix
-- Purpose: align runtime service expectations with DB schema and preserve governance auditability.

ALTER TABLE public.approval_tasks
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS reassigned_by uuid,
  ADD COLUMN IF NOT EXISTS escalated_by uuid,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'at_fk_updater'
  ) THEN
    ALTER TABLE public.approval_tasks
      ADD CONSTRAINT at_fk_updater
      FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'at_fk_reassigner'
  ) THEN
    ALTER TABLE public.approval_tasks
      ADD CONSTRAINT at_fk_reassigner
      FOREIGN KEY (reassigned_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'at_fk_escalator'
  ) THEN
    ALTER TABLE public.approval_tasks
      ADD CONSTRAINT at_fk_escalator
      FOREIGN KEY (escalated_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_approval_tasks_updated_by ON public.approval_tasks(updated_by);
CREATE INDEX IF NOT EXISTS idx_approval_tasks_reassigned_by ON public.approval_tasks(reassigned_by);
CREATE INDEX IF NOT EXISTS idx_approval_tasks_escalated_by ON public.approval_tasks(escalated_by);
CREATE INDEX IF NOT EXISTS idx_approval_tasks_escalated_at ON public.approval_tasks(escalated_at DESC);

