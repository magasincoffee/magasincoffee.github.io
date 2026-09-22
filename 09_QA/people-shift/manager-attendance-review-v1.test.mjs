import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const migrationUrl=new URL("../../07_DATABASE/migrations/20260922160120_task_100_manager_attendance_review_confirmed_work_time_v1.sql",import.meta.url);
const uiUrl=new URL("../../05_MANAGER/Workforce/attendance-review-v1.js",import.meta.url);
const engineUrl=new URL("../../05_MANAGER/Workforce/engine-v1.js",import.meta.url);

test("TASK-100 migration reuses attendance review/confirmed fields with terminal shape constraints",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/attendance_review_decision_check/);
  assert.match(sql,/review_decision in \('APPROVE','ADJUST','REJECT'\)/);
  assert.match(sql,/attendance_review_shape_check/);
  assert.match(sql,/status = 'APPROVED' and review_decision = 'APPROVE'/);
  assert.match(sql,/status = 'ADJUSTED' and review_decision = 'ADJUST'/);
  assert.match(sql,/status = 'REJECTED' and review_decision = 'REJECT'/);
  assert.match(sql,/attendance_unconfirmed_state_shape_check/);
  assert.match(sql,/confirmed_start is null[\s\S]*confirmed_end is null[\s\S]*confirmed_minutes is null/);
  assert.doesNotMatch(sql,/create table\s+public\.confirmed_work_time/i);
});

test("TASK-100 Manager authority is internal, ACTIVE and store scoped",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/validate_manager_attendance_review_authority_v1/);
  assert.match(sql,/v_profile\.status <> 'ACTIVE'/);
  assert.match(sql,/v_profile\.role not in \('STORE_MANAGER','OWNER'\)/);
  assert.match(sql,/not public\.can_access_store\(p_store_id\)/);
  assert.match(sql,/revoke execute on function public\.validate_manager_attendance_review_authority_v1\(uuid\) from public, anon, authenticated/);
  assert.match(sql,/grant execute on function public\.validate_manager_attendance_review_authority_v1\(uuid\) to postgres/);
});

test("TASK-100 review revalidates schedule ownership under shared Give/Swap lock",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/hashtextextended\('shift_swap_schedule:' \|\| v_schedule_id::text, 0\)/);
  assert.match(sql,/from public\.attendance[\s\S]*for update/);
  assert.match(sql,/from public\.work_schedules[\s\S]*for update/);
  assert.match(sql,/validate_attendance_assignment_authority_v1\(v_att\.schedule_id, v_att\.user_id\)/);
  assert.match(sql,/ATTENDANCE_REVIEW_SCHEDULE_SNAPSHOT_CHANGED/);
  assert.match(sql,/v_att\.status not in \('NORMAL','NEEDS_REVIEW'\)/);
});

test("TASK-100 confirmed time is explicit Manager review and never payroll/legacy amount truth",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/v_start := v_att\.actual_start/);
  assert.match(sql,/v_end := v_att\.actual_end/);
  assert.match(sql,/v_target_status := 'APPROVED'/);
  assert.match(sql,/ATTENDANCE_ADJUST_CONFIRMED_TIME_REQUIRED/);
  assert.match(sql,/v_target_status := 'ADJUSTED'/);
  assert.match(sql,/status = 'REJECTED'[\s\S]*confirmed_start = null[\s\S]*confirmed_minutes = null/);
  assert.match(sql,/extract\(epoch from \(v_end - v_start\)\) \/ 60/);
  assert.match(sql,/ATTENDANCE_CONFIRMED_TIME_MINUTE_PRECISION_REQUIRED/);
  assert.doesNotMatch(sql,/set\s+amount\s*=/i);
  assert.doesNotMatch(sql,/set\s+hours_worked\s*=/i);
  assert.doesNotMatch(sql,/payroll/i);
});

test("TASK-100 repeated exact review converges while conflicting terminal review fails closed",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/v_att\.status in \('APPROVED','ADJUSTED','REJECTED'\)/);
  assert.match(sql,/already_reviewed',true/);
  assert.match(sql,/ATTENDANCE_ALREADY_REVIEWED/);
  assert.match(sql,/if v_att\.status = 'APPROVED'[\s\S]*v_decision = 'APPROVE'/);
  assert.match(sql,/if v_att\.status = 'ADJUSTED'[\s\S]*v_decision = 'ADJUST'/);
  assert.match(sql,/if v_att\.status = 'REJECTED'[\s\S]*v_decision = 'REJECT'/);
});

test("TASK-100 manager reader and review RPC are authenticated only with fixed search_path",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/create or replace function public\.list_manager_attendance_review_v1/);
  assert.match(sql,/create or replace function public\.review_attendance_v1/);
  assert.match(sql,/revoke execute on function public\.list_manager_attendance_review_v1\(uuid,date,date\) from public, anon/);
  assert.match(sql,/grant execute on function public\.list_manager_attendance_review_v1\(uuid,date,date\) to authenticated, postgres/);
  assert.match(sql,/revoke execute on function public\.review_attendance_v1\(uuid,text,time,time\) from public, anon/);
  assert.match(sql,/grant execute on function public\.review_attendance_v1\(uuid,text,time,time\) to authenticated, postgres/);
  const fixed=(sql.match(/set search_path = public/g)||[]).length;
  assert.ok(fixed>=4,"expected fixed search_path on TASK-100 functions, got "+fixed);
  assert.match(sql,/revoke select, insert, update, delete on table public\.attendance from public, anon, authenticated/);
});

test("TASK-100 confirmed notification is idempotent by stable event key",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/ATTENDANCE_CONFIRMED/);
  assert.match(sql,/'attendance:'\|\|new\.id\|\|':confirmed'/);
  assert.match(sql,/new\.status in \('APPROVED','ADJUSTED'\)/);
  assert.match(sql,/old\.status is distinct from new\.status/);
  assert.doesNotMatch(sql,/ATTENDANCE_REJECTED/);
});

test("TASK-100 Manager UI sends intent by RPC only and exposes approve adjust reject controls",async()=>{
  const [ui,engine]=await Promise.all([fs.readFile(uiUrl,"utf8"),fs.readFile(engineUrl,"utf8")]);
  assert.match(ui,/get_manager_accessible_stores/);
  assert.match(ui,/list_manager_attendance_review_v1/);
  assert.match(ui,/review_attendance_v1/);
  assert.match(ui,/data-review="APPROVE"/);
  assert.match(ui,/data-review="ADJUST"/);
  assert.match(ui,/data-review="REJECT"/);
  assert.match(ui,/p_confirmed_start:null,p_confirmed_end:null/);
  assert.match(ui,/if\(decision==='ADJUST'\)/);
  assert.doesNotMatch(ui,/\.from\(['"]attendance['"]\)/);
  assert.doesNotMatch(ui,/\.from\(['"]work_schedules['"]\)/);
  assert.doesNotMatch(ui,/service_role/i);
  assert.match(engine,/attendance-review-v1\.js\?v=20260922-task100/);
});
