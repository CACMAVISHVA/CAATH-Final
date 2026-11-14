INSERT INTO public.regulatory_news_sources(id,label,source_url) VALUES
 ('cbic_gst','CBIC — GST latest updates','https://taxinformation.cbic.gov.in/api/cbic-notification-msts/fetchUpdatesByTaxId/1000001'),
 ('cbic_customs','CBIC — Customs latest updates','https://taxinformation.cbic.gov.in/api/cbic-notification-msts/fetchUpdatesByTaxId/1000002'),
 ('cbdt_notifications','CBDT — Direct Tax notifications','https://www.incometaxindia.gov.in/notification-rss-feed/-/asset_publisher/bxhj/rss'),
 ('cbdt_circulars','CBDT — Direct Tax circulars','https://www.incometaxindia.gov.in/circular-rss-feed/-/asset_publisher/bxhj/rss')
ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label,source_url=EXCLUDED.source_url;
