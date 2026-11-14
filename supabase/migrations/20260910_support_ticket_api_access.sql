  -- Support tickets are accessed by the browser through supabase-js.
  -- Keep the table unavailable to anonymous visitors and explicitly expose only
  -- the operations required by signed-in users. Existing RLS policies remain the
  -- row-level enforcement layer.

  REVOKE ALL ON TABLE public.support_tickets FROM anon;
  GRANT SELECT, INSERT, UPDATE ON TABLE public.support_tickets TO authenticated;
