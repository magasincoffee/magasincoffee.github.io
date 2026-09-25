import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const schedule=fs.readFileSync("06_EMPLOYEE/schedule/engine-v1.js","utf8");
const attendance=fs.readFileSync("06_EMPLOYEE/attendance/engine-v1.js","utf8");
const swap=fs.readFileSync("06_EMPLOYEE/swap/engine-v1.js","utf8");
const runtime=fs.readFileSync("06_EMPLOYEE/runtime/employee-runtime-v1.html","utf8");
const index=fs.readFileSync("06_EMPLOYEE/index.html","utf8");

test("SCHED-03 has one canonical Employee schedule reader",()=>{
  assert.match(schedule,/list_my_approved_schedules_v2/);
  assert.doesNotMatch(schedule,/get_my_schedule|list_my_approved_schedules_v1/);
  assert.doesNotMatch(schedule,/\.from\(['"](?:work_schedules|schedule_generation_runs|schedule_generation_assignments)['"]\)/);
  assert.match(schedule,/toUpperCase\(\)==='APPROVED'/);
});

test("SCHED-03 presents official schedule separately from Availability",()=>{
  assert.match(schedule,/Lịch làm chính thức/);
  assert.match(schedule,/Availability không phải lịch chính thức/);
  assert.match(schedule,/Đây chỉ là thời gian bạn có thể nhận ca/);
  assert.match(schedule,/không phải lịch chính thức/);
  assert.match(schedule,/Đã phát hành/);
});

test("SCHED-03 action identity is hidden binding and server-preflighted",()=>{
  assert.match(schedule,/data-schedule-id/);
  assert.match(schedule,/async function preflight/);
  assert.match(schedule,/await readWeek\(week\)/);
  assert.match(schedule,/schedule-stale/);
  assert.match(schedule,/async function openAction/);
});

test("SCHED-03 downstream actions reuse existing Give Swap Attendance primitives",()=>{
  assert.match(schedule,/attendance\?\.openSchedule\?\./);
  assert.match(schedule,/openGive/);
  assert.match(schedule,/openSwap/);
  assert.match(attendance,/async function openSchedule\(scheduleId,week\)/);
  assert.match(attendance,/state\.selectedScheduleId=current\.schedule_id/);
  assert.match(swap,/openGive:\(scheduleId,week\)=>openForm\('give',scheduleId,week\)/);
  assert.match(swap,/openSwap:\(scheduleId,week\)=>openForm\('swap',scheduleId,week\)/);
});

test("SCHED-03 stale ownership reconciles from server truth",()=>{
  assert.match(schedule,/if\(!current\)[\s\S]*không còn thuộc lịch chính thức/);
  assert.match(attendance,/Ca này (?:đã được chuyển cho người khác|không còn thuộc lịch chính thức của bạn)/);
  assert.match(swap,/Ca này không còn thuộc lịch chính thức của bạn/);
});

test("SCHED-03 technical backend errors are not Employee-visible",()=>{
  assert.match(schedule,/friendlyError/);
  assert.match(schedule,/Không thể tải lịch làm lúc này/);
  assert.doesNotMatch(schedule,/state\.error=e\?\.message/);
  assert.match(attendance,/e\.textContent=text;/);
  assert.doesNotMatch(attendance,/Mã: /);
  assert.doesNotMatch(swap,/q\.error\.message/);
});

test("SCHED-03 mobile-first layout has skeleton empty retry and no forced horizontal grid",()=>{
  assert.match(schedule,/@media\(max-width:600px\)/);
  assert.match(schedule,/\.employee-schedule-engine \.days\{grid-template-columns:1fr\}/);
  assert.match(schedule,/schedule-skeleton/);
  assert.match(schedule,/schedule-week-empty/);
  assert.match(schedule,/data-schedule-retry/);
});

test("SCHED-03 keeps one active Employee runtime path",()=>{
  assert.equal((runtime.match(/\/06_EMPLOYEE\/schedule\/engine-v1\.js/g)||[]).length,1);
  assert.match(runtime,/schedule\/engine-v1\.js\?v=20260923-sched03/);
  assert.match(runtime,/attendance\/engine-v1\.js\?v=20260923-sched03/);
  assert.match(runtime,/swap\/engine-v1\.js\?v=20260923-sched03/);
  assert.match(index,/employee-runtime-v1\.html\?v=20260925-ui2-006/);
});

console.log("SCHED_03_EMPLOYEE_SCHEDULE_CONTRACT=PASS");
