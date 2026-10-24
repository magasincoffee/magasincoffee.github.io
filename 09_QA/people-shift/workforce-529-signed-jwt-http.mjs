// Synthetic signed JWT owner/manager/staff QA, disposable GitHub PostgreSQL only.
import {createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
const secret=process.env.QA_529_JWT_SECRET,base=process.env.QA_529_URL||'http://127.0.0.1:3059';
assert.ok(secret&&secret.length>=32);
const ids={owner:'11111111-1111-1111-1111-111111111111',manager:'11111111-1111-1111-1111-111111111112',staff:'11111111-1111-1111-1111-111111111113',inactive:'11111111-1111-1111-1111-111111111114'};
const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function jwt(who){const n=Math.floor(Date.now()/1000),msg=b({alg:'HS256',typ:'JWT'})+'.'+b({role:'authenticated',sub:ids[who],iat:n,exp:n+1800});return msg+'.'+createHmac('sha256',secret).update(msg).digest('base64url')}
async function rpc(name,who,body={},auth=jwt(who)){
 const r=await fetch(base+'/rpc/'+name,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+auth},body:JSON.stringify(body)});const s=await r.text();let data;try{data=JSON.parse(s)}catch{data=s}return {status:r.status,data};
}
const ensure=(name,r,good)=>{assert.equal(r.status>=200&&r.status<300,good,JSON.stringify({name,...r}));console.log('JWT_529 '+name+'='+ (good?'PASS':'DENIED'))};
const capability='get_workforce_auto_scheduler_capabilities_529',writer='auto_generate_cross_store_schedule_529';
ensure('OWNER_CAPABILITY',await rpc(capability,'owner'),true);
ensure('MANAGER_CAPABILITY',await rpc(capability,'manager'),true);
ensure('STAFF_CAPABILITY_DENIED',await rpc(capability,'staff'),false);
ensure('INACTIVE_DENIED',await rpc(capability,'inactive'),false);
const forged=jwt('owner').slice(0,-2)+'AA';
ensure('FORGED_SIGNATURE_DENIED',await rpc(capability,'owner',{},forged),false);
ensure('OWNER_GENERATE',await rpc(writer,'owner',{p_week_start:'2026-10-26',p_replace_existing:false}),true);
ensure('STAFF_GENERATE_DENIED',await rpc(writer,'staff',{p_week_start:'2026-10-26',p_replace_existing:true}),false);
const owner=await rpc(writer,'owner',{p_week_start:'2026-10-26',p_replace_existing:true});
ensure('OWNER_SAFE_RERUN',owner,true);
assert.equal(owner.data?.published,false);
console.log('JWT_529_THREE_ROLE_WRITER=PASS');
