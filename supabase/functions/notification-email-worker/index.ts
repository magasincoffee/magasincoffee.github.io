import {accessScopeIncludesStore,buildEnvelope,normalizeBatchLimit,readEmailConfig,uniqueRecipients} from "./email-worker-core.mjs";
import {createGmailProvider} from "./gmail-provider.mjs";

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8"}});

function readSecretKeys(){
  try{
    const parsed=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
    return Object.values(parsed).filter(v=>typeof v==="string"&&v.length>0);
  }catch{return []}
}
function adminKey(){
  const modern=readSecretKeys();
  if(modern.length)return modern[0];
  return String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"").trim();
}
function authorized(req){
  const supplied=String(req.headers.get("apikey")||"").trim();
  const keys=readSecretKeys();
  const legacy=String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"").trim();
  if(legacy)keys.push(legacy);
  return !!supplied&&keys.includes(supplied);
}
async function rest(path,options={}){
  const base=String(Deno.env.get("SUPABASE_URL")||"").replace(/\/$/,"");
  const key=adminKey();
  if(!base||!key)throw new Error("SUPABASE_SERVER_CONFIG_REQUIRED");
  const res=await fetch(base+"/rest/v1/"+path,{...options,headers:{"apikey":key,"content-type":"application/json",...(options.headers||{})}});
  if(!res.ok)throw new Error("SUPABASE_REST_"+res.status+":"+await res.text());
  if(res.status===204)return null;
  return res.json();
}
async function resolveRecipients(row){
  if(row.audience_type==="USER"){
    const data=await rest("profiles?select=email,full_name&id=eq."+encodeURIComponent(row.recipient_user_id));
    return uniqueRecipients(data);
  }
  if(row.audience_type==="OWNER"){
    const data=await rest("profiles?select=email,full_name&role=eq.OWNER&status=eq.ACTIVE");
    return uniqueRecipients(data);
  }
  if(row.audience_type==="STORE_MANAGERS"){
    const stores=await rest("stores?select=code&id=eq."+encodeURIComponent(row.store_id));
    const code=stores?.[0]?.code;
    const managers=await rest("profiles?select=email,full_name,access_scope&role=eq.STORE_MANAGER&status=eq.ACTIVE");
    return uniqueRecipients((managers||[]).filter(x=>accessScopeIncludesStore(x.access_scope,code)));
  }
  throw new Error("UNSUPPORTED_AUDIENCE_TYPE");
}
async function claim(limit){
  return rest("rpc/claim_notification_email_batch_v1",{method:"POST",body:JSON.stringify({p_limit:limit})});
}
async function complete(id,success,error=null){
  return rest("rpc/complete_notification_email_v1",{method:"POST",body:JSON.stringify({p_notification_id:id,p_success:success,p_error:error})});
}

async function loadProviderAdapter(providerName){
  const normalized=String(providerName||"").trim().toUpperCase();
  if(normalized!=="GMAIL_GOOGLE_WORKSPACE")throw new Error("PROVIDER_NOT_REGISTERED:"+providerName);
  const adapter=createGmailProvider(Deno.env,fetch);
  await adapter.initialize();
  return adapter;
}

Deno.serve(async(req)=>{
  if(req.method!=="POST")return json({ok:false,code:"METHOD_NOT_ALLOWED"},405);
  if(!authorized(req))return json({ok:false,code:"UNAUTHORIZED"},401);

  const requestBody=await req.json().catch(()=>({}));
  const claimLimit=normalizeBatchLimit(requestBody?.limit);

  const config=readEmailConfig(Deno.env);
  if(!config.ready)return json({ok:false,code:"CONFIG_REQUIRED",missing:config.missing},503);

  let provider;
  try{provider=await loadProviderAdapter(config.provider)}
  catch(e){
    const detail=String(e?.message||e);
    if(detail.startsWith("GMAIL_OAUTH_CONFIG_REQUIRED:")){
      return json({ok:false,code:"PROVIDER_CONFIG_REQUIRED",provider:config.provider,missing:detail.split(":").slice(1).join(":").split(",").filter(Boolean)},503);
    }
    if(detail.startsWith("PROVIDER_NOT_REGISTERED:")){
      return json({ok:false,code:"PROVIDER_NOT_REGISTERED",provider:config.provider},503);
    }
    return json({ok:false,code:"PROVIDER_INITIALIZATION_FAILED",provider:config.provider,detail:detail.slice(0,300)},503);
  }

  // No queue row is claimed before provider configuration and adapter initialization succeed.
  const rows=await claim(claimLimit);
  const results=[];
  for(const row of rows||[]){
    try{
      const recipients=await resolveRecipients(row);
      if(!recipients.length)throw new Error("NO_RECIPIENT_EMAIL");
      const envelope=buildEnvelope(row,recipients,config);
      await provider.send(envelope);
      await complete(row.id,true,null);
      results.push({id:row.id,status:"SENT"});
    }catch(e){
      const message=String(e?.message||e).slice(0,1000);
      await complete(row.id,false,message);
      results.push({id:row.id,status:"FAILED",error:message});
    }
  }
  return json({ok:true,claimLimit,processed:results.length,results});
});
