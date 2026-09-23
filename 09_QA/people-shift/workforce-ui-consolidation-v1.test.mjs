import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(new URL("../../"+p,import.meta.url),"utf8");

test("TASK-105 canonical plan and gate stay exact",()=>{
  const plan=read("01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_OPERATIONS_V1_EXECUTION_PLAN.md");
  assert.match(plan,/TASK-105 \| Employee \+ Manager Workforce UI Consolidation \| keep only canonical V1 surfaces; remove\/hide duplicate\/deprecated active paths/);
  const queue=read("01_DOCS/MAGASIN/00_TASK_QUEUE.md");
  assert.match(queue,/TASK-105 \| Employee \+ Manager Workforce UI Consolidation \| 20m \| canonical routes only \+ regression/);
});

test("legacy Manager deep links route only through canonical Manager entry",()=>{
  const expected={
    "05_MANAGER/Cham-cong/index.html":"#attendance",
    "05_MANAGER/Doi-ca/index.html":"#swap",
    "05_MANAGER/Nhan-su/index.html":"#staff"
  };
  for(const [path,hash] of Object.entries(expected)){
    const src=read(path);
    assert.ok(src.includes("/05_MANAGER/"+hash),path);
    assert.doesNotMatch(src,/manager-v13-runtime|createClient\(|\.from\(['"]profiles['"]\)|\/employee\//,path);
  }
});

test("canonical Manager engine loads only V1 modules and consolidation",()=>{
  const src=read("05_MANAGER/Workforce/engine-v1.js");
  assert.match(src,/staff-projection-v1\.js/);
  assert.match(src,/ui-consolidation-v1\.js/);
  assert.doesNotMatch(src,/demand-v1\.js|runtime\/compat\/workforce/);
});

test("Manager consolidation removes deprecated active surfaces and keeps safe canonical routes",()=>{
  const src=read("05_MANAGER/Workforce/ui-consolidation-v1.js");
  assert.match(src,/\['kpi','academy'\]/);
  assert.match(src,/querySelector\('\[data-tab="demand"\]'\)\?\.remove/);
  assert.match(src,/getElementById\('panel-demand'\)\?\.remove/);
  assert.match(src,/payroll-self-check/);
  assert.doesNotMatch(src,/manager-v13-runtime|auto_generate_schedule_generation|get_workforce_staffing_requirements/);
});

test("Manager staff surface reuses TASK-101 server projection and never reads tables directly",()=>{
  const src=read("05_MANAGER/Workforce/staff-projection-v1.js");
  assert.match(src,/get_manager_accessible_stores/);
  assert.match(src,/list_employee_profile_projection_v1/);
  assert.doesNotMatch(src,/\.from\(|insert\(|update\(|delete\(/);
});

test("Employee canonical runtime retains TASK-099\/101\/104 engines and adds consolidation only",()=>{
  const runtime=read("06_EMPLOYEE/runtime/employee-runtime-v1.html");
  for(const token of ["profile/engine-v1.js","payroll/engine-v1.js","attendance/engine-v1.js","workforce-ui-consolidation-v1.js"])assert.ok(runtime.includes(token),token);
  const attendance=read("06_EMPLOYEE/attendance/engine-v1.js");
  assert.match(attendance,/submit_manual_time_attendance_v1/);
  assert.doesNotMatch(attendance,/clock_in_for_schedule|clock_out_attendance/);
  const ui=read("06_EMPLOYEE/workforce-ui-consolidation-v1.js");
  assert.match(ui,/attendance-report-wrap/);
  assert.match(ui,/Đổi \/ cho ca/);
});

test("route hashes are allowlisted before entering nested runtimes",()=>{
  const manager=read("05_MANAGER/index.html");
  const employee=read("06_EMPLOYEE/index.html");
  assert.match(manager,/new Set\(\['dashboard','staff','workforce','schedule','swap','attendance','payroll-self-check'\]\)/);
  assert.match(employee,/new Set\(\['dashboard','schedule','attendance','swap','payroll','profile'\]\)/);
});
