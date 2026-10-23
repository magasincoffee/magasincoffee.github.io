// P0 #487 — signed JWT attendance exact-shift confirmation (isolated PostgreSQL).
// No Supabase-hosted URLs, JWT credentials or production data in this test.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
const secret=process.env.QA_JWT_SECRET;
const origin=process.env.QA_POSTGREST_URL||'http://127.0.0.1:3000';
assert.ok(secret&&secret.length>=32);
const staff='90000000-0000-4000-8000-000000000007';
const manager='90000000-0000-4000-8000-000000000001';
const other='90000000-0000-4000-8000-000000000003';
const sid=n=>'93000000-0000-4000-8000-'+String(n).padStart(12,'0');
function jwt(sub){
 const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const now=Math.floor(Date.now()/1000);
 const m=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub,role:'authenticated',iat:now,exp:now+900});
 return m+'.'+createHmac('sha256',secret).update(m).digest('base64url');
}
async function rpc(actor,schedule,start='06:00',end='10:00',note=null){
 const headers={'content-type':'application/json',accept:'application/json'};
 if(actor) headers.authorization='Bearer '+jwt(actor);
 const response=await fetch(origin+'/rpc/submit_manual_time_attendance_v1',{
   method:'POST',headers,body:JSON.stringify({p_schedule_id:schedule,p_actual_start:start,
   p_actual_end:end,p_note:note})});
 const t=await response.text();let data;try{data=JSON.parse(t)}catch{data=t}
 return {status:response.status,data};
}
const ok=(x,tag)=>{assert.equal(x.status,200,tag+':'+JSON.stringify(x));return x.data};
const denied=(x,tag,code)=>{assert.ok(x.status>=400&&x.status<500,tag+':'+JSON.stringify(x));
 if(code)assert.match(JSON.stringify(x.data),new RegExp(code))};
async function run(tag,fn){await fn();console.log('PASS '+tag)}
await run('anonymous, manager, wrong employee cannot submit a different Staff assignment',async()=>{
 denied(await rpc(null,sid(1)),'anonymous');
 denied(await rpc(manager,sid(1)),'manager','ATTENDANCE_NOT_CURRENT_OWNER');
 denied(await rpc(other,sid(1)),'other employee','ATTENDANCE_NOT_CURRENT_OWNER');
 denied(await rpc(staff,sid(4)),'future schedule','ATTENDANCE_SCHEDULE_IN_FUTURE');
 denied(await rpc(staff,'93000000-0000-4000-8000-000000000099'),'not assigned','ATTENDANCE_SCHEDULE_NOT_FOUND');
});
await run('exact approved shift self-confirms, 240 minutes, not a fabricated Manager review',async()=>{
 const x=ok(await rpc(staff,sid(1)),'exact');
 assert.equal(x.status,'AUTO_CONFIRMED');assert.equal(x.submission_status,'SUBMITTED');
 assert.equal(x.already_submitted,false);assert.match(x.attendance_id,/^[\da-f-]{36}$/i);
 const retry=ok(await rpc(staff,sid(1)),'exact retry');
 assert.equal(retry.attendance_id,x.attendance_id);
 assert.equal(retry.status,'AUTO_CONFIRMED');
 assert.equal(retry.already_submitted,true);
 denied(await rpc(staff,sid(1),'06:15','10:00'),'cannot alter confirmed time','ATTENDANCE_ACTIVE_SUBMISSION_EXISTS');
});
await run('deviated actual hours remain pending manual Manager review',async()=>{
 const x=ok(await rpc(staff,sid(2),'06:30','10:00'),'deviation');
 assert.equal(x.status,'NEEDS_REVIEW');assert.equal(x.submission_status,'SUBMITTED');
 assert.equal(x.already_submitted,false);
 const retry=ok(await rpc(staff,sid(2),'06:30','10:00'),'deviation retry');
 assert.equal(retry.attendance_id,x.attendance_id);assert.equal(retry.already_submitted,true);
});
await run('even matched hours with exception note remain pending',async()=>{
 const x=ok(await rpc(staff,sid(3),'06:00','10:00','Exception reported by employee'),'note');
 assert.equal(x.status,'NEEDS_REVIEW');assert.equal(x.already_submitted,false);
});
console.log('WORKFORCE_487_ATTENDANCE_AUTO_CONFIRMED_JWT=PASS');
