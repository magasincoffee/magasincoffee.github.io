import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const migrationPath=new URL("../../07_DATABASE/migrations/20260925033927_sched_08_live_validator_alias_fix_v1.sql",import.meta.url);

test("SCHED-08 migration repairs the live PostgreSQL 42702 validator ambiguity",async()=>{
  const sql=await fs.readFile(migrationPath,"utf8");

  assert.match(sql,/create or replace function public\.validate_schedule_generation_v1\(p_generation_id uuid\)/i);
  assert.match(sql,/security definer/i);
  assert.match(sql,/set search_path = public/i);

  // The daily-count SQL alias must not collide with the outer PL/pgSQL record variable "a".
  assert.match(sql,/for r in\s+select asg\.user_id,asg\.work_date,[\s\S]*from public\.schedule_generation_assignments asg[\s\S]*group by asg\.user_id,asg\.work_date/i);
  assert.doesNotMatch(sql,/for r in\s+select a\.user_id,a\.work_date,[\s\S]*from public\.schedule_generation_assignments a/i);

  for(const code of [
    "GENERATION_STATUS_NOT_VALIDATABLE",
    "GENERATION_STORE_INVALID",
    "INVALID_GENERATION_WEEK",
    "COMPETING_GENERATION_EXISTS",
    "OFFICIAL_STORE_WEEK_ALREADY_EXISTS",
    "EMPLOYEE_NOT_FOUND",
    "EMPLOYEE_INACTIVE",
    "EMPLOYEE_NOT_STAFF",
    "ASSIGNMENT_STORE_MISMATCH",
    "ASSIGNMENT_OUTSIDE_GENERATION_WEEK",
    "INVALID_ASSIGNMENT_INTERVAL",
    "ASSIGNMENT_STATUS_INVALID",
    "AVAILABILITY_MISMATCH",
    "ASSIGNMENT_OVERLAP",
    "OFFICIAL_SCHEDULE_OVERLAP",
    "MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY"
  ]) assert.match(sql,new RegExp(code),code);

  assert.match(sql,/revoke execute on function public\.validate_schedule_generation_v1\(uuid\) from public,anon/i);
  assert.match(sql,/grant execute on function public\.validate_schedule_generation_v1\(uuid\) to authenticated/i);

  assert.doesNotMatch(sql,/alter table|create table|drop table|truncate|delete\s+from|update\s+public\./i);
});

test("SCHED-08 repair preserves canonical availability and official-schedule validation semantics",async()=>{
  const sql=await fs.readFile(migrationPath,"utf8");
  assert.match(sql,/availability_type in \('AVAILABLE','PREFERRED'\)/);
  assert.match(sql,/public\.work_schedules ws/);
  assert.match(sql,/ws\.status in \('PENDING','APPROVED'\)/);
  assert.match(sql,/'assignment_count'/);
  assert.match(sql,/'valid'/);
  assert.match(sql,/'violations'/);
  assert.match(sql,/'warnings'/);
});
