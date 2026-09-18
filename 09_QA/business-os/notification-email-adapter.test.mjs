import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  accessScopeIncludesStore,
  buildEnvelope,
  readEmailConfig,
  uniqueRecipients
} from "../../supabase/functions/notification-email-worker/email-worker-core.mjs";

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

test("TASK-035 worker never claims queue before provider adapter initializes",async()=>{
  const source=await read("supabase/functions/notification-email-worker/index.ts");
  const configPos=source.indexOf("readEmailConfig(Deno.env)");
  const providerPos=source.indexOf("loadProviderAdapter(config.provider)");
  const claimPos=source.indexOf("const rows=await claim(25)");
  assert.ok(configPos>=0&&providerPos>configPos&&claimPos>providerPos);
  assert.match(source,/CONFIG_REQUIRED/);
  assert.match(source,/PROVIDER_NOT_REGISTERED/);
  assert.match(source,/SUPABASE_SECRET_KEYS/);
  assert.match(source,/claim_notification_email_batch_v1/);
  assert.match(source,/complete_notification_email_v1/);
  assert.match(source,/profiles\?select=email,full_name/);
  assert.doesNotMatch(source,/RESEND_API_KEY|SENDGRID_API_KEY|MAILGUN_API_KEY|SMTP_PASSWORD|GMAIL_CLIENT_SECRET/);
});

test("TASK-035 machine contract preserves exact Owner activation boundary",async()=>{
  const spec=JSON.parse(await read("02_CORE/contracts/notification-email-adapter.v1.json"));
  assert.equal(spec.task,"TASK-035");
  assert.equal(spec.status,"OWNER_DECISION_REQUIRED");
  assert.equal(spec.provider_independent.claim_after_provider_initialization,true);
  assert.equal(spec.provider_independent.credentials_in_git,false);
  assert.equal(spec.owner_approved.sender_email,"bachvanti1994@gmail.com");
  assert.deepEqual(spec.activation_boundary.resolved_owner_inputs,{
    EXACT_MAGASIN_SENDER_EMAIL:"bachvanti1994@gmail.com"
  });
  assert.deepEqual(spec.activation_boundary.required_owner_inputs,[
    "CONCRETE_EMAIL_PROVIDER"
  ]);
  assert.equal(spec.activation_boundary.deploy_edge_function,false);
  assert.equal(spec.activation_boundary.set_provider_secrets,false);
  assert.equal(spec.activation_boundary.send_email,false);
  assert.equal(spec.required_project_state,"WAIT_USER");
});
