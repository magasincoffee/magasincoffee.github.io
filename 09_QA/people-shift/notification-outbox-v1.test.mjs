import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read=p=>fs.readFile(new URL("../../"+p,import.meta.url),"utf8");

test("TASK-034 outbox migration defines durable RLS-protected event queue",async()=>{
  const sql=await read("07_DATABASE/migrations/20260918114654_notification_outbox_v1.sql");
  assert.match(sql,/create table public\.notification_outbox/i);
  assert.match(sql,/event_key text not null unique/i);
  assert.match(sql,/email_status text not null default 'PENDING'/i);
  assert.match(sql,/alter table public\.notification_outbox enable row level security/i);
  assert.match(sql,/create policy notification_outbox_select/i);
  assert.match(sql,/revoke all on table public\.notification_outbox from anon,authenticated/i);
  assert.match(sql,/grant select,insert,update,delete on table public\.notification_outbox to service_role/i);
  assert.match(sql,/list_my_notifications_v1/);
  assert.match(sql,/claim_notification_email_batch_v1/);
  assert.match(sql,/for update skip locked/i);
  assert.match(sql,/complete_notification_email_v1/);
  assert.match(sql,/SCHEDULE_PUBLISHED/);
  assert.match(sql,/CLOCK_OUT_REMINDER/);
  assert.match(sql,/ATTENDANCE_CLOCKED_IN/);
  assert.match(sql,/ATTENDANCE_CLOCKED_OUT/);
  assert.match(sql,/SHIFT_SWAP_MANAGER_REVIEW/);
  assert.match(sql,/SHIFT_GIVE_MANAGER_REVIEW/);
  assert.match(sql,/email_status='CANCELLED'/);
});

test("TASK-034 trigger SECURITY DEFINER functions are not exposed as browser RPCs",async()=>{
  const sql=await read("07_DATABASE/migrations/20260918114903_notification_outbox_trigger_privileges_v1.sql");
  for(const fn of [
    "notification_schedule_trigger_v1",
    "notification_attendance_trigger_v1",
    "notification_shift_swap_trigger_v1",
    "notification_shift_give_trigger_v1"
  ]){
    assert.match(sql,new RegExp("revoke execute on function public\\."+fn+"\\(\\) from public,anon,authenticated","i"));
  }
});

test("Employee notification surface reads canonical RPC only",async()=>{
  const [engine,runtime,app]=await Promise.all([
    read("06_EMPLOYEE/notification/engine-v1.js"),
    read("06_EMPLOYEE/runtime/employee-runtime-v1.html"),
    read("06_EMPLOYEE/app/employee-v40.html")
  ]);
  assert.match(engine,/list_my_notifications_v1/);
  assert.match(engine,/p_limit:50/);
  assert.doesNotMatch(engine,/\.from\(/);
  assert.match(runtime,/\/06_EMPLOYEE\/notification\/engine-v1\.js/);
  assert.match(runtime,/E\.notification\?\.refresh/);
  assert.match(app,/view==='notice'[^\n]*notification\?\.refresh/);
  assert.match(app,/id="view-notice"/);
});

test("Employee shift-change reason UI matches required backend contract",async()=>{
  const app=await read("06_EMPLOYEE/app/employee-v40.html");
  assert.match(app,/id="employeeSwapReason"[^>]*required[^>]*placeholder="Bắt buộc nhập lý do"/);
  assert.doesNotMatch(app,/Lý do \(không bắt buộc\)/);
});
