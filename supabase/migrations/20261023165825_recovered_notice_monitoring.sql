-- Recovered from the 7 October checkpoint; adapted to current atomic notice RPC.
-- Sources start paused; no cron, mailbox or provider connection is enabled.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS clients_id_firm_unique ON public.clients(id,firm_id);
CREATE TABLE public.notice_monitor_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), firm_id uuid NOT NULL REFERENCES public.firms(id),
 label text NOT NULL CHECK (length(label) BETWEEN 1 AND 120), kind text NOT NULL CHECK (kind IN ('email','portal_webhook')),
 active boolean NOT NULL DEFAULT false, last_checked_at timestamptz, last_event_at timestamptz,
 last_error text, check_interval_minutes integer NOT NULL DEFAULT 60 CHECK (check_interval_minutes BETWEEN 5 AND 1440),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,firm_id)
);
CREATE TABLE public.notice_monitor_keys (
 source_id uuid PRIMARY KEY REFERENCES public.notice_monitor_sources(id), token_hash text NOT NULL UNIQUE
);
CREATE TABLE public.notice_client_watches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), firm_id uuid NOT NULL, client_id uuid NOT NULL,
 department text NOT NULL CHECK(department IN ('GST','Income Tax')), enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(client_id,firm_id) REFERENCES public.clients(id,firm_id),
 UNIQUE(client_id,department)
);
CREATE TABLE public.notice_monitor_inbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), firm_id uuid NOT NULL, source_id uuid NOT NULL,
 external_id text NOT NULL CHECK(length(external_id) BETWEEN 1 AND 512), fingerprint text NOT NULL,
 department text CHECK(department IN ('GST','Income Tax')), identifier text,
 client_id uuid, subject text NOT NULL, body_excerpt text NOT NULL DEFAULT '',
 notice_number text, issued_date date, deadline date, evidence_url text CHECK(evidence_url IS NULL OR evidence_url ~ '^https://'),
 status text NOT NULL DEFAULT 'Needs Review' CHECK(status IN ('Needs Review','Accepted','Dismissed')),
 notice_id uuid REFERENCES public.notices(id), reviewed_by uuid REFERENCES public.users(id), review_note text,
 received_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz,
 FOREIGN KEY(source_id,firm_id) REFERENCES public.notice_monitor_sources(id,firm_id),
 FOREIGN KEY(client_id,firm_id) REFERENCES public.clients(id,firm_id),
 UNIQUE(source_id,external_id), UNIQUE(firm_id,fingerprint)
);
CREATE TABLE public.notice_alert_receipts (
 firm_id uuid NOT NULL, alert_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(firm_id,alert_key)
);
CREATE INDEX notice_watch_firm_idx ON public.notice_client_watches(firm_id);
CREATE INDEX notice_source_firm_idx ON public.notice_monitor_sources(firm_id);
CREATE INDEX notice_inbox_firm_date_idx ON public.notice_monitor_inbox(firm_id,received_at DESC);
ALTER TABLE public.notice_monitor_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_monitor_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_client_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_monitor_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_alert_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY monitor_source_read ON public.notice_monitor_sources FOR SELECT TO authenticated USING(firm_id = (SELECT public.current_user_firm_id()) AND public.current_user_role() IN ('Admin','SuperAdmin'));
CREATE POLICY monitor_watch_read ON public.notice_client_watches FOR SELECT TO authenticated USING(firm_id = (SELECT public.current_user_firm_id()) AND public.current_user_role() IN ('Admin','SuperAdmin'));
CREATE POLICY monitor_watch_write ON public.notice_client_watches FOR ALL TO authenticated USING(firm_id = (SELECT public.current_user_firm_id()) AND public.current_user_role() IN ('Admin','SuperAdmin')) WITH CHECK(firm_id = (SELECT public.current_user_firm_id()) AND public.current_user_role() IN ('Admin','SuperAdmin'));
CREATE POLICY monitor_inbox_read ON public.notice_monitor_inbox FOR SELECT TO authenticated USING(firm_id = (SELECT public.current_user_firm_id()) AND (
 public.current_user_role() IN ('Admin','SuperAdmin') OR (public.current_user_role()='Staff' AND EXISTS(SELECT 1 FROM public.clients c WHERE c.id=client_id AND c.assigned_staff_id=public.current_user_profile_id()))));
REVOKE ALL ON public.notice_monitor_sources,public.notice_monitor_keys,public.notice_client_watches,public.notice_monitor_inbox,public.notice_alert_receipts FROM anon,authenticated;
GRANT SELECT ON public.notice_monitor_sources,public.notice_client_watches,public.notice_monitor_inbox TO authenticated;
GRANT INSERT,UPDATE ON public.notice_client_watches TO authenticated;
GRANT ALL ON public.notice_monitor_sources,public.notice_monitor_keys,public.notice_client_watches,public.notice_monitor_inbox,public.notice_alert_receipts TO service_role;
CREATE SCHEMA IF NOT EXISTS caath_private;
REVOKE ALL ON SCHEMA caath_private FROM PUBLIC;

-- Trigger-only function: notification creation is atomic with the inbox insert.
CREATE FUNCTION caath_private.alert_notice_intake() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE staff_id uuid; client_name text;
BEGIN
 SELECT c.assigned_staff_id,c.name INTO staff_id,client_name FROM public.clients c WHERE c.id=NEW.client_id AND c.firm_id=NEW.firm_id;
 INSERT INTO public.notifications(firm_id,audience_role,title,message,status)
 SELECT NEW.firm_id,r,'New notice detected — review required',
 coalesce(client_name,'Unmatched client') || ' · ' || coalesce(NEW.department,'Department unconfirmed') || ' · ' || left(NEW.subject,180) || ' [NOTICE_INBOX:' || NEW.id || ']','UNREAD'
 FROM unnest(ARRAY['Admin','SuperAdmin']) r;
 IF staff_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=staff_id AND u.firm_id=NEW.firm_id AND u.status='Active') THEN
 INSERT INTO public.notifications(firm_id,recipient_user_id,title,message,status) VALUES(NEW.firm_id,staff_id,'New client notice detected',client_name || ' · ' || left(NEW.subject,180) || ' [NOTICE_INBOX:' || NEW.id || ']','UNREAD');
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION caath_private.alert_notice_intake() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notice_intake_alert AFTER INSERT ON public.notice_monitor_inbox FOR EACH ROW EXECUTE FUNCTION caath_private.alert_notice_intake();

CREATE FUNCTION caath_private.provision_notice_source(p_label text,p_kind text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE source_id uuid; secret text; firm uuid;
BEGIN
 firm:=public.current_user_firm_id();
 IF auth.uid() IS NULL OR firm IS NULL OR coalesce(public.current_user_role(),'') NOT IN ('Admin','SuperAdmin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 secret:=replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
 INSERT INTO public.notice_monitor_sources(firm_id,label,kind) VALUES(firm,btrim(p_label),p_kind) RETURNING id INTO source_id;
 INSERT INTO public.notice_monitor_keys VALUES(source_id,encode(sha256(convert_to(secret,'UTF8')),'hex'));
 RETURN jsonb_build_object('source_id',source_id,'token',secret);
END; $$;
CREATE FUNCTION caath_private.set_notice_source_active(p_source uuid,p_active boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce(public.current_user_role(),'') NOT IN ('Admin','SuperAdmin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 UPDATE public.notice_monitor_sources SET active=p_active WHERE id=p_source AND firm_id=public.current_user_firm_id();
 IF NOT FOUND THEN RAISE EXCEPTION 'Source not found'; END IF;
END; $$;
CREATE FUNCTION caath_private.review_notice_intake(p_id uuid,p_client uuid,p_department text,p_number text,p_issued date,p_deadline date,p_dismiss boolean DEFAULT false,p_note text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.notice_monitor_inbox; firm uuid; actor uuid; result_id uuid; owner_id uuid;
BEGIN
 firm:=public.current_user_firm_id(); actor:=public.current_user_profile_id();
 IF auth.uid() IS NULL OR firm IS NULL OR coalesce(public.current_user_role(),'') NOT IN ('Admin','SuperAdmin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 SELECT * INTO item FROM public.notice_monitor_inbox WHERE id=p_id AND firm_id=firm FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Intake not found'; END IF;
 IF item.status='Accepted' THEN RETURN item.notice_id; END IF;
 IF item.status='Dismissed' THEN RAISE EXCEPTION 'Item already dismissed'; END IF;
 IF p_dismiss THEN
  UPDATE public.notice_monitor_inbox SET status='Dismissed',reviewed_by=actor,reviewed_at=now(),review_note=p_note WHERE id=p_id; RETURN NULL;
 END IF;
 IF p_deadline < p_issued THEN RAISE EXCEPTION 'Deadline precedes issue date'; END IF;
 IF p_department IS NULL OR p_department NOT IN ('GST','Income Tax') OR nullif(btrim(p_number),'') IS NULL OR p_issued IS NULL OR p_deadline IS NULL THEN RAISE EXCEPTION 'Client, department, reference and dates are required'; END IF;
 SELECT assigned_staff_id INTO owner_id FROM public.clients WHERE id=p_client AND firm_id=firm;
 IF NOT FOUND THEN RAISE EXCEPTION 'Client not in workspace'; END IF;
 IF owner_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.users WHERE id=owner_id AND firm_id=firm AND status='Active' AND role='Staff') THEN owner_id:=NULL; END IF;
 -- Share the same business-key lock and creation transaction as manual intake.
 PERFORM pg_advisory_xact_lock(hashtextextended(firm::text || p_client::text || p_department || lower(trim(p_number)),1));
 SELECT id INTO result_id FROM public.notices WHERE firm_id=firm AND client_id=p_client AND source=p_department AND lower(trim(notice_number))=lower(trim(p_number)) ORDER BY created_at LIMIT 1;
 IF result_id IS NULL THEN
  result_id := public.create_notice_intelligence(p_client,p_number,p_department,p_issued,p_deadline,left(item.subject,500),owner_id,item.id);
 END IF;
 UPDATE public.notice_monitor_inbox SET status='Accepted',client_id=p_client,department=p_department,notice_number=btrim(p_number),issued_date=p_issued,deadline=p_deadline,notice_id=result_id,reviewed_by=actor,reviewed_at=now(),review_note=p_note WHERE id=p_id;
 RETURN result_id;
END; $$;
GRANT USAGE ON SCHEMA caath_private TO authenticated;
REVOKE ALL ON FUNCTION caath_private.provision_notice_source(text,text),caath_private.set_notice_source_active(uuid,boolean),caath_private.review_notice_intake(uuid,uuid,text,text,date,date,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION caath_private.provision_notice_source(text,text),caath_private.set_notice_source_active(uuid,boolean),caath_private.review_notice_intake(uuid,uuid,text,text,date,date,boolean,text) TO authenticated;
CREATE FUNCTION public.provision_notice_source(p_label text,p_kind text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT caath_private.provision_notice_source(p_label,p_kind) $$;
CREATE FUNCTION public.set_notice_source_active(p_source uuid,p_active boolean) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT caath_private.set_notice_source_active(p_source,p_active) $$;
CREATE FUNCTION public.review_notice_intake(p_id uuid,p_client uuid,p_department text,p_number text,p_issued date,p_deadline date,p_dismiss boolean DEFAULT false,p_note text DEFAULT '') RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT caath_private.review_notice_intake(p_id,p_client,p_department,p_number,p_issued,p_deadline,p_dismiss,p_note) $$;
REVOKE ALL ON FUNCTION public.provision_notice_source(text,text),public.set_notice_source_active(uuid,boolean),public.review_notice_intake(uuid,uuid,text,text,date,date,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.provision_notice_source(text,text),public.set_notice_source_active(uuid,boolean),public.review_notice_intake(uuid,uuid,text,text,date,date,boolean,text) TO authenticated;

-- Run from a privileged hourly scheduler. No browser privileges or client secrets.
CREATE FUNCTION public.sweep_notice_alerts() RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE item record; alert_key text; made integer:=0; today date:=(now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
 FOR item IN SELECT s.firm_id,s.id,s.label FROM public.notice_monitor_sources s WHERE s.active AND (s.last_checked_at IS NULL OR s.last_checked_at < now()-make_interval(mins=>s.check_interval_minutes*2)) LOOP
  alert_key:='source-stale:' || item.id || ':' || today;
  INSERT INTO public.notice_alert_receipts(firm_id,alert_key) VALUES(item.firm_id,alert_key) ON CONFLICT DO NOTHING;
  IF FOUND THEN
   INSERT INTO public.notifications(firm_id,audience_role,title,message,status) SELECT item.firm_id,r,'Notice monitoring needs attention','Source ' || item.label || ' has not completed a recent check. Coverage is unconfirmed.','UNREAD' FROM unnest(ARRAY['Admin','SuperAdmin']) r;
   made:=made+1;
  END IF;
 END LOOP;
 FOR item IN SELECT n.*,c.name client_name FROM public.notices n JOIN public.clients c ON c.id=n.client_id AND c.firm_id=n.firm_id
 WHERE n.source IN ('GST','Income Tax') AND n.status NOT IN ('Filed','Closed','Archived') AND n.deadline<=today+7 LOOP
  alert_key:='deadline:' || item.id || ':' || item.deadline || ':' || today;
  INSERT INTO public.notice_alert_receipts(firm_id,alert_key) VALUES(item.firm_id,alert_key) ON CONFLICT DO NOTHING;
  IF FOUND THEN
   INSERT INTO public.notifications(firm_id,audience_role,title,message,status) SELECT item.firm_id,r,
   CASE WHEN item.deadline<today THEN 'Notice reply overdue' ELSE 'Notice reply deadline approaching' END,
   item.client_name || ' · ' || item.source || ' · ' || item.notice_number || ' · Due ' || item.deadline,'UNREAD' FROM unnest(ARRAY['Admin','SuperAdmin']) r;
   IF item.assigned_to IS NOT NULL AND EXISTS(SELECT 1 FROM public.users WHERE id=item.assigned_to AND firm_id=item.firm_id AND status='Active') THEN
    INSERT INTO public.notifications(firm_id,recipient_user_id,title,message,status) VALUES(item.firm_id,item.assigned_to,'Notice reply deadline',item.client_name || ' · ' || item.notice_number || ' · Due ' || item.deadline,'UNREAD');
   END IF;
   made:=made+1;
  END IF;
 END LOOP;
 RETURN made;
END; $$;
REVOKE ALL ON FUNCTION public.sweep_notice_alerts() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_notice_alerts() TO service_role;
CREATE FUNCTION public.ingest_notice_event(p_source uuid,p_external text,p_fingerprint text,p_department text,p_identifiers text[],p_subject text,p_body text,p_number text,p_issued date,p_deadline date,p_evidence text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE src public.notice_monitor_sources; matched uuid; match_count integer; item_id uuid;
BEGIN
 SELECT * INTO src FROM public.notice_monitor_sources WHERE id=p_source AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Source unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.notice_monitor_inbox WHERE (source_id=p_source AND external_id=p_external) OR (firm_id=src.firm_id AND fingerprint=p_fingerprint)) THEN RETURN jsonb_build_object('duplicate',true); END IF;
 IF (SELECT count(*) FROM public.notice_monitor_inbox WHERE source_id=p_source AND received_at>now()-interval '1 hour') >= 1000 THEN RAISE EXCEPTION 'Source intake limit reached'; END IF;
 SELECT count(DISTINCT c.id),(array_agg(DISTINCT c.id))[1] INTO match_count,matched
 FROM public.notice_client_watches w JOIN public.clients c ON c.id=w.client_id AND c.firm_id=w.firm_id
 WHERE w.firm_id=src.firm_id AND w.enabled AND (p_department IS NULL OR w.department=p_department)
 AND upper(btrim(CASE WHEN w.department='GST' THEN c.gstin ELSE c.pan END))=ANY(p_identifiers);
 IF match_count<>1 THEN matched:=NULL; END IF;
 INSERT INTO public.notice_monitor_inbox(firm_id,source_id,external_id,fingerprint,department,identifier,client_id,subject,body_excerpt,notice_number,issued_date,deadline,evidence_url)
 VALUES(src.firm_id,src.id,p_external,p_fingerprint,p_department,array_to_string(p_identifiers,', '),matched,p_subject,p_body,p_number,p_issued,p_deadline,p_evidence)
 ON CONFLICT DO NOTHING RETURNING id INTO item_id;
 UPDATE public.notice_monitor_sources SET last_event_at=now() WHERE id=src.id;
 IF item_id IS NULL THEN RETURN jsonb_build_object('duplicate',true); END IF;
 RETURN jsonb_build_object('id',item_id,'duplicate',false,'matched',matched IS NOT NULL);
END; $$;
REVOKE ALL ON FUNCTION public.ingest_notice_event(uuid,text,text,text,text[],text,text,text,date,date,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_notice_event(uuid,text,text,text,text[],text,text,text,date,date,text) TO service_role;
COMMIT;
