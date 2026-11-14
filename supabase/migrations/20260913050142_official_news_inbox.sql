BEGIN;
CREATE TABLE public.regulatory_news_sources (
  id text PRIMARY KEY, label text NOT NULL, source_url text NOT NULL,
  last_attempt_at timestamptz, last_success_at timestamptz,
  last_error text, last_imported integer NOT NULL DEFAULT 0
);
CREATE TABLE public.regulatory_news_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES public.regulatory_news_sources(id),
  source_url text NOT NULL UNIQUE CHECK (source_url LIKE 'https://%'),
  title text NOT NULL CHECK (length(title) BETWEEN 5 AND 600),
  area text NOT NULL CHECK (area IN ('GST','Direct Tax','Company Law','Financial Regulation','Professional Practice')),
  authority text NOT NULL, published_on date,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
  reviewed_by uuid REFERENCES public.users(id), reviewed_at timestamptz,
  review_note text, publication_id uuid REFERENCES public.platform_regulatory_updates(id)
);
ALTER TABLE public.regulatory_news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_news_inbox ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.regulatory_news_sources, public.regulatory_news_inbox TO authenticated;
GRANT ALL ON public.regulatory_news_sources, public.regulatory_news_inbox TO service_role;
CREATE POLICY news_sources_owner_read ON public.regulatory_news_sources FOR SELECT TO authenticated USING(public.is_god_admin());
CREATE POLICY news_inbox_owner_read ON public.regulatory_news_inbox FOR SELECT TO authenticated USING(public.is_god_admin());
CREATE INDEX regulatory_news_pending ON public.regulatory_news_inbox(status, fetched_at DESC);
INSERT INTO public.regulatory_news_sources(id,label,source_url) VALUES
 ('icai','ICAI announcements','https://www.icai.org/category/announcements'),
 ('rbi','RBI press releases','https://www.rbi.org.in/pressreleases_rss.xml'),
 ('pib','PIB practice-related releases','https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1');

CREATE FUNCTION public.claim_regulatory_news_source(p_id text) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
 UPDATE public.regulatory_news_sources SET last_attempt_at=now()
 WHERE id=p_id AND (last_attempt_at IS NULL OR last_attempt_at < now()-interval '10 minutes');
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_regulatory_news_source(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_regulatory_news_source(text) TO service_role;

CREATE FUNCTION public.review_regulatory_news(p_id uuid,p_approve boolean,p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item public.regulatory_news_inbox; publication uuid; reviewer uuid;
BEGIN
 SELECT id INTO reviewer FROM public.users WHERE auth_id=auth.uid() AND role='GodAdmin' AND status='Active' AND deleted_at IS NULL;
 IF reviewer IS NULL THEN RAISE EXCEPTION 'Only active God Admin can review news' USING ERRCODE='42501'; END IF;
 IF length(trim(coalesce(p_note,''))) < 10 OR length(p_note)>4000 THEN RAISE EXCEPTION 'Enter a review note between 10 and 4000 characters'; END IF;
 SELECT * INTO item FROM public.regulatory_news_inbox WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'News item not found'; END IF;
 IF item.status <> 'PENDING' THEN RAISE EXCEPTION 'This item has already been reviewed'; END IF;
 IF p_approve THEN
   INSERT INTO public.platform_regulatory_updates(area,authority,title,summary,source_url,source_label,published_on,created_by)
   VALUES(item.area,item.authority,item.title,trim(p_note),item.source_url,'Read official source',item.published_on,reviewer) RETURNING id INTO publication;
   PERFORM public.publish_platform_regulatory_update(publication);
 END IF;
 UPDATE public.regulatory_news_inbox SET status=CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,
 reviewed_by=reviewer,reviewed_at=now(),review_note=trim(p_note),publication_id=publication WHERE id=p_id;
 RETURN publication;
END $$;
REVOKE ALL ON FUNCTION public.review_regulatory_news(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_regulatory_news(uuid,boolean,text) TO authenticated;
COMMIT;
