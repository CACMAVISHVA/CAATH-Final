import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import { sources, fetchOfficialNews } from '../server/officialNews.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const send = (status: number, data: unknown) => { res.statusCode=status; res.setHeader('Content-Type','application/json'); res.setHeader('Cache-Control','no-store'); res.end(JSON.stringify(data)); };
  if (!['GET','POST'].includes(req.method || '')) return send(405,{error:'Method not allowed'});
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY, secret=process.env.CRON_SECRET;
  if (!url || !key) return send(503,{error:'News automation is not configured yet.'});
  const auth=req.headers.authorization || '';
  const expected=secret ? `Bearer ${secret}` : '';
  const cron=req.method==='GET' && expected.length>0 && Buffer.byteLength(auth)===Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(auth),Buffer.from(expected));
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    if (!cron) {
      if (req.method!=='POST' || !auth.startsWith('Bearer ')) return send(401,{error:'Unauthorized'});
      const {data,error}=await db.auth.getUser(auth.slice(7));
      if(error || !data.user) return send(401,{error:'Sign in again.'});
      const {data:owner,error:profileError}=await db.from('users').select('id').eq('auth_id',data.user.id).eq('role','GodAdmin').eq('status','Active').is('deleted_at',null).maybeSingle();
      if(profileError || !owner) return send(403,{error:'Only God Admin can fetch news.'});
    }
    const results=await Promise.all(sources.map(async source=>{
      try {
        const {data:claimed,error:claimError}=await db.rpc('claim_regulatory_news_source',{p_id:source.id});
        if(claimError) throw claimError;
        if(!claimed) return {source:source.id,skipped:true};
        const items=await fetchOfficialNews(source);
        let imported=0;
        if(items.length) {
          // Ignore duplicates: approvals and rejections must never be overwritten by a fetch.
          const {data,error}=await db.from('regulatory_news_inbox').upsert(items,{onConflict:'source_url',ignoreDuplicates:true}).select('id');
          if(error) throw error; imported=data?.length || 0;
        }
        const {error}=await db.from('regulatory_news_sources').update({last_success_at:new Date().toISOString(),last_error:null,last_imported:imported}).eq('id',source.id);
        if(error) throw error;
        return {source:source.id,imported};
      } catch(error) {
        const message=error instanceof Error ? error.message.slice(0,200) : 'Collection failed. Check server logs.';
        await db.from('regulatory_news_sources').update({last_error:message,last_imported:0}).eq('id',source.id);
        return {source:source.id,error:message};
      }
    }));
    return send(200,{results});
  } catch { return send(500,{error:'Unable to complete collection. No items were automatically published.'}); }
}
