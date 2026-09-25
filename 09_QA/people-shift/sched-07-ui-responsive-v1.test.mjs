import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const css=fs.readFileSync("02_CORE/ui/workforce-scheduling-polish-v1.css","utf8");
const employee=fs.readFileSync("06_EMPLOYEE/schedule/engine-v1.js","utf8");
const manager=fs.readFileSync("05_MANAGER/Workforce/draft-publish-v1.js","utf8");

test("SCHED-07 shared polish is loaded by all canonical scheduling roles",()=>{
  assert.match(employee,/workforce-scheduling-polish-v1\.css/);
  assert.match(manager,/workforce-scheduling-polish-v1\.css/);
  assert.match(employee,/dataset\.schedulingRole='employee'/);
  assert.match(manager,/dataset\.schedulingRole=actorRole\(\)\.toLowerCase\(\)/);
});

test("SCHED-07 enforces touch, focus and responsive mobile board contracts",()=>{
  assert.match(css,/min-height:44px/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/@media \(max-width:720px\)/);
  assert.match(css,/grid-template-columns:1fr !important/);
  assert.match(css,/min-width:0 !important/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test("SCHED-07 remains presentation-only",()=>{
  const combined=css+"\n"+employee+"\n"+manager;
  assert.doesNotMatch(css,/supabase|rpc\(|from\(/i);
  assert.match(manager,/create_schedule_generation/);
  assert.match(manager,/publish_schedule_generation/);
  assert.match(employee,/list_my_approved_schedules_v2/);
  assert.doesNotMatch(css,/service_role|secret|token/i);
  assert.ok(combined.length>1000);
});
