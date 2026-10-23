// Signed HS256 PostgREST RPC E2E. Synthetic PostgreSQL ONLY. NEVER production.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';

const host=process.env.QA_POSTGREST_URL||'http://127.0.0.1:3000',secret=process.env.QA_JWT_SECRET;
assert.ok(secret?.length>=32,'Synthetic HS256 signing key required');
const user={manager:'90000000-0000-4000-8000-000000000001',employee:'90000000-0000-4000-8000-000000000002',other:'90000000-0000-4000-8000-000000000003',inactive:'90000000-0000-4000-8000-000000000004',unknown:'90000000-0000-4000-8000-000000000099'};
const rowOld='a0000000-0000-4000-8000-000000000001',rowOther='a0000000-0000-4000-8000-000000000002';
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(id){
 const now=Math.floor(Date.now()/1000);
 const msg=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:id,role:'authenticated',iat:now,exp:now+1800});
 return msg+'.'+createHmac('sha256',secret).update(msg).digest('base64url');
}
async function request({subject,endpoint='save_my_availability',params={},bearer=subject?token(subject):null,path}={}){
 const res=await fetch(host+(path||('/rpc/'+endpoint)),{method:'POST',
  headers:{'content-type':'application/json',accept:'application/json',...(bearer?{authorization:'Bearer '+bearer}:{})},
  body:JSON.stringify(params)});
 const body=await res.text();let data;try{data=JSON.parse(body)}catch{data=body}
 return {status:res.status,data};
}
const ok=(x,label)=>assert.equal(x.status,200,label+' '+JSON.stringify(x));
function denied(x,label,contains=''){
 assert.ok(x.status>=400&&x.status<500,label+' must return 4xx, got '+JSON.stringify(x));
 if(contains)assert.ok(JSON.stringify(x.data).includes(contains),label+' must report '+contains+' '+JSON.stringify(x.data));
}
const d=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
const p=Object.fromEntries(d.map(x=>[x.type,x.value]));
const civil=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)));
const isoDow=civil.getUTCDay()||7,monday=new Date(civil);monday.setUTCDate(monday.getUTCDate()-(isoDow-1));
const ymd=x=>x.toISOString().slice(0,10);
const nowMonday=ymd(monday),future=new Date(monday);future.setUTCDate(future.getUTCDate()+7);
const nextMonday=ymd(future),nextNext=new Date(monday);nextNext.setUTCDate(nextNext.getUTCDate()+14);
const open=isoDow!==7||(Number(p.hour)*60+Number(p.minute)<720);
const slot=(date,additional={})=>({p_work_date:date,p_start_time:'06:00',p_end_time:'10:00',p_availability_type:'AVAILABLE',...additional});
const performed=[];
async function check(label,fn){await fn();performed.push(label);console.log('PASS '+label)}
await check('signed Employee JWT cannot write current week',async()=>{
 denied(await request({subject:user.employee,params:slot(nowMonday)}),'wrong week','AVAILABILITY_REGISTRATION_CLOSED');
});
await check('signed Employee JWT cannot write two weeks out',async()=>{
 denied(await request({subject:user.employee,params:slot(ymd(nextNext))}),'wrong future','AVAILABILITY_REGISTRATION_CLOSED');
});
await check('signed Employee cannot delete locked historical own row',async()=>{
 denied(await request({subject:user.employee,endpoint:'delete_my_availability',params:{p_availability_id:rowOld}}),'delete locked','AVAILABILITY_REGISTRATION_CLOSED');
});
await check('signed Employee cannot change locked row to next week',async()=>{
 denied(await request({subject:user.employee,params:slot(nextMonday,{p_availability_id:rowOld})}),'edit locked','AVAILABILITY_REGISTRATION_CLOSED');
});
await check('signed Employee cannot delete other employee row',async()=>{
 const x=await request({subject:user.employee,endpoint:'delete_my_availability',params:{p_availability_id:rowOther}});
 ok(x,'other delete returns false');assert.equal(x.data,false);
});
await check('inactive/manager/unknown signed identities fail employee writer',async()=>{
 for(const actor of [user.manager,user.inactive,user.unknown]){
  denied(await request({subject:actor,params:slot(nextMonday)}),'bad actor '+actor,'EMPLOYEE_NOT_ACTIVE');
 }
});
await check('signed JWT authentication is necessary',async()=>{
 denied(await request({subject:user.employee,bearer:token(user.employee).slice(0,-1)+'!'}),'tampered bearer');
 denied(await request({params:slot(nextMonday)}),'missing bearer');
});
await check('no direct authenticated table write grants',async()=>{
 const x=await request({subject:user.employee,path:'/employee_availability',params:{user_id:user.employee,work_date:nextMonday,start_time:'06:00',end_time:'10:00'}});
 denied(x,'table insert must be inaccessible');
});
await check('signed Employee read API enforces authentication, identity and week scope',async()=>{
 const own=await request({subject:user.employee,endpoint:'get_my_availability',params:{p_week_start:nextMonday}});
 ok(own,'own read');assert.ok(Array.isArray(own.data));
 assert.ok(own.data.every(row=>row.id!==rowOther),'foreign row never returned');
 const foreign=await request({subject:user.other,endpoint:'get_my_availability',params:{p_week_start:nextMonday}});
 ok(foreign,'other own read');assert.ok(foreign.data.some(row=>row.id===rowOther));
 assert.ok(foreign.data.every(row=>row.id!==rowOld),'old week excluded');
 denied(await request({subject:user.manager,endpoint:'get_my_availability',params:{p_week_start:nextMonday}}),'manager read','EMPLOYEE_NOT_ACTIVE');
 denied(await request({subject:user.inactive,endpoint:'get_my_availability',params:{p_week_start:nextMonday}}),'inactive read','EMPLOYEE_NOT_ACTIVE');
 denied(await request({subject:user.employee,bearer:null,endpoint:'get_my_availability',params:{p_week_start:nextMonday}}),'anonymous read');
});
if(open){
 await check('employee signed JWT create -> read -> edit -> read -> delete -> original snapshot',async()=>{
  const before=await request({subject:user.employee,endpoint:'get_my_availability',params:{p_week_start:nextMonday}});
  ok(before,'baseline');assert.ok(Array.isArray(before.data));
  const created=await request({subject:user.employee,params:slot(nextMonday)});
  ok(created,'create');assert.match(String(created.data),/^[0-9a-f-]{36}$/);
  const id=String(created.data);
  const inserted=await request({subject:user.employee,endpoint:'get_my_availability',params:{p_week_start:nextMonday}});
  ok(inserted,'read after insert');assert.equal(inserted.data.length,before.data.length+1);
  assert.ok(inserted.data.some(row=>row.id===id&&String(row.start_time).startsWith('06:00')),'insert persisted and scoped');
  const foreign=await request({subject:user.other,endpoint:'get_my_availability',params:{p_week_start:nextMonday}});
  ok(foreign,'foreign read after insert');assert.ok(foreign.data.every(row=>row.id!==id),'isolation after insert');
  const bad=await request({subject:user.employee,params:slot(nextMonday,{p_availability_id:id,p_start_time:'06:15'})});
  denied(bad,'invalid 30m','AVAILABILITY_INVALID_30_MINUTE_INTERVAL');
  const update=await request({subject:user.employee,params:slot(nextMonday,{p_availability_id:id,p_start_time:'06:30'})});
  ok(update,'update');assert.equal(update.data,id);
  const edited=await request({subject:user.employee,endpoint:'get_my_availability',params:{p_week_start:nextMonday}});
  ok(edited,'read after edit');assert.ok(edited.data.some(row=>row.id===id&&String(row.start_time).startsWith('06:30')),'edit persisted');
  const drop=await request({subject:user.employee,endpoint:'delete_my_availability',params:{p_availability_id:id}});
  ok(drop,'delete');assert.equal(drop.data,true);
  const restored=await request({subject:user.employee,endpoint:'get_my_availability',params:{p_week_start:nextMonday}});
  ok(restored,'read restored');assert.deepEqual(restored.data,before.data,'no residual rows after deletion');
 });
}else console.log('CLOSED_NOW: current wall clock is after Sunday cutoff. Safe positive insert/edit/delete skipped; read/negative checks executed.');
console.log('SIGNED_JWT_EMPLOYEE_DEADLINE_E2E=PASS '+performed.length+' tests; localhost disposable DB only');
