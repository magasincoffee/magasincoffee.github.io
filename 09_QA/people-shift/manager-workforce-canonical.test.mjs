import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read=p=>fs.readFile(new URL("../../"+p,import.meta.url),"utf8");

test("Manager runtime owns Workforce through canonical module only",async()=>{
  const runtime=await read("05_MANAGER/runtime/manager-runtime-v1.html");
  assert.match(runtime,/\/05_MANAGER\/Workforce\/engine-v1\.js/);
  const legacy=["manager-workforce-live.js","manager-workforce-review-v2.js","manager-workforce-demand-v4.js","manager-workforce-auto.js","manager-workforce-tabs-v1.js","manager-workforce-day-header-fix-v2.js"];
  for(const file of legacy)assert.equal(runtime.includes(file),false,file);
});

test("Canonical Manager Workforce keeps writes behind RPC and Robot draft-only",async()=>{
  const review=await read("05_MANAGER/Workforce/review-v1.js");
  const draft=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  const official=await read("05_MANAGER/Workforce/official-v1.js");
  const demand=await read("05_MANAGER/Workforce/demand-v1.js");
  const engine=await read("05_MANAGER/Workforce/engine-v1.js");
  for(const file of ["demand-v1.js","review-v1.js","draft-publish-v1.js","official-v1.js"])assert.equal(engine.includes(file),true,file);
  assert.equal(review.includes("get_manager_weekly_availability"),true);
  assert.equal(review.includes("manager_update_employee_availability"),true);
  assert.equal(review.includes(".from('employee_availability').update"),false);
  assert.equal(demand.includes("get_workforce_staffing_requirements"),true);
  assert.equal(demand.includes("OWNER_ONLY"),true);
  assert.equal(demand.includes("upsert_workforce_staffing_requirement"),false);
  assert.equal(demand.includes("delete_workforce_staffing_requirement"),false);
  for(const rpc of ["auto_generate_schedule_generation","get_schedule_generation_assignments","replace_schedule_generation_assignments","validate_schedule_generation_v1","review_schedule_generation","publish_schedule_generation"])assert.equal(draft.includes(rpc),true,rpc);
  const start=draft.indexOf("async function robot");
  const end=draft.indexOf("document.addEventListener('magasin:schedule-robot-request'");
  const robot=draft.slice(start,end);
  assert.equal(robot.includes("review_schedule_generation"),false);
  assert.equal(robot.includes("publish_schedule_generation"),false);
  assert.equal(official.includes("get_manager_weekly_schedule"),true);
  assert.equal(official.includes(".from('work_schedules')"),false);
});

test("Manager deep-links use canonical runtime",async()=>{
  for(const p of ["05_MANAGER/Workforce/index.html","05_MANAGER/Lich-lam/index.html"]){
    const source=await read(p);
    assert.equal(source.includes("shared-core-v1.js"),true);
    assert.equal(source.includes("manager-runtime-v1.html"),true);
    assert.equal(source.includes("manager-v13-runtime.html"),false);
  }
});
