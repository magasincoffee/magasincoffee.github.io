import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

test("TASK-036 keeps schedule-first closure on canonical in-app path",async()=>{
  const [stateRaw,queue,current,closure,emailConfig,notification]=await Promise.all([
    read("01_DOCS/MAGASIN/00_PROJECT_STATE.json"),
    read("01_DOCS/MAGASIN/00_TASK_QUEUE.md"),
    read("01_DOCS/MAGASIN/00_CURRENT_STATE.md"),
    read("01_DOCS/MAGASIN/05_SYSTEM/SCHEDULE_FIRST_CLOSURE_REGRESSION_V1.md"),
    read("01_DOCS/MAGASIN/05_SYSTEM/MAGASIN_EMAIL_ADAPTER_CONFIG_V1.md"),
    read("06_EMPLOYEE/notification/engine-v1.js")
  ]);
  const state=JSON.parse(stateRaw);

  assert.equal(state.current_task,"TASK-036");
  assert.equal(state.status,"READY");
  assert.equal(state.autonomy,"AUTO_CONTINUE");
  assert.equal(state.requires_user,false);
  assert.match(queue,/TASK-035[^\n]*DEFERRED/);
  assert.match(queue,/TASK-036[^\n]*IN_PROGRESS/);
  assert.match(current,/Schedule-first closure regression \+ recovery gate/);
  assert.match(closure,/notification outbox[\s\S]*Employee in-app notification/i);
  assert.match(emailConfig,/DEFERRED_BY_OWNER \/ FAIL_CLOSED/);
  assert.match(notification,/list_my_notifications_v1/);
});

test("TASK-036 does not reopen deferred modules or external email",async()=>{
  const closure=await read("01_DOCS/MAGASIN/05_SYSTEM/SCHEDULE_FIRST_CLOSURE_REGRESSION_V1.md");
  assert.match(closure,/Do not add:/);
  assert.match(closure,/Gmail production activation/);
  assert.match(closure,/SOP\/Task write automation/);
  assert.match(closure,/No production fixtures, destructive writes or new credentials/);
});
