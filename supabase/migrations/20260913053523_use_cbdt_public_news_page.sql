ALTER TABLE public.regulatory_news_sources ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true;
UPDATE public.regulatory_news_sources
SET label='CBDT / Income Tax — Direct Tax latest news',source_url='https://www.incometax.gov.in/iec/foportal/latest-news',is_enabled=true
WHERE id='cbdt_notifications';
UPDATE public.regulatory_news_sources SET is_enabled=false WHERE id='cbdt_circulars';
