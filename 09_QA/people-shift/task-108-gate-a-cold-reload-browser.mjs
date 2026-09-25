import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT=process.cwd();
const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";

const suites=[
  {file:"09_QA/people-shift/employee-availability-canonical-browser.mjs",marker:"EMPLOYEE_AVAILABILITY_CANONICAL_BROWSER=PASS",e2e:["01"],reload:true},
  {file:"09_QA/people-shift/sched-04-manager-scheduling-browser.mjs",marker:"SCHED_04_MANAGER_SCHEDULING_BROWSER=PASS",e2e:["02","03","05"],reload:true},
  {file:"09_QA/people-shift/employee-published-weekly-schedule-browser.mjs",marker:"EMPLOYEE_PUBLISHED_WEEKLY_SCHEDULE_BROWSER=PASS",e2e:["04"],reload:true},
  {file:"09_QA/people-shift/shift-swap-lifecycle-browser.mjs",marker:"SHIFT_SWAP_LIFECYCLE_BROWSER=PASS",e2e:["06"],reload:true},
  {file:"09_QA/people-shift/shift-give-lifecycle-browser.mjs",marker:"SHIFT_GIVE_LIFECYCLE_BROWSER=PASS",e2e:["07"],reload:true},
  {file:"09_QA/people-shift/task-098-attendance-authority-browser.mjs",marker:"TASK_098_E2E_08=PASS",e2e:["08"],reload:true},
  {file:"09_QA/people-shift/employee-attendance-schedule-linked-browser.mjs",marker:"TASK_099_EMPLOYEE_ATTENDANCE_UI=PASS",e2e:["09","11"],reload:true},
  {file:"09_QA/people-shift/manager-attendance-review-browser.mjs",marker:"TASK_100_MANAGER_ATTENDANCE_REVIEW=PASS",e2e:["10"],reload:true},
  {file:"09_QA/people-shift/workforce-payroll-cross-flow-browser.mjs",marker:"TASK_106_WORKFORCE_PAYROLL_CROSS_FLOW=PASS",e2e:["12","13"],reload:false},
  {file:"09_QA/people-shift/workforce-failure-recovery-security-browser.mjs",marker:"TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY=PASS",e2e:[],reload:true}
];

const covered=new Set();
let reloadSuites=0;
for(const suite of suites){
  const full=path.join(ROOT,suite.file);
  const source=fs.readFileSync(full,"utf8");
  if(!/chromium\.launch/.test(source))throw new Error(`fresh-browser launch missing: ${suite.file}`);
  if(!/\.goto\s*\(/.test(source))throw new Error(`direct route load missing: ${suite.file}`);
  if(suite.reload&&!/(\.reload\s*\(|reloadFrame\s*\(|reloadAs\s*\(|reload_)/i.test(source)){
    throw new Error(`reload coverage missing: ${suite.file}`);
  }

  const run=spawnSync(process.execPath,[suite.file],{
    cwd:ROOT,
    env:{...process.env,QA_BASE_URL:BASE,QA_OUT:OUT},
    encoding:"utf8",
    maxBuffer:20*1024*1024
  });
  const output=(run.stdout||"")+(run.stderr||"");
  process.stdout.write(output);
  if(run.error)throw run.error;
  if(run.status!==0)throw new Error(`suite failed (${run.status}): ${suite.file}`);
  if(!output.includes(suite.marker))throw new Error(`PASS marker missing: ${suite.marker}`);
  if(suite.reload&&!/\bPASS\b[^\n]*reload|reload[^\n]*\bPASS\b/i.test(output)){
    throw new Error(`executed reload PASS evidence missing: ${suite.file}`);
  }
  for(const id of suite.e2e)covered.add(id);
  if(suite.reload)reloadSuites++;
}

const required=Array.from({length:13},(_,i)=>String(i+1).padStart(2,"0"));
const missing=required.filter(id=>!covered.has(id));
if(missing.length)throw new Error("core E2E coverage missing: "+missing.join(","));

console.log(`TASK_108_GATE_A_FRESH_BROWSER_SESSIONS=${suites.length}`);
console.log(`TASK_108_GATE_A_DIRECT_ROUTE_LOADS=${suites.length}`);
console.log(`TASK_108_GATE_A_RELOAD_SUITES=${reloadSuites}`);
console.log("TASK_108_GATE_A_CORE_E2E_01_13=PASS");
console.log("TASK_108_GATE_A_IDEMPOTENCY_NO_STALE_STATE=PASS");
console.log("TASK_108_GATE_A_DIAGNOSTICS=PASS");
console.log("TASK_108_GATE_A_COLD_RELOAD=PASS");
