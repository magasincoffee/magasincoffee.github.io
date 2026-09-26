import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const app=read("06_EMPLOYEE/app/employee-v40.html");
const attendance=read("06_EMPLOYEE/attendance/engine-v1.js");
const payroll=read("06_EMPLOYEE/payroll/engine-v1.js");
const profile=read("06_EMPLOYEE/profile/engine-v1.js");
const runtime=read("06_EMPLOYEE/runtime/employee-runtime-v1.html");
const shell=read("02_CORE/ui/magasin-ui-v2-employee-shell.js");
const css=read("02_CORE/ui/magasin-ui-v2-employee-people.css");
const peopleShiftGate=read("09_QA/people-shift/browser-e2e.mjs");
const rpcs=source=>[...source.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(m=>m[1]);

const assertNoBrowserDml=source=>{
  assert.doesNotMatch(source,/\.from\s*\(/);
  assert.doesNotMatch(source,/createClient\s*\(/);
  assert.doesNotMatch(source,/\.(?:insert|update|delete|upsert)\s*\(/);
};

test("UI2-009 loads one namespaced Employee People presentation layer and keeps prior UI2 surfaces",()=>{
  assert.ok(app.includes('/02_CORE/ui/magasin-ui-v2-employee-people.css?v=20260926-ui2-009'));
  assert.match(css,/body\[data-magasin-employee-shell-v2\] #view-attendance/);
  assert.match(css,/body\[data-magasin-employee-shell-v2\] #view-payroll/);
  assert.match(css,/body\[data-magasin-employee-shell-v2\] #view-profile/);
  assert.match(css,/min-height:44px/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/@media \(max-width:760px\)/);
  assert.match(css,/@media \(max-width:430px\)/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.doesNotMatch(css,/(^|\n)\s*:root\s*\{/m);
  assert.match(peopleShiftGate,/ui2-009-employee-people-browser\.mjs/);
  for(const marker of [
    'magasin-ui-v2-employee-today.css?v=20260925-ui2-006',
    'magasin-ui-v2-employee-schedule.css?v=20260926-ui2-007',
    'magasin-ui-v2-employee-secondary.css?v=20260926-ui2-008'
  ])assert.ok(app.includes(marker),marker);
});

test("UI2-009 Attendance keeps exact Manual-Time canonical RPC inventory and payload boundary",()=>{
  assert.deepEqual(rpcs(attendance),[
    'list_my_approved_schedules_v2',
    'get_my_attendance_v2',
    'submit_manual_time_attendance_v1'
  ]);
  assert.match(attendance,/p_week_start:requestedWeek/);
  assert.match(attendance,/p_from_date:requestedWeek,p_to_date:add\(requestedWeek,6\)/);
  assert.match(attendance,/p_schedule_id:selected\.schedule_id,p_actual_start:start,p_actual_end:end,p_note:note\|\|null/);
  assert.match(attendance,/CANONICAL_STATUSES=new Set\(\['SUBMITTED','NORMAL','NEEDS_REVIEW','APPROVED','ADJUSTED','REJECTED'\]\)/);
  assert.match(attendance,/RECONCILE_ERRORS/);
  assert.match(attendance,/ATTENDANCE_NOT_CURRENT_OWNER/);
  assert.match(attendance,/không phải giờ công đã xác nhận và không phải payroll truth/);
  assert.match(attendance,/type="time" step="60"/);
  assert.match(attendance,/state\.submitting/);
  assertNoBrowserDml(attendance);
  assert.doesNotMatch(attendance,/clock_in_for_schedule|clock_out_attendance|manual_attendance_from_schedule|auto_attendance_from_approved_schedules/);
});

test("UI2-009 Attendance does not promote legacy income/report presentation as truth",()=>{
  assert.match(app,/class="panel legacy-attendance-report" hidden aria-hidden="true"/);
  assert.match(app,/attendance:\['Chấm công','Giờ làm thực tế'\]/);
  assert.match(attendance,/legacyReport\.hidden=true/);
  assert.match(app,/Lịch sử chấm công/);
  assert.doesNotMatch(attendance,/attendanceTotalIncome|attendanceAvgIncome|Thành tiền/);
});

test("UI2-009 Payroll remains parameterless self-check read-only with exact state semantics and no money invention",()=>{
  assert.deepEqual(rpcs(payroll),['get_my_payroll_self_check_v1']);
  assert.match(payroll,/ESTIMATED:'Ước tính'/);
  assert.match(payroll,/REVIEWED:'Đã review'/);
  assert.match(payroll,/FINALIZED:'Đã chốt'/);
  assert.match(payroll,/PAID:'Đã thanh toán'/);
  assert.match(payroll,/ESTIMATED không bao giờ được trình bày như FINALIZED/);
  assert.match(payroll,/Số tiền chưa hiển thị vì chưa có canonical monetary evaluator/);
  assert.match(payroll,/data-payroll-retry/);
  assert.doesNotMatch(payroll,/hourly_rate|gross_pay|net_pay|pay_rule_reference|confirmed_work_source_revision/i);
  assertNoBrowserDml(payroll);
});

test("UI2-009 Profile stays on existing operational projection allowlist and preserves security navigation",()=>{
  assert.deepEqual(rpcs(profile),['get_my_employee_profile_v1']);
  for(const id of ['profileFullName','profileUsername','profilePhone','profileRole','profileStatus','profilePrimaryStore','profileLevel','profileJoinDate'])assert.ok(profile.includes("'"+id+"'")||app.includes('id="'+id+'"'),id);
  assert.match(app,/id="view-profile" class="page-view employee-profile-v2"/);
  assert.match(app,/Hồ sơ vận hành chỉ đọc từ projection canonical/);
  assert.match(app,/class="panel security-link-panel"[\s\S]*onclick="showView\('settings'\)"/);
  assert.doesNotMatch(profile,/\bemail\b|access_scope|hourly_rate|pay_rule_reference|service_role/i);
  assertNoBrowserDml(profile);
});

test("UI2-009 direct route/back/reload authority stays delegated to the existing shell/runtime refresh hooks",()=>{
  for(const route of ['dashboard','schedule','attendance','swap','payroll','profile'])assert.ok(shell.includes("'"+route+"'"),route);
  assert.match(shell,/addEventListener\('popstate', handler\)/);
  assert.match(shell,/addEventListener\('hashchange', handler\)/);
  assert.match(runtime,/E\.attendance\?\.refresh\?\.\(\)/);
  assert.match(runtime,/E\.profileProjection\?\.refresh\?\.\(\)/);
  assert.match(runtime,/E\.payrollSelfCheck\?\.refresh\?\.\(\)/);
  assert.match(runtime,/employee-v40\.html\?ui=v45-ui2-008&runtime=engine/);
});

console.log("UI2_009_EMPLOYEE_PEOPLE_CONTRACT=PASS");
