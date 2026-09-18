import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {buildEmailEnvelope,runEmailBatch,validateEmailActivation} from "../../02_CORE/notification/email-delivery-core-v1.mjs";

const read=p=>fs.readFile(new URL("../../"+p,import.meta.url),"utf8");

test("TASK-035 activation fails closed before claiming when provider config is unresolved",async()=>{
  let claimCalls=0;
  const result=await runEmailBatch({
    config:{provider:"",sender:"",credentialAvailable:false},
    claimBatch:async()=>{claimCalls+=1;return[];}
  });
  assert.equal(result.status,"CONFIG_PENDING");
  assert.deepEqual(result.activation.missing,["provider","sender","credential"]);
  assert.equal(claimCalls,0);
});

test("TASK-035 envelope deduplicates recipient addresses and requires blind recipient semantics",()=>{
  const envelope=buildEmailEnvelope({
    id:"n1",
    event_key:"event:1",
    event_type:"SCHEDULE_PUBLISHED",
    title:"Lịch làm",
    message:"Ca mới"
  },[
    {email:"Staff@example.com"},
    {email:"staff@example.com"},
    {email:"manager@example.com"}
  ]);
  assert.deepEqual(envelope.recipients,["Staff@example.com","manager@example.com"]);
  assert.equal(envelope.privacy,"BLIND_RECIPIENTS");
  assert.equal(envelope.idempotencyKey,"event:1");
});

test("TASK-035 batch sends, permanently skips no-target events and retries transport failures",async()=>{
  const completed=[]; const skipped=[]; const sent=[];
  const claimed=[
    {id:"n1",event_key:"e1",event_type:"SCHEDULE_PUBLISHED",title:"A",message:"A1"},
    {id:"n2",event_key:"e2",event_type:"SHIFT_SWAP_MANAGER_REVIEW",title:"B",message:"B1"},
    {id:"n3",event_key:"e3",event_type:"SCHEDULE_CHANGED",title:"C",message:"C1"}
  ];
  const result=await runEmailBatch({
    config:{provider:"configured-provider",sender:"ops@example.com",credentialAvailable:true},
    claimBatch:async()=>claimed,
    resolveTargets:async id=>id==="n2"?[]:[{email:id==="n1"?"a@example.com":"c@example.com"}],
    send:async envelope=>{sent.push(envelope.notificationId);if(envelope.notificationId==="n3") throw new Error("TRANSIENT_PROVIDER_ERROR");},
    complete:async(...args)=>completed.push(args),
    skip:async(...args)=>skipped.push(args)
  });
  assert.deepEqual(sent,["n1","n3"]);
  assert.deepEqual(skipped,[["n2","NO_ACTIVE_EMAIL_TARGET"]]);
  assert.deepEqual(completed,[["n1",true,null],["n3",false,"TRANSIENT_PROVIDER_ERROR"]]);
  assert.deepEqual({sent:result.sent,skipped:result.skipped,failed:result.failed},{sent:1,skipped:1,failed:1});
});

test("TASK-035 machine contract keeps provider activation Owner-gated",async()=>{
  const spec=JSON.parse(await read("02_CORE/contracts/magasin-email-adapter.v1.json"));
  assert.equal(spec.status,"WAIT_PROVIDER_ACTIVATION");
  assert.equal(spec.worker_contract.claim_only_when_config_ready,true);
  assert.equal(spec.worker_contract.blind_recipient_semantics,true);
  assert.equal(spec.activation_boundary.status,"OWNER_INPUT_REQUIRED");
  assert.deepEqual(spec.activation_boundary.required.map(x=>x.id),["EMAIL-001","EMAIL-002","EMAIL-003"]);
  assert.equal(spec.guardrails.provider_send_invoked,false);
  assert.equal(spec.guardrails.scheduler_enabled,false);
  assert.equal(spec.guardrails.credentials_in_public_git,false);
});
