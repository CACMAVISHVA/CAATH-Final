-- Reconcile older CAATH databases with the client portal fields used by the app.
-- All fields are optional and this migration preserves existing client records.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tan text,
  ADD COLUMN IF NOT EXISTS cin_llpin text,
  ADD COLUMN IF NOT EXISTS portal_username text,
  ADD COLUMN IF NOT EXISTS portal_usernames jsonb NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_clients_portal_identifiers
  ON public.clients(firm_id, gstin, pan, tan, cin_llpin);
