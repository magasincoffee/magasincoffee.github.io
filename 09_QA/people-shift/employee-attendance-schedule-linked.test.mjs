import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Employee attendance executes published schedules through verified RPCs",async()=>{
  const source=await fs.readFile(new URL("../../06_EMPLOYEE/attendance/engine-v1.js",import.meta.url),"utf8");
  assert.match(source,/get_my_today_schedules/);
  assert.match(source,/clock_in_for_schedule/);
  assert.match(source,/p_schedule_id:id/);
  assert.match(source,/clock_out_attendance/);
  assert.match(source,/p_attendance_id:id/);
  assert.match(source,/get_my_attendance_v2/);
  assert.doesNotMatch(source,/\.from\(['"]attendance['"]\)/);
  assert.doesNotMatch(source,/\.from\(['"]work_schedules['"]\)/);
});
