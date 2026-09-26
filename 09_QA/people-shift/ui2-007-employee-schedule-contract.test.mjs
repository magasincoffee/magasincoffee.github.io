import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const app=read("06_EMPLOYEE/app/employee-v40.html");
const schedule=read("06_EMPLOYEE/schedule/engine-v1.js");
const runtime=read("06_EMPLOYEE/runtime/employee-runtime-v1.html");
const index=read("06_EMPLOYEE/index.html");
const shell=read("02_CORE/ui/magasin-ui-v2-employee-shell.js");
const scheduleCss=read("02_CORE/ui/magasin-ui-v2-employee-schedule.css");
const todayCss=read("02_CORE/ui/magasin-ui-v2-employee-today.css");

test("UI2-007 loads a namespaced V2 Schedule presentation layer",()=>{
  assert.ok(app.includes("/02_CORE/ui/magasin-ui-v2-employee-schedule.css?v=20260926-ui2-007"));
  assert.match(scheduleCss,/body\[data-magasin-employee-shell-v2\] #view-schedule/);
  assert.match(scheduleCss,/schedule-week-nav/);
  assert.match(scheduleCss,/\.day\.today/);
  assert.match(scheduleCss,/\.shift-time/);
  assert.match(scheduleCss,/\.shift-store/);
  assert.match(scheduleCss,/\.shift-status/);
  assert.match(scheduleCss,/min-height:\s*44px/);
  assert.match(scheduleCss,/@media \(max-width: 760px\)/);
  assert.match(scheduleCss,/@media \(max-width: 430px\)/);
  assert.doesNotMatch(scheduleCss,/(^|\n)\s*:root\s*\{/m);
});

test("UI2-007 leaves canonical Schedule authority and RPC surface unchanged",()=>{
  const rpcNames=[...schedule.matchAll(/\.rpc\(['"]([^'"]+)/g)].map(m=>m[1]);
  assert.deepEqual(rpcNames,["list_my_approved_schedules_v2"]);
  assert.match(schedule,/toUpperCase\(\)==='APPROVED'/);
  assert.match(schedule,/async function preflight\(scheduleId\)/);
  assert.match(schedule,/await readWeek\(week\)/);
  assert.doesNotMatch(schedule,/\.from\(['"](?:work_schedules|schedule_generation_runs|schedule_generation_assignments)['"]\)/);
  assert.doesNotMatch(schedule,/C\.supabase\.from|createClient\(/);
});

test("UI2-007 preserves downstream Schedule action delegation",()=>{
  assert.match(schedule,/attendance\?\.openSchedule\?\./);
  assert.match(schedule,/api\?\.openGive\?\./);
  assert.match(schedule,/api\?\.openSwap\?\./);
  assert.match(schedule,/globalThis\.MAGASIN_EMPLOYEE\?\.availability\?\.open\?\.\(\)/);
  assert.match(schedule,/data-schedule-action="attendance"/);
  assert.match(schedule,/data-schedule-action="give"/);
  assert.match(schedule,/data-schedule-action="swap"/);
});

test("UI2-007 keeps week rendering canonical including multiple shifts per day",()=>{
  assert.match(schedule,/C\.date\.weekDays\(state\.week\)/);
  assert.match(schedule,/weekRows\.filter\(r=>String\(r\.work_date\)/);
  assert.match(schedule,/\.sort\(\(a,b\)=>mins\(a\.start_time\)-mins\(b\.start_time\)/);
  assert.match(schedule,/for\(const r of rows\)/);
  assert.match(schedule,/schedule-skeleton/);
  assert.match(schedule,/schedule-week-empty/);
  assert.match(schedule,/data-schedule-error/);
  assert.match(schedule,/data-schedule-retry/);
});

test("UI2-005 shell and UI2-006 Today remain canonical while cache entry advances",()=>{
  for(const label of ["Hôm nay","Lịch","Công","Lương","Tôi"])assert.ok(shell.includes("'"+label+"'"));
  assert.ok(app.includes("/02_CORE/ui/magasin-ui-v2-employee-today.css?v=20260925-ui2-006"));
  assert.ok(todayCss.includes(".employee-today-v2"));
  assert.match(runtime,/employee-v40\.html\?ui=v45-ui2-008&runtime=engine/);
  assert.match(index,/employee-runtime-v1\.html\?v=20260926-ui2-008/);
  assert.equal((runtime.match(/\/06_EMPLOYEE\/schedule\/engine-v1\.js/g)||[]).length,1);
  assert.match(runtime,/schedule\/engine-v1\.js\?v=20260926-ui2-008/);
});

test("UI2-007 Schedule presentation remains bounded after UI2-008 adds a separate secondary layer",()=>{
  assert.doesNotMatch(scheduleCss,/availability-form|swap-form|give-form/);
  assert.ok(fs.existsSync("02_CORE/ui/magasin-ui-v2-employee-secondary.css"));
  assert.ok(app.includes("/02_CORE/ui/magasin-ui-v2-employee-schedule.css?v=20260926-ui2-007"));
});

console.log("UI2_007_EMPLOYEE_SCHEDULE_CONTRACT=PASS");
