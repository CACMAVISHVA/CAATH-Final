// Verification script for the branding + error-monitoring work (November 2026).
// Not part of `npm test`: it needs an in-memory Postgres that is not a project dependency.
//   npm i --no-save @electric-sql/pglite
//   VITE_REPORT_DEV_ERRORS=true npm run dev      (in another terminal)
//   node tests/branding-monitoring/browser.e2e.mjs   (uses installed Microsoft Edge; Supabase is fully mocked)
import { fileURLToPath } from 'node:url';
// Browser E2E for branding + error monitoring.
// The real app (vite dev) runs in Edge; every Supabase request is intercepted and answered
// from an in-memory Postgres that has the two new migrations applied. Production is never contacted.
import { PGlite } from '@electric-sql/pglite';
import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SHOTS = new URL('./shots/', import.meta.url); // screenshots (git-ignored)
fs.mkdirSync(SHOTS, { recursive: true });
const env = Object.fromEntries(fs.readFileSync(ROOT + '.env', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]));
const SUPA = new URL(env.VITE_SUPABASE_URL).origin;
const REF = new URL(SUPA).hostname.split('.')[0];
const APP = process.env.APP_URL || 'http://localhost:3000';
const Z = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`;

// ---------- database ----------
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
grant usage on schema auth to authenticated, anon; grant usage on schema public to authenticated, anon;
create table public.firms (id uuid primary key, name text, status text default 'Active');
create table public.users (id uuid primary key, auth_id uuid, firm_id uuid references public.firms(id), role text, name text, email text, status text default 'Active', deleted_at timestamptz);
create table public.notifications (id uuid primary key default gen_random_uuid(), firm_id uuid, recipient_user_id uuid, audience_role text, title text not null, message text not null, status text not null default 'UNREAD', priority text not null default 'MEDIUM', created_at timestamptz default now());
create function public.current_user_role() returns text language sql stable security definer set search_path='' as $$ select role from public.users where auth_id=auth.uid() and status='Active' and deleted_at is null limit 1 $$;
create function public.current_user_profile_id() returns uuid language sql stable security definer set search_path='' as $$ select id from public.users where auth_id=auth.uid() and status='Active' and deleted_at is null limit 1 $$;
create function public.current_user_firm_id() returns uuid language sql stable security definer set search_path='' as $$ select firm_id from public.users where auth_id=auth.uid() and status='Active' and deleted_at is null limit 1 $$;
create function public.is_god_admin() returns boolean language sql stable security definer set search_path='' as $$ select coalesce(public.current_user_role()='GodAdmin', false) $$;
insert into public.firms values ('${Z(91)}','Sharma & Associates'),('${Z(92)}','Mehta Tax Consultants');
insert into public.users (id, auth_id, firm_id, role, name, email) values
 ('${Z(1)}','${Z(11)}',null,'GodAdmin','Platform Admin','god@test.local'),
 ('${Z(2)}','${Z(12)}','${Z(91)}','SuperAdmin','Anita Sharma','owner-a@test.local'),
 ('${Z(3)}','${Z(13)}','${Z(91)}','Staff','Ravi Kumar','staff-a@test.local'),
 ('${Z(4)}','${Z(14)}','${Z(92)}','SuperAdmin','Kiran Mehta','owner-b@test.local');
`);
const M = ROOT + 'supabase/migrations/';
await db.exec(fs.readFileSync(M + '20260912190523_firm_invoice_branding.sql', 'utf8').split('INSERT INTO storage.buckets')[0]);
await db.exec(fs.readFileSync(M + '20261115060000_workspace_branding_theme.sql', 'utf8'));
await db.exec(fs.readFileSync(M + '20261115061000_error_monitoring.sql', 'utf8'));
await db.exec(`grant select on public.firms, public.users to authenticated;`);

let chain = Promise.resolve();
const asUser = (uid, sql, params = []) => (chain = chain.catch(() => {}).then(async () => {
  await db.exec(`set role authenticated; select set_config('test.uid', '${uid ?? ''}', false);`);
  try { return (await db.query(sql, params)).rows; } finally { await db.exec(`reset role; select set_config('test.uid', '', false);`); }
}));
const admin = (sql, params = []) => (chain = chain.catch(() => {}).then(async () => (await db.query(sql, params)).rows));

// ---------- fake Supabase ----------
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const session = (authId, email) => {
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const user = { id: authId, aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  return { access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: authId, exp, role: 'authenticated', email, aal: 'aal1', session_id: Z(77) })}.sig`, token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: 'r', user };
};
const uidOf = (request) => { try { return JSON.parse(Buffer.from((request.headers().authorization || '').split('.')[1], 'base64url').toString()).sub; } catch { return null; } };
const objects = new Map();
const reportCalls = [];
const pgError = (e) => ({ status: /permission denied|row-level security|required/i.test(e.message) ? 403 : 400, contentType: 'application/json', body: JSON.stringify({ code: e.code || 'P0001', message: e.message, details: null, hint: null }) });
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
const FIRM_COLS = (id, name) => ({ id, name, firm_name: name, status: 'Active', workspace_code: 'CAATH-' + id.slice(-2), subscription_plan: 'CAATH Practice OS', subscription_status: 'Active', subscription_expiry_date: '2027-12-31', max_admins: 3, max_staff: 10, max_clients: 500 });

const handle = async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname;
  const method = request.method();
  const uid = uidOf(request);
  const single = (request.headers().accept || '').includes('vnd.pgrst.object');
  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  try {
    if (path.startsWith('/auth/v1/user')) { const u = (await admin(`select email from users where auth_id = $1`, [uid]))[0]; return route.fulfill(json(session(uid, u?.email).user)); }
    if (path.startsWith('/auth/v1/')) return route.fulfill(json({}));
    if (path.startsWith('/realtime/')) return route.abort();

    if (path.startsWith('/storage/v1/object/sign/')) { const key = decodeURIComponent(path.replace('/storage/v1/object/sign/', '')); return objects.has(key) ? route.fulfill(json({ signedURL: `/object/public-test/${key}?token=t${Date.now()}` })) : route.fulfill(json({ statusCode: '404', error: 'not_found', message: 'Object not found' }, 400)); }
    if (path.startsWith('/storage/v1/object/public-test/')) { const o = objects.get(decodeURIComponent(path.replace('/storage/v1/object/public-test/', ''))); return o ? route.fulfill({ status: 200, contentType: o.type, body: o.body }) : route.fulfill({ status: 404, body: '' }); }
    if (path.startsWith('/storage/v1/object/list/')) return route.fulfill(json([]));
    if (path.startsWith('/storage/v1/object/')) {
      const key = decodeURIComponent(path.replace('/storage/v1/object/', ''));
      if (method === 'DELETE') { const body = request.postDataJSON(); (body?.prefixes ?? []).forEach((p) => objects.delete(`${key}/${p}`)); return route.fulfill(json([])); }
      // storage RLS equivalent: folder must be the caller's firm, caller must be SuperAdmin
      const [bucket, folder] = key.split('/');
      const me = (await admin(`select firm_id, role from users where auth_id = $1`, [uid]))[0];
      if (bucket === 'firm-branding' && (me?.firm_id !== folder || me?.role !== 'SuperAdmin')) return route.fulfill(json({ statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' }, 400));
      let type = request.headers()['content-type'] || 'application/octet-stream'; let body = request.postDataBuffer();
      if (type.startsWith('multipart/')) { // supabase-js sends Blobs as multipart form data
        const raw = body.toString('latin1'); const boundary = '--' + type.split('boundary=')[1];
        const part = raw.split(boundary).find((p) => /Content-Type: image\//i.test(p));
        type = part.match(/Content-Type: ([^\r\n]+)/i)[1]; body = Buffer.from(part.slice(part.indexOf('\r\n\r\n') + 4, part.lastIndexOf('\r\n')), 'latin1');
      }
      objects.set(key, { type, body });
      return route.fulfill(json({ Key: key, Id: 'x' }));
    }

    if (path.startsWith('/rest/v1/rpc/')) {
      const fn = path.split('/').pop();
      const args = request.postDataJSON() || {};
      if (fn === 'report_errors') reportCalls.push(args.p_events);
      if (!['report_errors', 'error_monitor_stats', 'error_monitor_list', 'error_group_detail', 'error_group_update', 'firm_error_summary'].includes(fn)) return route.fulfill(json(null));
      const keys = Object.keys(args);
      const rows = await asUser(uid, `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}${k === 'p_events' ? '::jsonb' : ''}`).join(', ')}) as r`, keys.map((k) => (k === 'p_events' ? JSON.stringify(args[k]) : args[k])));
      return route.fulfill(json(rows[0].r));
    }

    const table = path.replace('/rest/v1/', '');
    if (table === 'users' && url.searchParams.get('auth_id')) {
      const u = (await admin(`select u.id, u.auth_id, u.firm_id, u.name, u.email, u.role, u.status, false as is_workspace_owner, now() as created_at, f.name as fname from users u left join firms f on f.id = u.firm_id where u.auth_id = $1`, [url.searchParams.get('auth_id').replace('eq.', '')]))[0];
      const row = u ? { ...u, is_workspace_owner: u.role === 'SuperAdmin', firms: u.firm_id ? FIRM_COLS(u.firm_id, u.fname) : null } : null;
      return route.fulfill(json(single ? row : row ? [row] : []));
    }
    if (table === 'firms' && method === 'GET') {
      const rows = (await asUser(uid, `select id, name from firms order by name`)).map((f) => FIRM_COLS(f.id, f.name));
      if (method === 'HEAD') return route.fulfill({ status: 200, headers: { 'content-range': '0-0/2' } });
      return route.fulfill(json(single ? rows[0] ?? null : rows));
    }
    if (table === 'firm_branding') {
      if (method === 'GET') {
        const firm = (url.searchParams.get('firm_id') || '').replace('eq.', '');
        const cols = (url.searchParams.get('select') || '*').split(',').map((c) => c.trim()).filter((c) => /^[a-z_*]+$/.test(c)).join(', ');
        const rows = await asUser(uid, `select ${cols} from firm_branding where firm_id = $1`, [firm]);
        return route.fulfill(json(single ? rows[0] ?? null : rows));
      }
      const body = [].concat(request.postDataJSON())[0];
      const keys = Object.keys(body);
      await asUser(uid, `insert into firm_branding (${keys.join(', ')}) values (${keys.map((k, i) => `$${i + 1}${k === 'theme' ? '::jsonb' : ''}`).join(', ')}) on conflict (firm_id) do update set ${keys.filter((k) => k !== 'firm_id').map((k) => `${k} = excluded.${k}`).join(', ')}`, keys.map((k) => (k === 'theme' && body[k] !== null ? JSON.stringify(body[k]) : body[k])));
      return route.fulfill(json(null, 201));
    }
    if (table === 'error_alert_settings') {
      if (method === 'GET') { const rows = await asUser(uid, `select in_app_enabled, email_enabled, email_recipients, realert_hours from error_alert_settings`); return route.fulfill(json(single ? rows[0] ?? null : rows)); }
      const b = request.postDataJSON();
      await asUser(uid, `update error_alert_settings set in_app_enabled = $1, email_enabled = $2, email_recipients = $3, realert_hours = $4`, [b.in_app_enabled, b.email_enabled, b.email_recipients, b.realert_hours]);
      return route.fulfill(json(null, 204));
    }
    if (table === 'error_alerts') {
      const rows = await asUser(uid, `select a.id, a.group_id, a.severity, a.channel, a.delivery_status, a.reason, a.created_at, jsonb_build_object('message', g.message, 'module', g.module) as error_groups from error_alerts a join error_groups g on g.id = a.group_id order by a.created_at desc limit 30`);
      return route.fulfill(json(rows));
    }
    if (table === 'tasks' && method === 'GET' && process.env.BREAK_TASKS) return route.fulfill(json({ code: '42703', message: 'column tasks.sla_due_at does not exist', details: null, hint: null }, 400));
    if (method === 'HEAD') return route.fulfill({ status: 200, headers: { 'content-range': '*/0' } });
    return route.fulfill(json(single ? null : [], single && method === 'GET' ? 200 : 200));
  } catch (e) {
    return route.fulfill(pgError(e));
  }
};

// ---------- browser ----------
const browser = await chromium.launch({ channel: 'msedge' });
const results = [];
const check = (name, fn) => fn().then(() => { results.push(['PASS', name]); console.log('PASS', name); }, (e) => { results.push(['FAIL', name, e.message.split('\n')[0]]); console.log('FAIL', name, '\n   ', e.message.split('\n').slice(0, 14).join('\n    ')); });

const open = async (authId, email, tab, viewport = { width: 1440, height: 900 }) => {
  const context = await browser.newContext({ viewport });
  const profile = (await admin(`select id from users where auth_id = $1`, [authId]))[0];
  await context.addInitScript(([key, value, id, tab]) => {
    localStorage.setItem(key, value);
    localStorage.setItem(`caath-onboarding-hidden-${id}`, 'true');
    localStorage.setItem(`caath-onboarding-completed-${id}`, 'true');
    localStorage.setItem('caath-cookie-consent', 'accepted'); localStorage.setItem('caath_cookie_consent', 'accepted');
    if (tab) sessionStorage.setItem(`caath:last-tab:${id}`, tab);
  }, [`sb-${REF}-auth-token`, JSON.stringify(session(authId, email)), profile.id, tab]);
  await context.route(`${SUPA}/**`, handle);
  await context.route('**/api/health', (route) => route.fulfill(json({ ok: true })));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${APP}/app`);
  await page.waitForSelector('aside', { timeout: 30000, state: 'attached' });
  await page.waitForTimeout(1200);
  const label = { tasks: 'Task Board', clients: 'Client Master', 'gst-filing-matrix': 'GST Filing Matrix', 'workspace-settings': 'Workspace Settings', help: 'Help Centre', 'system-health': 'System Health & Errors' }[tab];
  if (label) {
    await page.evaluate((text) => [...document.querySelectorAll('aside nav button')].find((b) => b.textContent.trim() === text)?.click(), label);
    await page.waitForTimeout(900);
  }
  return { context, page, errors };
};
const shot = (page, name) => page.screenshot({ path: new URL(`${name}.png`, SHOTS).pathname.slice(1) });
const rootState = (page) => page.evaluate(() => ({ theme: document.documentElement.dataset.brandTheme ?? null, mode: document.documentElement.dataset.brandMode ?? null, bg: getComputedStyle(document.documentElement).getPropertyValue('--color-matte-black').trim(), gold: getComputedStyle(document.documentElement).getPropertyValue('--color-gold').trim(), bodyBg: getComputedStyle(document.body).backgroundColor }));
const brandingRow = async () => (await admin(`select theme, logo_light_path, logo_dark_path from firm_branding where firm_id = $1`, [Z(91)]))[0];

const OWNER_A = [Z(12), 'owner-a@test.local'];
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" onload="window.__pwned=1"><script>window.__pwned=1</script><rect width="400" height="100" rx="12" fill="#2563EB"/><text x="200" y="64" font-size="44" font-family="Arial" font-weight="700" text-anchor="middle" fill="#fff">SHARMA</text></svg>`;

let a = await open(...OWNER_A, 'workspace-settings');
await check('default appearance is untouched when no theme is saved', async () => {
  const s = await rootState(a.page);
  assert.equal(s.theme, null); assert.equal(s.gold.toLowerCase(), '#d4af37');
  await a.page.getByRole('heading', { name: 'Appearance & Branding' }).waitFor();
  await shot(a.page, '01-settings-default');
});
await check('preset selection updates live preview without applying or saving', async () => {
  await a.page.getByRole('button', { name: /Midnight Navy/ }).click();
  assert.equal(await a.page.locator('#brand-button-hex').inputValue(), '#2563EB');
  assert.equal((await rootState(a.page)).theme, null, 'workspace not changed before opting in');
  assert.equal(await brandingRow(), undefined, 'nothing persisted');
});
await check('"try on whole workspace" previews, Cancel restores', async () => {
  await a.page.getByLabel(/Try these colours/).check();
  assert.equal((await rootState(a.page)).theme, 'midnight-navy');
  await a.page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal((await rootState(a.page)).theme, null);
  assert.equal(await brandingRow(), undefined);
});
await check('HEX input + colour picker edit a custom theme; unreadable contrast blocks Save', async () => {
  await a.page.getByRole('button', { name: /Charcoal \+ Violet/ }).click();
  await a.page.locator('#brand-primary-hex').fill('#1b1c21');
  await a.page.getByText(/Primary is hard to read on Background/).waitFor();
  assert.ok(await a.page.getByRole('button', { name: 'Save', exact: true }).isDisabled());
  await a.page.locator('#brand-primary-hex').fill('zzz'); await a.page.locator('#brand-primary-hex').blur();
  assert.equal(await a.page.locator('#brand-primary-hex').inputValue(), '#1B1C21', 'invalid HEX is rejected');
  await a.page.getByLabel('Primary colour picker').fill('#c4b5fd');
  assert.equal(await a.page.locator('#brand-primary-hex').inputValue(), '#C4B5FD');
  assert.ok(await a.page.getByRole('button', { name: 'Save', exact: true }).isEnabled());
  await a.page.getByText(/Custom theme/).waitFor();
});
await check('logo: malicious SVG is sanitised + rasterised, previewed before saving', async () => {
  await a.page.getByLabel('Upload logo for dark mode').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(SVG) });
  await a.page.getByText(/New logo \(\d+×\d+\) — not saved yet/).waitFor();
  assert.equal(await a.page.evaluate(() => window.__pwned), undefined);
  assert.equal(objects.size, 0, 'not uploaded before Save');
  await a.page.getByLabel('Upload logo for light mode').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await a.page.getByText('Please upload a PNG, JPG, WebP or SVG logo.').waitFor();
  await a.page.getByLabel('Upload logo for light mode').setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await a.page.getByText(/could not be read/).waitFor();
  await a.page.getByLabel('Upload logo for light mode').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024 * 1024 + 10) });
  await a.page.getByText('Logo must be smaller than 2 MB.').waitFor();
});
await check('Save persists theme + logo for this organisation only', async () => {
  await a.page.getByRole('button', { name: /Midnight Navy/ }).click();
  await a.page.getByRole('button', { name: 'Save', exact: true }).click();
  await a.page.getByText('Branding saved').waitFor();
  const row = await brandingRow();
  assert.equal(row.theme.preset, 'midnight-navy'); assert.match(row.logo_dark_path, new RegExp(`^${Z(91)}/workspace-logo-dark\\.(webp|png)$`));
  const stored = objects.get(`firm-branding/${row.logo_dark_path}`);
  assert.match(stored.type, /image\/(webp|png)/); assert.ok(stored.body.length > 200 && stored.body.length < 200_000);
  assert.ok(!stored.body.toString('latin1').includes('<script'), 'stored asset is a bitmap, not SVG');
  assert.equal((await admin(`select count(*)::int c from firm_branding`))[0].c, 1);
  const s = await rootState(a.page); assert.equal(s.theme, 'midnight-navy'); assert.equal(s.bg, '#0B1220');
  await a.page.locator('aside img[alt$="logo"]').waitFor();
  await shot(a.page, '02-settings-navy-saved');
});
await a.context.close();

a = await open(...OWNER_A, 'dashboard');
await check('saved branding loads after sign-in (reload) across the workspace', async () => {
  const s = await rootState(a.page);
  assert.equal(s.theme, 'midnight-navy'); assert.equal(s.gold, '#5B9BFF'); assert.equal(s.bodyBg, 'rgb(11, 18, 32)');
  const dims = await a.page.locator('aside img[alt$="logo"]').evaluate((img) => ({ w: img.naturalWidth, h: img.naturalHeight }));
  assert.ok(Math.abs(dims.w / dims.h - 4) < 0.05, `aspect ratio preserved (${dims.w}x${dims.h})`); assert.ok(dims.w <= 640 && dims.h <= 240);
  assert.equal(await a.page.locator('aside').evaluate((el) => getComputedStyle(el).backgroundColor), 'rgb(14, 23, 41)');
  await shot(a.page, '03-dashboard-navy');
  assert.deepEqual(a.errors, []);
});
await a.context.close();

let s3 = await open(Z(13), 'staff-a@test.local', 'tasks');
await check('staff of the same organisation see the branding but cannot change it', async () => {
  assert.equal((await rootState(s3.page)).theme, 'midnight-navy');
  assert.equal(await s3.page.getByText('Workspace Settings').count(), 0);
  const denied = await s3.page.evaluate(async ([url, ref, firm]) => {
    const token = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`)).access_token;
    const r = await fetch(`${url}/rest/v1/firm_branding`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ firm_id: firm, theme: null }) });
    const up = await fetch(`${url}/storage/v1/object/firm-branding/${firm}/workspace-logo-dark.png`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'image/png' }, body: 'x' });
    return [r.status, up.status];
  }, [SUPA, REF, Z(91)]);
  assert.deepEqual(denied, [403, 400]);
  assert.equal((await brandingRow()).theme.preset, 'midnight-navy');
});

let b = await open(Z(14), 'owner-b@test.local', 'workspace-settings');
await check('organisation switching: another organisation gets its own (default) branding and no foreign logo', async () => {
  const s = await rootState(b.page);
  assert.equal(s.theme, null); assert.equal(s.gold.toLowerCase(), '#d4af37');
  assert.equal(await b.page.locator('aside img[alt$="logo"]').count(), 0);
  const leak = await b.page.evaluate(async ([url, ref, firm]) => {
    const token = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`)).access_token;
    const r = await fetch(`${url}/rest/v1/firm_branding?select=theme&firm_id=eq.${firm}`, { headers: { authorization: `Bearer ${token}` } });
    return r.json();
  }, [SUPA, REF, Z(91)]);
  assert.deepEqual(leak, []);
});
await b.context.close();

a = await open(...OWNER_A, 'workspace-settings');
await check('Light Mode saves and renders readable text', async () => {
  await a.page.getByRole('button', { name: 'Light', exact: true }).click();
  await a.page.getByRole('button', { name: 'Save', exact: true }).click();
  await a.page.getByText('Branding saved').waitFor();
  const s = await rootState(a.page); assert.equal(s.mode, 'light'); assert.equal(s.bodyBg, 'rgb(244, 246, 251)');
  const heading = await a.page.getByRole('heading', { name: 'Appearance & Branding' }).evaluate((el) => getComputedStyle(el).color);
  assert.equal(heading, 'rgb(15, 23, 42)');
  const btn = await a.page.getByRole('button', { name: 'Save', exact: true }).evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color, getComputedStyle(el).backgroundImage]);
  assert.deepEqual(btn, ['rgb(37, 99, 235)', 'rgb(255, 255, 255)', 'none']);
  await shot(a.page, '04-settings-light');
});
await a.context.close();
for (const [tab, name] of [['dashboard', '05-dashboard-light'], ['clients', '06-clients-light'], ['gst-filing-matrix', '07-gst-light']]) {
  const p = await open(...OWNER_A, tab); await shot(p.page, name);
  await check(`light mode renders ${tab} without page errors`, async () => assert.deepEqual(p.errors, []));
  await p.context.close();
}
a = await open(...OWNER_A, 'workspace-settings', { width: 390, height: 844 });
await check('branding settings usable on mobile (no horizontal overflow)', async () => {
  await a.page.getByRole('heading', { name: 'Appearance & Branding' }).scrollIntoViewIfNeeded();
  const overflow = await a.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `overflow ${overflow}px`);
  await shot(a.page, '08-settings-mobile');
});
await a.context.close();
a = await open(...OWNER_A, 'workspace-settings');
await check('logo removal and Reset to Default restore the CAATH identity', async () => {
  await a.page.getByRole('button', { name: 'Remove' }).click();
  await a.page.getByText('Will be removed when you save.').waitFor();
  await a.page.getByRole('button', { name: 'Reset to Default' }).click();
  await a.page.getByRole('button', { name: 'Save', exact: true }).click();
  await a.page.getByText('Branding saved').waitFor();
  const row = await brandingRow(); assert.equal(row.theme, null); assert.equal(row.logo_dark_path, null);
  assert.equal([...objects.keys()].filter((k) => k.includes('workspace-logo')).length, 0);
  const s = await rootState(a.page); assert.equal(s.theme, null); assert.equal(s.gold.toLowerCase(), '#d4af37');
  assert.equal(await a.page.locator('aside img[alt$="logo"]').count(), 0);
  await a.page.getByText('CAATH OS').first().waitFor();
});
await a.context.close();

// ---------- error monitoring ----------
process.env.BREAK_TASKS = '1';
await check('uncaught errors, promise rejections and failed database calls are reported automatically', async () => {
  await s3.page.reload(); await s3.page.waitForSelector('aside', { state: 'attached' }); await s3.page.waitForTimeout(1500); await s3.page.evaluate(() => [...document.querySelectorAll('aside nav button')].find((b) => b.textContent.trim() === 'Task Board')?.click());
  await s3.page.evaluate(() => {
    setTimeout(() => { throw new TypeError('Cannot read properties of undefined (reading \'gstin\') for jane@example.com'); }, 0);
    for (let i = 0; i < 12; i += 1) Promise.reject(new Error('Reconciliation worker failed for batch ' + i));
    Promise.reject({ name: 'AbortError', message: 'user cancelled' });
  });
  await s3.page.waitForTimeout(5500);
  const groups = await admin(`select error_type, module, severity, message, error_code, occurrence_count::int as n, last_browser from error_groups order by message`);
  console.log(groups.map((g) => `    [${g.error_type}/${g.module}/${g.severity}] x${g.n} ${g.message}`).join('\n'));
  assert.ok(groups.some((g) => g.error_type === 'database' && g.error_code === '42703' && /tasks/.test(g.message)), 'schema drift captured from the Supabase client');
  const typeErr = groups.find((g) => /Cannot read properties/.test(g.message)); assert.ok(typeErr); assert.ok(!typeErr.message.includes('jane@')); assert.equal(typeErr.severity, 'High'); assert.match(typeErr.last_browser, /Edge|Chrome/);
  const rej = groups.find((g) => /Reconciliation worker/.test(g.message)); assert.equal(rej.n, 12, 'twelve repeats collapse into one grouped report');
  assert.ok(!groups.some((g) => /cancelled/.test(g.message)));
  assert.ok(reportCalls.length <= 2, `batched: ${reportCalls.length} RPC call(s)`);
  const occ = await admin(`select distinct firm_id, user_id from error_occurrences`); assert.deepEqual(occ, [{ firm_id: Z(91), user_id: Z(3) }]);
});
await check('a React render crash shows a safe recovery screen (no stack) and is reported as High', async () => {
  // Force a render-time exception by corrupting a prop the sidebar reads on its next render.
  await s3.page.evaluate(() => { const proto = Array.prototype; const original = proto.map; const until = Date.now() + 1500; proto.map = function (...args) { if (Date.now() < until && this.length && this[0] && typeof this[0].label === 'string' && Array.isArray(this[0].items)) { throw new Error('Sidebar render exploded at C:/secret/path token=abc123456'); } return original.apply(this, args); }; });
  await s3.page.locator('aside nav button').nth(1).click();
  await s3.page.getByText('Something went wrong while displaying this screen').waitFor({ timeout: 8000 });
  assert.equal(await s3.page.getByText('Sidebar render exploded').count(), 0, 'internal message is not shown to the user');
  await shot(s3.page, '09-error-boundary');
  await s3.page.waitForTimeout(16500);
  const g = (await admin(`select severity, error_type, stack, message from error_groups where message like '%Sidebar render exploded%'`))[0];
  assert.ok(g, 'boundary crash reported'); assert.equal(g.error_type, 'react'); assert.equal(g.severity, 'High'); assert.ok(!g.message.includes('abc123456')); assert.ok(g.stack && g.stack.length > 50);
});
await s3.context.close();
delete process.env.BREAK_TASKS;
await check('non-GodAdmin cannot read error data or call GodAdmin functions from the browser', async () => {
  const p = await open(Z(13), 'staff-a@test.local', 'tasks');
  const out = await p.page.evaluate(async ([url, ref]) => {
    const token = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`)).access_token;
    const call = (fn, body = {}) => fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.status);
    return [await call('error_monitor_stats'), await call('error_monitor_list'), await call('firm_error_summary')];
  }, [SUPA, REF]);
  assert.deepEqual(out, [403, 403, 403]);
  await p.context.close();
});
a = await open(...OWNER_A, 'help');
await check('workspace admin sees own-organisation issues without stack traces', async () => {
  await a.page.getByRole('heading', { name: 'Technical issues in your workspace' }).scrollIntoViewIfNeeded();
  await a.page.getByText(/ERR-[0-9A-F]{8}/).first().waitFor();
  assert.equal(await a.page.getByText(/at .*\.tsx?:\d+/).count(), 0);
  await shot(a.page, '10-workspace-issues');
});
await a.context.close();

await admin(`select public.report_errors($1::jsonb)`, ['[]']).catch(() => {});
// Seed a little history so the trend has more than one day (direct SQL; test data only).
await admin(`insert into error_occurrences (group_id, firm_id, user_id, day, count) select id, '${Z(92)}', '${Z(4)}', error_monitor_private.today() - d, 2 + d from error_groups, generate_series(1, 9) d where error_type = 'database'`);
let g = await open(Z(11), 'god@test.local', 'system-health');
await check('GodAdmin dashboard shows platform-wide totals, breakdowns and trend', async () => {
  await g.page.getByRole('heading', { name: 'System Health & Error Monitoring' }).waitFor();
  await g.page.getByText('Recent error activity').waitFor();
  await g.page.getByRole('row', { name: /tasks/ }).first().waitFor();
  const tiles = await g.page.locator('p.tabular-nums.text-2xl').allInnerTexts();
  assert.equal(tiles.length, 5); assert.ok(Number(tiles[0].replace(/,/g, '')) >= 14, tiles.join('|'));
  await g.page.getByRole('button', { name: /Sharma & Associates/ }).waitFor(); await g.page.getByRole('button', { name: /Mehta Tax Consultants/ }).waitFor();
  await shot(g.page, '11-godadmin-errors');
  assert.deepEqual(g.errors, []);
});
await check('filters narrow the list (organisation, severity, search by reference)', async () => {
  const total = async () => Number((await g.page.getByText(/^\d+ issues?$/).innerText()).split(' ')[0]);
  const all = await total();
  await g.page.getByLabel('Organisation').selectOption({ label: 'Mehta Tax Consultants' });
  await g.page.waitForTimeout(700); assert.equal(await total(), 2);
  await g.page.getByRole('button', { name: 'Clear filters' }).click(); await g.page.waitForTimeout(700); assert.equal(await total(), all);
  await g.page.getByLabel('Severity').selectOption('Low'); await g.page.waitForTimeout(700);
  await g.page.getByText('No errors match these filters.').waitFor();
  await g.page.getByRole('button', { name: 'Clear filters' }).click();
  await g.page.getByRole('searchbox', { name: 'Search' }).fill('Reconciliation'); await g.page.waitForTimeout(1200); assert.equal(await total(), 1);
  await g.page.getByRole('searchbox', { name: 'Search' }).fill(''); await g.page.waitForTimeout(1200);
});
await check('investigation workflow: open, inspect stack, note, assign, resolve, history', async () => {
  await g.page.getByRole('row', { name: /Cannot read properties/ }).click();
  const dialog = g.page.getByRole('dialog');
  await dialog.getByText('Stack trace').waitFor();
  await dialog.getByText('Sharma & Associates').waitFor();
  assert.ok((await dialog.locator('pre').innerText()).length > 20);
  await dialog.getByLabel('Add an internal note').fill('Null GSTIN on legacy client rows — guard added in ClientProfile.');
  await dialog.getByRole('button', { name: 'Add note' }).click();
  await dialog.getByText('Null GSTIN on legacy client rows').waitFor();
  await dialog.getByLabel('Assigned to').selectOption({ label: 'Platform Admin' });
  await dialog.getByText('Assignment: Unassigned → Platform Admin').waitFor();
  await dialog.getByLabel('Status').selectOption('Investigating');
  await dialog.getByText('Status: New → Investigating').waitFor();
  await shot(g.page, '12-godadmin-detail');
  await dialog.getByRole('button', { name: /Mark as resolved/ }).click();
  await dialog.getByText('Status: Investigating → Resolved').waitFor();
  const row = (await admin(`select status, assigned_to, resolved_by from error_groups where message like 'TypeError: Cannot read%'`))[0];
  assert.deepEqual(row, { status: 'Resolved', assigned_to: Z(1), resolved_by: Z(1) });
  await g.page.keyboard.press('Escape');
  assert.equal(await g.page.getByRole('dialog').count(), 0);
});
await check('alerts: High/Critical raise one in-app alert each; history and channel settings work', async () => {
  await g.page.getByRole('tab', { name: 'Alerts' }).click();
  await g.page.getByText('Notification history').waitFor();
  const alerts = await admin(`select a.severity, a.channel, a.group_id::text as message from error_alerts a join error_groups g on g.id = a.group_id`);
  const notes = await admin(`select title, priority, audience_role from notifications`);
  assert.ok(alerts.length >= 2 && alerts.every((x) => x.channel === 'in_app')); assert.equal(notes.length, alerts.length); assert.ok(notes.every((n) => n.audience_role === 'GodAdmin'));
  assert.equal(new Set(alerts.map((x) => x.message)).size, alerts.length, 'no duplicate alert for the same issue');
  await g.page.getByLabel(/^Email/).first().check();
  await g.page.getByLabel(/Email recipients/).fill('ops@caath.test, bad-address');
  await g.page.getByRole('button', { name: 'Save alert settings' }).click();
  await g.page.getByText('Enter valid email addresses').waitFor();
  await g.page.getByLabel(/Email recipients/).fill('ops@caath.test');
  await g.page.getByRole('button', { name: 'Save alert settings' }).click();
  await g.page.getByText('Alert settings saved').waitFor();
  assert.deepEqual((await admin(`select email_enabled, email_recipients from error_alert_settings`))[0], { email_enabled: true, email_recipients: ['ops@caath.test'] });
  await shot(g.page, '13-godadmin-alerts');
});
await check('system health view runs live checks and shows 24h failures by area', async () => {
  await g.page.getByRole('tab', { name: 'System health' }).click();
  await g.page.getByText('Live service checks').waitFor();
  await g.page.getByText('Operational').first().waitFor();
  await g.page.getByText(/\d+ failures?/).first().waitFor();
  await shot(g.page, '14-godadmin-health');
});
await g.context.close();
g = await open(Z(11), 'god@test.local', 'system-health', { width: 390, height: 844 });
await check('error dashboard usable on mobile', async () => {
  await g.page.getByText('Recent error activity').waitFor();
  const overflow = await g.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `overflow ${overflow}px`);
  await shot(g.page, '15-godadmin-mobile');
});
await g.context.close();
await browser.close();
const failed = results.filter((r) => r[0] === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`);
process.exit(failed.length ? 1 : 0);
