import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const exists=p=>fs.existsSync(p);
const acceptancePath="01_DOCS/MAGASIN/05_SYSTEM/EMPLOYEE_LIVE_READINESS_V1_ACCEPTANCE.md";
const tempPath="01_DOCS/MAGASIN/05_SYSTEM/EMPLOYEE_LIVE_READINESS_TEMP_SOURCE_OF_TRUTH.md";
const acceptance=read(acceptancePath);
const profile=read("06_EMPLOYEE/profile/engine-v1.js");
const payroll=read("06_EMPLOYEE/payroll/engine-v1.js");
const notification=read("06_EMPLOYEE/notification/engine-v1.js");
const runtime=read("06_EMPLOYEE/runtime/employee-runtime-v1.html");
const index=read("06_EMPLOYEE/index.html");

const rpcs=source=>[...source.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(x=>x[1]);

test("EMLIVE-004 removes temporary authority and preserves permanent acceptance evidence",()=>{
  assert.equal(exists(tempPath),false);
  assert.equal(exists(acceptancePath),true);
  assert.match(acceptance,/MAGASIN_EMPLOYEE_LIVE_READINESS_V1/);
  assert.match(acceptance,/EMLIVE-004/);
  assert.match(acceptance,/CLOSED \/ ACCEPTED/);
  assert.match(acceptance,/ACTIVE Employee profiles: \*\*4\*\*/);
  assert.match(acceptance,/ACTIVE Employee profiles with existing sign-in history: \*\*3\*\*/);
  assert.match(acceptance,/Employee Availability rows: \*\*17\*\*/);
  assert.match(acceptance,/approved `work_schedules`: \*\*0\*\*/);
  assert.match(acceptance,/Attendance rows: \*\*0\*\*/);
  assert.match(acceptance,/Payroll entries: \*\*0\*\*/);
  assert.match(acceptance,/identity 1: \*\*7 rows\*\*/);
  assert.match(acceptance,/identity 2: \*\*3 rows\*\*/);
  assert.match(acceptance,/identity 3: \*\*0 rows\*\*/);
});

test("EMLIVE-004 keeps canonical Employee read authority unchanged",()=>{
  assert.deepEqual(rpcs(profile),["get_my_employee_workforce_profile_v1","get_my_employee_employment_type_v1"]);
  assert.deepEqual(rpcs(payroll),["get_my_payroll_self_check_v1"]);
  assert.deepEqual(rpcs(notification),["list_my_notifications_v1"]);
  for(const src of [profile,payroll,notification]){
    assert.doesNotMatch(src,/\.from\s*\(/);
    assert.doesNotMatch(src,/createClient\s*\(/);
    assert.doesNotMatch(src,/\.(?:insert|update|delete|upsert)\s*\(/);
    assert.doesNotMatch(src,/service_role/i);
  }
});

test("EMLIVE-004 keeps the accepted EMLIVE-003 runtime and user-facing semantics",()=>{
  assert.match(runtime,/employee-v40\.html\?ui=(?:20260930-emlive003|20261001-ui-unified1|20261003-sched-ui-007|20261006-xstore-019d|20261006-xstore-019h|20261007-xstore-019h-visual3|20261009-x19j-paint1)&runtime=engine/);
  assert.match(runtime,/profile\/engine-v1\.js\?v=(?:20260930-emlive003|20261006-xstore-019h)/);
  assert.match(runtime,/payroll\/engine-v1\.js\?v=20260930-emlive003/);
  assert.match(runtime,/notification\/engine-v1\.js\?v=20260930-emlive003/);
  assert.match(index,/employee-runtime-v1\.html\?v=(?:20260930-emlive003|20261001-ui-unified1|20261002-sched-ui-006|20261003-sched-ui-007|20261006-xstore-019d|20261006-xstore-019h|20261007-xstore-019h-visual3|20261009-x19j-paint1)/);
  assert.match(profile,/Không thể tải thông tin cá nhân lúc này\. Hãy thử lại\./);
  assert.match(payroll,/Không thể tải thông tin lương lúc này/);
  assert.match(notification,/Không thể tải thông báo lúc này/);
  assert.doesNotMatch(profile,/backend|Workforce Profile|canonical/i);
  assert.doesNotMatch(payroll,/Projection payroll canonical|canonical monetary evaluator|payroll truth/i);
});

test("EMLIVE-004 acceptance explicitly forbids fabricated production closure data",()=>{
  assert.match(acceptance,/No credential was changed/);
  assert.match(acceptance,/No profile role\/status\/scope was changed/);
  assert.match(acceptance,/No production Availability, Schedule, Attendance, Notification, Profile, Payroll, Store Priority, or Staffing Requirement row was inserted, updated, deleted, relabelled, or fabricated/);
  assert.match(acceptance,/Empty production state is never replaced with fake acceptance data/);
});

console.log("EMLIVE_004_EMPLOYEE_LIVE_CLOSURE=PASS");
