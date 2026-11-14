import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { load } from 'cheerio';

export const sources = [
  { id: 'icai', url: 'https://www.icai.org/category/announcements', authority: 'ICAI', area: 'Professional Practice', format: 'icai-html' },
  { id: 'rbi', url: 'https://www.rbi.org.in/pressreleases_rss.xml', authority: 'RBI', area: 'Financial Regulation', format: 'rss' },
  { id: 'pib', url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1', authority: 'PIB', area: 'Professional Practice', format: 'rss' },
  { id: 'cbic_gst', url: 'https://taxinformation.cbic.gov.in/api/cbic-notification-msts/fetchUpdatesByTaxId/1000001', authority: 'CBIC', area: 'GST', format: 'cbic-json' },
  { id: 'cbic_customs', url: 'https://taxinformation.cbic.gov.in/api/cbic-notification-msts/fetchUpdatesByTaxId/1000002', authority: 'CBIC', area: 'Financial Regulation', format: 'cbic-json' },
  { id: 'cbdt_notifications', url: 'https://www.incometax.gov.in/iec/foportal/latest-news', authority: 'CBDT / Income Tax Department', area: 'Direct Tax', format: 'cbdt-html' },
] as const;
type Source = typeof sources[number];
export type NewsItem = { source_id: string; source_url: string; title: string; authority: string; area: string; published_on: string | null };
const plain = (value: unknown) => load(String(value ?? '')).text().replace(/\s+/g, ' ').trim();
const monthNumber: Record<string,string> = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
export function publishedDate(value?: string): string | null {
  if (!value) return null;
  const iso=value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const indian=value.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (indian && monthNumber[indian[2].toLowerCase()]) return `${indian[3]}-${monthNumber[indian[2].toLowerCase()]}-${indian[1].padStart(2,'0')}`;
  const date=new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0,10) : null;
}
export function officialLink(value: string, source: Source): string | null {
  try {
    const url = new URL(value, source.url);
    const allowed = source.id === 'icai' ? ['www.icai.org','icai.org','resource.cdn.icai.org']
      : source.id === 'rbi' ? ['www.rbi.org.in','rbi.org.in']
      : source.id === 'pib' ? ['pib.gov.in','www.pib.gov.in']
      : source.id.startsWith('cbic_') ? ['taxinformation.cbic.gov.in']
      : ['www.incometaxindia.gov.in','incometaxindia.gov.in','wmstatic-prd.incometaxindia.gov.in','www.incometax.gov.in','incometax.gov.in'];
    if (!['http:', 'https:'].includes(url.protocol) || !allowed.includes(url.hostname) || url.username || url.password || url.port) return null;
    url.protocol = 'https:'; url.hash = ''; return url.toString();
  } catch { return null; }
}
export function parseOfficialNews(source: Source, body: string): NewsItem[] {
  if (/<!ENTITY/i.test(body) || (/<!DOCTYPE/i.test(body) && !source.format.endsWith('-html'))) throw new Error('Unsafe feed format');
  let entries: { title: string; link: string; date?: string }[] = [];
  if (source.format === 'icai-html') {
    const doc = load(body);
    doc('a[href]').each((_, element) => {
      const a = doc(element), title = a.text().replace(/\s+/g, ' ').trim();
      const date = a.parent().text().match(/\b(\d{2})-(\d{2})-(\d{4})\b/);
      if (title.length >= 20 && date) entries.push({ title, link: a.attr('href')!, date: `${date[3]}-${date[2]}-${date[1]}` });
    });
  } else if (source.format === 'cbdt-html') {
    const doc=load(body);
    doc('.views-row').each((index,row)=>{
      const date=doc(row).find('.up-date').first().text().trim();
      const content=doc(row).find('.gry-ft').first();
      const title=content.text().replace(/\s+/g,' ').replace(/Click here\s*$/i,'').trim();
      const href=content.find('a[href]').first().attr('href') || `${source.url}?caath_item=${index}`;
      if (date && title.length >= 20) entries.push({title,link:href,date});
    });
  } else if (source.format === 'cbic-json') {
    let items: unknown;
    try { items = JSON.parse(body); } catch { throw new Error('CBIC returned invalid data'); }
    if (!Array.isArray(items)) throw new Error('CBIC update list missing');
    entries = items.map((item: Record<string, unknown>) => {
      const kind = String(item.updateType || '').toLowerCase() === 'circular' ? 'Circulars' : 'Notifications';
      return {
        title: `${plain(item.notificationNo)} — ${plain(item.notificationName)}`,
        link: `https://taxinformation.cbic.gov.in/view-pdf/${encodeURIComponent(String(item.id || ''))}/ENG/${kind}`,
        date: String(item.updatedDate || ''),
      };
    });
  } else {
    if (XMLValidator.validate(body) !== true) throw new Error('Source returned invalid RSS');
    const xml = new XMLParser({ processEntities: false }).parse(body);
    if (!xml.rss?.channel) throw new Error('Expected RSS channel missing');
    const items = xml.rss.channel.item || [];
    entries = (Array.isArray(items) ? items : [items]).map(item => ({ title: plain(item.title), link: String(item.link || ''), date: item.pubDate }));
  }
  if (!entries.length) throw new Error('Source returned no items; coverage cannot be confirmed');
  const unique = new Map<string, NewsItem>();
  for (const entry of entries) {
    const link = officialLink(entry.link, source);
    if (!link || entry.title.length < 5 || entry.title.length > 600) continue;
    if (source.id === 'pib' && !/\b(GST|tax|income.tax|CBDT|CBIC|corporate affairs|accounting|audit|MSME|companies act|SEBI|insolvency)\b/i.test(entry.title)) continue;
    const published = publishedDate(entry.date);
    const date = published ? new Date(`${published}T12:00:00Z`) : null;
    if (date && (Date.now() - date.getTime() > 90 * 86400000 || date.getTime() > Date.now() + 86400000)) continue;
    const area = /\bGST\b/i.test(entry.title) ? 'GST' : /income.tax|CBDT|direct tax/i.test(entry.title) ? 'Direct Tax' : /corporate affairs|companies act|MCA\b/i.test(entry.title) ? 'Company Law' : source.area;
    unique.set(link, { source_id: source.id, source_url: link, title: entry.title, authority: source.authority, area, published_on: published });
  }
  return [...unique.values()].slice(0,60);
}
export async function fetchOfficialNews(source: Source): Promise<NewsItem[]> {
  let response: Response;
  try {
    response = await fetch(source.url, { signal: AbortSignal.timeout(18000), redirect: 'error', headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': source.format === 'cbic-json' ? 'application/json' : '*/*' } });
  } catch (error) {
    const causeCode = (error as { cause?: { code?: string } })?.cause?.code;
    if (source.id.startsWith('cbic_') && causeCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      throw new Error('CBIC secure connection could not be verified; the source remains unpublished and will be retried');
    }
    throw new Error('Official source is temporarily unreachable; it will be retried');
  }
  if (!response.ok) throw new Error(`Official source returned HTTP ${response.status}`);
  const reader = response.body?.getReader(); if (!reader) throw new Error('Empty source response');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length; if (size > 1500000) { await reader.cancel(); throw new Error('Source exceeds safe size limit'); }
    chunks.push(value);
  }
  return parseOfficialNews(source, Buffer.concat(chunks).toString('utf8'));
}
