// PostgreSQL/PostgREST E2E uses ONLY disposable synthetic fixture DB and JWTs.
// Production RLS, SECURITY DEFINER RPC, and authenticated browser flows are separate gates.
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
const secret=process.env.QA_JWT_SECRET;
assert.ok(secret?.length>=32,'Synthetic local signing secret missing');
const host=process.env.QA_POSTGREST_URL||'http://127.0.0.1:3000';
const uid=i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0');
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(id){
 const message=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:uid(id),role:'authenticated',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});
 return message+'.'+createHmac('sha256',secret).update(message).digest('base64url');
}
async function http(table,{actor,method='POST',id,data,authorization}={}){
 const search=id?'?id=eq.'+id:'';
 const response=await fetch(host+'/'+table+search,{
 method,headers:{accept:'application/json','content-type':'application/json',prefer:'return=representation',...(authorization?{authorization:'Bearer '+authorization}:actor?{authorization:'Bearer '+token(actor)}:{})},
 ...(['POST','PATCH'].includes(method)?{body:JSON.stringify(data)}:{})
 });
 const raw=await response.text();let json;try{json=JSON.parse(raw)}catch{json=raw};
 return {status:response.status,json};
}
const passed=[];
async function check(name,fn){await fn();passed.push(name);console.log('PASS '+name)}
function ok(result,why){assert.ok(result.status>=200&&result.status<300,why+': '+JSON.stringify(result))}
function denied(result,code,why){
 assert.ok(result.status>=400&&result.status<500,why+': expected 4xx: '+JSON.stringify(result));
 if(code)assert.ok(JSON.stringify(result.json).includes(code),why+': missing '+code+': '+JSON.stringify(result));
}
const local=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
const fields=Object.fromEntries(local.map(x=>[x.type,x.value]));
const cur=new Date(Date.UTC(Number(fields.year),Number(fields.month)-1,Number(fields.day)));
const monDelta=(cur.getUTCDay()+6)%7;
const monday=new Date(cur.getTime()+(7-monDelta)*86400000);
const iso=x=>x.toISOString().slice(0,10);
const nextWeek=iso(monday),pastWeek=iso(new Date(monday.getTime()-7*86400000));
const isClosed=fields.weekday==='Sun'&&Number(fields.hour)>=12;
const avail=(user_id,date=nextWeek,start_time='05:00:00',end_time='09:00:00')=>({id:randomUUID(),user_id:uid(user_id),work_date:date,start_time,end_time,availability_type:'AVAILABLE'});
const swap=(req,target)=>({id:randomUUID(),requester_schedule_id:uid(req),target_schedule_id:uid(target),requester_id:uid(1),target_user_id:uid(2),status:'PENDING'});
await check('Anonymous direct availability INSERT is unauthorized',async()=>denied(await http('employee_availability',{data:avail(1)}),null,'anon'));
await check('Forged employee JWT signature rejected',async()=>{
 const jwt=token(1);denied(await http('employee_availability',{authorization:jwt.slice(0,-1)+'!',data:avail(1)}),null,'signature');
});
await check('Inactive employee cannot create row',async()=>denied(await http('employee_availability',{actor:3,data:avail(3)}),'ACTOR_NOT_ACTIVE','inactive'));
await check('Employee cannot register someone else row',async()=>denied(await http('employee_availability',{actor:1,data:avail(2)}),'AVAILABILITY_NOT_OWNED','foreign user'));
await check('Old week cannot be registered',async()=>denied(await http('employee_availability',{actor:1,data:avail(1,pastWeek)}),'AVAILABILITY_REGISTRATION_CLOSED','old week'));
await check('Employee 05:15 violates 30-minute grid',async()=>denied(await http('employee_availability',{actor:1,data:avail(1,nextWeek,'05:15:00','09:00:00')}),isClosed?'AVAILABILITY_REGISTRATION_CLOSED':'AVAILABILITY_INVALID_30_MINUTE_INTERVAL','15-minute'));
await check('Employee before 05:00 rejected',async()=>denied(await http('employee_availability',{actor:1,data:avail(1,nextWeek,'04:30:00','09:00:00')}),isClosed?'AVAILABILITY_REGISTRATION_CLOSED':'AVAILABILITY_INVALID_30_MINUTE_INTERVAL','early'));
await check('Employee after 22:00 rejected',async()=>denied(await http('employee_availability',{actor:1,data:avail(1,nextWeek,'20:00:00','22:30:00')}),isClosed?'AVAILABILITY_REGISTRATION_CLOSED':'AVAILABILITY_INVALID_30_MINUTE_INTERVAL','late'));
if(!isClosed){
 const row=avail(1);
 await check('Active employee can register next-week half-hour valid interval',async()=>ok(await http('employee_availability',{actor:1,data:row}),'register'));
 await check('Employee cannot UPDATE someone else registration',async()=>denied(await http('employee_availability',{actor:2,method:'PATCH',id:row.id,data:{end_time:'10:00:00'}}),'AVAILABILITY_NOT_OWNED','foreign patch'));
 await check('Employee cannot DELETE another employee registration',async()=>denied(await http('employee_availability',{actor:2,method:'DELETE',id:row.id}),'AVAILABILITY_NOT_OWNED','foreign delete'));
 await check('Employee can UPDATE own open row',async()=>ok(await http('employee_availability',{actor:1,method:'PATCH',id:row.id,data:{end_time:'10:00:00'}}),'own patch'));
 await check('Employee can DELETE own open row',async()=>ok(await http('employee_availability',{actor:1,method:'DELETE',id:row.id}),'own delete'));
}else{
 console.log('INFO Closed local Sunday >=12:00: open-window write positives deferred by actual wall clock');
}
await check('Manager can perform existing separate override on locked week',async()=>ok(await http('employee_availability',{actor:4,data:avail(2,pastWeek,'05:15:00','09:00:00')}),'Manager override'));
await check('Swap with earlier affected shift <24h is rejected',async()=>denied(await http('shift_swaps',{actor:1,data:swap(301,304)}),'SHIFT_SWAP_REQUIRES_24H_NOTICE','earlier requester'));
await check('Swap with earlier target shift <24h is rejected',async()=>denied(await http('shift_swaps',{actor:1,data:swap(303,302)}),'SHIFT_SWAP_REQUIRES_24H_NOTICE','earlier target'));
const goodSwap=swap(303,304);
await check('Swap with both shifts >24h is accepted',async()=>ok(await http('shift_swaps',{actor:1,data:goodSwap}),'swap accepted'));
await check('Retargeting a pending swap to earlier shift <24h rejected',async()=>denied(await http('shift_swaps',{actor:1,method:'PATCH',id:goodSwap.id,data:{target_schedule_id:uid(302)}}),'SHIFT_SWAP_REQUIRES_24H_NOTICE','retarget'));
await check('Peer consent status update is not rechecked as new submission',async()=>ok(await http('shift_swaps',{actor:1,method:'PATCH',id:goodSwap.id,data:{status:'PEER_ACCEPTED'}}),'consent'));
await check('Give request with <24h shift is still allowed',async()=>ok(await http('shift_gives',{actor:1,data:{id:randomUUID(),schedule_id:uid(301),giver_id:uid(1),status:'PENDING'}}),'Give exempt'));
console.log('WORKFORCE_SERVER_GUARDS_SIGNED_JWT_E2E=PASS ('+passed.length+' actual synthetic API scenarios; NOT production acceptance)');
