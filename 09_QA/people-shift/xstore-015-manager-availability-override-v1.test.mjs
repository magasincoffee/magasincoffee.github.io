import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const sql=read("07_DATABASE/migrations/20261004224500_xstore_015_manager_availability_override_v1.sql");
const ui=read("05_MANAGER/Workforce/draft-publish-v1.js");
const engine=read("05_MANAGER/Workforce/engine-v1.js");
const auto=read("07_DATABASE/migrations/20261004222500_xstore_014_interval_composed_auto_schedule_v1.sql");
const lifecycle=read("07_DATABASE/migrations/20260928162000_xstore_004_006_cross_store_scheduling_v1.sql");

test("XSTORE-015 server-tags only manual DRAFT Availability override",()=>{
  assert.match(sql,/replace_schedule_generation_assignments/);
  assert.match(sql,/MANAGER_AVAILABILITY_OVERRIDE/);
  assert.match(sql,/select exists\([\s\S]*from public\.employee_availability ea/);
  assert.match(sql,/v_warning := 'MANAGER_AVAILABILITY_OVERRIDE'/);
  assert.match(sql,/ASSIGNMENT_EMPLOYEE_NOT_FOUND/);
  assert.match(sql,/STORE_NOT_ELIGIBLE/);
});

test("XSTORE-015 validator converts explicit override mismatch to warning only",()=>{
  assert.match(sql,/if upper\(coalesce\(a\.warning,''\)\)='MANAGER_AVAILABILITY_OVERRIDE'/);
  assert.match(sql,/v_warnings := v_warnings \|\| jsonb_build_object\([\s\S]*'code','MANAGER_AVAILABILITY_OVERRIDE'/);
  assert.match(sql,/else[\s\S]*'code','AVAILABILITY_MISMATCH'/);
  assert.match(sql,/'warning_count',jsonb_array_length\(v_warnings\)/);
  assert.match(sql,/'valid',jsonb_array_length\(v_violations\)=0/);
});

test("hard safety stays fail-closed",()=>{
  for(const token of [
    "STORE_NOT_ELIGIBLE",
    "EMPLOYEE_INACTIVE",
    "EMPLOYEE_NOT_STAFF",
    "ASSIGNMENT_OVERLAP",
    "CROSS_STORE_ASSIGNMENT_OVERLAP",
    "OFFICIAL_SCHEDULE_OVERLAP",
    "MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY",
    "EMPTY_GENERATION"
  ]) assert.ok(sql.includes(token),token);
});

test("review and publish continue to gate through canonical validator",()=>{
  assert.match(lifecycle,/create or replace function public\.review_schedule_generation[\s\S]*validate_schedule_generation_v1\(p_generation_id\)/);
  assert.match(lifecycle,/create or replace function public\.publish_schedule_generation[\s\S]*validate_schedule_generation_v1\(p_generation_id\)/);
});

test("Manager picker reads full canonical eligible employee pool",()=>{
  assert.match(ui,/list_employee_workforce_profiles_v1/);
  assert.match(ui,/eligibleEmployees/);
  assert.match(ui,/profile_status\|\|''\)\.toUpperCase\(\)==='ACTIVE'/);
  assert.match(ui,/priority_store_ids/);
  assert.match(ui,/msdManualEmployee/);
  assert.match(ui,/msdManualDate/);
  assert.match(ui,/msdManualStart/);
  assert.match(ui,/msdManualEnd/);
  assert.match(ui,/Quản lý điều động ngoài thời gian đăng ký/);
  assert.match(ui,/MANAGER_AVAILABILITY_OVERRIDE/);
  assert.match(ui,/Trong thời gian còn trống/);
  assert.match(ui,/Điều động thủ công/);
});

test("runtime cache retains XSTORE-015 Manager editor behavior through later IA revision",()=>{
  assert.match(engine,/draft-publish-v1\.js\?v=(?:20261004-xstore-015|20261004-xstore-016|20261005-xstore-017|20261005-xstore-018|20261005-xstore-019)/);
});

test("Auto Schedule remains Availability-bound and never gains override marker",()=>{
  assert.match(auto,/from public\.employee_availability ea/);
  assert.match(auto,/ea\.availability_type in \('AVAILABLE','PREFERRED'\)/);
  assert.doesNotMatch(auto,/MANAGER_AVAILABILITY_OVERRIDE/);
  assert.match(auto,/'DRAFT','AUTO_XSTORE_INTERVAL_COMPOSED_V1'/);
});

console.log("XSTORE_015_MANAGER_AVAILABILITY_OVERRIDE=PASS");
