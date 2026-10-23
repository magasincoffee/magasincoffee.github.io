// #487: actual hosted RPC bodies on disposable PostgREST/PostgreSQL with HS256 JWT.
// This tests real Manager write transitions; no hosted secrets or production calls.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
const base=process.env.QA_POSTGREST_URL||'http://127.0.0.1:3000';
const secret=process.env.QA_JWT_SECRET;
assert.ok(secret?.length>=32);
const uid=n=>'90000000-0000-4000-8000-'+String(n).padStart(12,'0');
const store=n=>'91000000-0000-4000-8000-'+String(n).padStart(12,'0');
const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{
 timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'
}).formatToParts(new Date()).map(p=>[p.type,p.value]));
const weekDate=new Date(Date.UTC(+parts.year,+parts.month-1,+parts.day));
weekDate.setUTCDate(weekDate.getUTCDate()-((weekDate.getUTCDay()||7)-1)+7);
const week=weekDate.toISOString().slice(0,10);
const tomorrow=new Date(weekDate);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
const nextDay=tomorrow.toISOString().slice(0,10);
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function jwt(n){const now=Math.floor(Date.now()/1000);
 const message=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:uid(n),role:'authenticated',iat:now,exp:now+900});
 return message+'.'+createHmac('sha256',secret).update(message).digest('base64url');
}
async function request(n,name,params={},overrideToken){
 const headers={'content-type':'application/json',accept:'application/json'};
 if(n!==null||overrideToken)headers.authorization='Bearer '+(overrideToken||jwt(n));
 const response=await fetch(base+'/rpc/'+name,{method:'POST',headers,body:JSON.stringify(params)});
 const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{data=raw}
 return {status:response.status,data};
}
function ok(res,label){assert.equal(res.status,200,label+': '+JSON.stringify(res));return res.data;}
function deny(res,label,reason){assert.ok(res.status>=400&&res.status<500,label+': '+JSON.stringify(res));
 if(reason)assert.match(JSON.stringify(res.data),new RegExp(reason));}
const log=async(name,cb)=>{await cb();console.log('PASS '+name)};
const create={p_store_id:store(3),p_week_start:week,p_algorithm_version:'RULE_V1'};
const employee=n=>request(n,'list_my_approved_schedules_v2',{p_week_start:week});
const manager=(n,s)=>request(n,'get_manager_weekly_schedule',{p_store_id:s,p_week_start:week});
let generationId;
await log('prerequisite: seeded availability and empty published CN3',async()=>{
 const availability=ok(await request(7,'get_my_availability',{p_week_start:week}),'STAFF availability');
 assert.equal(availability.length,1);assert.equal(availability[0].work_date,week);
 assert.deepEqual(ok(await employee(7),'STAFF published before'),[]);
 assert.deepEqual(ok(await manager(1,store(3)),'Manager CN3 published before'),[]);
 assert.deepEqual(ok(await manager(5,store(3)),'Owner CN3 published before'),[]);
});
await log('JWT and branch authorization denied before creating any draft',async()=>{
 deny(await request(null,'create_schedule_generation',create),'anonymous');
 deny(await request(7,'create_schedule_generation',create),'Employee cannot create','ROLE_NOT_ALLOWED');
 deny(await request(6,'create_schedule_generation',create),'Manager CN2 denied CN3','STORE_NOT_ALLOWED');
 deny(await request(4,'create_schedule_generation',create),'inactive employee','ROLE_NOT_ALLOWED');
 deny(await request(1,'create_schedule_generation',{...create,p_week_start:nextDay}),'bad Monday','WEEK_START_MUST_BE_MONDAY');
});
await log('Manager signs draft creation and same-draft resume',async()=>{
 generationId=ok(await request(1,'create_schedule_generation',create),'create DRAFT');
 assert.match(generationId,/^[0-9a-f-]{36}$/);
 const resumed=ok(await request(1,'create_schedule_generation',create),'resume DRAFT');
 assert.equal(resumed,generationId,'same generation identity');
 deny(await request(1,'publish_schedule_generation',{p_generation_id:generationId}),'publish before REVIEW','GENERATION_MUST_BE_REVIEWED');
});
await log('assignment payload rejects cross-store, invalid interval, and wrong roles',async()=>{
 const valid={user_id:uid(7),store_id:store(3),work_date:week,start_time:'07:00',end_time:'11:00',status:'DRAFT'};
 deny(await request(6,'replace_schedule_generation_assignments',{p_generation_id:generationId,p_assignments:[valid]}),'Manager outside store','STORE_NOT_ALLOWED');
 deny(await request(7,'replace_schedule_generation_assignments',{p_generation_id:generationId,p_assignments:[valid]}),'Employee writer','ROLE_NOT_ALLOWED');
 deny(await request(1,'replace_schedule_generation_assignments',{p_generation_id:generationId,p_assignments:[{...valid,store_id:store(2)}]}),'wrong assignment store','ASSIGNMENT_STORE_MISMATCH');
 deny(await request(1,'replace_schedule_generation_assignments',{p_generation_id:generationId,p_assignments:[{...valid,start_time:'11:00',end_time:'07:00'}]}),'invalid assignment interval','INVALID_ASSIGNMENT_INTERVAL');
 assert.equal(ok(await request(1,'replace_schedule_generation_assignments',{p_generation_id:generationId,p_assignments:[valid]}),'replace DRAFT'),1);
 const check=ok(await request(1,'validate_schedule_generation_v1',{p_generation_id:generationId}),'validate');
 assert.equal(check.valid,true,JSON.stringify(check));
 assert.equal(check.assignment_count,1);
 assert.equal(check.violation_count,0);
});
await log('Manager signs REVIEW, duplicate review is idempotent, draft cannot change',async()=>{
 deny(await request(6,'review_schedule_generation',{p_generation_id:generationId,p_decision:'APPROVED'}),'foreign Manager review','STORE_NOT_ALLOWED');
 const reviewed=ok(await request(1,'review_schedule_generation',{p_generation_id:generationId,p_decision:'APPROVED'}),'review');
 assert.equal(reviewed.status,'REVIEWED');
 assert.equal(ok(await request(1,'review_schedule_generation',{p_generation_id:generationId,p_decision:'APPROVED'}),'review again').already_reviewed,true);
 deny(await request(1,'replace_schedule_generation_assignments',{p_generation_id:generationId,p_assignments:[]}),
 'cannot replace REVIEWED','GENERATION_NOT_DRAFT');
 assert.deepEqual(ok(await employee(7),'STAFF still no schedule pre-publish'),[]);
});
await log('publish one official schedule; retry does not create a duplicate',async()=>{
 deny(await request(6,'publish_schedule_generation',{p_generation_id:generationId}),'foreign Manager publish','STORE_NOT_ALLOWED');
 const published=ok(await request(1,'publish_schedule_generation',{p_generation_id:generationId}),'publish');
 assert.equal(published.status,'PUBLISHED',JSON.stringify(published));
 assert.equal(published.inserted_schedule_count,1);
 const retry=ok(await request(1,'publish_schedule_generation',{p_generation_id:generationId}),'publish retry');
 assert.equal(retry.already_published,true);assert.equal(retry.inserted_schedule_count,0);assert.equal(retry.official_schedule_count,1);
 deny(await request(1,'create_schedule_generation',create),'cannot open second active generation','GENERATION_ALREADY_PUBLISHED');
});
await log('published schedule ID and owner converge across Employee, Manager and Owner',async()=>{
 const staff=ok(await employee(7),'Employee after publish');
 const managed=ok(await manager(1,store(3)),'Manager after publish');
 const owner=ok(await manager(5,store(3)),'Owner after publish');
 assert.deepEqual([staff.length,managed.length,owner.length],[1,1,1]);
 const scheduleId=staff[0].schedule_id;
 assert.match(scheduleId,/^[0-9a-f-]{36}$/);
 assert.equal(managed[0].schedule_id,scheduleId);
 assert.equal(owner[0].schedule_id,scheduleId);
 assert.equal(managed[0].user_id,uid(7));
 assert.equal(owner[0].user_id,uid(7));
 assert.equal(staff[0].status,'APPROVED');
 assert.equal(staff[0].work_date,week);
 assert.equal(staff[0].start_time,'07:00:00');
 assert.equal(staff[0].end_time,'11:00:00');
 assert.ok(!ok(await employee(3),'different Employee own schedule').some(x=>x.schedule_id===scheduleId));
 deny(await manager(6,store(3)),'foreign Manager cannot read official','STORE_NOT_ALLOWED');
 const direct=await fetch(base+'/work_schedules?select=id',{headers:{accept:'application/json',authorization:'Bearer '+jwt(1)}});
 deny({status:direct.status,data:await direct.text()},'no direct schedule table SELECT');
});
console.log('WORKFORCE_487_MANAGER_PUBLISH_SIGNED_JWT_E2E=PASS; actual hosted write RPC snapshots; synthetic only');
