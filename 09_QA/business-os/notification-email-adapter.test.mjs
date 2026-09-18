import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  accessScopeIncludesStore,
  buildEnvelope,
  readEmailConfig,
  uniqueRecipients
} from "../../supabase/functions/notification-email-worker/email-worker-core.mjs";
import {
  buildGmailRawMessage,
  createGmailProvider,
  readGmailOAuthConfig
} from "../../supabase/functions/notification-email-worker/gmail-provider.mjs";

const read=p=>fs.readFile(new URL("../../"+p,import.meta.url),"utf8");

test("TASK-035 config fails closed until provider and sender are explicit",()=>{
  const empty={get:()=>undefined};
  assert.deepEqual(readEmailConfig(empty),{
    provider:"",from:"",replyTo:null,ready:false,
    missing:["MAGASIN_EMAIL_PROVIDER","MAGASIN_EMAIL_FROM"]
  });
  const values=new Map([
    ["MAGASIN_EMAIL_PROVIDER","example-provider"],
    ["MAGASIN_EMAIL_FROM","ops@example.invalid"],
    ["MAGASIN_EMAIL_REPLY_TO","reply@example.invalid"]
  ]);
  assert.deepEqual(readEmailConfig({get:k=>values.get(k)}),{
    provider:"example-provider",from:"ops@example.invalid",replyTo:"reply@example.invalid",ready:true,missing:[]
  });
});

test("TASK-035 store-manager recipient scope mirrors canonical access-scope semantics",()=>{
  assert.equal(accessScopeIncludesStore("ALL","CN2"),true);
  assert.equal(accessScopeIncludesStore("*","CN2"),true);
  assert.equal(accessScopeIncludesStore("CN1,CN2","CN2"),true);
  assert.equal(accessScopeIncludesStore("CN1;CN3","CN2"),false);
});

test("TASK-035 recipient normalization deduplicates and rejects malformed email",()=>{
  assert.deepEqual(uniqueRecipients([
    {email:"Manager@Example.com",full_name:"Manager A"},
    {email:"manager@example.com",full_name:"Duplicate"},
    {email:"",full_name:"Missing"},
    {email:"not-an-email",full_name:"Invalid"}
  ]),[{email:"manager@example.com",name:"Manager A"}]);
});

test("TASK-035 envelope contains operational message but no provider credential",()=>{
  const envelope=buildEnvelope(
    {id:"n-1",event_type:"SCHEDULE_CHANGED",title:"Lịch đổi",message:"Ca của bạn đã đổi."},
    [{email:"staff@example.com",name:"Staff"}],
    {from:"magasin@example.com",replyTo:null}
  );
  assert.equal(envelope.eventId,"n-1");
  assert.equal(envelope.subject,"Lịch đổi");
  assert.equal(envelope.text,"Ca của bạn đã đổi.");
  assert.deepEqual(envelope.to,[{email:"staff@example.com",name:"Staff"}]);
  assert.equal("apiKey" in envelope,false);
  assert.equal("token" in envelope,false);
});


test("TASK-035 Gmail OAuth config fails closed before provider initialization",()=>{
  const empty={get:()=>undefined};
  assert.deepEqual(readGmailOAuthConfig(empty),{
    clientId:"",clientSecret:"",refreshToken:"",ready:false,
    missing:["GMAIL_OAUTH_CLIENT_ID","GMAIL_OAUTH_CLIENT_SECRET","GMAIL_OAUTH_REFRESH_TOKEN"]
  });
});

test("TASK-035 Gmail adapter initializes OAuth before send and emits Gmail API raw message",async()=>{
  const values=new Map([
    ["GMAIL_OAUTH_CLIENT_ID","client-id"],
    ["GMAIL_OAUTH_CLIENT_SECRET","client-secret"],
    ["GMAIL_OAUTH_REFRESH_TOKEN","refresh-token"]
  ]);
  const calls=[];
  const fakeFetch=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).includes("oauth2.googleapis.com/token")){
      return {ok:true,status:200,json:async()=>({access_token:"access-token",expires_in:3600})};
    }
    return {ok:true,status:200,json:async()=>({id:"gmail-message-1"})};
  };
  const provider=createGmailProvider({get:k=>values.get(k)},fakeFetch);
  await provider.initialize();
  const result=await provider.send({
    from:"bachvanti1994@gmail.com",
    replyTo:null,
    to:[{email:"staff@example.com",name:"Staff"}],
    subject:"Lịch làm việc",
    text:"Ca của bạn đã được cập nhật."
  });
  assert.equal(provider.name,"GMAIL_GOOGLE_WORKSPACE");
  assert.equal(result.providerMessageId,"gmail-message-1");
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,"https://oauth2.googleapis.com/token");
  assert.equal(calls[1].url,"https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
  assert.equal(calls[1].options.headers.authorization,"Bearer access-token");
  const payload=JSON.parse(calls[1].options.body);
  assert.equal(typeof payload.raw,"string");
  assert.ok(payload.raw.length>20);
  assert.equal(payload.raw,buildGmailRawMessage({
    from:"bachvanti1994@gmail.com",
    replyTo:null,
    to:[{email:"staff@example.com",name:"Staff"}],
    subject:"Lịch làm việc",
    text:"Ca của bạn đã được cập nhật."
  }));
});

test("TASK-035 worker never claims queue before provider adapter initializes",async()=>{
  const source=await read("supabase/functions/notification-email-worker/index.ts");
  const configPos=source.indexOf("readEmailConfig(Deno.env)");
  const providerPos=source.indexOf("loadProviderAdapter(config.provider)");
  const claimPos=source.indexOf("const rows=await claim(25)");
  assert.ok(configPos>=0&&providerPos>configPos&&claimPos>providerPos);
  assert.match(source,/CONFIG_REQUIRED/);
  assert.match(source,/PROVIDER_NOT_REGISTERED/);
  assert.match(source,/PROVIDER_CONFIG_REQUIRED/);
  assert.match(source,/PROVIDER_INITIALIZATION_FAILED/);
  assert.match(source,/createGmailProvider/);
  assert.match(source,/await adapter\.initialize\(\)/);
  assert.match(source,/SUPABASE_SECRET_KEYS/);
  assert.match(source,/claim_notification_email_batch_v1/);
  assert.match(source,/complete_notification_email_v1/);
  assert.match(source,/profiles\?select=email,full_name/);
  assert.doesNotMatch(source,/RESEND_API_KEY|SENDGRID_API_KEY|MAILGUN_API_KEY|SMTP_PASSWORD/);
});

test("TASK-035 machine contract preserves exact Owner activation boundary",async()=>{
  const spec=JSON.parse(await read("02_CORE/contracts/notification-email-adapter.v1.json"));
  assert.equal(spec.task,"TASK-035");
  assert.equal(spec.status,"PROVIDER_SELECTED_CREDENTIALS_REQUIRED");
  assert.equal(spec.provider_independent.claim_after_provider_initialization,true);
  assert.equal(spec.provider_independent.credentials_in_git,false);
  assert.equal(spec.owner_approved.sender_email,"bachvanti1994@gmail.com");
  assert.equal(spec.owner_approved.provider,"GMAIL_GOOGLE_WORKSPACE");
  assert.deepEqual(spec.activation_boundary.resolved_owner_inputs,{
    EXACT_MAGASIN_SENDER_EMAIL:"bachvanti1994@gmail.com",
    CONCRETE_EMAIL_PROVIDER:"GMAIL_GOOGLE_WORKSPACE"
  });
  assert.deepEqual(spec.activation_boundary.required_owner_inputs,[]);
  assert.deepEqual(spec.activation_boundary.required_runtime_secrets,[
    "GMAIL_OAUTH_CLIENT_ID",
    "GMAIL_OAUTH_CLIENT_SECRET",
    "GMAIL_OAUTH_REFRESH_TOKEN"
  ]);
  assert.equal(spec.activation_boundary.deploy_edge_function,false);
  assert.equal(spec.activation_boundary.set_provider_secrets,false);
  assert.equal(spec.activation_boundary.send_email,false);
  assert.equal(spec.required_project_state,"WAIT_USER");
});
