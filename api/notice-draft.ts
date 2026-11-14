import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { generateNoticeDraft, noticeDraftPrompt } from '../server/notice-draft.js';

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  const send = (status: number, body: unknown) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
  if (req.method !== 'POST') return send(405, { error: 'POST required.' });
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return send(401, { error: 'Sign in again.' });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const publicKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !publicKey) return send(503, { error: 'Drafting service unavailable.' });
  try {
    let body = req.body;
    if (body === undefined) {
      let raw = '';
      for await (const chunk of req) { raw += chunk.toString(); if (Buffer.byteLength(raw) > 8192) return send(413, { error: 'Request too large.' }); }
      body = JSON.parse(raw);
    }
    if (typeof body === 'string') { if (Buffer.byteLength(body) > 8192) return send(413, { error: 'Request too large.' }); body = JSON.parse(body); }
    if (Buffer.byteLength(JSON.stringify(body) || '') > 8192) return send(413, { error: 'Request too large.' });
    const input = body as { noticeId?: unknown; provider?: unknown; apiKey?: unknown; model?: unknown; consent?: unknown };
    if (input?.provider !== 'gemini' || input.consent !== true) return send(400, { error: 'Choose your AI connection and confirm provider data sharing.' });
    const key = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
    const model = typeof input.model === 'string' ? input.model.trim() : '';
    if (!key || key.length > 512 || /[\s\x00-\x1f]/.test(key) || !/^[a-zA-Z0-9._-]{1,100}$/.test(model)) return send(400, { error: 'Enter your own provider API key and model ID.' });
    const id = input.noticeId;
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return send(400, { error: 'A notice ID is required.' });
    const db = createClient(url, publicKey, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error: authError } = await db.auth.getUser();
    if (authError || !identity.user) return send(401, { error: 'Sign in again.' });
    const { data: actor, error: actorError } = await db.from('users').select('id,firm_id,role,status,deleted_at').eq('auth_id', identity.user.id).single();
    if (actorError || !actor || actor.status !== 'Active' || actor.deleted_at || !['Admin','SuperAdmin','Staff'].includes(actor.role)) return send(403, { error: 'Active internal workspace access required.' });
    const { data: notice, error } = await db.from('notices').select('id,version,notice_number,source,received_date,deadline,description,status').eq('id', id).eq('firm_id', actor.firm_id).single();
    if (error || !notice || notice.status === 'Archived') return send(404, { error: 'Notice unavailable.' });
    if (!notice.description?.trim()) return send(400, { error: 'Add a factual notice summary first.' });
    const prompt = noticeDraftPrompt(notice);
    const reservation = await db.rpc('reserve_notice_ai_request', { p_notice: id });
    if (reservation.error) return send(429, { error: 'AI drafting limit reached or workspace access unavailable.' });
    const draft = await generateNoticeDraft(prompt, key, model);
    return send(200, { draft, noticeVersion: notice.version, requestId: reservation.data, requiresReview: true });
  } catch { return send(502, { error: 'Draft generation failed. No reply was saved or submitted.' }); }
}
