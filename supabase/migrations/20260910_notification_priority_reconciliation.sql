-- Reconcile older CAATH databases with notification priority used by runtime alerts.
-- Existing notifications receive the safe default priority of MEDIUM.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'MEDIUM'
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status
  ON public.notifications(recipient_user_id, status, created_at DESC);
