import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const profile=read("06_EMPLOYEE/profile/engine-v1.js");
const payroll=read("06_EMPLOYEE/payroll/engine-v1.js");
const notification=read("06_EMPLOYEE/notification/engine-v1.js");
const app=read("06_EMPLOYEE/app/employee-v40.html");
const runtime=read("06_EMPLOYEE/runtime/employee-runtime-v1.html");
const index=read("06_EMPLOYEE/index.html");
const acceptance=read("01_DOCS/MAGASIN/05_SYSTEM/EMPLOYEE_LIVE_READINESS_V1_ACCEPTANCE.md");

test("EMLIVE-003 keeps Employee Notification Profile Payroll on canonical read authority",()=>{
  assert.deepEqual([...profile.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(x=>x[1]),["get_my_employee_workforce_profile_v1"]);
  assert.deepEqual([...payroll.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(x=>x[1]),["get_my_payroll_self_check_v1"]);
  assert.deepEqual([...notification.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(x=>x[1]),["list_my_notifications_v1"]);
  for(const src of [profile,payroll,notification]){
    assert.doesNotMatch(src,/\.from\s*\(/);
    assert.doesNotMatch(src,/createClient\s*\(/);
    assert.doesNotMatch(src,/\.(?:insert|update|delete|upsert)\s*\(/);
    assert.doesNotMatch(src,/service_role/i);
  }
});

test("EMLIVE-003 Profile is plain Employee language with explicit unavailable state",()=>{
  assert.match(profile,/Đang tải thông tin cá nhân…/);
  assert.match(profile,/Không thể tải thông tin cá nhân lúc này\. Hãy thử lại\./);
  assert.match(profile,/Chưa cập nhật/);
  assert.match(profile,/Thông tin này được đồng bộ từ hồ sơ nhân sự và chỉ dùng để xem/);
  assert.doesNotMatch(app,/projection canonical|Supabase Auth|Hồ sơ vận hành chỉ đọc/i);
  assert.match(app,/Thông tin được đồng bộ từ hồ sơ nhân sự của bạn/);
  assert.match(app,/Để đổi mật khẩu, hãy đăng xuất rồi chọn “Quên mật khẩu\?”/);
});

test("EMLIVE-003 Payroll remains read-only and removes implementation language",()=>{
  assert.match(payroll,/Đang tải thông tin lương…/);
  assert.match(payroll,/Không thể tải thông tin lương lúc này/);
  assert.match(payroll,/Chưa có kỳ lương nào để hiển thị/);
  assert.match(payroll,/Kỳ lương/);
  assert.match(payroll,/Trạng thái Ước tính không có nghĩa là kỳ lương đã được chốt/);
  assert.doesNotMatch(payroll,/Self-check|Projection payroll canonical|Payroll self-check|payroll entry canonical|canonical monetary evaluator|payroll truth|Kỳ payroll|review\/finalize\/paid/i);
  assert.doesNotMatch(payroll,/review_payroll|finalize_payroll|mark_payroll_paid|PAYROLL_AUTHORIZED/i);
  assert.doesNotMatch(payroll,/>Revision</i);
});

test("EMLIVE-003 Notification has loading empty error retry without exposing backend error text",()=>{
  assert.match(notification,/data-notification-loading/);
  assert.match(notification,/Bạn chưa có thông báo nào/);
  assert.match(notification,/Không thể tải thông báo lúc này/);
  assert.match(notification,/data-notification-retry/);
  assert.match(notification,/list_my_notifications_v1'\s*,\s*\{p_limit:50\}/);
  assert.doesNotMatch(notification,/esc\(state\.error\)|esc\(error\)|UNKNOWN/);
});

test("EMLIVE-003 runtime cache serves reconciled assets",()=>{
  assert.match(runtime,/employee-v40\.html\?ui=(?:20260930-emlive003|20261001-ui-unified1)&runtime=engine/);
  assert.match(runtime,/profile\/engine-v1\.js\?v=20260930-emlive003/);
  assert.match(runtime,/payroll\/engine-v1\.js\?v=20260930-emlive003/);
  assert.match(runtime,/notification\/engine-v1\.js\?v=20260930-emlive003/);
  assert.match(index,/employee-runtime-v1\.html\?v=(?:20260930-emlive003|20261001-ui-unified1|20261002-sched-ui-006)/);
});

test("EMLIVE-003 remains permanently closed after TEMP authority cleanup",()=>{
  assert.match(acceptance,/EMLIVE-003` = DONE \/ PR #348 \/ EXACT-MAIN GREEN/);
  assert.match(acceptance,/d09510a9ee1036ccb9e9e1b05e888ca70e5a8af7/);
  assert.match(acceptance,/EMLIVE-004/);
});

console.log("EMLIVE_003_EMPLOYEE_NOTIFICATION_PROFILE_PAYROLL=PASS");
