import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT=process.cwd();
const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8769";
const OUT=process.env.QA_OUT||"qa-artifacts/ui2-cross-role";
const EXPECTED_SHA=String(process.env.SCHED_UI_014_CANDIDATE_SHA||"").trim();

fs.mkdirSync(OUT,{recursive:true});

function runGit(...args){
  const r=spawnSync("git",args,{cwd:ROOT,encoding:"utf8",maxBuffer:4*1024*1024});
  if(r.status!==0)throw new Error("git "+args.join(" ")+" failed: "+String(r.stderr||r.stdout||""));
  return String(r.stdout||"").trim();
}

const ACTUAL_SHA=runGit("rev-parse","HEAD");
if(!EXPECTED_SHA)throw new Error("SCHED_UI_014_CANDIDATE_SHA is required");
if(ACTUAL_SHA!==EXPECTED_SHA)throw new Error(`candidate SHA mismatch: expected ${EXPECTED_SHA}, checkout ${ACTUAL_SHA}`);

const cases=[
  {
    id:"manager-recurring-auto",
    script:"09_QA/people-shift/xstore-cross-store-browser.mjs",
    markers:[
      "SCHED_UI_013_RECURRING_EDITOR_REGRESSION=PASS",
      "XSTORE_RECURRING_STABLE_EDITOR_BROWSER=PASS"
    ],
    covers:["Manager recurring staffing","Auto Schedule prerequisites","responsive recurring widths"]
  },
  {
    id:"manager-canonical-transactional-schedule",
    script:"09_QA/people-shift/manager-workforce-canonical-browser.mjs",
    markers:["MANAGER_WORKFORCE_CANONICAL_BROWSER=PASS"],
    covers:["Manager canonical store/week controls","save/validate/review/publish","idempotency and conflict rejection","role-scoped writer","console/page/request/5xx diagnostics"]
  },
  {
    id:"manager-owner-approved-five-board",
    script:"09_QA/people-shift/xstore-019g-manager-five-board-browser.mjs",
    markers:["XSTORE_019G_MANAGER_FIVE_BOARD_BROWSER=PASS"],
    covers:["Owner-approved Manager five-step calendar","seven-day responsive layout","keyboard and drawer interactions"]
  },
  {
    id:"manager-direct-calendar-editing",
    script:"09_QA/people-shift/xstore-019b-direct-calendar-editing-browser.mjs",
    markers:["XSTORE_019B_DIRECT_CALENDAR_BROWSER=PASS"],
    covers:["direct click/create/duplicate/edit/delete","conflict fail-closed and writer-only save"]
  },
  {
    id:"employee-official-schedule",
    script:"09_QA/people-shift/sched-03-employee-schedule-ui-browser.mjs",
    markers:["SCHED_03_EMPLOYEE_SCHEDULE_UI=PASS"],
    covers:["Employee official schedule","Employee time bands","console/page/request/5xx diagnostics"]
  },
  {
    id:"employee-availability",
    script:"09_QA/people-shift/employee-availability-canonical-browser.mjs",
    markers:["EMPLOYEE_AVAILABILITY_CANONICAL_BROWSER=PASS"],
    covers:["Employee availability registration","immediate save/reload","console/page/request/5xx diagnostics"]
  },
  {
    id:"owner-responsive-drilldown",
    script:"09_QA/people-shift/sched-07-ui-responsive-browser.mjs",
    markers:["SCHED_07_UI_RESPONSIVE=PASS"],
    covers:["Owner overview/drill-down","representative responsive widths","touch targets","console/page/request/5xx diagnostics"]
  },
  {
    id:"canonical-routes",
    script:"09_QA/ui2-cross-role/sched-ui-009-clean-routes-browser.mjs",
    markers:["SCHED_UI_009_CLEAN_ROUTES_BROWSER=PASS"],
    covers:["canonical routes","clean reload"]
  },
  {
    id:"compat-auth-routes",
    script:"09_QA/ui2-cross-role/sched-ui-010-auth-navigation-browser.mjs",
    markers:["SCHED_UI_010_AUTH_NAVIGATION_BROWSER=PASS"],
    covers:["old compatibility routes","Auth route destinations","back/forward/reload"]
  }
];

const report={
  task:"SCHED-UI-014",
  status:"PASS",
  candidate_sha:ACTUAL_SHA,
  candidate_ref:process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||"",
  base_url:BASE,
  cases:[],
  coverage:[]
};

for(const spec of cases){
  const caseOut=path.join(OUT,"sched-ui-014",spec.id);
  fs.mkdirSync(caseOut,{recursive:true});
  const started=Date.now();
  const r=spawnSync(process.execPath,[spec.script],{
    cwd:ROOT,
    encoding:"utf8",
    maxBuffer:32*1024*1024,
    env:{...process.env,QA_BASE_URL:BASE,QA_OUT:caseOut}
  });
  const stdout=String(r.stdout||"");
  const stderr=String(r.stderr||"");
  const missing=spec.markers.filter(m=>!stdout.includes(m)&&!stderr.includes(m));
  const ok=r.status===0&&missing.length===0;
  report.cases.push({
    id:spec.id,
    script:spec.script,
    status:ok?"PASS":"FAIL",
    exit_code:r.status,
    missing_markers:missing,
    duration_ms:Date.now()-started,
    covers:spec.covers
  });
  report.coverage.push(...spec.covers);
  if(!ok){
    report.status="FAIL";
    fs.writeFileSync(path.join(OUT,"sched-ui-014-integrated-qualification-report.json"),JSON.stringify(report,null,2));
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    throw new Error(`SCHED-UI-014 case failed: ${spec.id}; missing markers: ${missing.join(", ")}`);
  }
  process.stdout.write(`[SCHED-UI-014 PASS] ${spec.id} · ${spec.covers.join(" · ")}\n`);
}

const requiredCoverage=[
  "Manager recurring staffing",
  "Manager canonical store/week controls",
  "Owner-approved Manager five-step calendar",
  "direct click/create/duplicate/edit/delete",
  "Auto Schedule prerequisites",
  "save/validate/review/publish",
  "idempotency and conflict rejection",
  "Employee official schedule",
  "Employee availability registration",
  "Owner overview/drill-down",
  "canonical routes",
  "old compatibility routes",
  "Auth route destinations",
  "representative responsive widths",
  "console/page/request/5xx diagnostics"
];
for(const item of requiredCoverage){
  if(!report.coverage.includes(item))throw new Error("missing integrated coverage: "+item);
}
report.coverage=[...new Set(report.coverage)];
fs.writeFileSync(path.join(OUT,"sched-ui-014-integrated-qualification-report.json"),JSON.stringify(report,null,2));
console.log("SCHED_UI_014_CANDIDATE_SHA="+ACTUAL_SHA);
console.log("SCHED_UI_014_INTEGRATED_CROSS_ROLE_BROWSER=PASS");
