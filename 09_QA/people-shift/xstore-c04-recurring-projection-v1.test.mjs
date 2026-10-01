import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const sql=fs.readFileSync("07_DATABASE/migrations/20261001175825_xstore_c04_recurring_auto_projection_v1.sql","utf8");

test("one recurring staffing truth is projected, never materialized",()=>{
 assert.match(sql,/workforce_recurring_staffing_requirements/);
 assert.match(sql,/\(p_week_start \+ \(req\.day_of_week::integer - 1\)\)::date as work_date/);
 assert.doesNotMatch(sql,/insert into public\.staffing_requirements/);
 assert.doesNotMatch(sql,/from public\.staffing_requirements/);
});

test("date-bound browser staffing RPCs are cut off after Robot cutover",()=>{
 for(const signature of ["list_cross_store_staffing_requirements_v1(date)","replace_cross_store_staffing_requirements_v1(date,jsonb)"]){
  assert.ok(sql.includes(signature));
 }
 assert.match(sql,/from public,anon,authenticated/g);
});

test("Robot remains bounded DRAFT-only",()=>{
 assert.match(sql,/AUTH_REQUIRED/);
 assert.match(sql,/ROLE_NOT_ALLOWED/);
 assert.match(sql,/ACTOR_NOT_ACTIVE/);
 assert.match(sql,/public\.can_access_store/);
 assert.match(sql,/employee_store_priorities/);
 assert.match(sql,/employee_availability/);
 assert.match(sql,/OFFICIAL_WEEK_ALREADY_EXISTS/);
 assert.match(sql,/NON_DRAFT_GENERATION_EXISTS/);
 assert.match(sql,/'published',false/);
 assert.doesNotMatch(sql,/publish_schedule_generation/);
});

console.log("XSTORE_C04_RECURRING_PROJECTION=PASS");