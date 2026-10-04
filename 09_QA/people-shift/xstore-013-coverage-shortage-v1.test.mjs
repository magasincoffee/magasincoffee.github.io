import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const migration=read("07_DATABASE/migrations/20261004220500_xstore_013_continuous_coverage_shortage_v1.sql");
const c04=read("07_DATABASE/migrations/20261001175825_xstore_c04_recurring_auto_projection_v1.sql");

test("XSTORE-013 adds a reusable boundary-driven coverage primitive",()=>{
  assert.match(migration,/evaluate_workforce_coverage_shortages_v1/);
  assert.match(migration,/lead\(b\.boundary\) over\(order by b\.boundary\)/);
  assert.match(migration,/count\(distinct n\.employee_key\)/);
  assert.match(migration,/missing_headcount/);
  assert.match(migration,/lag\(ss\.segment_end\)/);
});

test("XSTORE-013 shortage reader stays on recurring staffing authority",()=>{
  assert.match(migration,/from public\.workforce_recurring_staffing_requirements r/);
  assert.match(migration,/schedule_generation_runs/);
  assert.match(migration,/schedule_generation_assignments/);
  assert.doesNotMatch(migration,/from public\.staffing_requirements/);
  assert.doesNotMatch(migration,/staffing_requirement_templates/);
});

test("XSTORE-013 remains bounded to active Manager or Owner scope",()=>{
  for(const token of ["AUTH_REQUIRED","ROLE_NOT_ALLOWED","ACTOR_NOT_ACTIVE","WEEK_START_MUST_BE_MONDAY","public.can_access_store"]){
    assert.ok(migration.includes(token),token);
  }
  assert.match(migration,/grant execute on function public\.list_cross_store_staffing_shortages_v1\(date\)[\s\S]*to authenticated/);
  assert.match(migration,/revoke execute on function public\.evaluate_workforce_coverage_shortages_v1/);
});

test("XSTORE-013 does not perform the XSTORE-014 Auto Schedule composition cutover",()=>{
  assert.match(c04,/ea\.start_time<=r\.start_time/);
  assert.match(c04,/ea\.end_time>=r\.end_time/);
  assert.doesNotMatch(migration,/create or replace function public\.auto_generate_cross_store_schedule_v1/);
  assert.doesNotMatch(migration,/insert into public\.schedule_generation_assignments/);
});

console.log("XSTORE_013_COVERAGE_SHORTAGE=PASS");
