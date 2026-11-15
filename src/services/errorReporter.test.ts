import test from 'node:test';
import assert from 'node:assert/strict';
import {
  __configureErrorReporterForTests, __pendingErrorReports, classifyHttpFailure, createMonitoredFetch, describeBrowser, describeResource,
  ErrorEvent, flushErrorReports, isExpectedError, redact, reportError, setErrorModule,
} from './errorReporter';
import { BRAND_PRESETS, buildThemeVariables, contrastRatio, normaliseHex, parseBrandTheme, presetTheme, readableOn, validateBrandTheme } from '../shared/config/brandTheme';

const BASE = 'https://project.supabase.co';
const failure = (over: Partial<Parameters<typeof classifyHttpFailure>[0]>) => classifyHttpFailure({ url: `${BASE}/rest/v1/clients?pan=eq.ABCDE1234F`, method: 'GET', status: 500, durationMs: 50, ...over });

test('redaction removes credentials, tokens and personal identifiers', () => {
  const out = redact('password=Hunter2! token: abc.def Bearer abcdefghijkl jane@example.com eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefgh PAN ABCDE1234F GSTIN 22ABCDE1234F1Z5 phone 9876543210 sb_secret_abcdef123');
  for (const secret of ['Hunter2', 'abcdefghijkl', 'jane@', 'eyJhbGci', 'ABCDE1234F', '22ABCDE', '9876543210', 'abcdef123']) assert.ok(!out.includes(secret), `${secret} leaked in: ${out}`);
});

test('resource names never include query strings, ids or object paths', () => {
  assert.deepEqual(describeResource(`${BASE}/rest/v1/clients?pan=eq.ABCDE1234F`), { area: 'rest', name: 'clients' });
  assert.equal(describeResource(`${BASE}/rest/v1/rpc/report_errors`).name, 'rpc/report_errors');
  assert.equal(describeResource(`${BASE}/storage/v1/object/client-documents/firm-1/secret-file.pdf`).name, 'storage/client-documents');
  assert.equal(describeResource(`${BASE}/storage/v1/object/sign/firm-branding/f/logo.png`).name, 'storage/firm-branding');
  assert.equal(describeResource(`${BASE}/auth/v1/token?grant_type=password`).name, 'auth/token');
  assert.equal(describeResource('/api/notice-draft').name, 'api/notice-draft');
});

test('genuine technical failures are classified', () => {
  assert.deepEqual(failure({})?.severity, 'High');
  assert.equal(failure({})?.type, 'database');
  assert.ok(!failure({})?.message.includes('ABCDE1234F'));
  assert.equal(failure({ status: 400, code: '42703', message: 'column clients.foo does not exist' })?.code, '42703');
  assert.equal(failure({ status: 404, code: 'PGRST205' })?.severity, 'High');
  assert.equal(failure({ status: 0 })?.type, 'network');
  assert.equal(failure({ status: 200, durationMs: 20_000 })?.type, 'performance');
  assert.equal(failure({ url: `${BASE}/storage/v1/object/docs/a.pdf`, status: 500 })?.type, 'storage');
  assert.equal(failure({ url: `${BASE}/auth/v1/token`, status: 503 })?.type, 'auth');
  assert.equal(failure({ status: 400, code: '23502' })?.type, 'validation');
});

test('expected outcomes are not reported', () => {
  for (const over of [
    { status: 401 }, { status: 403, code: '42501' }, { status: 409, code: '23505' }, { status: 406, code: 'PGRST116' }, { status: 400, code: 'P0001' },
    { status: 429 }, { status: 0, aborted: true }, { status: 0, offline: true }, { status: 200 },
    { url: `${BASE}/auth/v1/token`, status: 400 }, { url: `${BASE}/storage/v1/object/docs/a.pdf`, status: 413 },
    { url: `${BASE}/rest/v1/rpc/report_errors`, status: 500 },
  ]) assert.equal(failure(over), null, JSON.stringify(over));
  assert.ok(isExpectedError({ name: 'AbortError', message: 'x' }));
  assert.ok(isExpectedError({ code: '23505', message: 'duplicate', details: 'x', hint: null }));
  assert.ok(isExpectedError({ __isAuthError: true, message: 'Invalid login credentials' }));
  assert.ok(isExpectedError(new Error('ResizeObserver loop limit exceeded')));
  assert.ok(!isExpectedError(new TypeError("Cannot read properties of undefined (reading 'map')")));
});

test('browser description is coarse', () => {
  assert.equal(describeBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'), 'Chrome 130 / Windows');
  assert.equal(describeBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'), 'Safari 17 / iOS (mobile)');
});

test('repeats are aggregated, redacted and sent as one batch', async () => {
  const sent: ErrorEvent[][] = [];
  __configureErrorReporterForTests({ enabled: true, transport: async (events) => { sent.push(events.map((e) => ({ ...e }))); return 'ok'; } });
  setErrorModule('clients');
  for (let i = 0; i < 25; i += 1) reportError(new TypeError(`Cannot load client ${i} for jane@example.com`));
  reportError(new Error('Different failure'), { severity: 'Critical', type: 'react', module: 'dashboard' });
  reportError({ name: 'AbortError', message: 'cancelled' });
  assert.equal(__pendingErrorReports().length, 2);
  await flushErrorReports();
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0].count, 25);
  assert.equal(sent[0][0].module, 'clients');
  assert.ok(!sent[0][0].message.includes('jane@'));
  assert.equal(sent[0][1].severity, 'Critical');
  assert.equal(__pendingErrorReports().length, 0);
});

test('a flood is capped and never grows without bound', () => {
  __configureErrorReporterForTests({ enabled: true, transport: async () => 'ok' });
  for (let i = 0; i < 500; i += 1) reportError(new Error(`distinct failure ${'abcdefghijklmnopqrstuvwxyz'[i % 26]}${'abcdefghijklmnopqrstuvwxyz'[Math.floor(i / 26) % 26]}`));
  assert.ok(__pendingErrorReports().length <= 30);
});

test('reporting failures never throw, never loop, and trip the circuit breaker', async () => {
  let calls = 0;
  __configureErrorReporterForTests({ enabled: true, transport: async () => { calls += 1; reportError(new Error('reporter itself failed')); throw new Error('network down'); } });
  for (let round = 0; round < 6; round += 1) { reportError(new Error(`boom ${'abcdef'[round]}`)); await flushErrorReports(); }
  assert.equal(calls, 3, 'paused after three consecutive failures');
  assert.ok(__pendingErrorReports().length <= 3, 'reports raised during the pause wait in the bounded queue; nothing is retried in a loop');

  calls = 0;
  __configureErrorReporterForTests({ enabled: true, transport: async () => { calls += 1; return 'unavailable'; } });
  reportError(new Error('first')); await flushErrorReports();
  reportError(new Error('second')); await flushErrorReports();
  assert.equal(calls, 1, 'stops for the session when the endpoint is not deployed');
});

test('nothing is sent when reporting is disabled (local development)', async () => {
  let calls = 0;
  __configureErrorReporterForTests({ enabled: false, transport: async () => { calls += 1; return 'ok'; } });
  reportError(new Error('dev error')); await flushErrorReports();
  assert.equal(calls, 0);
});

test('monitored fetch passes responses through and reports only real failures', async () => {
  const sent: ErrorEvent[] = [];
  __configureErrorReporterForTests({ enabled: true, transport: async (events) => { sent.push(...events); return 'ok'; } });
  const responses: Record<string, () => Response> = {
    ok: () => new Response('[]', { status: 200 }),
    drift: () => new Response(JSON.stringify({ code: '42703', message: 'column clients.foo does not exist', details: 'row with PAN ABCDE1234F' }), { status: 400, headers: { 'sb-request-id': 'req-123' } }),
    denied: () => new Response(JSON.stringify({ code: '42501', message: 'permission denied' }), { status: 403 }),
    self: () => new Response('{}', { status: 500 }),
  };
  const monitored = createMonitoredFetch(async (input) => {
    const url = String(input);
    if (url.includes('down')) throw new TypeError('Failed to fetch');
    return responses[url.includes('report_errors') ? 'self' : url.includes('drift') ? 'drift' : url.includes('denied') ? 'denied' : 'ok']();
  });
  assert.equal((await monitored(`${BASE}/rest/v1/ok`)).status, 200);
  const drift = await monitored(`${BASE}/rest/v1/drift?id=eq.1`);
  assert.equal((await drift.json()).code, '42703', 'caller can still read the body');
  await monitored(`${BASE}/rest/v1/denied`);
  await monitored(`${BASE}/rest/v1/rpc/report_errors`, { method: 'POST' });
  await assert.rejects(() => monitored(`${BASE}/rest/v1/down`), /Failed to fetch/);
  await flushErrorReports();
  assert.deepEqual(sent.map((e) => `${e.type}:${e.code}`).sort(), ['database:42703', 'network:NETWORK']);
  const drifted = sent.find((e) => e.code === '42703') as ErrorEvent;
  assert.equal(drifted.request_id, 'req-123');
  assert.ok(!JSON.stringify(drifted).includes('ABCDE1234F'), 'response details are never forwarded');
});

test('brand themes: presets are accessible, input is validated, tokens are derived', () => {
  for (const preset of BRAND_PRESETS) for (const mode of ['dark', 'light'] as const) {
    const theme = presetTheme(preset.id, mode)!;
    assert.deepEqual(validateBrandTheme(theme).filter((i) => i.level === 'error'), [], `${preset.id}/${mode}`);
    const vars = buildThemeVariables(theme);
    assert.ok(contrastRatio(vars['--caath-button'], vars['--caath-button-text']) >= 4.5, `${preset.id}/${mode} button text contrast`);
    assert.ok(contrastRatio(theme.colors.primary, theme.colors.background) >= 4.5, `${preset.id}/${mode} primary contrast`);
  }
  assert.equal(normaliseHex('2f6bff'), '#2F6BFF'); assert.equal(normaliseHex('#abc'), '#AABBCC'); assert.equal(normaliseHex('red'), null);
  assert.equal(readableOn('#FFFFFF'), '#0B1020'); assert.equal(readableOn('#101010'), '#FFFFFF');
  assert.equal(parseBrandTheme({ colors: { primary: 'red; background:url(x)' } }), null);
  assert.equal(parseBrandTheme('nope'), null);
  const parsed = parseBrandTheme({ preset: 'x', mode: 'light', colors: { primary: '#123456', evil: '#000000' } })!;
  assert.equal(parsed.colors.primary, '#123456'); assert.ok(!('evil' in parsed.colors));
  const unreadable = { ...presetTheme('midnight-navy', 'dark')!, colors: { ...presetTheme('midnight-navy', 'dark')!.colors, primary: '#0C1322' } };
  assert.ok(validateBrandTheme(unreadable).some((i) => i.level === 'error'));
  const wrongMode = { ...presetTheme('midnight-navy', 'dark')!, mode: 'light' as const };
  assert.ok(validateBrandTheme(wrongMode).some((i) => /too dark for Light Mode/.test(i.message)));
});
