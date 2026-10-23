import { fingerprintText, identifyNotice, validateDate } from '../_shared/noticeIntake.ts';
const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const digest = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))).map(v => v.toString(16).padStart(2, '0')).join('');
export function createNoticeIntakeHandler(createAdmin: () => { from: (table: string) => any; rpc: (name: string, values: Record<string, unknown>) => PromiseLike<{ data: any; error: unknown }> }) {
return async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return response(405, { error: 'POST required' });
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return response(401, { error: 'Invalid source credentials' });
  try {
    const admin = createAdmin();
    const { data: key, error: keyError } = await admin.from('notice_monitor_keys').select('source_id').eq('token_hash', await digest(token)).maybeSingle();
    if (keyError) throw keyError;
    if (!key) return response(401, { error: 'Invalid source credentials' });
    const { data: source, error: sourceError } = await admin.from('notice_monitor_sources').select('id,firm_id,active').eq('id', key.source_id).single();
    if (sourceError) throw sourceError;
    if (!source.active) return response(403, { error: 'Source disabled' });
    // Streaming size limit also handles requests without Content-Length.
    const reader = req.body?.getReader(); if (!reader) return response(400, { error: 'Payload required' });
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 65536) { await reader.cancel(); return response(413, { error: 'Payload too large' }); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let input; try { input = JSON.parse(new TextDecoder().decode(bytes)); } catch { return response(400, { error: 'Invalid JSON' }); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) return response(400, { error: 'Object required' });
    if (input.operation === 'check_complete' || input.operation === 'check_failed') {
      const { error } = await admin.from('notice_monitor_sources').update(input.operation === 'check_complete'
        ? { last_checked_at: new Date().toISOString(), last_error: null }
        : { last_error: 'Connector check failed; check the worker configuration and logs.' }).eq('id', source.id);
      if (error) throw error;
      return response(200, { ok: true });
    }
    const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
    const externalId = text(input.externalId, 512), subject = text(input.subject, 500), body = text(input.body, 32000);
    if (!externalId || !subject) return response(400, { error: 'externalId and subject required' });
    if (input.department != null && !['GST', 'Income Tax'].includes(input.department)) return response(400, { error: 'Invalid department' });
    const identified = identifyNotice(`${subject}\n${body}\n${text(input.identifier, 30)}`, input.department);
    const number = text(input.noticeNumber, 200) || null;
    let issuedDate, deadline;
    try { issuedDate = validateDate(input.issuedDate); deadline = validateDate(input.deadline); } catch (err) { return response(400, { error: err instanceof Error ? err.message : 'Invalid dates' }); }
    const evidence = text(input.evidenceUrl, 2000) || null;
    if (evidence) { try { if (new URL(evidence).protocol !== 'https:') throw new Error(); } catch { return response(400, { error: 'HTTPS evidence URL required' }); } }
    const { data, error } = await admin.rpc('ingest_notice_event', {
      p_source: source.id, p_external: externalId,
      p_fingerprint: await digest(fingerprintText({ ...identified, noticeNumber: number, subject, body })),
      p_department: identified.department, p_identifiers: identified.identifiers,
      p_subject: subject, p_body: body, p_number: number, p_issued: issuedDate, p_deadline: deadline, p_evidence: evidence,
    });
    if (error) throw error;
    return response(200, { ok: true, ...data });
  } catch { return response(500, { error: 'Intake unavailable; retry with the same externalId' }); }
};
}
