import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canAccessVault,canManageVault,hasRecentAuthentication} from '../supabase/functions/portal-secrets/policy.ts';
import {encryptSecret,decryptSecret} from '../supabase/functions/portal-secrets/crypto.ts';
test('vault role, firm and assignment boundaries',()=>{
 const row={firm_id:'firm-a',assigned_to:'staff-a'};
 for(const role of ['Client','GodAdmin','Unknown']) assert.equal(canAccessVault({id:'staff-a',firm_id:'firm-a',role},row),false);
 assert.equal(canAccessVault({id:'staff-a',firm_id:'firm-a',role:'Staff'},row),true);
 assert.equal(canAccessVault({id:'staff-b',firm_id:'firm-a',role:'Staff'},row),false);
 assert.equal(canAccessVault({id:'admin',firm_id:'firm-b',role:'SuperAdmin'},row),false);
 assert.equal(canAccessVault({id:'admin',firm_id:'firm-a',role:'Admin'},row),true);
 assert.equal(canManageVault({id:'staff-a',firm_id:'firm-a',role:'Staff'}),false);
});
test('refresh/iat alone never satisfies recent authentication',()=>{
 const token=(p:object)=>'header.'+btoa(JSON.stringify(p))+'.signature';
 assert.equal(hasRecentAuthentication(token({iat:1000}),1000),false);
 assert.equal(hasRecentAuthentication(token({amr:[{method:'password',timestamp:600}]}),1000),false);
 assert.equal(hasRecentAuthentication(token({amr:[{method:'password',timestamp:900}]}),1000),true);
 assert.equal(hasRecentAuthentication(token({amr:[{method:'password',timestamp:2000}]}),1000),false);
 assert.equal(hasRecentAuthentication('invalid',1000),false);
});
test('encryption binds firm, client, record and field and supports key rotation',async()=>{
 const key=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
 const next=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
 const c={id:'row1',firm_id:'firm-a',client_id:'client-a',field:'password' as const};
 const one=await encryptSecret('synthetic-secret',key,'1',c);
 const two=await encryptSecret('synthetic-secret',key,'1',c);
 assert.notEqual(one,two);
 assert.equal(await decryptSecret(one,{'1':key,'2':next},'2',c),'synthetic-secret');
 for(const change of [{id:'row2'},{firm_id:'firm-b'},{client_id:'client-b'},{field:'username' as const}]) await assert.rejects(decryptSecret(one,{'1':key},'1',{...c,...change}));
 await assert.rejects(decryptSecret(one,{'2':next},'2',c));
});

test('legacy ciphertext remains readable after a versioned key rotation',async()=>{
 const keyBytes=crypto.getRandomValues(new Uint8Array(32));
 const raw=btoa(String.fromCharCode(...keyBytes));
 const key=await crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['encrypt']);
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode('legacy synthetic secret')));
 const payload=new Uint8Array(iv.length+cipher.length);payload.set(iv);payload.set(cipher,iv.length);
 assert.equal(await decryptSecret(btoa(String.fromCharCode(...payload)),{legacy:raw,'2':btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))},'2',{id:'old',firm_id:'firm',client_id:'client',field:'password'}),'legacy synthetic secret');
});
