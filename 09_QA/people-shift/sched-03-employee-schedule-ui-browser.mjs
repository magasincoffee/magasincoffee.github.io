import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.message||e)});report.status="FAIL"}};

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:390,height:844}});
const page=await context.newPage();
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push({url:r.url(),error:r.failure()?.errorText||"unknown"}));
page.on("response",r=>{if(r.status()>=500)report.http_errors.push({url:r.url(),status:r.status()})});

await page.goto(BASE+"/09_QA/people-shift/sched-03-employee-schedule-ui-fixture.html",{waitUntil:"networkidle"});
const employee=page.frameLocator("#employeeApp");
await employee.locator(".employee-schedule-engine").waitFor();

await check("sched03_mobile_current_week_is_official_self_only",async()=>{
  await employee.locator(".shift").first().waitFor();
  const text=(await employee.locator("#view-schedule").innerText()).replace(/\s+/g," ");
  const rows=await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.schedule.getRows());
  if(rows.length!==2||rows.some(r=>r.status!=="APPROVED")||rows.some(r=>!["sch-today","sch-future"].includes(r.schedule_id)))throw new Error(JSON.stringify(rows));
  if(text.includes("sch-today")||text.includes("sch-future")||text.includes("sch-other")||text.includes("sch-draft")||text.includes("APPROVED")||text.includes("DRAFT"))throw new Error(text);
  for(const expected of ["Lịch làm chính thức","Đã phát hành","CN1","CN2","06:00–12:00","17:00–22:00"])if(!text.includes(expected))throw new Error("missing "+expected+": "+text);
  return "2 own APPROVED rows; ids/status backend values not exposed";
});

await check("sched03_availability_is_explicitly_not_official_schedule",async()=>{
  const text=(await employee.locator(".schedule-availability").innerText()).replace(/\s+/g," ");
  if(!text.includes("Availability")||!text.includes("không phải lịch chính thức"))throw new Error(text);
  await employee.locator("[data-schedule-availability]").click();
  const q=await page.evaluate(()=>({views:globalThis.__SCHED03_QA.views,downstream:globalThis.__SCHED03_QA.downstream}));
  if(q.views.at(-1)!=="schedule"||q.downstream.at(-1)?.type!=="availability")throw new Error(JSON.stringify(q));
  return "Availability remains input, clearly separated and secondary under Schedule";
});

await check("sched03_actions_bind_hidden_schedule_identity_and_preflight_server_truth",async()=>{
  const today=employee.locator('[data-schedule-id="sch-today"]');
  const future=employee.locator('[data-schedule-id="sch-future"]');
  if(await today.locator('[data-schedule-action="attendance"]').count()!==1)throw new Error("today attendance action missing");
  if(await future.locator('[data-schedule-action="give"]').count()!==1||await future.locator('[data-schedule-action="swap"]').count()!==1)throw new Error("future give/swap actions missing");
  const before=await page.evaluate(()=>globalThis.__SCHED03_QA.rpcCount());
  await today.locator('[data-schedule-action="attendance"]').click();
  await page.waitForFunction(()=>globalThis.__SCHED03_QA.downstream.some(x=>x.type==="attendance"));
  const afterAttendance=await page.evaluate(()=>({rpc:globalThis.__SCHED03_QA.rpcCount(),views:globalThis.__SCHED03_QA.views,downstream:globalThis.__SCHED03_QA.downstream}));
  if(afterAttendance.rpc-before!==1||afterAttendance.views.at(-1)!=="attendance")throw new Error(JSON.stringify(afterAttendance));
  const a=afterAttendance.downstream.find(x=>x.type==="attendance");
  if(a?.id!=="sch-today"||a?.week!=="2026-09-21")throw new Error(JSON.stringify(a));
  await future.locator('[data-schedule-action="give"]').click();
  await page.waitForFunction(()=>globalThis.__SCHED03_QA.downstream.some(x=>x.type==="give"));
  await future.locator('[data-schedule-action="swap"]').click();
  await page.waitForFunction(()=>globalThis.__SCHED03_QA.downstream.some(x=>x.type==="swap"));
  const d=await page.evaluate(()=>globalThis.__SCHED03_QA.downstream.filter(x=>["give","swap"].includes(x.type)));
  if(d.some(x=>x.id!=="sch-future"||x.week!=="2026-09-21"))throw new Error(JSON.stringify(d));
  return "attendance/give/swap anchored to current schedule identity after fresh canonical read";
});

await check("sched03_stale_ownership_reconcile_removes_old_owner_shift",async()=>{
  await page.evaluate(()=>globalThis.__SCHED03_QA.transferAway("sch-future"));
  const before=await page.evaluate(()=>globalThis.__SCHED03_QA.downstream.filter(x=>x.type==="swap").length);
  await employee.locator('[data-schedule-id="sch-future"] [data-schedule-action="swap"]').click();
  await employee.locator(".schedule-notice.open").filter({hasText:"không còn thuộc lịch chính thức"}).waitFor();
  const state=await page.evaluate(()=>({rows:globalThis.MAGASIN_EMPLOYEE.schedule.getRows().map(x=>x.schedule_id),swapCalls:globalThis.__SCHED03_QA.downstream.filter(x=>x.type==="swap").length}));
  if(state.rows.includes("sch-future")||state.swapCalls!==before)throw new Error(JSON.stringify(state));
  return "old owner card removed; downstream action not opened";
});

await check("sched03_raw_backend_errors_never_render",async()=>{
  await page.evaluate(()=>globalThis.__SCHED03_QA.setFail(true));
  await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.schedule.refresh());
  await employee.locator("[data-schedule-error='1']").waitFor();
  const text=await employee.locator("[data-schedule-error='1']").innerText();
  if(text.includes("SQLSTATE")||text.includes("INTERNAL_QA_RAW"))throw new Error(text);
  if(!text.includes("Không thể tải lịch làm"))throw new Error(text);
  await page.evaluate(()=>globalThis.__SCHED03_QA.setFail(false));
  await employee.locator("[data-schedule-retry]").click();
  await employee.locator('[data-schedule-id="sch-today"]').waitFor();
  return "friendly error + deterministic retry";
});

await check("sched03_current_next_navigation_and_reload_are_deterministic",async()=>{
  await employee.locator('[data-schedule-week="next"]').click();
  await employee.locator('[data-schedule-id="sch-next"]').waitFor();
  const before=await page.evaluate(()=>globalThis.__SCHED03_QA.rpcCount());
  await page.evaluate(()=>globalThis.__SCHED03_QA.reloadFrame());
  await employee.locator('[data-schedule-id="sch-next"]').waitFor();
  const state=await page.evaluate(()=>({week:globalThis.MAGASIN_EMPLOYEE.schedule.getWeek(),rows:globalThis.MAGASIN_EMPLOYEE.schedule.getRows().map(x=>x.schedule_id),rpc:globalThis.__SCHED03_QA.rpcCount()}));
  if(state.week!=="2026-09-28"||JSON.stringify(state.rows)!==JSON.stringify(["sch-next"])||state.rpc-before!==1)throw new Error(JSON.stringify(state));
  const current=await employee.locator('[data-schedule-week="next"]').getAttribute("aria-current");
  if(current!=="true")throw new Error("next week not marked current");
  return JSON.stringify(state);
});

await check("sched03_mobile_390_has_no_horizontal_overflow",async()=>{
  const m=await employee.locator("body").evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
  if(m.scroll>m.client+2)throw new Error(JSON.stringify(m));
  return m.client+"px fits";
});

const desktop=await context.newPage();
await desktop.setViewportSize({width:1280,height:900});
await desktop.goto(BASE+"/09_QA/people-shift/sched-03-employee-schedule-ui-fixture.html",{waitUntil:"networkidle"});
const desktopEmployee=desktop.frameLocator("#employeeApp");
await desktopEmployee.locator(".employee-schedule-engine").waitFor();
await check("sched03_desktop_grid_is_professional_and_non_overflowing",async()=>{
  await desktopEmployee.locator(".shift").first().waitFor();
  const m=await desktopEmployee.locator("body").evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
  const cols=await desktopEmployee.locator(".days").evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length);
  if(m.scroll>m.client+2||cols!==7)throw new Error(JSON.stringify({m,cols}));
  return "7-column desktop week · no horizontal overflow";
});

await check("sched03_no_direct_table_or_legacy_schedule_reader",async()=>{
  const calls=await page.evaluate(()=>globalThis.__SCHED03_QA.calls);
  if(calls.some(x=>x.kind==="from"))throw new Error(JSON.stringify(calls));
  const names=calls.filter(x=>x.kind==="rpc").map(x=>x.name);
  if(names.some(x=>["get_my_schedule","list_my_approved_schedules_v1"].includes(x)))throw new Error(JSON.stringify(names));
  if(!names.includes("list_my_approved_schedules_v2"))throw new Error(JSON.stringify(names));
  return "V2 only; no direct table/legacy reader";
});

await check("sched03_browser_diagnostics",async()=>{
  if(report.page_errors.length||report.console_errors.length||report.request_failures.length||report.http_errors.length)throw new Error(JSON.stringify({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures,http_errors:report.http_errors}));
  return "0 page/console/request/5xx errors";
});

await page.screenshot({path:path.join(OUT,"sched-03-employee-schedule-mobile.png"),fullPage:true});
await desktop.screenshot({path:path.join(OUT,"sched-03-employee-schedule-desktop.png"),fullPage:true});
await browser.close();
fs.writeFileSync(path.join(OUT,"sched-03-employee-schedule-report.json"),JSON.stringify(report,null,2));
console.log("SCHED_03_EMPLOYEE_SCHEDULE_UI="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=="PASS")process.exitCode=1;
