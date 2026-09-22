import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const migrationUrl=new URL("../../07_DATABASE/migrations/20260922143000_task_098_manual_time_attendance_authority_v1.sql",import.meta.url);
const fixtureUrl=new URL("./shift-give-lifecycle-fixture.html",import.meta.url);

test("TASK-098 schema adds raw submission/review/confirmed fields without rewriting legacy rows",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  for(const field of ["actual_start","actual_end","submitted_at","submission_status","reviewed_by","reviewed_at","review_decision","confirmed_start","confirmed_end","confirmed_minutes"]){
    assert.match(sql,new RegExp(`add column if not exists ${field}\\b`,"i"));
  }
  assert.match(sql,/'OPEN','COMPLETED','DELETED','DELETED_BY_MANAGER'/);
  assert.match(sql,/'SUBMITTED','NORMAL','NEEDS_REVIEW','APPROVED','ADJUSTED','REJECTED'/);
  assert.doesNotMatch(sql,/update\s+public\.attendance\s+set\s+status\s*=\s*'SUBMITTED'/i);
});

test("TASK-098 canonical submit uses current assignment owner under shared Give/Swap schedule lock",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/create or replace function public\.submit_manual_time_attendance_v1/i);
  assert.match(sql,/shift_swap_schedule:/);
  assert.match(sql,/from public\.work_schedules[\s\S]*where id = p_schedule_id[\s\S]*for update/i);
  assert.match(sql,/validate_attendance_assignment_authority_v1\(p_schedule_id, v_uid\)/);
  assert.match(sql,/v_schedule\.user_id <> p_employee_id[\s\S]*ATTENDANCE_NOT_CURRENT_OWNER/);
  assert.match(sql,/v_profile\.status <> 'ACTIVE'/);
  assert.match(sql,/v_profile\.role <> 'STAFF'/);
});

test("TASK-098 manual-time submit is fail-closed to NEEDS_REVIEW and does not create confirmed work time",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/p_actual_start time/);
  assert.match(sql,/p_actual_end time/);
  assert.match(sql,/'NEEDS_REVIEW',[\s\S]*p_actual_start,[\s\S]*p_actual_end,[\s\S]*now\(\),[\s\S]*'SUBMITTED'/);
  assert.match(sql,/'status', 'NEEDS_REVIEW'/);
  const submit=sql.split(/create or replace function public\.submit_manual_time_attendance_v1/i)[1].split(/create or replace function public\.clock_in_for_schedule/i)[0];
  assert.doesNotMatch(submit,/confirmed_start\s*=|confirmed_end\s*=|confirmed_minutes\s*=/i);
  assert.doesNotMatch(submit,/hours_worked\s*=|amount\s*=/i);
});

test("TASK-098 attendance submit retry converges on one active attendance identity",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/already_submitted', true/);
  assert.match(sql,/ATTENDANCE_ACTIVE_SUBMISSION_EXISTS/);
  assert.match(sql,/when unique_violation then/);
  assert.match(sql,/status not in \('DELETED','DELETED_BY_MANAGER'\)/);
});

test("TASK-098 hardens transitional legacy mutation paths against transfer races",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  const clockIn=sql.split(/create or replace function public\.clock_in_for_schedule/i)[1].split(/create or replace function public\.clock_out_attendance/i)[0];
  const clockOut=sql.split(/create or replace function public\.clock_out_attendance/i)[1].split(/create or replace function public\.manual_attendance_from_schedule/i)[0];
  const legacyManual=sql.split(/create or replace function public\.manual_attendance_from_schedule/i)[1].split(/revoke execute on function public\.manual_attendance_from_schedule/i)[0];
  for(const src of [clockIn,clockOut,legacyManual]){
    assert.match(src,/shift_swap_schedule:/);
    assert.match(src,/validate_attendance_assignment_authority_v1/);
  }
  assert.match(clockIn,/for update/i);
  assert.match(clockOut,/for update/i);
  assert.match(legacyManual,/for update of ws/i);
});

test("TASK-098 removes automatic planned-schedule attendance authority and anonymous legacy reader execution",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/revoke execute on function public\.auto_attendance_from_approved_schedules\(date,date\) from public, anon, authenticated/i);
  assert.match(sql,/grant execute on function public\.auto_attendance_from_approved_schedules\(date,date\) to postgres/i);
  assert.match(sql,/revoke execute on function public\.get_my_attendance\(\) from public, anon/i);
  assert.match(sql,/revoke all on table public\.attendance from public, anon, authenticated/i);
});

test("TASK-098 operational RPC boundary is least-privilege and internal validator is postgres-only",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/security definer[\s\S]*set search_path = public/i);
  assert.match(sql,/revoke execute on function public\.validate_attendance_assignment_authority_v1\(uuid,uuid\) from public, anon, authenticated/i);
  assert.match(sql,/grant execute on function public\.validate_attendance_assignment_authority_v1\(uuid,uuid\) to postgres/i);
  assert.match(sql,/revoke execute on function public\.submit_manual_time_attendance_v1\(uuid,time,time,text\) from public, anon/i);
  assert.match(sql,/grant execute on function public\.submit_manual_time_attendance_v1\(uuid,time,time,text\) to authenticated, postgres/i);
});

test("TASK-098 notification semantics distinguish manual submission from legacy clock events",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/ATTENDANCE_SUBMITTED/);
  assert.match(sql,/ATTENDANCE_NEEDS_REVIEW/);
  assert.match(sql,/new\.submission_status = 'SUBMITTED'/);
  assert.match(sql,/Legacy compatibility only/);
  assert.match(sql,/ATTENDANCE_CLOCKED_IN/);
  assert.match(sql,/ATTENDANCE_CLOCKED_OUT/);
});

test("TASK-098 E2E-08 fixture proves old-owner denial, new-owner authority, idempotency and no confirmed-time invention",async()=>{
  const fixture=await fs.readFile(fixtureUrl,"utf8");
  assert.match(fixture,/submit_manual_time_attendance_v1/);
  assert.match(fixture,/ATTENDANCE_NOT_CURRENT_OWNER/);
  assert.match(fixture,/submission_status:"SUBMITTED"/);
  assert.match(fixture,/status:"NEEDS_REVIEW"/);
  assert.match(fixture,/confirmed_start:null,confirmed_end:null,confirmed_minutes:null/);
  assert.match(fixture,/already_submitted:true/);
  assert.match(fixture,/ATTENDANCE_SUBMITTED/);
  assert.match(fixture,/ATTENDANCE_NEEDS_REVIEW/);
});
