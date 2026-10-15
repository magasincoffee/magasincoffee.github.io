// XSTORE-019O: hosted Supabase Auth / three-role RLS strictly read-only QA.
// A password-grant login creates an Auth session; no business data is written.
// Never print passwords, usernames, emails, UUIDs, tokens or response bodies.
const BASE='https://menvbzlsncmpuvnaifxa.supabase.co';
const KEY='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx'; // public browser key
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORES=['CN1','CN2','CN3','CN4'];
const ALLOWED=new Set([
 '/auth/v1/token?grant_type=password','/auth/v1/user',
 '/rest/v1/rpc/resolve_login_email','/rest/v1/rpc/current_user_role',
 '/rest/v1/rpc/get_manager_accessible_stores','/rest/v1/rpc/can_access_store',
 '/rest/v1/stores?select=id,code&status=eq.ACTIVE&order=code.asc'
]);
const POST=new Set([
 '/auth/v1/token?grant_type=password','/rest/v1/rpc/resolve_login_email',
 '/rest/v1/rpc/current_user_role','/rest/v1/rpc/get_manager_accessible_stores',
 '/rest/v1/rpc/can_access_store'
]);
function need(ok,code){if(!ok)throw new Error(code);}
function isProfilePath(p){return /^\/rest\/v1\/profiles\?select=id,role,status,access_scope&id=eq\.[0-9a-f-]{36}$/i.test(p) ||
 /^\/rest\/v1\/profiles\?select=id&id=neq\.[0-9a-f-]{36}&limit=1$/i.test(p);}
async function call(path,{method='GET',token,body,deny=false,label='GATE'}={}){
 need(ALLOWED.has(path)||isProfilePath(path),'UNAPPROVED_ENDPOINT');
 need((method==='POST'&&POST.has(path))||(method==='GET'&&!POST.has(path)),'UNAPPROVED_METHOD');
 const h={apikey:KEY,accept:'application/json',authorization:'Bearer '+(token||KEY)};
 if(body!==undefined)h['content-type']='application/json';
 const res=await fetch(BASE+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(deny){need(res.status>=400&&res.status<500,label+'_MUST_DENY');await res.body?.cancel();return null;}
 need(res.ok,label+'_HTTP_'+res.status);
 let data;try{data=JSON.parse(await res.text());}catch{throw new Error(label+'_NOT_JSON');}
 return data;
}
async function login(slot){
 const username=String(process.env['XSTORE_019O_QA_'+slot+'_USERNAME']||'').trim();
 const password=String(process.env['XSTORE_019O_QA_'+slot+'_PASSWORD']||'');
 need(username&&password,'MISSING_QA_SECRET_'+slot);
 let email=username;
 if(!EMAIL.test(username)){
  email=await call('/rest/v1/rpc/resolve_login_email',{method:'POST',body:{p_username:username},label:'USERNAME_'+slot});
  need(typeof email==='string'&&EMAIL.test(email),'USERNAME_UNRESOLVED_'+slot);
 }
 const result=await call('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},label:'LOGIN_'+slot});
 const token=result?.access_token;
 need(typeof token==='string'&&token.split('.').length===3,'JWT_MISSING_'+slot);
 let jwt;try{jwt=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));}
 catch{throw new Error('JWT_INVALID_'+slot);}
 need(UUID.test(jwt?.sub||'')&&jwt.role==='authenticated'&&jwt.exp>Math.floor(Date.now()/1000)&&
 typeof jwt.iss==='string'&&jwt.iss.startsWith(BASE+'/auth/v1'),'JWT_CLAIMS_INVALID_'+slot);
 const user=await call('/auth/v1/user',{token,label:'AUTH_USER_'+slot});
 need(user?.id===jwt.sub,'AUTH_USER_MISMATCH_'+slot);
 const prof=await call('/rest/v1/profiles?select=id,role,status,access_scope&id=eq.'+jwt.sub,{token,label:'SELF_'+slot});
 need(Array.isArray(prof)&&prof.length===1&&prof[0].id===jwt.sub&&prof[0].status==='ACTIVE','SELF_RLS_FAILED_'+slot);
 const role=String(prof[0].role||'').toUpperCase();
 const rpc=await call('/rest/v1/rpc/current_user_role',{method:'POST',token,body:{},label:'ROLE_'+slot});
 need(String(rpc||'').toUpperCase()===role,'ROLE_RPC_FAILED_'+slot);
 const expected={OWNER:['OWNER'],MANAGER:['STORE_MANAGER'],STAFF:['STAFF','EMPLOYEE']}[slot];
 need(expected.includes(role),'WRONG_ROLE_'+slot);
 if(slot==='MANAGER'){
  const scope=String(prof[0].access_scope||'').toUpperCase();
  need(scope.split(/[,;\s]+/).some(v=>v==='ALL'||v==='*'),'MANAGER_NOT_ALL');
 }
 console.log('XSTORE_019O_AUTH_JWT=PASS; SLOT='+slot+'; ROLE='+role);
 return{slot,token,id:jwt.sub};
}
async function managerStores(actor){
 const rows=await call('/rest/v1/rpc/get_manager_accessible_stores',{method:'POST',token:actor.token,body:{},label:'STORE_LIST_'+actor.slot});
 need(Array.isArray(rows)&&rows.length===4&&JSON.stringify(rows.map(x=>x.code).sort())===JSON.stringify(STORES),'MANAGER_STORE_SCOPE_'+actor.slot);
}
async function main(){
 const owner=await login('OWNER'),manager=await login('MANAGER'),staff=await login('STAFF');
 need(new Set([owner.id,manager.id,staff.id]).size===3,'QA_ACTORS_NOT_DISTINCT');
 const stores=await call('/rest/v1/stores?select=id,code&status=eq.ACTIVE&order=code.asc',{token:owner.token,label:'STORES'});
 need(Array.isArray(stores)&&stores.length===4&&JSON.stringify(stores.map(s=>s.code))===JSON.stringify(STORES)&&stores.every(s=>UUID.test(s.id)),'CANONICAL_STORE_MATRIX_CHANGED');
 await managerStores(owner);await managerStores(manager);
 await call('/rest/v1/rpc/get_manager_accessible_stores',{method:'POST',body:{},token:staff.token,deny:true,label:'STAFF_MANAGER_DENIAL'});
 for(const st of stores){
  for(const actor of [owner,manager,staff]){
   const allowed=await call('/rest/v1/rpc/can_access_store',{method:'POST',body:{target_store_id:st.id},token:actor.token,label:'SCOPE_'+actor.slot});
   need(allowed===(actor.slot!=='STAFF'),'SCOPE_DENIAL_'+actor.slot);
  }
 }
 for(const actor of [manager,staff]){
  const other=await call('/rest/v1/profiles?select=id&id=neq.'+actor.id+'&limit=1',{token:actor.token,label:'FOREIGN_'+actor.slot});
  need(Array.isArray(other)&&other.length===0,'FOREIGN_PROFILE_RLS_EXPOSURE_'+actor.slot);
 }
 const ownerOther=await call('/rest/v1/profiles?select=id&id=neq.'+owner.id+'&limit=1',{token:owner.token,label:'OWNER_RLS'});
 need(Array.isArray(ownerOther)&&ownerOther.length===1,'OWNER_RLS_NOT_VERIFIED');
 console.log('XSTORE_019O_HOSTED_RLS=PASS; MANAGER_ALL=PASS; STAFF_FOUR_STORE_DENIAL=PASS; FOREIGN_PROFILE_DENIAL=PASS');
 console.log('XSTORE_019O_HOSTED_THREE_ROLE_READONLY=PASS; ACTORS=3; NO_EMPLOYEE_WRITE; NO_PII_OUTPUT');
 console.log('XSTORE_019O_RELEASE_ADMISSION=PARTIAL; PARTIAL_MANAGER_FOREIGN_STORE_NOT_TESTED; LIFECYCLE_RPC_NOT_DEPLOYED; ACL_RESTORE_PENDING');
}
try{await main();}
catch(e){
 const reason=e instanceof Error&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'UNEXPECTED_ERROR';
 console.error('XSTORE_019O_HOSTED_THREE_ROLE_READONLY=FAIL; CODE='+reason+'; NO_PII_OUTPUT');
 process.exitCode=1;
}
