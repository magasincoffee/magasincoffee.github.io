// XSTORE-019O read-only HOSTED Supabase Auth probe, existing approved QA identity only.
// This never calls employee lifecycle writer, inserts data, requests password recovery,
// outputs credentials, user names, UUIDs, JWTs, or employee records.
import assert from 'node:assert/strict';

const user = String(process.env.XSTORE_019O_QA_USERNAME || '').trim();
const password = String(process.env.XSTORE_019O_QA_PASSWORD || '');
const base = 'https://menvbzlsncmpuvnaifxa.supabase.co';
const publicKey = 'sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx'; // Existing public web client key
assert(user && password, 'XSTORE_019O_HOSTED_AUTH=BLOCKED_MISSING_APPROVED_QA_CREDENTIALS');
const idRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function call(path,{method='GET',body,token,allowError=false}={}) {
 const headers = {'apikey':publicKey,'accept':'application/json'};
 if(token)headers.authorization='Bearer '+token;
 else headers.authorization='Bearer '+publicKey;
 if(body!==undefined)headers['content-type']='application/json';
 const response = await fetch(base+path,{
   method,headers,
   body:body===undefined?undefined:JSON.stringify(body),
   signal:AbortSignal.timeout(20000),
   redirect:'error'
 });
 const raw=await response.text();
 let data=null;
 try{data=raw?JSON.parse(raw):null}catch{}
 if(!allowError)assert(response.ok,'HOSTED_AUTH_HTTP_'+response.status+' endpoint '+path.split('?')[0]);
 return {status:response.status,data};
}
// Existing GitHub QA secret may hold either an email or a canonical username.
// Do not expose which value, and never attempt guessed or alternate identities.
const isEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user);
let email=user;
if(!isEmail){
 const resolved=await call('/rest/v1/rpc/resolve_login_email',{
  method:'POST',body:{p_username:user}
 });
 assert(typeof resolved.data==='string' && resolved.data.includes('@'),
  'HOSTED_AUTH_QA_USERNAME_NOT_RESOLVED; VERIFY_APPROVED_SECRET_ACCOUNT');
 email=resolved.data;
}
console.log('XSTORE_019O_APPROVED_QA_LOGIN_FORMAT='+ (isEmail?'EMAIL':'USERNAME_RESOLVED'));
const tokenResponse = await call('/auth/v1/token?grant_type=password',{
 method:'POST',
 body:{email,password}
});
const accessToken=tokenResponse.data?.access_token;
assert(typeof accessToken==='string'&&accessToken.split('.').length===3,
 'HOSTED_AUTH_DID_NOT_ISSUE_JWT');
const jwtClaims=JSON.parse(Buffer.from(accessToken.split('.')[1],'base64url').toString('utf8'));
assert(idRegex.test(jwtClaims.sub),'HOSTED_AUTH_JWT_SUB_INVALID');
assert(jwtClaims.role==='authenticated','HOSTED_AUTH_JWT_ROLE_NOT_AUTHENTICATED');
assert(jwtClaims.exp>Math.floor(Date.now()/1000),'HOSTED_AUTH_TOKEN_EXPIRED');
const me=await call('/auth/v1/user',{token:accessToken});
assert(me.data?.id===jwtClaims.sub,'HOSTED_AUTH_JWT_USER_MISMATCH');
console.log('XSTORE_019O_HOSTED_SUPABASE_AUTH_SIGNED_SESSION=PASS');

// Exactly-one-self-profile read, never disclose name/account/employee data.
const selfPath='/rest/v1/profiles?select=id,role,status,access_scope&id=eq.'+encodeURIComponent(jwtClaims.sub);
const p=await call(selfPath,{token:accessToken});
assert(Array.isArray(p.data)&&p.data.length===1,'HOSTED_AUTH_PROFILE_SELF_RLS_FAILED');
const profile=p.data[0];
assert(profile.id===jwtClaims.sub,'HOSTED_AUTH_PROFILE_ID_MISMATCH');
assert(profile.status==='ACTIVE','HOSTED_AUTH_QA_ACCOUNT_NOT_ACTIVE');
const role=String(profile.role||'').toUpperCase();
assert(/^[A-Z_]+$/.test(role),'HOSTED_AUTH_INVALID_CANONICAL_ROLE');
const actual=await call('/rest/v1/rpc/current_user_role',{
 method:'POST',body:{},token:accessToken
});
assert(String(actual.data||'').toUpperCase()===role,'HOSTED_AUTH_ROLE_RPC_MISMATCH');
console.log('XSTORE_019O_HOSTED_SELF_PROFILE_AND_CANONICAL_ROLE=PASS; ROLE='+role);

// Verify non-Owner cannot read *any* other profile under live RLS.
// Only IDs are requested; no names, emails, phones or other employee data.
if(role!=='OWNER'){
 const other=await call('/rest/v1/profiles?select=id&id=neq.'+
   encodeURIComponent(jwtClaims.sub)+'&limit=1',{token:accessToken});
 assert(Array.isArray(other.data)&&other.data.length===0,
   'HOSTED_AUTH_FOREIGN_PROFILE_RLS_LEAK');
 console.log('XSTORE_019O_HOSTED_FOREIGN_PROFILE_READ_DENIED=PASS');
}else {
 console.log('XSTORE_019O_HOSTED_FOREIGN_PROFILE_READ_DENIED=NOT_APPLICABLE_OWNER');
}
// Do not claim complete role matrix: only one authorized account was checked.
console.log('XSTORE_019O_HOSTED_ROLE_MATRIX=PARTIAL; COVERED_ONE_ROLE='+role+
 '; LIFECYCLE_RPC_NOT_DEPLOYED; NO_EMPLOYEE_WRITE; NO_PII_OUTPUT');
