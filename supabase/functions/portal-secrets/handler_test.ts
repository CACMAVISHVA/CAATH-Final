import { createVaultHandler } from './handler.ts';
import { createSupabaseClients, allowedOrigin, withCors } from '../_shared/security.ts';
import { encryptSecret } from './crypto.ts';
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const credentialId='81000000-0000-4000-8000-000000000001';
const clientId='82000000-0000-4000-8000-000000000001';
const firmId='83000000-0000-4000-8000-000000000001';
const actorId='84000000-0000-4000-8000-000000000001';
async function setup(role='SuperAdmin') {
 const key=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
 Deno.env.set('PORTAL_MASTER_KEY',key);
 const context={id:credentialId,firm_id:firmId,client_id:clientId};
 const state={actor:{id:actorId,name:'Synthetic',role,firm_id:firmId,status:'Active',deleted_at:null},
  row:{...context,assigned_to:actorId,portal_name:'Synthetic portal',portal_type:'GST',portal_url:'https://www.gst.gov.in/',username_masked:'sy***',security_notes:'not public',encrypted_password:await encryptSecret('synthetic-password',key,'1',{...context,field:'password'}),encrypted_username:await encryptSecret('synthetic-user',key,'1',{...context,field:'username'})},
  auditFailure:false,firmStatus:'Active',rateAllowed:true,mutations:[] as {table:string;operation:string;value:Record<string,unknown>}[],filters:[] as [string,string,unknown][]};
 const admin={
  rpc:async()=>({data:state.rateAllowed,error:null}),
  from:(table:string)=>{
   let operation='select';let value:Record<string,unknown>={};
   const result=()=>{
    if(table==='users')return {data:state.actor,error:null};
    if(table==='firms')return {data:{status:state.firmStatus},error:null};
    if(table==='clients')return {data:{id:clientId,firm_id:firmId},error:null};
    if(table==='audit_logs')return {data:null,error:state.auditFailure?{message:'simulated audit failure'}:null};
    return {data:operation==='insert'?{...state.row,...value}:state.row,error:null};
   };
   const query={select:()=>query,eq:(name:string,v:unknown)=>{state.filters.push([table,name,v]);return query;},is:()=>query,in:()=>query,
    insert:(v:Record<string,unknown>[])=>{operation='insert';value=v[0];state.mutations.push({table,operation,value});return query;},
    update:(v:Record<string,unknown>)=>{operation='update';value=v;state.mutations.push({table,operation,value});return query;},
    delete:()=>{operation='delete';state.mutations.push({table,operation,value});return query;},
    maybeSingle:async()=>result(),single:async()=>result(),order:async()=>({data:[state.row],error:null}),
    then:(resolve:(v:ReturnType<typeof result>)=>unknown)=>Promise.resolve(result()).then(resolve)};
   return query;
  }
 };
 const handler=createVaultHandler(()=>({caller:{auth:{getUser:async()=>({data:{user:{id:'auth-synthetic'}},error:null})}},admin}) as unknown as ReturnType<typeof createSupabaseClients>);
 const call=async(action:string,fields:Record<string,unknown>={},fresh=true)=>{
  const token='x.'+btoa(JSON.stringify({amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)-(fresh?1:600)}]}))+'.x';
  const response=await handler(new Request('https://preview.invalid/portal-secrets',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,credentialId,clientId,...fields})}));
  return {status:response.status,body:await response.json()};
 };
 return {state,call};
}
Deno.test('client and platform roles cannot read, touch or reveal vault records',async()=>{
 for(const role of ['Client','GodAdmin']){
  const {call}=await setup(role);
  for(const action of ['list','get','touch_login','touch_filing','reveal'])assert((await call(action)).status===403,role+' '+action+' accepted');
 }
});
Deno.test('unassigned and other-firm staff cannot access an individual credential',async()=>{
 const {state,call}=await setup('Staff');state.row.assigned_to='someone-else';
 for(const action of ['get','reveal','touch_login','update','delete'])assert((await call(action)).status===403,'Unassigned '+action+' accepted');
 state.row.assigned_to=actorId;state.row.firm_id='another-firm';assert((await call('get')).status===403,'Cross-firm read accepted');
});
Deno.test('list filters both client and staff assignment',async()=>{
 const {state,call}=await setup('Staff');assert((await call('list')).status===200,'List failed');
 for(const [column,value] of [['client_id',clientId],['firm_id',firmId],['assigned_to',actorId]])assert(state.filters.some(([table,k,v])=>table==='portal_credentials'&&k===column&&v===value),'Missing filter '+column);
});
Deno.test('get returns safe metadata only and inactive firms are denied',async()=>{
 const {state,call}=await setup();const r=await call('get');assert(r.status===200,'Get failed');
 assert(!('encrypted_password' in r.body.data)&&!('encrypted_username' in r.body.data)&&!('security_notes' in r.body.data),'Sensitive field returned');
 state.firmStatus='Suspended';assert((await call('get')).status===403,'Suspended firm accepted');
});
Deno.test('create stores validated client ID and staff cannot mutate credentials',async()=>{
 const {state,call}=await setup();const r=await call('create',{portalName:'Synthetic',username:'synthetic-user',password:'synthetic-password',portalUrl:'https://www.gst.gov.in/'});
 assert(r.status===200,'Create failed');assert(state.mutations.some(m=>m.table==='portal_credentials'&&m.value.client_id===clientId),'Missing client ID');
 const staff=await setup('Staff');for(const action of ['create','update','delete','touch_filing'])assert((await staff.call(action)).status===403,'Staff mutation accepted');
});
Deno.test('reveal requires reason and recent auth and fails closed when audit fails',async()=>{
 const {state,call}=await setup('Staff');
 assert((await call('reveal')).status===400,'Missing reason accepted');
 assert((await call('reveal',{reason:'Synthetic notice response'},false)).status===403,'Old authentication accepted');
 state.auditFailure=true;const failed=await call('reveal',{reason:'Synthetic notice response'});
 assert(failed.status===503&&!JSON.stringify(failed.body).includes('synthetic-password'),'Unaudited plaintext returned');
 state.auditFailure=false;const ok=await call('reveal',{reason:'Synthetic notice response'});assert(ok.status===200&&ok.body.data.password==='synthetic-password','Authorized reveal failed');
});
Deno.test('rate rejection and CORS deny arbitrary browser origins',async()=>{
 const {state,call}=await setup();state.rateAllowed=false;assert((await call('get')).status===429,'Rate limit ignored');
 let denied=false;try{allowedOrigin('https://attacker.invalid');}catch{denied=true;}assert(denied,'Arbitrary origin allowed');
 assert(withCors(new Response(),allowedOrigin('https://caath.in')).headers.get('Access-Control-Allow-Origin')==='https://caath.in','Production CORS missing');
});

Deno.test('audit failure prevents mutations and invalid dates are rejected',async()=>{
 const {state,call}=await setup();state.auditFailure=true;
 const r=await call('create',{portalName:'Synthetic',username:'synthetic-user',password:'synthetic-password',portalUrl:'https://www.gst.gov.in/'});
 assert(r.status===503&&!state.mutations.some(m=>m.table==='portal_credentials'),'Unaudited mutation accepted');
 state.auditFailure=false;
 for(const filingDate of ['invalid','2026-02-30','2026-99-99'])assert((await call('touch_filing',{filingDate})).status===400,'Invalid date accepted');
});
