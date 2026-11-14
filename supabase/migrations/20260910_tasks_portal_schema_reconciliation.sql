-- Reconcile older CAATH databases with the task portal fields used by the app.
-- All fields are optional and this migration preserves existing task records.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS portal_type text CHECK (portal_type IS NULL OR portal_type IN ('GST', 'IncomeTax', 'MCA', 'TRACES')),
  ADD COLUMN IF NOT EXISTS portal_workflow_type text CHECK (portal_workflow_type IS NULL OR portal_workflow_type IN (
    'GST Filing',
    'GST Registration',
    'GST Notice',
    'Income Tax Filing',
    'Income Tax Notice',
    'Tax Payment',
    'MCA Annual Filing',
    'ROC Filing',
    'Director KYC',
    'TRACES/TDS Activities',
    'TDS Return',
    'Form 16/16A'
  )),
  ADD COLUMN IF NOT EXISTS linked_portal_event_id uuid,
  ADD COLUMN IF NOT EXISTS calendar_event_ref text;

CREATE INDEX IF NOT EXISTS idx_tasks_portal_type
  ON public.tasks(firm_id, portal_type, portal_workflow_type);
