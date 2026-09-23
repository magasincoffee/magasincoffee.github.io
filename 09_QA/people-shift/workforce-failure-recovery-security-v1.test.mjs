import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {authorizeWorkforceAccess} from "../../02_CORE/shared/workforce-operations-v1.mjs";

const profileSqlUrl=new URL("../../07_DATABASE/migrations/20260923061225_task_101_employee_profile_projection_v1.sql",import.meta.url);
const payrollSqlUrl=new URL("../../07_DATABASE/migrations/20260923110608_task_104_employee_payroll_self_check_v1.sql",import.meta.url);
const employeeProfileUrl=new URL("../../06_EMPLOYEE/profile/engine-v1.js",import.meta.url);
const employeePayrollUrl=new URL("../../06_EMPLOYEE/payroll/engine-v1.js",import.meta.url);
const managerProfileUrl=new URL("../../05_MANAGER/Workforce/staff-projection-v1.js",import.meta.url);
const managerPayrollUrl=new URL("../../05_MANAGER/Workforce/payroll-self-check-v1.js",import.meta.url);
const contractUrl=new URL("../../02_CORE/contracts/workforce-operations-v1.json",import.meta.url);

test("TASK-107 E2E-14 canonical role boundary is self/store/enterprise separated",()=>{
  for(const capability of ["PROFILE_READ","PAYROLL_READ"]){
    assert.equal(authorizeWorkforceAccess({actor_role:"EMPLOYEE",actor_employee_id:"a",subject_employee_id:"a",capability}).ok,true);
    assert.equal(authorizeWorkforceAccess({actor_role:"EMPLOYEE",actor_employee_id:"a",subject_employee_id:"b",capability}).code,"CROSS_USER_DENY");
    assert.equal(authorizeWorkforceAccess({actor_role:"MANAGER",subject_employee_id:"b",capability,subject_store_id:"s1",allowed_store_ids:["s1"]}).detail.scope,"STORE");
    assert.equal(authorizeWorkforceAccess({actor_role:"MANAGER",subject_employee_id:"b",capability,subject_store_id:"s2",allowed_store_ids:["s1"]}).code,"STORE_SCOPE_DENY");
    assert.equal(authorizeWorkforceAccess({actor_role:"OWNER",subject_employee_id:"b",capability}).detail.scope,"ENTERPRISE");
  }
});

test("TASK-107 does not invent PAYROLL_AUTHORIZED mapping or Manager review authority",()=>{
  const denied=authorizeWorkforceAccess({actor_role:"MANAGER",subject_employee_id:"b",capability:"PAYROLL_REVIEW",subject_store_id:"s1",allowed_store_ids:["s1"]});
  assert.equal(denied.ok,false);
  assert.equal(denied.code,"EXPLICIT_PERMISSION_REQUIRED");
});

test("TASK-107 server readers remain auth-derived, scoped, anon-denied and read-only",async()=>{
  const [profileSql,payrollSql]=await Promise.all([fs.readFile(profileSqlUrl,"utf8"),fs.readFile(payrollSqlUrl,"utf8")]);
  assert.match(profileSql,/get_my_employee_profile_v1\(\)[\s\S]*auth\.uid\(\)/);
  assert.match(payrollSql,/get_my_payroll_self_check_v1\(\)[\s\S]*auth\.uid\(\)/);
  assert.match(profileSql,/list_employee_profile_projection_v1[\s\S]*can_access_store\(p_store_id\)/);
  assert.match(payrollSql,/list_scoped_payroll_self_check_v1[\s\S]*can_access_store\(p_store_id\)/);
  assert.match(profileSql,/revoke execute on function public\.get_my_employee_profile_v1\(\)[\s\S]*from public, anon, authenticated/);
  assert.match(payrollSql,/revoke execute on function public\.get_my_payroll_self_check_v1\(\)[\s\S]*from public, anon, authenticated/);
  assert.doesNotMatch(profileSql,/\b(update|insert into|delete from)\s+public\.(profiles|employee_constraints|employee_grades)\b/i);
  assert.doesNotMatch(payrollSql,/\b(update|insert into|delete from)\s+public\.payroll_entries\b/i);
});

test("TASK-107 read UIs reject malformed canonical projections and never fall back to direct tables",async()=>{
  const [ep,ey,mp,my]=await Promise.all([
    fs.readFile(employeeProfileUrl,"utf8"),
    fs.readFile(employeePayrollUrl,"utf8"),
    fs.readFile(managerProfileUrl,"utf8"),
    fs.readFile(managerPayrollUrl,"utf8")
  ]);
  assert.match(ep,/PROFILE_PROJECTION_INVALID/);
  assert.match(mp,/PROFILE_PROJECTION_INVALID/);
  assert.match(ey,/PAYROLL_PROJECTION_INVALID/);
  assert.match(my,/PAYROLL_PROJECTION_INVALID/);
  assert.match(ey,/ESTIMATED','REVIEWED','FINALIZED','PAID/);
  assert.match(my,/ESTIMATED','REVIEWED','FINALIZED','PAID/);
  for(const src of [ep,ey,mp,my]){
    assert.doesNotMatch(src,/service_role/i);
    assert.doesNotMatch(src,/\.from\(['"](?:profiles|payroll_entries)['"]\)/);
    assert.doesNotMatch(src,/PAYROLL_AUTHORIZED/);
  }
});

test("TASK-107 unresolved profile fields remain explicit and no monetary/pay semantics are invented",async()=>{
  const [ep,ey,my]=await Promise.all([fs.readFile(employeeProfileUrl,"utf8"),fs.readFile(employeePayrollUrl,"utf8"),fs.readFile(managerPayrollUrl,"utf8")]);
  assert.match(ep,/Chưa có nguồn chuẩn/);
  assert.match(ey,/Số tiền chưa hiển thị/);
  assert.match(my,/Không hiển thị monetary amount\/pay-rate\/pay-rule internals/);
  assert.doesNotMatch(ey+my,/hourly_rate|gross_pay|net_pay|overtime|rounding|break rule/i);
});

test("TASK-107 keeps canonical Asia/Ho_Chi_Minh Monday-Sunday week semantics unchanged",async()=>{
  const c=JSON.parse(await fs.readFile(contractUrl,"utf8"));
  assert.equal(c.timezone,"Asia/Ho_Chi_Minh");
  assert.equal(c.week_semantics.timezone,"Asia/Ho_Chi_Minh");
  assert.equal(c.week_semantics.week_start,"MONDAY");
  assert.equal(c.week_semantics.week_end,"SUNDAY");
  assert.equal(c.week_semantics.employee_registration_target,"NEXT_WEEK");
  assert.equal(c.week_semantics.sunday_manager_target,"NEXT_WEEK");
});
