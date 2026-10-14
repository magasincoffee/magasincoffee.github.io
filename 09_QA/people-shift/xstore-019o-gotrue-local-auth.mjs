// XSTORE-019O: actual GoTrue/Supabase Auth LOCAL signup -> password login -> JWT -> PostgREST.
// Synthetic users only; all services on an internal Docker network. No production credentials.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const mode=process.argv[2];
const authBase=process.env.XSTORE_QA_AUTH_URL||'http://xstore019o-auth:9999';
const restBase=process.env.XSTORE_QA_REST_URL||'http://xstore019o-pgrst:3000';
const actorPath=process.env.XSTORE_QA_ACTOR_FILE||'/qa-tmp/actors.json';
const sqlPath=process.env.XSTORE_QA_ACTOR_SQL||'/qa-tmp/map-actors.sql';
const fixed={
 owner:'00000000-0000-4000-8000-000000000001',
 manager:'00000000-0000-4000-8000-000000000002',
 partial:'00000000-0000-4000-8000-000000000003',
 employee:'00000000-0000-4000-8000-000000000004',
 target:'00000000-0000-4000-8000-000000000005',
 foreign:'00000000-0000-4000-8000-000000000006',
 inactive:'00000000-0000-4000-8000-000000000007'
};
const uidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
async function request(base,path,method='GET',body=null,token=''){
 const headers={'accept':'application/json'};
 if(body!==null)headers['content-type']='application/json';
 if(token)headers.authorization='Bearer '+token;
 const res=await fetch(base+path,{method,headers,body:body===null?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 let json=null;
 try{json=await res.json()}catch{}
 return {status:res.status,data:json};
}
async function ready(base,path){
 for(let i=0;i<65;i++){
  try{const r=await fetch(base+path,{signal:AbortSignal.timeout(1500)});if(r.status<500)return}catch{}
  await sleep(500);
 }
 throw Error('LOCAL_AUTH_OR_REST_NOT_READY');
}
function checkUuid(value){assert(uidPattern.test(String(value||'')),'Invalid synthetic auth UUID');return value}
async function signup(role){
 const email='xstore019o-'+role+'-'+crypto.randomBytes(6).toString('hex')+'@qa.invalid';
 const password=crypto.randomBytes(26).toString('base64url')+'aA9!';
 const r=await request(authBase,'/signup','POST',{email,password});
 assert([200,201].includes(r.status),'GoTrue signup failed for '+role+' (HTTP '+r.status+', '+String(r.data?.code||'no-code')+')');
 const id=checkUuid(r.data?.user?.id||r.data?.id);
 return {id,email,password};
}
async function signin(actor,role){
 const r=await request(authBase,'/token?grant_type=password','POST',{email:actor.email,password:actor.password});
 assert.equal(r.status,200,'GoTrue password login denied for '+role+' HTTP '+r.status+' '+String(r.data?.code||''));
 const token=r.data?.access_token;
 assert(typeof token==='string'&&token.split('.').length===3,'Auth login did not issue a signed JWT');
 const payload=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
 assert.equal(payload.sub,actor.id,'GoTrue JWT sub did not match authenticated user');
 assert.equal(payload.role,'authenticated','GoTrue JWT role must be authenticated');
 assert.equal(payload.aud,'authenticated','GoTrue JWT audience must be authenticated');
 assert(payload.exp>Math.floor(Date.now()/1000),'GoTrue JWT must not be expired');
 const me=await request(authBase,'/user','GET',null,token);
 assert.equal(me.status,200,'GoTrue user endpoint did not accept issued token for '+role);
 assert.equal(me.data?.id,actor.id,'GoTrue /user returned different user');
 return token;
}
async function rpc(name,token,params={}){
 return request(restBase,'/rpc/'+name,'POST',params,token);
}
function deny(r,name){
 assert([400,401,403].includes(r.status),name+' expected HTTP denial, received '+r.status);
}
function pass(r,name){
 assert.equal(r.status,200,name+' expected HTTP200, got '+r.status+' '+String(r.data?.code||''));
}
async function ensureNoProfileMutation(actor,patch,label,token){
 const r=await request(restBase,'/profiles?id=eq.'+actor.id,'PATCH',patch,token);
 assert(r.status<500,label+' unexpected 5xx');
 if(r.status>=200&&r.status<300){
  // PostgREST may return HTTP204 with zero rows due to Owner-only UPDATE RLS.
  assert(r.data===null||(Array.isArray(r.data)&&r.data.length===0),label+' updated an authenticated account');
 }else assert([400,401,403].includes(r.status),label+' unexpected HTTP '+r.status);
}
if(mode==='seed'){
 await ready(authBase,'/health');
 const actors={};
 for(const role of ['owner','manager','partial','employee','inactive']){
  actors[role]=await signup(role);
  await signin(actors[role],role); // Real GoTrue login, not a manually minted JWT.
 }
 const sql=Object.keys(actors).map(role=>
  "UPDATE public.profiles SET id='"+checkUuid(actors[role].id)+
  "'::uuid WHERE id='"+fixed[role]+"'::uuid;").join('\n')+'\n';
 fs.writeFileSync(actorPath,JSON.stringify(actors),{mode:0o600});
 fs.writeFileSync(sqlPath,sql,{mode:0o600});
 console.log('XSTORE_019O_LOCAL_GOTRUE_SIGNUP_PASSWORD_LOGIN=PASS; ACTORS=5; NO_PRODUCTION_ACCESS');
}else if(mode==='verify'){
 await ready(restBase,'/');
 const actors=JSON.parse(fs.readFileSync(actorPath,'utf8'));
 let tests=0;
 const tokens={};
 for(const role of Object.keys(actors)){tokens[role]=await signin(actors[role],role);tests++}
 const valid=tokens.owner, last=valid.at(-1), tampered=valid.slice(0,-1)+(last==='a'?'b':'a');
 deny(await rpc('list_employee_lifecycle_controls_v1',tampered),'Modified GoTrue signature');tests++;
 deny(await rpc('list_employee_lifecycle_controls_v1',''),'Missing GoTrue JWT');tests++;
 const owner=await rpc('list_employee_lifecycle_controls_v1',tokens.owner);pass(owner,'Owner list');
 assert(owner.data.some(x=>x.employee_id===fixed.target&&x.can_manage===true));tests+=2;
 const mgr=await rpc('list_employee_lifecycle_controls_v1',tokens.manager);pass(mgr,'ALL Manager list');
 assert(mgr.data.some(x=>x.employee_id===fixed.target&&x.can_manage===true));tests+=2;
 const partial=await rpc('list_employee_lifecycle_controls_v1',tokens.partial);pass(partial,'Partial Manager list');
 assert(partial.data.some(x=>x.employee_id===fixed.target&&x.can_manage===false));
 assert(!partial.data.some(x=>x.employee_id===fixed.foreign));tests+=3;
 deny(await rpc('list_employee_lifecycle_controls_v1',tokens.employee),'Employee list denied');tests++;
 deny(await rpc('set_employee_lifecycle_status_v1',tokens.employee,{p_employee_id:fixed.target,p_new_status:'INACTIVE',p_reason:'deny staff'}),'Employee write denied');tests++;
 deny(await rpc('set_employee_lifecycle_status_v1',tokens.partial,{p_employee_id:fixed.target,p_new_status:'INACTIVE',p_reason:'deny scope'}),'Partial Manager write denied');tests++;
 deny(await rpc('set_employee_lifecycle_status_v1',tokens.partial,{p_employee_id:fixed.foreign,p_new_status:'INACTIVE',p_reason:'deny foreign'}),'Foreign store denied');tests++;
 deny(await rpc('set_employee_lifecycle_status_v1',tokens.inactive,{p_employee_id:fixed.target,p_new_status:'INACTIVE',p_reason:'deny inactive'}),'Inactive manager denied');tests++;
 deny(await rpc('set_employee_lifecycle_status_v1',tokens.owner,{p_employee_id:fixed.target,p_new_status:'DELETED',p_reason:'no hard delete'}),'Invalid lifecycle change denied');tests++;
 await ensureNoProfileMutation(actors.employee,{role:'OWNER'},'Employee role escalation',tokens.employee);tests++;
 await ensureNoProfileMutation(actors.partial,{access_scope:'ALL'},'Manager scope escalation',tokens.partial);tests++;
 await ensureNoProfileMutation(actors.employee,{status:'INACTIVE'},'Employee self status update',tokens.employee);tests++;
 const off=await rpc('set_employee_lifecycle_status_v1',tokens.owner,{p_employee_id:fixed.target,p_new_status:'INACTIVE',p_reason:'local owner offboard'});
 pass(off,'Owner reversible offboard');assert.equal(off.data?.new_status,'INACTIVE');tests+=2;
 const on=await rpc('set_employee_lifecycle_status_v1',tokens.manager,{p_employee_id:fixed.target,p_new_status:'ACTIVE',p_reason:'local manager restore'});
 pass(on,'Manager reversible restore');assert.equal(on.data?.new_status,'ACTIVE');tests+=2;
 console.log('XSTORE_019O_GOTRUE_ISSUED_JWT_HTTP=PASS; CASES='+tests+'; AUTH_LOCAL_NOT_PRODUCTION; NO_PII');
}else throw Error('Use seed or verify');
