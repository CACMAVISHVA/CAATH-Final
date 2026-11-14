import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNoticeIntakeHandler } from '../supabase/functions/notice-intake/handler.ts';
const token = 'a'.repeat(64);
function mock(active=true, valid=true) {
  const calls: { method: string; values: any }[] = [];
  const admin = { from(table: string) { const query = { select() { return query; }, eq() { return query; }, async maybeSingle() { return {data:valid ? {source_id:'source'} : null}; }, async single() {return {data:{id:'source',firm_id:'server-firm',active}};}, update(values: unknown) { calls.push({method:'update',values}); return {async eq(){return {error:null};}}; } };return query;}, async rpc(method: string,values: unknown) {calls.push({method,values});return {data:{id:'inbox',matched:true,duplicate:false},error:null};} };
  return {handler:createNoticeIntakeHandler(()=>admin),calls};
}
const request=(body: unknown, auth=token) => new Request('https://example.test/intake',{method:'POST',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('webhook rejects unauthenticated and revoked credentials',async()=>{assert.equal((await mock().handler(request({},'bad'))).status,401);assert.equal((await mock(true,false).handler(request({}))).status,401);});
test('paused source rejects intake',async()=>{assert.equal((await mock(false).handler(request({}))).status,403);});
test('source context is server derived; caller firm/client cannot override it',async()=>{const m=mock();const response=await m.handler(request({externalId:'e1',subject:'GST Notice',body:'33ABCDE1234F1Z5',firm_id:'attacker',client_id:'attacker'}));assert.equal(response.status,200);assert.equal(m.calls[0].values.p_source,'source');assert.deepEqual(m.calls[0].values.p_identifiers,['33ABCDE1234F1Z5']);assert.equal('firm_id' in m.calls[0].values,false);});
test('missing identifiers creates reviewable intake rather than guessing',async()=>{const m=mock();assert.equal((await m.handler(request({externalId:'e',subject:'Notice attached',body:''}))).status,200);assert.deepEqual(m.calls[0].values.p_identifiers,[]);});
test('invalid dates and large streamed bodies are rejected',async()=>{assert.equal((await mock().handler(request({externalId:'e',subject:'GST',deadline:'2026-02-30'}))).status,400);assert.equal((await mock().handler(request({body:'x'.repeat(70000)}))).status,413);});
test('heartbeat updates source check independently of event arrivals',async()=>{const m=mock();assert.equal((await m.handler(request({operation:'check_complete'}))).status,200);assert.ok(m.calls[0].values.last_checked_at);assert.equal(m.calls[0].values.last_error,null);});
