import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createWebhookHandler} from '../api/cashfree-webhook.ts';
import {readRawBody} from '../server/cashfree.ts';
import {Readable} from 'node:stream';

test('webhook validates signature/time/currency/amount and ignores failed attempts',async()=>{
 const now=Date.now(); const timestamp=String(now); let paid=0; let lookups=0;
 const order={id:'order',currency:'INR',total_amount:1499,status:'PAID'};
 let event={data:{order:{order_id:'reference',order_currency:'INR',order_amount:1499},payment:{payment_status:'SUCCESS',payment_amount:1499,payment_currency:'INR',cf_payment_id:'payment-1'}}};
 let raw=JSON.stringify(event);
 const db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{lookups++;return {data:order,error:null};}})})})};
 const handler=createWebhookHandler({getServiceClient:()=>db as any,markOrderPaid:async()=>{paid++;return {} as any;},readRawBody:async()=>raw,requireCashfreeConfiguration:()=>({appId:'test',secretKey:'test-secret'}),now:()=>now});
 const call=async(time=timestamp,signature?:string)=>{
  let status=0; const res={set statusCode(n:number){status=n;},setHeader(){},end(){}};
  await handler({method:'POST',headers:{'x-webhook-timestamp':time,'x-webhook-signature':signature??createHmac('sha256','test-secret').update(time+raw).digest('base64')}} as any,res as any);return status;
 };
 assert.equal(await call(timestamp,'forged'),401);assert.equal(lookups,0);
 assert.equal(await call(String(now-300001)),401);assert.equal(lookups,0);
 assert.equal(await call(String(now+300001)),401);
 assert.equal(await call(),200);assert.equal(paid,1);
 event.data.payment.payment_status='FAILED';raw=JSON.stringify(event);assert.equal(await call(),200);assert.equal(paid,1);
 event.data.payment.payment_status='USER_DROPPED';raw=JSON.stringify(event);assert.equal(await call(),200);assert.equal(paid,1);
 event.data.payment.payment_status='SUCCESS';event.data.payment.payment_amount=1;raw=JSON.stringify(event);assert.equal(await call(),422);assert.equal(paid,1);
 event.data.payment.payment_amount=1499;event.data.payment.payment_currency='USD';raw=JSON.stringify(event);assert.equal(await call(),422);assert.equal(paid,1);
});
test('raw payment body has a hard size bound',async()=>{
 assert.equal(await readRawBody(Readable.from(['abc']) as any),'abc');
 await assert.rejects(readRawBody(Readable.from([Buffer.alloc(262145)]) as any),/too large/);
});
