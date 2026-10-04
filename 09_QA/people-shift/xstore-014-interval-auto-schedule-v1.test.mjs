import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const sql=read("07_DATABASE/migrations/20261004222500_xstore_014_interval_composed_auto_schedule_v1.sql");
const coverage=read("07_DATABASE/migrations/20261004220500_xstore_013_continuous_coverage_shortage_v1.sql");
const c04=read("07_DATABASE/migrations/20261001175825_xstore_c04_recurring_auto_projection_v1.sql");

test("XSTORE-014 replaces whole-block matching with interval composition",()=>{
  assert.match(sql,/create or replace function public\.auto_generate_cross_store_schedule_v1/);
  assert.match(sql,/evaluate_workforce_coverage_shortages_v1/);
  assert.match(sql,/greatest\(g\.shortage_start,ea\.start_time\)/);
  assert.match(sql,/least\(g\.shortage_end,ea\.end_time\)/);
  assert.match(sql,/AUTO_XSTORE_INTERVAL_COMPOSED_V1/);
  assert.doesNotMatch(sql,/ea\.start_time<=r\.start_time/);
  assert.doesNotMatch(sql,/ea\.end_time>=r\.end_time/);
});

test("XSTORE-014 returns exact shortage intervals from XSTORE-013 semantics",()=>{
  assert.match(coverage,/count\(distinct n\.employee_key\)/);
  assert.match(sql,/'start_time',g\.shortage_start/);
  assert.match(sql,/'end_time',g\.shortage_end/);
  assert.match(sql,/'assigned',g\.assigned_headcount/);
  assert.match(sql,/'missing',g\.missing_headcount/);
  assert.match(sql,/'coverage_semantics','CONTINUOUS_INTERVAL_V1'/);
});

test("XSTORE-014 Auto Schedule remains Availability-bound and DRAFT-only",()=>{
  assert.match(sql,/from public\.employee_availability ea/);
  assert.match(sql,/ea\.availability_type in \('AVAILABLE','PREFERRED'\)/);
  assert.match(sql,/employee_store_priorities/);
  assert.match(sql,/'DRAFT','AUTO_XSTORE_INTERVAL_COMPOSED_V1'/);
  assert.match(sql,/'published',false/);
  assert.doesNotMatch(sql,/MANAGER_AVAILABILITY_OVERRIDE/);
  assert.doesNotMatch(sql,/publish_schedule_generation/);
});

test("XSTORE-014 preserves global overlap and official safety boundaries",()=>{
  assert.match(sql,/gx\.status in \('DRAFT','REVIEWED'\)/);
  assert.match(sql,/x\.start_time<least\(g\.shortage_end,ea\.end_time\)/);
  assert.match(sql,/from public\.work_schedules ws/);
  assert.match(sql,/OFFICIAL_WEEK_ALREADY_EXISTS/);
  assert.match(sql,/NON_DRAFT_GENERATION_EXISTS/);
  assert.match(sql,/EXISTING_DRAFT_REQUIRES_CONFIRMATION/);
  assert.match(sql,/SCHEDULER_ITERATION_GUARD/);
});

test("XSTORE-C04 remains historical recurring cutover evidence",()=>{
  assert.match(c04,/workforce_recurring_staffing_requirements/);
  assert.match(c04,/ea\.start_time<=r\.start_time/);
  assert.match(c04,/ea\.end_time>=r\.end_time/);
});

console.log("XSTORE_014_INTERVAL_COMPOSED_AUTO_SCHEDULE=PASS");
