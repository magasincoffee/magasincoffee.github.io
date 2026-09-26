import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
const ACCEPT=path.join(OUT,"ui2-010");
const widths=[360,390,430];
fs.mkdirSync(ACCEPT,{recursive:true});

const report={
  generated_at:new Date().toISOString(),
  status:"PASS",
  base_url:BASE,
  matrix:[],
  checks:[],
  screenshots:[],
  diagnostics:{page_errors:[],console_errors:[],request_failures:[],http_errors:[]}
};
const add=(name,status,detail="")=>{report.checks.push({name,status,detail:String(detail??"")});if(status!=="PASS")report.status="FAIL"};
async function check(name,fn){try{add(name,"PASS",await fn())}catch(e){add(name,"FAIL",e?.stack||e);report.status="FAIL"}}
const readJson=name=>{
  const file=path.join(OUT,name);
  if(!fs.existsSync(file))throw new Error("UI2-010 prerequisite report missing: "+file);
  const parsed=JSON.parse(fs.readFileSync(file,"utf8"));
  if(parsed.status!=="PASS")throw new Error("UI2-010 prerequisite report not PASS: "+name+" status="+parsed.status);
  return parsed;
};
const findCheck=(source,name)=>{
  const row=(source.checks||[]).find(x=>x.name===name);
  if(!row)throw new Error("missing acceptance evidence check: "+name);
  if(row.status!=="PASS")throw new Error("non-PASS acceptance evidence: "+name+" "+row.detail);
  return row;
};
const parseDetail=row=>{
  try{return JSON.parse(row.detail)}catch{return {detail:row.detail}}
};
const ensure=(ok,message)=>{if(!ok)throw new Error(message)};

const sched07=readJson("sched-07-ui-responsive-report.json");
const secondary=readJson("ui2-008-employee-secondary-report.json");
const people=readJson("ui2-009-employee-people-report.json");
const availabilityCanonical=readJson("employee-availability-canonical-report.json");
const swapLifecycle=readJson("shift-swap-lifecycle-v1.json");
const giveLifecycle=readJson("shift-give-lifecycle-v1.json");
const attendanceCanonical=readJson("task-099-employee-attendance-ui-report.json");
const profileCanonical=readJson("task-101-employee-profile-projection-report.json");
const payrollCanonical=readJson("task-104-employee-payroll-self-check-report.json");

function coreMetric(surface,width){
  let row,m;
  if(surface==="shell"){
    row=findCheck(sched07,`ui2_005_employee_${width}_bottom_nav_bounds_touch_and_no_overflow`);m=parseDetail(row);
    return {overflow:m.scrollWidth<=m.clientWidth+1,target:Math.min(...m.buttons.map(x=>Math.min(x.w,x.h))),focus:null,collision:null,source:row.name};
  }
  if(surface==="today"){
    row=findCheck(sched07,`ui2_006_employee_today_${width}_responsive_touch_no_collision`);m=parseDetail(row);
    return {overflow:m.scrollWidth<=m.clientWidth+1,target:m.minButtonHeight,focus:null,collision:!!m.collision,source:row.name};
  }
  if(surface==="schedule"){
    row=findCheck(sched07,`ui2_007_employee_schedule_${width}_responsive_touch_no_collision`);m=parseDetail(row);
    return {overflow:m.scrollWidth<=m.clientWidth+1,target:m.minButtonHeight,focus:m.focusOutline,collision:!!m.collision,source:row.name};
  }
  if(surface==="availability"){
    row=findCheck(secondary,`ui2_008_availability_${width}_responsive_touch_focus_safe_area`);m=parseDetail(row);
    return {overflow:m.scroll<=m.client+1,target:m.minHeight,focus:m.focusOutline,collision:!!m.collision,source:row.name};
  }
  if(surface==="swap"){
    row=findCheck(secondary,`ui2_008_swap_${width}_identity_eligibility_touch_focus_no_overflow`);m=parseDetail(row);
    return {overflow:m.scroll<=m.client+1,target:m.minHeight,focus:m.focusOutline,collision:!!m.collision,source:row.name};
  }
  if(["attendance","payroll","profile"].includes(surface)){
    row=findCheck(people,`ui2_009_${surface}_${width}_phone_contract`);m=parseDetail(row);
    return {overflow:m.scrollWidth<=m.clientWidth+1,target:m.minTarget,focus:m.focusOutline,collision:!!m.collision,source:row.name};
  }
  throw new Error("unknown core metric surface "+surface);
}

for(const width of widths){
  for(const surface of ["shell","today","schedule","availability","swap","attendance","payroll","profile"]){
    const m=coreMetric(surface,width);
    ensure(m.overflow,surface+" "+width+" overflow");
    ensure(Number(m.target)>=43.5,surface+" "+width+" target="+m.target);
    if(m.focus!==null)ensure(m.focus!=="none",surface+" "+width+" missing focus-visible");
    if(m.collision!==null)ensure(!m.collision,surface+" "+width+" nav collision");
    report.matrix.push({width,surface,overflow:"PASS",target:"PASS",focus:m.focus===null?"SUPPLEMENTAL": "PASS",nav_collision:m.collision===null?"SUPPLEMENTAL":"PASS",source:m.source});
  }
}

await check("ui2_010_state_reachability_from_accepted_browser_contracts",async()=>{
  for(const [source,name] of [
    [sched07,"ui2_006_today_current_next_loading_empty_error_states"],
    [sched07,"ui2_007_schedule_week_navigation_and_states"],
    [secondary,"ui2_008_availability_state_matrix_submit_error_retry_readonly"],
    [secondary,"ui2_008_swap_give_state_matrix_delegation_error_retry_submit"],
    [people,"ui2_009_state_matrix_error_retry_stale_owner"]
  ])findCheck(source,name);
  return "Today/Schedule/Availability/Swap-Give/Attendance-Payroll-Profile state evidence present";
});

await check("ui2_010_reload_back_canonical_truth_evidence",async()=>{
  const evidence=[
    [sched07,"ui2_005_employee_hash_back_reload_and_secondary_drawer"],
    [sched07,"ui2_006_today_direct_reload_back_keeps_dashboard_active"],
    [sched07,"ui2_007_schedule_direct_reload_back_keeps_shell_route"],
    [secondary,"ui2_008_secondary_direct_reload_back_refreshes_canonical_truth"],
    [availabilityCanonical,"frame_reload_preserves_same_week_rows_without_resubmit"],
    [swapLifecycle,"reload_retains_applied_state_and_employee_b_ownership"],
    [giveLifecycle,"reload_retains_applied_state_and_new_owner"],
    [attendanceCanonical,"task099_persisted_status_survives_reload_without_duplicate"],
    [profileCanonical,"task101_reload_converges_without_cross_user_state"],
    [people,"ui2_009_direct_route_back_reload_refreshes_canonical_truth"]
  ];
  for(const [source,name] of evidence)findCheck(source,name);
  findCheck(payrollCanonical,"task104_employee_error_clears_stale_payroll_rows_and_recovers");
  return evidence.map(x=>x[1]).join(" | ")+" | payroll refresh recovery";
});

await check("ui2_010_existing_browser_rpc_only_evidence",async()=>{
  for(const [source,name] of [
    [availabilityCanonical,"only_canonical_rpc_boundary_is_used"],
    [swapLifecycle,"browser_uses_rpc_contract_not_direct_shift_swap_table_mutation"],
    [giveLifecycle,"browser_uses_rpc_contract_not_direct_give_or_schedule_table_mutation"],
    [attendanceCanonical,"task099_no_direct_table_or_legacy_mutation_path"],
    [profileCanonical,"task101_browser_uses_self_rpc_only_and_no_direct_profile_table"],
    [payrollCanonical,"task104_employee_self_reader_is_parameterless_and_rpc_only"],
    [people,"ui2_009_360_rpc_only_diagnostics"],
    [people,"ui2_009_390_rpc_only_diagnostics"],
    [people,"ui2_009_430_rpc_only_diagnostics"]
  ])findCheck(source,name);
  return "accepted browser reports confirm RPC-only boundaries / zero direct table calls";
});

const browser=await chromium.launch({headless:true});
for(const width of widths){
  const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width,height:900}});
  const bind=page=>{
    page.on("pageerror",e=>report.diagnostics.page_errors.push(width+": "+String(e?.stack||e?.message||e)));
    page.on("console",m=>{if(m.type()==="error")report.diagnostics.console_errors.push(width+": "+m.text())});
    page.on("requestfailed",r=>report.diagnostics.request_failures.push(width+": "+r.method()+" "+r.url()+" "+(r.failure()?.errorText||"")));
    page.on("response",r=>{if(r.status()>=500)report.diagnostics.http_errors.push(width+": "+r.status()+" "+r.url())});
  };

  const shellPage=await context.newPage();bind(shellPage);
  await shellPage.goto(BASE+"/06_EMPLOYEE/app/employee-v40.html#dashboard",{waitUntil:"networkidle",timeout:20000});
  await shellPage.locator("#employeeV2PrimaryNav").waitFor({state:"attached",timeout:10000});
  const shellTarget=shellPage.locator('[data-employee-primary-view="dashboard"]');
  await shellTarget.focus();await shellTarget.press("Tab");await shellPage.locator(":focus").press("Shift+Tab");
  const shellExtra=await shellPage.evaluate(()=>{
    const html=document.documentElement,view=document.querySelector(".page-view.active"),nav=document.getElementById("employeeV2PrimaryNav"),target=document.querySelector('[data-employee-primary-view="dashboard"]');
    const controls=[...document.querySelectorAll("#employeeV2PrimaryNav button,.header-menu,.header-icon")].filter(x=>{const r=x.getBoundingClientRect(),s=getComputedStyle(x);return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0});
    window.scrollTo(0,html.scrollHeight);
    const candidates=[...view.querySelectorAll("button,input,select,textarea,.panel")].filter(x=>{const r=x.getBoundingClientRect(),s=getComputedStyle(x);return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0});
    const last=candidates.at(-1)||view,lr=last.getBoundingClientRect(),nr=nav.getBoundingClientRect();
    return {overflow:html.scrollWidth<=html.clientWidth+1,target:Math.min(...controls.map(x=>Math.min(x.getBoundingClientRect().width,x.getBoundingClientRect().height))),focus:getComputedStyle(target).outlineStyle,collision:lr.bottom>nr.top+1};
  });
  ensure(shellExtra.overflow&&shellExtra.target>=43.5&&shellExtra.focus!=="none"&&!shellExtra.collision,"shell supplemental "+width+" "+JSON.stringify(shellExtra));
  const shellRow=report.matrix.find(x=>x.width===width&&x.surface==="shell");shellRow.focus="PASS";shellRow.nav_collision="PASS";shellRow.supplemental=shellExtra;
  const shellShot=path.join(ACCEPT,`shell-${width}.png`);await shellPage.screenshot({path:shellShot,fullPage:true});report.screenshots.push(shellShot);
  await shellPage.close();

  const todayPage=await context.newPage();bind(todayPage);
  await todayPage.goto(BASE+"/09_QA/people-shift/ui2-006-employee-today-fixture.html",{waitUntil:"networkidle",timeout:20000});
  const today=todayPage.frameLocator("#employeeApp");
  await today.locator("#view-dashboard.active [data-today-shift-kind='current']").waitFor({timeout:10000});
  const todayTarget=today.locator("#view-dashboard button:visible").first();
  await todayTarget.focus();await todayTarget.press("Tab");await today.locator(":focus").press("Shift+Tab");
  const todayExtra=await today.locator("#view-dashboard").evaluate(view=>{
    const doc=view.ownerDocument,html=doc.documentElement,nav=doc.getElementById("employeeV2PrimaryNav"),target=doc.activeElement;
    const controls=[...view.querySelectorAll("button,input,select,textarea")].filter(x=>{const r=x.getBoundingClientRect(),s=getComputedStyle(x);return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0});
    doc.defaultView.scrollTo(0,html.scrollHeight);
    const last=controls.at(-1)||view,lr=last.getBoundingClientRect(),nr=nav.getBoundingClientRect();
    return {overflow:html.scrollWidth<=html.clientWidth+1,target:Math.min(...controls.map(x=>Math.min(x.getBoundingClientRect().width,x.getBoundingClientRect().height))),focus:target?getComputedStyle(target).outlineStyle:"none",collision:lr.bottom>nr.top+1,visibleActions:controls.length};
  });
  ensure(todayExtra.overflow&&todayExtra.target>=43.5&&todayExtra.focus!=="none"&&!todayExtra.collision&&todayExtra.visibleActions>0,"today supplemental "+width+" "+JSON.stringify(todayExtra));
  const todayRow=report.matrix.find(x=>x.width===width&&x.surface==="today");todayRow.focus="PASS";todayRow.nav_collision="PASS";todayRow.supplemental=todayExtra;
  const todayShot=path.join(ACCEPT,`today-${width}.png`);await todayPage.screenshot({path:todayShot,fullPage:true});report.screenshots.push(todayShot);
  await todayPage.close();

  const secondaryPage=await context.newPage();bind(secondaryPage);
  await secondaryPage.goto(BASE+"/09_QA/people-shift/ui2-008-employee-secondary-fixture.html",{waitUntil:"networkidle",timeout:20000});
  const employee=secondaryPage.frameLocator("#employeeApp");
  await employee.locator("#view-schedule.active [data-schedule-id='sch-fri-am']").waitFor({timeout:10000});
  await employee.locator(".employee-schedule-secondary [data-schedule-availability]").click();
  await employee.locator("#weeklyRegistrationPanel.open").waitFor({state:"visible",timeout:10000});
  const availabilityShot=path.join(ACCEPT,`availability-${width}.png`);await employee.locator("#view-schedule").screenshot({path:availabilityShot});report.screenshots.push(availabilityShot);
  await employee.locator("#weeklyRegistrationPanel .employee-secondary-head button").click();
  await employee.locator('[data-schedule-id="sch-fri-am"] [data-schedule-action="swap"]').click();
  await employee.locator('#view-swap[data-swap-mode="swap"][data-swap-eligibility="eligible"]').waitFor({timeout:10000});
  const swapShot=path.join(ACCEPT,`swap-${width}.png`);await employee.locator("#view-swap").screenshot({path:swapShot});report.screenshots.push(swapShot);
  await employee.locator("[data-swap-return-schedule]").click();await employee.locator("#view-schedule.active").waitFor();
  await employee.locator('[data-schedule-id="sch-fri-am"] [data-schedule-action="give"]').click();
  await employee.locator('#view-swap[data-swap-mode="give"][data-swap-eligibility="eligible"]').waitFor({timeout:10000});
  const giveTarget=employee.locator("#swapForm .swap-actions .btn.primary");
  await giveTarget.focus();await giveTarget.press("Tab");await employee.locator(":focus").press("Shift+Tab");
  const giveMetric=await employee.locator("#view-swap").evaluate(view=>{
    const doc=view.ownerDocument,html=doc.documentElement,nav=doc.getElementById("employeeV2PrimaryNav"),target=doc.activeElement;
    const controls=[...view.querySelectorAll("button,input,select,textarea")].filter(x=>{const r=x.getBoundingClientRect(),s=getComputedStyle(x);return s.display!=="none"&&s.visibility!=="hidden"&&!x.hidden&&r.width>0&&r.height>0});
    doc.defaultView.scrollTo(0,html.scrollHeight);
    const last=controls.at(-1)||view,lr=last.getBoundingClientRect(),nr=nav.getBoundingClientRect();
    return {overflow:html.scrollWidth<=html.clientWidth+1,target:Math.min(...controls.map(x=>Math.min(x.getBoundingClientRect().width,x.getBoundingClientRect().height))),focus:target?getComputedStyle(target).outlineStyle:"none",collision:lr.bottom>nr.top+1,mode:view.dataset.swapMode};
  });
  ensure(giveMetric.mode==="give"&&giveMetric.overflow&&giveMetric.target>=43.5&&giveMetric.focus!=="none"&&!giveMetric.collision,"give "+width+" "+JSON.stringify(giveMetric));
  report.matrix.push({width,surface:"give",overflow:"PASS",target:"PASS",focus:"PASS",nav_collision:"PASS",source:"UI2-010 supplemental give probe",supplemental:giveMetric});
  await employee.locator("#view-swap").evaluate(view=>view.ownerDocument.defaultView.scrollTo(0,0));
  const giveShot=path.join(ACCEPT,`give-${width}.png`);await employee.locator("#view-swap").screenshot({path:giveShot});report.screenshots.push(giveShot);
  await secondaryPage.close();
  await context.close();
}

await check("ui2_010_attendance_error_empty_retry_reachable",async()=>{
  const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:390,height:900}});
  const page=await context.newPage();
  await page.goto(BASE+"/09_QA/people-shift/ui2-009-employee-people-fixture.html#attendance",{waitUntil:"networkidle",timeout:20000});
  const f=page.frameLocator("#employeeApp");
  await f.locator("#view-attendance.active").waitFor({timeout:10000});
  await page.evaluate(()=>{globalThis.__UI2_009_QA.failAttendance(true);return globalThis.MAGASIN_EMPLOYEE.attendance.refresh()});
  await f.locator('#view-attendance[data-attendance-ui-state="error"] [data-attendance-retry]').waitFor({timeout:10000});
  await page.evaluate(()=>globalThis.__UI2_009_QA.failAttendance(false));
  await f.locator("[data-attendance-retry]").click();
  await f.locator('#view-attendance[data-attendance-ui-state="ready"]').waitFor({timeout:10000});
  await page.evaluate(()=>{globalThis.__UI2_009_QA.transferAway();return globalThis.MAGASIN_EMPLOYEE.attendance.refresh()});
  await f.locator('#view-attendance[data-attendance-ui-state="empty"] [data-attendance-empty="1"]').waitFor({timeout:10000});
  const shot=path.join(ACCEPT,"attendance-error-empty-retry-390.png");await f.locator("#view-attendance").screenshot({path:shot});report.screenshots.push(shot);
  await context.close();
  return "Attendance error → retry → ready → canonical empty reachable";
});

await browser.close();

await check("ui2_010_supplemental_browser_diagnostics",async()=>{
  const d=report.diagnostics;
  const relevant=d.request_failures.filter(x=>!x.includes("net::ERR_ABORTED"));
  if(d.page_errors.length||d.console_errors.length||relevant.length||d.http_errors.length)throw new Error(JSON.stringify({...d,request_failures:relevant}));
  return "0 page/console/relevant-request/5xx errors";
});

await check("ui2_010_matrix_complete",async()=>{
  const expected=widths.length*9;
  ensure(report.matrix.length===expected,"matrix rows "+report.matrix.length+" expected "+expected);
  for(const row of report.matrix){
    for(const key of ["overflow","target","focus","nav_collision"])ensure(row[key]==="PASS","matrix "+row.surface+" "+row.width+" "+key+"="+row[key]);
  }
  return expected+" surface×viewport rows all PASS";
});

const copyIfExists=(srcName,dstName=srcName)=>{
  const src=path.join(OUT,srcName),dst=path.join(ACCEPT,dstName);
  if(fs.existsSync(src)){fs.copyFileSync(src,dst);report.screenshots.push(dst);return true}
  return false;
};
for(const width of widths){
  copyIfExists(`ui2-007-employee-schedule-phone-${width}.png`,`schedule-${width}.png`);
  copyIfExists(`ui2-009-attendance-${width}.png`,`attendance-${width}.png`);
  copyIfExists(`ui2-009-payroll-${width}.png`,`payroll-${width}.png`);
  copyIfExists(`ui2-009-profile-${width}.png`,`profile-${width}.png`);
}
report.screenshots=[...new Set(report.screenshots)];

const matrixMd=[
  "# UI2-010 Employee phone acceptance matrix",
  "",
  "| Viewport | Surface | Overflow | Target >=44 | Focus visible | Nav collision |",
  "|---:|---|---|---|---|---|",
  ...report.matrix.sort((a,b)=>a.width-b.width||a.surface.localeCompare(b.surface)).map(r=>`| ${r.width} | ${r.surface} | ${r.overflow} | ${r.target} | ${r.focus} | ${r.nav_collision} |`)
].join("\n");
fs.writeFileSync(path.join(ACCEPT,"ui2-010-employee-phone-acceptance-matrix.md"),matrixMd);
fs.writeFileSync(path.join(ACCEPT,"ui2-010-employee-phone-acceptance-report.json"),JSON.stringify(report,null,2));

console.log("UI2_010_EMPLOYEE_PHONE_ACCEPTANCE="+report.status);
console.log("UI2_010_MATRIX_ROWS="+report.matrix.length);
console.log("UI2_010_SCREENSHOTS="+report.screenshots.length);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=="PASS")process.exitCode=1;
