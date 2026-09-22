import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("TASK-099 Employee attendance UI uses Manual-Time V1 and no legacy mutation authority",async()=>{
  const source=await fs.readFile(new URL("../../06_EMPLOYEE/attendance/engine-v1.js",import.meta.url),"utf8");
  assert.match(source,/list_my_approved_schedules_v2/);
  assert.match(source,/get_my_attendance_v2/);
  assert.match(source,/submit_manual_time_attendance_v1/);
  assert.match(source,/p_schedule_id:selected\.schedule_id/);
  assert.match(source,/p_actual_start:start/);
  assert.match(source,/p_actual_end:end/);
  assert.match(source,/p_note:note\|\|null/);
  assert.match(source,/ATTENDANCE_NOT_CURRENT_OWNER/);
  assert.match(source,/RECONCILE_ERRORS/);
  assert.match(source,/type="time" step="60"/);
  assert.match(source,/state\.submitting/);
  assert.doesNotMatch(source,/clock_in_for_schedule/);
  assert.doesNotMatch(source,/clock_out_attendance/);
  assert.doesNotMatch(source,/manual_attendance_from_schedule/);
  assert.doesNotMatch(source,/auto_attendance_from_approved_schedules/);
  assert.doesNotMatch(source,/\.from\(['"]attendance['"]\)/);
  assert.doesNotMatch(source,/\.from\(['"]work_schedules['"]\)/);
});