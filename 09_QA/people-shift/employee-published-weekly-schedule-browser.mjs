import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
const pass=(name,detail="")=>report.checks.push({name,status:"PASS",detail:String(detail??"")});
const fail=(name,detail="")=>{report.checks.push({name,status:"FAIL",detail:String(detail??"")});report.status="FAIL"};
const check=async(name,fn)=>{try{pass(name,await fn())}catch(e){fail(name,e?.message||e)}};

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1280,height:900}});
const baseOrigin=new URL(BASE).origin;
function wire(page){
  page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
  page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
  page.on("requestfailed",r=>report.request_failures.push({url:r.url(),error:r.failure()?.errorText||"unknown"}));
  page.on("response",r=>{if(r.status()>=500)report.http_errors.push({url:r.url(),status:r.status()})});
  page.on("request",r=>{if(!r.url().startsWith(baseOrigin)&&!r.url().startsWith("data:")&&!r.url().startsWith("about:"))report.request_failures.push({url:r.url(),error:"external-request"})});
}

const sunday=await context.newPage();wire(sunday);
await sunday.goto(`${BASE}/09_QA/people-shift/employee-published-weekly-schedule-fixture.html?now=2026-09-27T16%3A30%3A00.000Z`,{waitUntil:"networkidle"});
const employee=sunday.frameLocator("#employeeApp");
await employee.locator("body[data-employee-schedule-engine='1']").waitFor();

await check("sunday_current_week_is_2026_09_21_and_target_week_not_cross_wired",async()=>{
  await employee.locator("#view-schedule .pill").filter({hasText:"21/09–27/09"}).waitFor();
  const week=await sunday.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.schedule.getWeek());
  if(week!=="2026-09-21")throw new Error("week="+week);
  const shifts=await employee.locator("#view-schedule .shift").count();
  if(shifts!==0)throw new Error("unexpected shifts="+shifts);
  return week+" · 0 next-week shifts in current week";
});

await check("manager_publish_fixture_is_idempotent_and_creates_no_clock_out_reminder",async()=>{
  const result=await sunday.evaluate(()=>{
    globalThis.__TASK095_QA.publishTargetWeek();
    globalThis.__TASK095_QA.publishTargetWeek();
    const notifications=globalThis.__TASK095_QA.getPublishedNotifications();
    return {
      publishCalls:globalThis.__TASK095_QA.state.publishCalls,
      eventKeys:notifications.map(x=>x.event_key).sort(),
      eventTypes:notifications.map(x=>x.event_type),
      emailStatuses:notifications.map(x=>x.email_status)
    };
  });
  if(result.publishCalls!==2)throw new Error(JSON.stringify(result));
  if(new Set(result.eventKeys).size!==result.eventKeys.length)throw new Error("duplicate event_key "+JSON.stringify(result));
  if(result.eventTypes.some(x=>x==="CLOCK_OUT_REMINDER"))throw new Error(JSON.stringify(result));
  if(result.emailStatuses.some(x=>x==="SENT"))throw new Error("fake SENT "+JSON.stringify(result));
  if(!result.eventKeys.includes("schedule:sch-1:published")||!result.eventKeys.includes("schedule:sch-2:published"))throw new Error(JSON.stringify(result));
  return JSON.stringify(result);
});

await check("sunday_next_week_reads_exact_target_and_only_own_approved_rows",async()=>{
  await employee.locator('[data-schedule-week="next"]').click();
  await employee.locator("#view-schedule .pill").filter({hasText:"28/09–04/10"}).waitFor();
  await employee.locator("#view-schedule .shift").first().waitFor();
  const viewText=(await employee.locator("#view-schedule").innerText()).replace(/\s+/g," ");
  const state=await sunday.evaluate(()=>({
    week:globalThis.MAGASIN_EMPLOYEE.schedule.getWeek(),
    rows:globalThis.MAGASIN_EMPLOYEE.schedule.getRows(),
    readerCalls:globalThis.__TASK095_QA.calls.filter(x=>x.kind==="rpc"&&x.name==="list_my_approved_schedules_v2")
  }));
  if(state.week!=="2026-09-28")throw new Error(JSON.stringify(state));
  if(state.rows.length!==2)throw new Error(JSON.stringify(state.rows));
  if(state.rows.some(x=>x.status!=="APPROVED"))throw new Error(JSON.stringify(state.rows));
  if(state.rows.some(x=>!["sch-1","sch-2"].includes(x.schedule_id)))throw new Error(JSON.stringify(state.rows));
  if(viewText.includes("sch-other")||viewText.includes("PENDING")||viewText.includes("CANCELLED"))throw new Error(viewText);
  if(!viewText.includes("06:00–12:00")||!viewText.includes("17:00–22:00")||!viewText.includes("CN-QA-A")||!viewText.includes("CN-QA-B"))throw new Error(viewText);
  const last=state.readerCalls.at(-1);
  if(last?.args?.p_week_start!=="2026-09-28")throw new Error(JSON.stringify(last));
  return "2026-09-28 → 2026-10-04 · 2 own APPROVED schedules";
});

await check("same_week_refresh_is_deduped_to_one_effective_reader_call",async()=>{
  const before=await sunday.evaluate(()=>globalThis.__TASK095_QA.calls.filter(x=>x.kind==="rpc"&&x.name==="list_my_approved_schedules_v2").length);
  await sunday.evaluate(()=>Promise.all([
    globalThis.MAGASIN_EMPLOYEE.schedule.refresh(),
    globalThis.MAGASIN_EMPLOYEE.schedule.refresh()
  ]));
  const after=await sunday.evaluate(()=>globalThis.__TASK095_QA.calls.filter(x=>x.kind==="rpc"&&x.name==="list_my_approved_schedules_v2").length);
  if(after-before!==1)throw new Error(`reader delta=${after-before}`);
  return "2 refresh calls → 1 RPC";
});

await check("failed_future_week_clears_stale_success_and_recovers_without_cross_wire",async()=>{
  await sunday.evaluate(()=>globalThis.__TASK095_QA.setFailWeek("2026-10-05"));
  await employee.locator('[data-schedule-week="next"]').click();
  await employee.locator("[data-schedule-error='1']").filter({hasText:"QA_WEEK_READ_FAILED"}).waitFor();
  if(await employee.locator("#view-schedule .shift").count())throw new Error("stale prior-week shift remained visible");
  await sunday.evaluate(()=>globalThis.__TASK095_QA.setFailWeek(null));
  await employee.locator('[data-schedule-week="prev"]').click();
  await employee.locator("#view-schedule .pill").filter({hasText:"28/09–04/10"}).waitFor();
  await employee.locator("#view-schedule .shift").first().waitFor();
  return "failure shows explicit error; prior success removed; previous week recovers";
});

await check("iframe_reload_preserves_target_week_and_rows_without_duplicate_binding",async()=>{
  const before=await sunday.evaluate(()=>globalThis.__TASK095_QA.calls.filter(x=>x.kind==="rpc"&&x.name==="list_my_approved_schedules_v2").length);
  await sunday.evaluate(()=>globalThis.__TASK095_QA.reloadFrame());
  await employee.locator("body[data-employee-schedule-engine='1']").waitFor();
  await employee.locator("#view-schedule .pill").filter({hasText:"28/09–04/10"}).waitFor();
  await employee.locator("#view-schedule .shift").first().waitFor();
  const result=await sunday.evaluate(()=>({
    week:globalThis.MAGASIN_EMPLOYEE.schedule.getWeek(),
    rows:globalThis.MAGASIN_EMPLOYEE.schedule.getRows().length,
    after:globalThis.__TASK095_QA.calls.filter(x=>x.kind==="rpc"&&x.name==="list_my_approved_schedules_v2").length
  }));
  if(result.week!=="2026-09-28"||result.rows!==2)throw new Error(JSON.stringify(result));
  if(result.after-before!==1)throw new Error("reload reader delta="+(result.after-before));
  return JSON.stringify(result);
});

await check("employee_notification_reader_sees_own_publish_events_once_and_no_legacy_reminder",async()=>{
  await sunday.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.notification.refresh());
  await employee.locator("#view-notice .timeline-item").first().waitFor();
  const text=(await employee.locator("#view-notice").innerText()).replace(/\s+/g," ");
  const result=await sunday.evaluate(()=>{
    const all=globalThis.__TASK095_QA.getPublishedNotifications();
    const visibleCalls=globalThis.__TASK095_QA.calls.filter(x=>x.kind==="rpc"&&x.name==="list_my_notifications_v1").length;
    return {
      allTypes:all.map(x=>x.event_type),
      ownPublished:all.filter(x=>x.recipient_user_id==="employee-a"&&x.event_type==="SCHEDULE_PUBLISHED").length,
      otherPublished:all.filter(x=>x.recipient_user_id==="employee-b"&&x.event_type==="SCHEDULE_PUBLISHED").length,
      uniqueKeys:new Set(all.map(x=>x.event_key)).size,
      total:all.length,
      visibleCalls
    };
  });
  if(result.ownPublished!==2||result.otherPublished!==1||result.uniqueKeys!==result.total)throw new Error(JSON.stringify(result));
  if(result.allTypes.includes("CLOCK_OUT_REMINDER"))throw new Error(JSON.stringify(result));
  if(!text.includes("Lịch làm đã được phát hành"))throw new Error(text);
  if((text.match(/Lịch làm đã được phát hành/g)||[]).length!==2)throw new Error(text);
  return JSON.stringify(result);
});

const monday=await context.newPage();wire(monday);
await monday.goto(`${BASE}/09_QA/people-shift/employee-published-weekly-schedule-fixture.html?now=2026-09-27T17%3A30%3A00.000Z&published=1`,{waitUntil:"networkidle"});
const mondayEmployee=monday.frameLocator("#employeeApp");
await mondayEmployee.locator("body[data-employee-schedule-engine='1']").waitFor();

await check("monday_rollover_current_week_is_same_schedule_seen_as_sunday_next_week",async()=>{
  await mondayEmployee.locator("#view-schedule .pill").filter({hasText:"28/09–04/10"}).waitFor();
  await mondayEmployee.locator("#view-schedule .shift").first().waitFor();
  const result=await monday.evaluate(()=>({
    week:globalThis.MAGASIN_EMPLOYEE.schedule.getWeek(),
    ids:globalThis.MAGASIN_EMPLOYEE.schedule.getRows().map(x=>x.schedule_id).sort(),
    calls:globalThis.__TASK095_QA.calls.filter(x=>x.kind==="rpc"&&x.name==="list_my_approved_schedules_v2").map(x=>x.args.p_week_start)
  }));
  if(result.week!=="2026-09-28")throw new Error(JSON.stringify(result));
  if(JSON.stringify(result.ids)!==JSON.stringify(["sch-1","sch-2"]))throw new Error(JSON.stringify(result));
  if(result.calls.at(-1)!=="2026-09-28")throw new Error(JSON.stringify(result));
  return JSON.stringify(result);
});

await check("browser_diagnostics",async()=>{
  if(report.console_errors.length)throw new Error(report.console_errors.join("\n"));
  if(report.page_errors.length)throw new Error(report.page_errors.join("\n"));
  if(report.request_failures.length)throw new Error(JSON.stringify(report.request_failures));
  if(report.http_errors.length)throw new Error(JSON.stringify(report.http_errors));
  return "0 console/page/request/5xx errors";
});

await sunday.screenshot({path:path.join(OUT,"employee-published-weekly-schedule-sunday.png"),fullPage:true});
await monday.screenshot({path:path.join(OUT,"employee-published-weekly-schedule-monday.png"),fullPage:true});
await browser.close();
fs.writeFileSync(path.join(OUT,"employee-published-weekly-schedule-report.json"),JSON.stringify(report,null,2));
console.log("EMPLOYEE_PUBLISHED_WEEKLY_SCHEDULE_BROWSER="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;
