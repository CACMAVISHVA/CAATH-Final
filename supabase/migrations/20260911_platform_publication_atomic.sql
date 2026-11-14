BEGIN;

CREATE OR REPLACE FUNCTION public.publish_platform_regulatory_update(p_id uuid)
RETURNS public.platform_regulatory_updates
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item public.platform_regulatory_updates;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'GodAdmin' THEN
    RAISE EXCEPTION 'Only God Admin can publish platform updates' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO item
  FROM public.platform_regulatory_updates
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Update not found'; END IF;
  IF item.status = 'PUBLISHED' THEN RETURN item; END IF;
  IF item.status <> 'DRAFT' THEN RAISE EXCEPTION 'Only drafts can be published'; END IF;

  UPDATE public.platform_regulatory_updates
  SET status = 'PUBLISHED',
      verified_by = public.current_user_profile_id(),
      verified_at = now(),
      published_at = now(),
      updated_at = now()
  WHERE id = p_id
  RETURNING * INTO item;

  INSERT INTO public.notifications (
    firm_id, recipient_user_id, audience_role, title, message, priority, created_by
  )
  SELECT firm_id,
         id,
         NULL,
         'Regulatory update: ' || item.title,
         'CAATH God Admin published a ' || item.area || ' update. Open Regulatory Updates to read the official source.',
         'HIGH',
         public.current_user_profile_id()
  FROM public.users
  WHERE role = 'SuperAdmin'
    AND status = 'Active'
    AND firm_id IS NOT NULL;

  RETURN item;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_platform_regulatory_update(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_platform_regulatory_update(uuid) TO authenticated;

COMMIT;
