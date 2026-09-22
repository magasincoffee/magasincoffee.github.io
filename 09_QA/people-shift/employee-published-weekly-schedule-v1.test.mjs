import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const read=p=>fs.readFile(new URL("../../"+p,import.meta.url),"utf8");

test("TASK-095 Employee schedule uses one canonical APPROVED reader and hardened iframe/request state",async()=>{
  const source=await read("06_EMPLOYEE/schedule/engine-v1.js");
  assert.match(source,/list_my_approved_schedules_v2/);
  assert.match(source,/p_week_start:requestedWeek/);
  assert.doesNotMatch(source,/get_my_schedule/);
  assert.doesNotMatch(source,/\.from\(/);
  assert.match(source,/!d\.body\|\|d\.body\.dataset\.employeeScheduleEngine/);
  assert.match(source,/pending\?\.week===requestedWeek/);
  assert.match(source,/requestSeq/);
  assert.match(source,/requestedWeek!==state\.week/);
  assert.match(source,/data-schedule-loading/);
  assert.match(source,/data-schedule-error/);
  assert.match(source,/state\.rows=\[\];state\.error=/);
  assert.match(source,/function bootFrame\(attempt=0\)/);
  assert.match(source,/attempt<20/);
  assert.match(source,/setTimeout\(\(\)=>bootFrame\(attempt\+1\),25\)/);
});

test("TASK-095 shared date primitives keep Asia Ho Chi Minh Sunday to Monday identity across UTC midnight",async()=>{
  const source=await read("02_CORE/shared/shared-core-v1.js");
  const context={Intl,Date,setTimeout,clearTimeout,console};
  vm.runInNewContext(source,context);
  const date=context.MAGASIN_CORE.date;

  const sundayUtc=new Date("2026-09-27T16:30:00.000Z"); // 23:30 Sunday in Vietnam
  assert.equal(date.dateKey(sundayUtc),"2026-09-27");
  assert.equal(date.monday(date.dateKey(sundayUtc)),"2026-09-21");

  const mondayUtc=new Date("2026-09-27T17:30:00.000Z"); // 00:30 Monday in Vietnam
  assert.equal(date.dateKey(mondayUtc),"2026-09-28");
  assert.equal(date.monday(date.dateKey(mondayUtc)),"2026-09-28");
  assert.deepEqual(
    Array.from(date.weekDays("2026-09-28")),
    ["2026-09-28","2026-09-29","2026-09-30","2026-10-01","2026-10-02","2026-10-03","2026-10-04"]
  );
});

test("TASK-095 schedule notification override keeps publish/change/transfer/cancel but creates no new clock-out reminder",async()=>{
  const sql=await read("07_DATABASE/migrations/20260922012300_task_095_employee_published_weekly_schedule_v1.sql");
  assert.match(sql,/create or replace function public\.notification_schedule_trigger_v1\(\)/i);
  for(const type of ["SCHEDULE_PUBLISHED","SCHEDULE_CHANGED","SCHEDULE_CANCELLED","SCHEDULE_TRANSFERRED_IN","SCHEDULE_TRANSFERRED_OUT"]){
    assert.match(sql,new RegExp(type));
  }
  assert.match(sql,/'schedule:'\|\|new\.id\|\|':published'/);
  assert.doesNotMatch(sql,/clock_out_reminder:/i);
  assert.doesNotMatch(sql,/Nhắc chấm công ra ca/i);
  assert.doesNotMatch(sql,/v_end_at/i);
  assert.match(sql,/where event_type='CLOCK_OUT_REMINDER'/i); // historical pending reminder cancellation only
  assert.match(sql,/revoke execute on function public\.notification_schedule_trigger_v1\(\)[\s\S]*from public,anon,authenticated/i);
});

test("TASK-095 does not rewrite historical TASK-032 reminder evidence",async()=>{
  const [historical,contract]=await Promise.all([
    read("07_DATABASE/migrations/20260918114654_notification_outbox_v1.sql"),
    read("02_CORE/contracts/published-schedule-feedback-loop.v1.json")
  ]);
  assert.match(historical,/CLOCK_OUT_REMINDER/);
  assert.equal(JSON.parse(contract).verified.clock_out_reminder,true);
});


test("TASK-095 browser fixture bootstrap script is syntactically valid",async()=>{
  const html=await read("09_QA/people-shift/employee-published-weekly-schedule-fixture.html");
  const match=html.match(/<script>\s*([\s\S]*?)<\/script>/);
  assert.ok(match,"fixture inline bootstrap script missing");
  assert.doesNotThrow(()=>new vm.Script(match[1]));
});
