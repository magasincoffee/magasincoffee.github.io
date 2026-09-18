import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

test("TASK-029 schedule-first contract preserves Five-Step order and role ownership",async()=>{
  const spec=JSON.parse(await read("02_CORE/contracts/schedule-first-flow.v1.json"));
  assert.equal(spec.task,"TASK-029");
  assert.equal(spec.phase,"P1_SCHEDULE_FIRST_CORE_FLOW");
  assert.equal(spec.status,"VERIFIED_CONTRACT");
  assert.deepEqual(spec.five_step.accelerate,["TASK-030","TASK-031","TASK-032"]);
  assert.ok(spec.five_step.delete.includes("OWNER_WORKFORCE_AS_CANONICAL_DAILY_OWNER"));
  assert.ok(spec.roles.manager.includes("PUBLISH"));
  assert.deepEqual(spec.roles.owner,["POLICY","EXCEPTION","ATTENTION"]);
  assert.ok(spec.roles.robot.includes("PROPOSE_DRAFT"));
  assert.equal(spec.guardrails.robot_auto_publish,false);
  assert.equal(spec.guardrails.production_write_in_task_029,false);
  assert.equal(spec.guardrails.direct_browser_business_table_write_when_rpc_exists,false);
});

test("TASK-029 canonical data and live RPC boundaries cover the full pre-publish chain",async()=>{
  const spec=JSON.parse(await read("02_CORE/contracts/schedule-first-flow.v1.json"));
  assert.deepEqual(spec.canonical_data_chain.slice(0,5),[
    "employee_availability",
    "staffing_requirements",
    "schedule_generation_runs",
    "schedule_generation_assignments",
    "work_schedules"
  ]);
  const all=Object.values(spec.rpc_boundaries).flat();
  for(const rpc of [
    "save_my_availability",
    "get_manager_weekly_availability",
    "manager_update_employee_availability",
    "get_workforce_staffing_requirements",
    "auto_generate_schedule_generation",
    "replace_schedule_generation_assignments",
    "validate_schedule_generation_v1",
    "review_schedule_generation",
    "publish_schedule_generation",
    "list_my_approved_schedules_v2"
  ]) assert.ok(all.includes(rpc),`missing ${rpc}`);
});

test("architecture docs no longer declare Owner as canonical daily Workforce owner",async()=>{
  const [moduleDoc,ownerReadme,flow]=await Promise.all([
    read("01_DOCS/modules/WORKFORCE.md"),
    read("04_OWNER/Workforce/README.md"),
    read("01_DOCS/MAGASIN/05_SYSTEM/SCHEDULE_FIRST_CANONICAL_FLOW_V1.md")
  ]);
  assert.match(moduleDoc,/Manager.*daily scheduling/i);
  assert.match(ownerReadme,/policy.*exception.*attention/i);
  assert.match(flow,/Manager is daily scheduler/i);
  assert.doesNotMatch(ownerReadme,/canonical home for Owner Workforce/i);
});
