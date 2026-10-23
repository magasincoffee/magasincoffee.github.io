// #487: signed JWT cross-role projections on isolated synthetic PostgreSQL ONLY.
// The three read RPC definitions are copied directly from deployed pg_get_functiondef;
// schedule publication is NOT simulated here: official schedules are fixture seeds.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
const host=process.env.QA_POSTGREST_URL||'http://127.0.0.1:3000';
const secret=process.env.QA_JWT_SECRET;
assert.ok(secret?.length>=32,'QA-only JWT secret required');
const uid=n=>'90000000-0000-4000-8000-'+String(n).padStart(12,'0');
const store=n=>'91000000-0000-4000-8000-'+String(n).padStart(12,'0');
const sched=n=>'92000000-0000-4000-8000-'+String(n).padStart(12,'0');
const iso=x=>x.toISOString().slice(0,10);
const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{
 timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',
 hour:'2-digit',minute:'2-digit',hourCycle:'h23'
}).formatToParts(new Date()).map(p=>[p.type,p.value]));
const monday=new Date(Date.UTC(+parts.year,+parts.month-1,+parts.day));
monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()||7)-1)+7);
const week=iso(monday),previous=new Date(monday);
previous.setUTCDate(previous.getUTCDate()-7);
const previousWeek=iso(previous);
const registrationOpen=+(parts.hour)*60+(parts.minute)<720 || new Date(Date.UTC(+parts.year,+parts.month-1,+parts.day)).getUTCDay()!==0;
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function signed(n,extraClaims={}){
 const now=Math.floor(Date.now()/1000);
 const msg=encode({alg:'HS256',typ:'JWT'})+'.'+encode({role:'authenticated',sub:uid(n),iat:now,exp:now+900,...extraClaims});
 return msg+'.'+createHmac('sha256',secret).update(msg).digest('base64url');
}
async function rpc(n,name,params={}){
 const res=await fetch(host+'/rpc/'+name,{method:'POST',headers:{
  'content-type':'application/json',accept:'application/json',...n?{authorization:'Bearer '+signed(n)}:{}
 },body:JSON.stringify(params)});
 const body=await res.text();let data;try{data=JSON.parse(body)}catch{data=body}
 return {status:res.status,data};
}
function success(res,label){assert.equal(res.status,200,label+': '+JSON.stringify(res));return res.data;}
function denied(res,label,reason){assert.ok(res.status>=400&&res.status<500,label+': '+JSON.stringify(res));if(reason)assert.match(JSON.stringify(res.data),new RegExp(reason));}
async function check(name,fn){await fn();console.log('PASS '+name)}
const mgr=(n,s)=>rpc(n,'get_manager_weekly_schedule',{p_store_id:s,p_week_start:week});
const avail=(n,s)=>rpc(n,'get_manager_weekly_availability',{p_store_id:s,p_week_start:week});
const self=n=>rpc(n,'list_my_approved_schedules_v2',{p_week_start:week});
await check('four synthetic branches and one immutable schedule ID across Owner, Manager, Employee',async()=>{
 const a=success(await self(2),'employee A published schedule');
 const m=success(await mgr(1,store(1)),'manager CN1 published schedule');
 const o=success(await mgr(5,store(1)),'owner CN1 published schedule');
 assert.deepEqual([a.length,m.length,o.length],[1,1,1]);
 assert.deepEqual([a[0].schedule_id,m[0].schedule_id,o[0].schedule_id],[sched(1),sched(1),sched(1)]);
 assert.equal(m[0].user_id,uid(2));
 assert.equal(a[0].status,'APPROVED');
 assert.equal(a[0].work_date,week);
});
await check('Employee B and Owner see CN2 schedule, Manager CN2 only own branch',async()=>{
 const b=success(await self(3),'employee B schedule');
 const scoped=success(await mgr(6,store(2)),'manager CN2');
 const owner=success(await mgr(5,store(2)),'owner CN2');
 assert.deepEqual([b.length,scoped.length,owner.length],[1,1,1]);
 assert.ok([b[0],scoped[0],owner[0]].every(x=>x.schedule_id===sched(2)));
 const all=success(await mgr(5,null),'owner all stores');
 assert.deepEqual(all.map(x=>x.schedule_id).sort(),[sched(1),sched(2)].sort());
 for(const s of [store(3),store(4)]){
  assert.deepEqual(success(await mgr(5,s),'owner empty branch '+s),[]);
 }
});
await check('unauthorized cross-branch and forged roles fail closed',async()=>{
 denied(await mgr(1,store(2)),'Manager CN1 cannot read CN2','STORE_NOT_ALLOWED');
 denied(await mgr(6,store(1)),'Manager CN2 cannot read CN1','STORE_NOT_ALLOWED');
 denied(await mgr(1,store(4)),'Manager CN1+CN3 cannot read CN4','STORE_NOT_ALLOWED');
 // Signed but forged metadata cannot widen the Manager's DB-backed store scope.
 const forged=await fetch(host+'/rpc/get_manager_weekly_schedule',{
   method:'POST',headers:{'content-type':'application/json',accept:'application/json',
   authorization:'Bearer '+signed(1,{access_scope:'ALL',user_metadata:{access_scope:'ALL'},app_metadata:{access_scope:'ALL'}})},
   body:JSON.stringify({p_store_id:store(2),p_week_start:week})
 });
 const forgedBody=await forged.text();
 denied({status:forged.status,data:forgedBody},'forged JWT metadata cannot widen store scope','STORE_NOT_ALLOWED');
 denied(await mgr(2,store(1)),'Employee cannot inspect Manager roster','ROLE_NOT_ALLOWED');
 denied(await self(1),'Manager cannot use Employee schedule projection','EMPLOYEE_NOT_ACTIVE');
 denied(await self(5),'Owner cannot use Employee schedule projection','EMPLOYEE_NOT_ACTIVE');
 denied(await self(4),'inactive employee cannot use projection','EMPLOYEE_NOT_ACTIVE');
 denied(await mgr(1,null),'Manager must specify branch','STORE_REQUIRED_FOR_MANAGER');
 // Production can_access_store grants OWNER enterprise scope; a nonexistent store
 // remains an empty projection, not a STORE_NOT_ALLOWED error.
 assert.deepEqual(success(await mgr(5,store(9)),'Owner nonexistent branch empty'),[]);
 denied(await mgr(1,store(9)),'Manager nonexistent branch denied','STORE_NOT_ALLOWED');
 denied(await mgr(null,store(1)),'anonymous cannot read');
});
await check('week selection is isolated and signed JWT cannot access raw schedule table',async()=>{
 const old=success(await rpc(2,'list_my_approved_schedules_v2',{p_week_start:previousWeek}),'old week');
 assert.deepEqual(old,[]);
 denied(await rpc(2,'list_my_approved_schedules_v2',{p_week_start:'2026-10-27'}),'not Monday','WEEK_START_MUST_BE_MONDAY');
 const direct=await fetch(host+'/work_schedules?select=id',{headers:{accept:'application/json',authorization:'Bearer '+signed(1)}});
 denied({status:direct.status,data:await direct.text()},'Manager direct table read');
});
await check('registration read goes Employee -> authorized Manager / Owner, never foreign branch',async()=>{
 const baseline=success(await avail(1,store(1)),'manager baseline');
 assert.deepEqual(baseline,[]);
 assert.deepEqual(success(await avail(6,store(2)),'CN2 baseline').map(x=>x.user_id),[uid(3)]);
 denied(await avail(1,store(2)),'Manager cannot inspect unauthorized branch','STORE_NOT_ALLOWED');
 const own=success(await avail(5,null),'Owner all availability');
 assert.ok(own.some(x=>x.user_id===uid(3)));
 if(!registrationOpen){console.log('QA_WINDOW_CLOSED: skip positive Employee create; verify scoped static reads only');return;}
 const created=success(await rpc(2,'save_my_availability',{
  p_work_date:week,p_start_time:'07:00',p_end_time:'11:00',p_availability_type:'AVAILABLE'
 }), 'Employee A register');
 assert.match(created,/^[0-9a-f-]{36}$/);
 try{
  const mm=success(await avail(1,store(1)),'manager CN1 sees registration');
  const oo=success(await avail(5,store(1)),'owner CN1 sees registration');
  assert.ok(mm.some(x=>x.availability_id===created && x.user_id===uid(2)));
  assert.ok(oo.some(x=>x.availability_id===created && x.user_id===uid(2)));
  assert.ok(!success(await avail(6,store(2)),'CN2 isolated').some(x=>x.availability_id===created));
  assert.ok(!success(await rpc(3,'get_my_availability',{p_week_start:week}),'other employee self').some(x=>x.id===created));
 }finally{
  const deleted=success(await rpc(2,'delete_my_availability',{p_availability_id:created}),'cleanup registration');
  assert.equal(deleted,true);
 }
 assert.deepEqual(success(await avail(1,store(1)),'restored manager baseline'),baseline);
});
console.log('WORKFORCE_487_CROSS_ROLE_SIGNED_JWT_READ_PROJECTIONS=PASS; 4 synthetic stores, seeded official roster, zero production calls');
