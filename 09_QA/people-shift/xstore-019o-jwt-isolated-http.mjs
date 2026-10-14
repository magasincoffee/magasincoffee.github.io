// Signed HMAC JWTs are verified through a real isolated PostgREST HTTP service.
// All actors are synthetic. This is NOT an actual Supabase-issued credential test.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const base=process.env.PGRST_TEST_URL||'http://xstore019o-pgrst:3000';
const key=process.env.TEST_JWT_SECRET;
assert(key && key.length>=32);
const users={
 owner:'00000000-0000-4000-8000-000000000001',
 manager:'00000000-0000-4000-8000-000000000002',
 partial:'00000000-0000-4000-8000-000000000003',
 staff:'00000000-0000-4000-8000-000000000004',
 target:'00000000-0000-4000-8000-000000000005',
 foreign:'00000000-0000-4000-8000-000000000006',
 inactive:'00000000-0000-4000-8000-000000000007'
};
const encode=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
function token(sub){
 const now=Math.floor(Date.now()/1000);
 const msg=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub,role:'authenticated',iat:now,exp:now+600});
 return msg+'.'+crypto.createHmac('sha256',key).update(msg).digest('base64url');
}
async function rpc(name,sub,params={},override){
 const t=override===undefined?token(sub):override;
 const headers={'content-type':'application/json','accept':'application/json'};
 if(t)headers.authorization='Bearer '+t;
 const res=await fetch(base+'/rpc/'+name,{method:'POST',headers,body:JSON.stringify(params),signal:AbortSignal.timeout(12000)});
 let body;try{body=await res.json()}catch{body={}};
 return {status:res.status,body};
}
async function awaitServer(){
 for(let i=0;i<50;i++){
  try{const r=await fetch(base+'/',{signal:AbortSignal.timeout(1000)});if(r.status<500)return}catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 throw Error('ISOLATED_POSTGREST_NOT_READY');
}
await awaitServer();
let checks=0;
function success(r,caseName){assert.equal(r.status,200,caseName+' expected HTTP200, got '+r.status+' '+(r.body?.code||''));checks++}
function reject(r,caseName){assert([400,401,403].includes(r.status),caseName+' expected denied HTTP, got '+r.status);checks++}
const valid=token(users.owner);
const last=valid.slice(-1);
reject(await rpc('list_employee_lifecycle_controls_v1',users.owner,{},valid.slice(0,-1)+(last==='x'?'y':'x')),'bad signature');
reject(await rpc('list_employee_lifecycle_controls_v1',users.owner,{},''),'missing JWT');
const owner=await rpc('list_employee_lifecycle_controls_v1',users.owner);
success(owner,'Owner list');assert(owner.body.some(x=>x.employee_id===users.target && x.can_manage===true));checks++;
const manager=await rpc('list_employee_lifecycle_controls_v1',users.manager);
success(manager,'ALL Manager list');assert(manager.body.some(x=>x.employee_id===users.target && x.can_manage===true));checks++;
const partial=await rpc('list_employee_lifecycle_controls_v1',users.partial);
success(partial,'partial Manager scoped list');assert(partial.body.some(x=>x.employee_id===users.target && x.can_manage===false));assert(!partial.body.some(x=>x.employee_id===users.foreign));checks+=2;
reject(await rpc('list_employee_lifecycle_controls_v1',users.staff),'Employee cannot list');
reject(await rpc('set_employee_lifecycle_status_v1',users.staff,{p_employee_id:users.target,p_new_status:'INACTIVE',p_reason:'staff-denied'}),'Employee cannot write');
reject(await rpc('set_employee_lifecycle_status_v1',users.partial,{p_employee_id:users.target,p_new_status:'INACTIVE',p_reason:'partial-denied'}),'partial scope rejected');
reject(await rpc('set_employee_lifecycle_status_v1',users.partial,{p_employee_id:users.foreign,p_new_status:'INACTIVE',p_reason:'foreign-denied'}),'foreign scope rejected');
reject(await rpc('set_employee_lifecycle_status_v1',users.inactive,{p_employee_id:users.target,p_new_status:'INACTIVE',p_reason:'inactive-denied'}),'inactive Manager rejected');
reject(await rpc('set_employee_lifecycle_status_v1',users.owner,{p_employee_id:users.target,p_new_status:'DELETED',p_reason:'invalid-status'}),'hard delete rejected');
const off=await rpc('set_employee_lifecycle_status_v1',users.owner,{p_employee_id:users.target,p_new_status:'INACTIVE',p_reason:'synthetic-offboard'});
success(off,'Owner offboard');assert.equal(off.body.new_status,'INACTIVE');checks++;
const back=await rpc('set_employee_lifecycle_status_v1',users.manager,{p_employee_id:users.target,p_new_status:'ACTIVE',p_reason:'synthetic-reactivate'});
success(back,'ALL Manager reactivate');assert.equal(back.body.new_status,'ACTIVE');checks++;
console.log('XSTORE_019O_SYNTHETIC_SIGNED_JWT_HTTP=PASS; CASES='+checks+'; NO_PRODUCTION_ACCESS');
