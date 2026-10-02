import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(new URL("../../"+p,import.meta.url),"utf8");

test("EMLIVE-002 schedule uses employee-facing availability language",()=>{
  const schedule=read("06_EMPLOYEE/schedule/engine-v1.js");
  assert.match(schedule,/Thời gian có thể làm không phải lịch chính thức/);
  assert.match(schedule,/Đăng ký thời gian có thể làm/);
  assert.doesNotMatch(schedule,/Availability không phải lịch chính thức|Đăng ký Availability/);
});

test("EMLIVE-002 attendance keeps authority but hides implementation jargon",()=>{
  const attendance=read("06_EMPLOYEE/attendance/engine-v1.js");
  for(const rpc of ["list_my_approved_schedules_v2","get_my_attendance_v2","submit_manual_time_attendance_v1"]) assert.ok(attendance.includes(rpc),rpc);
  assert.match(attendance,/Giờ bạn gửi cần được quản lý xác nhận trước khi dùng để tính lương/);
  assert.match(attendance,/Trạng thái chấm công/);
  assert.match(attendance,/Nếu ca vừa được cho\/đổi, lịch sẽ tự tải lại/);
  assert.doesNotMatch(attendance,/payroll truth|Trạng thái canonical|canonical truth|Give\/Swap|Manual-time|chấm công canonical/);
});

test("EMLIVE-002 runtime cache points browsers at the reconciled Schedule and Attendance assets",()=>{
  const runtime=read("06_EMPLOYEE/runtime/employee-runtime-v1.html");
  const index=read("06_EMPLOYEE/index.html");
  assert.match(runtime,/schedule\/engine-v1\.js\?v=(?:20260930-emlive002|20261002-sched-ui-006|20261003-sched-ui-007)/);
  assert.match(runtime,/attendance\/engine-v1\.js\?v=20260930-emlive002/);
  assert.match(index,/employee-runtime-v1\.html\?v=(?:20260930-emlive002|20260930-emlive003|20261001-ui-unified1|20261002-sched-ui-006|20261003-sched-ui-007)/);
});
