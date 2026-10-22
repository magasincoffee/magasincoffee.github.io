// End-to-end signed HS256 JWT/PostgREST tests against disposable PostgreSQL ONLY.
// No production URLs, auth keys, users or writes.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
const host=process.env.QA_POSTGREST_URL||'http://127.0.0.1:3000';
const secret=process.env.QA_JWT_SECRET;
assert.ok(secret?.length>=32,'Only synthetic local JWT signing key should be supplied.');
const u=id=>'00000000-0000-4000-8000-'+String(id).padStart(12,'0');
const store1=u(101),store2=u(102),store3=u(103),week='2026-10-26';
const base64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
function jwt(id,role='authenticated'){
 const message=base64({alg:'HS256',typ:'JWT'})+'.'+base64({sub:u(id),role,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});
 return message+'.'+createHmac('sha256',secret).update(message).digest('base64url');
}
async function call({subject,store=store1,date=week,token,method='GET',path}={}){
 const uri=path||'/rpc/list_workforce_registration_order_v1?p_store_id='+store+'&p_week_start='+date;
 const bearer=token||(subject?jwt(subject):null);
 const result=await fetch(host+uri,{method,headers:{accept:'application/json',...(bearer?{authorization:'Bearer '+bearer}:{})}});
 const content=await result.text();
 let data;try{data=JSON.parse(content)}catch{data=content}
 return {status:result.status,data};
}
function allowed(result,ids,label){
 assert.equal(result.status,200,label+': '+JSON.stringify(result));
 assert.ok(Array.isArray(result.data),label+': array required');
 assert.deepEqual(result.data.map(r=>r.availability_id).sort(),ids.map(u).sort(),label+': unauthorized rows or omission');
 for(const row of result.data){
   assert.deepEqual(Object.keys(row).sort(),['availability_id','registered_at']);
   assert.match(row.registered_at,/^2026-/);
 }
}
function denied(result,label){
 assert.ok(result.status>=400&&result.status<500,label+': rejected with 4xx, not '+result.status+': '+JSON.stringify(result.data));
 assert.ok(!Array.isArray(result.data)||result.data.length===0,label+': cannot return row data');
}
const results=[];
function check(label,run){return Promise.resolve().then(run).then(()=>{results.push(label);console.log('PASS '+label)})}
await check('Owner CN1 only active employees in CN1',async()=>allowed(await call({subject:1}),[301,302],'Owner CN1'));
await check('Owner CN2 scoped rows, including shared employee',async()=>allowed(await call({subject:1,store:store2}),[302,303],'Owner CN2'));
await check('Manager CN1 allowed',async()=>allowed(await call({subject:2}),[301,302],'Manager CN1'));
await check('Manager CN2 allowed, not CN1',async()=>allowed(await call({subject:5,store:store2}),[302,303],'Manager CN2'));
await check('Manager CN1 denied for CN2',async()=>denied(await call({subject:2,store:store2}),'cross-store manager'));
await check('Manager CN2 denied for CN1',async()=>denied(await call({subject:5,store:store1}),'reverse cross-store'));
await check('Employee denied for all stores',async()=>denied(await call({subject:3}),'employee cannot list'));
await check('Inactive Manager denied',async()=>denied(await call({subject:4}),'inactive manager'));
await check('Unknown user with signed authenticated JWT denied',async()=>denied(await call({subject:999}),'unknown profile'));
await check('Missing JWT denied',async()=>denied(await call({}),'unauthenticated'));
await check('Wrong store (inactive) denied',async()=>denied(await call({subject:1,store:store3}),'inactive branch'));
await check('Owner cannot query nonexistent UUID even if live can_access_store allows it',async()=>denied(await call({subject:1,store:u(999)}),'phantom branch'));
await check('Non-Monday target date denied',async()=>denied(await call({subject:2,date:'2026-10-27'}),'non-Monday'));
await check('No store parameter denied',async()=>denied(await call({subject:2,store:''}),'missing store'));
await check('Adjacent week does not leak previous availability',async()=>allowed(await call({subject:2,date:'2026-11-02'}),[306],'week isolation'));
await check('JWT wrong signature rejected',async()=>{const a=jwt(2);denied(await call({token:a.slice(0,-1)+'!'}),'signature tamper')});
await check('No direct authenticated table SELECT',async()=>denied(await call({subject:2,path:'/employee_availability?select=id'}),'direct table read'));
await check('No direct anon table SELECT',async()=>denied(await call({path:'/employee_availability?select=id'}),'anon table read'));
console.log('WORKFORCE_REGISTRATION_ORDER_SIGNED_JWT_E2E=PASS ('+results.length+' cases; local PostgREST + isolated PostgreSQL; no production data)');
