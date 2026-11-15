// Verification script for the branding + error-monitoring work (November 2026).
// Not part of `npm test`: it needs an in-memory Postgres that is not a project dependency.
//   npm i --no-save @electric-sql/pglite
//   node tests/branding-monitoring/migrations.pglite.mjs
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const M = fileURLToPath(new URL('../../supabase/migrations/', import.meta.url));
const db = new PGlite();
const Z = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`;
await db.exec(`
create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
grant usage on schema auth to authenticated, anon; grant usage on schema public to authenticated, anon;
create table public.firms (id uuid primary key, name text, status text default 'Active');
create table public.users (id uuid primary key, auth_id uuid, firm_id uuid references public.firms(id), role text, name text, status text default 'Active', deleted_at timestamptz);
create table public.notifications (id uuid primary key default gen_random_uuid(), firm_id uuid, recipient_user_id uuid, audience_role text, title text not null, message text not null, status text not null default 'UNREAD', priority text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH','CRITICAL')), created_at timestamptz default now());
create function public.current_user_role() returns text language sql stable security definer set search_path='' as $$ select role from public.users where auth_id=auth.uid() and status='Active' and deleted_at is null limit 1 $$;
create function public.current_user_profile_id() returns uuid language sql stable security definer set search_path='' as $$ select id from public.users where auth_id=auth.uid() and status='Active' and deleted_at is null limit 1 $$;
create function public.current_user_firm_id() returns uuid language sql stable security definer set search_path='' as $$ select firm_id from public.users where auth_id=auth.uid() and status='Active' and deleted_at is null limit 1 $$;
create function public.is_god_admin() returns boolean language sql stable security definer set search_path='' as $$ select coalesce(public.current_user_role()='GodAdmin', false) $$;
insert into public.firms values ('${Z(91)}','Firm A'),('${Z(92)}','Firm B');
insert into public.users (id, auth_id, firm_id, role, name) values
 ('${Z(1)}','${Z(11)}',null,'GodAdmin','God'),
 ('${Z(2)}','${Z(12)}','${Z(91)}','SuperAdmin','Owner A'),
 ('${Z(3)}','${Z(13)}','${Z(91)}','Staff','Staff A'),
 ('${Z(4)}','${Z(14)}','${Z(92)}','SuperAdmin','Owner B'),
 ('${Z(5)}','${Z(15)}','${Z(92)}','Client','Client B');
`);
const fb = fs.readFileSync(M + '20260912190523_firm_invoice_branding.sql', 'utf8').split('INSERT INTO storage.buckets')[0];
await db.exec(fb);
await db.exec(fs.readFileSync(M + '20261115060000_workspace_branding_theme.sql', 'utf8'));
await db.exec(fs.readFileSync(M + '20261115061000_error_monitoring.sql', 'utf8'));
console.log('migrations applied');

const as = async (authId, fn) => {
  await db.exec(`set role authenticated; select set_config('test.uid', '${authId ?? ''}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('test.uid', '', false);`); }
};
const q = async (sql, params) => (await db.query(sql, params)).rows;
const fails = async (fn, re) => { let err; try { await fn(); } catch (e) { err = e; } assert.ok(err, 'expected failure'); if (re) assert.match(String(err.message), re); };
let n = 0; const ok = (name) => console.log(`ok ${++n} ${name}`);

// ---------- branding ----------
const theme = JSON.stringify({ preset: 'midnight-navy', mode: 'dark', colors: { primary: '#3B82F6', background: '#0B1220' } });
await as(Z(12), () => q(`insert into firm_branding (firm_id, theme) values ($1, $2)`, [Z(91), theme]));
ok('SuperAdmin saves own firm theme');
await fails(() => as(Z(13), () => q(`insert into firm_branding (firm_id, theme) values ($1, $2)`, [Z(91), theme])), /row-level security|duplicate/);
assert.equal((await as(Z(13), () => q(`update firm_branding set theme = null where firm_id = $1 returning firm_id`, [Z(91)]))).length, 0);
ok('Staff cannot write branding');
await fails(() => as(Z(12), () => q(`insert into firm_branding (firm_id, theme) values ($1, $2)`, [Z(92), theme])), /row-level security/);
assert.equal((await as(Z(14), () => q(`select * from firm_branding`))).length, 0);
assert.equal((await as(Z(13), () => q(`select * from firm_branding`))).length, 1);
ok('branding is tenant isolated (other firm cannot read or write)');
for (const bad of [{ colors: { primary: 'red;x' } }, { colors: { evil: '#000000' } }, { mode: 'neon' }, { extra: 1 }, { colors: { primary: '#12345' } }])
  await fails(() => as(Z(12), () => q(`update firm_branding set theme = $2 where firm_id = $1`, [Z(91), JSON.stringify(bad)])), /firm_branding_theme_valid/);
ok('invalid theme payloads rejected by constraint');
await fails(() => as(Z(12), () => q(`update firm_branding set logo_light_path = $2 where firm_id = $1`, [Z(91), `${Z(92)}/workspace-logo-light.png`])), /logo_light_scoped/);
await as(Z(12), () => q(`update firm_branding set logo_light_path = $2, logo_dark_path = $3 where firm_id = $1`, [Z(91), `${Z(91)}/workspace-logo-light.webp`, `${Z(91)}/workspace-logo-dark.png`]));
ok('logo paths must live in own firm folder');

// ---------- error reporting ----------
const ev = (o = {}) => ({ type: 'database', module: 'clients', severity: 'High', message: 'column clients.foo does not exist', code: '42703', frame: 'ClientMaster-AbC12345.js:10:22', stack: 'at x', route: '/app?token=abc', browser: 'Chrome 130 / Windows', ...o });
const report = (authId, events) => as(authId, async () => (await q(`select public.report_errors($1::jsonb) as r`, [JSON.stringify(events)]))[0].r);
await fails(() => report(null, [ev()]), /Authentication required/);
await db.exec(`set role anon;`); await fails(() => q(`select public.report_errors('[]'::jsonb)`), /permission denied/); await db.exec(`reset role;`);
ok('anonymous callers rejected');
let r = await report(Z(13), [ev()]);
assert.equal(r.accepted, 1); assert.match(r.references[0], /^ERR-[0-9A-F]{8}$/);
r = await report(Z(15), [ev({ frame: 'ClientMaster-Zz998877.js:99:1', message: 'column clients.foo does not exist' }), ev({ count: 3 })]);
let groups = await q(`select * from error_groups`);
assert.equal(groups.length, 1); assert.equal(Number(groups[0].occurrence_count), 5);
ok('identical errors across firms/builds group under one fingerprint');
let occ = await q(`select firm_id, user_id, count, route from error_occurrences order by count`);
assert.equal(occ.length, 2); assert.deepEqual(occ.map((o) => o.count), [1, 4]); assert.equal(occ[0].firm_id, Z(91)); assert.equal(occ[1].firm_id, Z(92)); assert.equal(occ[0].route, '/app');
ok('occurrences roll up per firm/user/day; identity taken from session; query string stripped');
let alerts = await q(`select * from error_alerts`); let notes = await q(`select * from notifications`);
assert.equal(alerts.length, 1); assert.equal(notes.length, 1); assert.equal(notes[0].audience_role, 'GodAdmin'); assert.equal(notes[0].priority, 'HIGH');
ok('High error alerts once, no duplicate notification on recurrence (Client reporter included)');
await report(Z(13), [ev({ module: 'Auth!!', type: 'weird', severity: 'nope', code: '', frame: 'f1',
  message: 'login failed password=Hunter2! for jane.doe@example.com token: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefgh PAN ABCDE1234F GSTIN 22ABCDE1234F1Z5 acct 123456789012',
  stack: 'Authorization: Bearer abcdefghijklmnop\n at f' })]);
const red = (await q(`select * from error_groups where module = 'auth'`))[0];
assert.ok(red, 'module sanitised'); assert.equal(red.error_type, 'unknown'); assert.equal(red.severity, 'Medium');
for (const secret of ['Hunter2', 'jane.doe', 'eyJhbGci', 'ABCDE1234F', '22ABCDE', '123456789012']) assert.ok(!red.message.includes(secret), `leaked ${secret}: ${red.message}`);
assert.ok(!red.stack.includes('abcdefghijklmnop'), red.stack);
ok('server redacts passwords, tokens, emails, PAN/GSTIN, long numbers: ' + red.message);
await report(Z(13), [ev({ message: 'minor glitch', code: 'X1', severity: 'Low', frame: 'g' })]);
await report(Z(13), [ev({ message: 'minor glitch', code: 'X1', severity: 'Low', frame: 'g', count: 12 })]);
let low = (await q(`select * from error_groups where error_code = 'X1'`))[0]; assert.equal(low.severity, 'Medium');
assert.equal((await q(`select count(*)::int c from error_alerts where group_id = $1`, [low.id]))[0].c, 0);
await report(Z(13), [ev({ message: 'minor glitch', code: 'X1', severity: 'Low', frame: 'g', count: 40 })]);
low = (await q(`select * from error_groups where error_code = 'X1'`))[0]; assert.equal(low.severity, 'High'); assert.equal(low.base_severity, 'Low');
assert.equal((await q(`select count(*)::int c from error_alerts where group_id = $1`, [low.id]))[0].c, 1);
await report(Z(13), [ev({ message: 'minor glitch', code: 'X1', severity: 'Low', frame: 'g', count: 40 })]);
assert.equal((await q(`select count(*)::int c from error_alerts where group_id = $1`, [low.id]))[0].c, 1);
ok('repetition escalates Low to Medium to High, alerting exactly once on reaching High');
await report(Z(12), [ev({ type: 'react', module: 'dashboard', severity: 'Critical', message: 'App crashed', code: 'REACT', frame: 'h' })]);
assert.equal((await q(`select priority from notifications where title like 'Critical%'`))[0].priority, 'CRITICAL');
ok('Critical error raises CRITICAL notification');
r = await report(Z(13), [null, 5, 'x', {}, { message: 'x'.repeat(5000), stack: 'y'.repeat(50000), count: 'abc' }]);
assert.equal(r.accepted, 2);
await fails(() => report(Z(13), { not: 'array' }), /Invalid error report/);
ok('malformed events skipped / truncated safely');

// ---------- access control ----------
for (const who of [Z(12), Z(13), Z(15)]) {
  for (const t of ['error_groups', 'error_occurrences', 'error_group_events', 'error_alerts', 'error_alert_settings'])
    assert.equal((await as(who, () => q(`select * from ${t}`))).length, 0, `${t} visible to non-god`);
  await fails(() => as(who, () => q(`select * from error_report_rate`)), /permission denied/);
  await fails(() => as(who, () => q(`insert into error_groups (fingerprint, error_type, severity, base_severity, message) values ('x','api','Low','Low','m')`)), /permission denied/);
  await fails(() => as(who, () => q(`update error_groups set status = 'Ignored'`)), /permission denied/);
  await fails(() => as(who, () => q(`delete from error_groups`)), /permission denied/);
  await fails(() => as(who, () => q(`select public.error_monitor_stats()`)), /Platform administration required/);
  await fails(() => as(who, () => q(`select public.error_monitor_list()`)), /Platform administration required/);
  await fails(() => as(who, () => q(`select public.error_group_detail($1)`, [low.id])), /Platform administration required/);
  await fails(() => as(who, () => q(`select public.error_group_update($1, 'Ignored')`, [low.id])), /Platform administration required/);
  assert.equal((await as(who, () => q(`update error_alert_settings set email_enabled = true returning *`))).length, 0);
  await fails(() => as(who, () => q(`select error_monitor_private.redact('x')`)), /permission denied/);
}
ok('non-GodAdmin roles cannot read, write or call GodAdmin RPCs (RLS + grants)');
const sumA = await as(Z(12), async () => (await q(`select public.firm_error_summary() as r`))[0].r);
const sumB = await as(Z(14), async () => (await q(`select public.firm_error_summary() as r`))[0].r);
assert.ok(sumA.length >= 3); assert.equal(sumB.length, 1); assert.ok(sumA.every((x) => !('stack' in x) && !('firm_id' in x)));
assert.ok(!sumB.some((x) => x.message.includes('minor glitch')));
await fails(() => as(Z(13), () => q(`select public.firm_error_summary()`)), /Workspace administration required/);
await fails(() => as(Z(15), () => q(`select public.firm_error_summary()`)), /Workspace administration required/);
ok('firm admins see only own-firm stack-free summary; Staff/Client denied');

// ---------- GodAdmin workflow ----------
const stats = await as(Z(11), async () => (await q(`select public.error_monitor_stats() as r`))[0].r);
assert.equal(stats.total_errors, 5 + 1 + 93 + 1 + 2); assert.equal(stats.errors_today, stats.total_errors); assert.equal(stats.critical_errors, 1);
assert.equal(stats.by_firm.length, 2); assert.equal(stats.trend.length, 1); assert.equal(stats.top_issues[0].errors, 93);
const statsB = await as(Z(11), async () => (await q(`select public.error_monitor_stats(p_firm => $1) as r`, [Z(92)]))[0].r);
assert.equal(statsB.total_errors, 4);
const list = await as(Z(11), async () => (await q(`select public.error_monitor_list(p_severity => 'High', p_limit => 1) as r`))[0].r);
assert.equal(list.total, 2); assert.equal(list.rows.length, 1);
const byRef = await as(Z(11), async () => (await q(`select public.error_monitor_list(p_search => $1) as r`, [r.references[0]]))[0].r);
assert.equal(byRef.total, 1);
ok('GodAdmin stats, filters, pagination and reference search');
let d = await as(Z(11), async () => (await q(`select public.error_group_update($1, p_status => 'Investigating', p_assignee => $2, p_note => 'Looking into schema drift') as r`, [groups[0].id, Z(1)]))[0].r);
assert.equal(d.group.status, 'Investigating'); assert.equal(d.group.assignee_name, 'God'); assert.equal(d.events.length, 3); assert.equal(d.firms.length, 2); assert.equal(d.affected_users, 2);
await fails(() => as(Z(11), () => q(`select public.error_group_update($1, p_assignee => $2)`, [groups[0].id, Z(2)])), /active platform administrator/);
d = await as(Z(11), async () => (await q(`select public.error_group_update($1, p_status => 'Resolved') as r`, [groups[0].id]))[0].r);
assert.ok(d.group.resolved_at); assert.equal(d.group.resolved_by, Z(1));
await report(Z(13), [ev()]);
d = await as(Z(11), async () => (await q(`select public.error_group_detail($1) as r`, [groups[0].id]))[0].r);
assert.equal(d.group.status, 'New'); assert.equal(d.events[0].kind, 'regression'); assert.equal(d.alerts.length, 2); assert.equal(d.alerts[0].reason, 'regression');
ok('investigate, assign, note, resolve, then automatic reopen on regression with history + re-alert');
await as(Z(11), () => q(`select public.error_group_update($1, p_status => 'Ignored')`, [groups[0].id]));
const before = (await q(`select count(*)::int c from error_alerts`))[0].c;
await report(Z(13), [ev({ count: 60 })]);
assert.equal((await q(`select count(*)::int c from error_alerts`))[0].c, before);
ok('ignored issues keep counting but never alert');
await as(Z(11), () => q(`update error_alert_settings set email_enabled = true, email_recipients = array['ops@example.com']`));
await report(Z(12), [ev({ type: 'api', module: 'billing', severity: 'Critical', message: 'payment webhook 500', code: '500', frame: 'p' })]);
assert.equal((await q(`select delivery_status from error_alerts where channel = 'email'`))[0].delivery_status, 'pending');
ok('email channel configurable; alerts queued as pending');
let limited = false; for (let i = 0; i < 8 && !limited; i++) limited = Boolean((await report(Z(15), Array.from({ length: 10 }, (_, k) => ev({ message: 'flood ' + 'abcdefghij'[k] })))).rate_limited);
assert.ok(limited);
assert.equal((await report(Z(13), [ev()])).accepted, 1);
ok('per-user rate limit (60 / 10 min) enforced without affecting other users');
await db.exec(`update error_occurrences set day = day - 120 where group_id = '${low.id}'; update error_groups set status='Resolved', last_seen_at = now() - interval '200 days' where id = '${low.id}'; select error_monitor_private.purge();`);
assert.equal((await q(`select count(*)::int c from error_groups where id = $1`, [low.id]))[0].c, 0);
ok('retention purge removes old roll-ups and long-closed issues');
console.log(`\nALL ${n} SQL CHECKS PASSED`);
