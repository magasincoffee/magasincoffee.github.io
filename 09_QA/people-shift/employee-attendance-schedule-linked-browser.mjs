import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={generated_at:new Date().toISOString(),status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
async function check(name,fn){try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.message||e)});report.status="FAIL"}}
const browserInstance=await chromium.launch({headless:true});
const page=await browserInstance.newPage({viewport:{width:390,height:844},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push({url:r.url(),method:r.method(),error:r.failure()?.errorText||"unknown"}));
page.on("response",r=>{if(r.status()>=500)report.http_errors.push({url:r.url(),status:r.status()})});

async function employee(){const f=page.frameLocator("#employeeApp");await f.locator(".employee-attendance-v1").waitFor({timeout:10000});return f}
try{
  await page.goto(BASE+"/09_QA/people-shift/employee-attendance-schedule-linked-fixture.html?reset=1",{waitUntil:"networkidle",timeout:20000});
  let f=await employee();

  await check("task099_manual_time_ui_replaces_realtime_controls",async()=>{
    const body=await f.locator("body").innerText();
    if(/Bắt đầu ca|Kết thúc ca|Chấm công bổ sung|Tự động chấm công/.test(body))throw new Error(body);
    if(!body.includes("Gửi giờ làm thực tế")||!body.includes("2026-09-18")||!body.includes("06:00–12:00"))throw new Error(body);
    return "current canonical schedule shown; no realtime/manual legacy mutation controls";
  });

  await check("task099_submit_double_click_is_single_canonical_mutation",async()=>{
    await f.locator("#employeeAttendanceStart").fill("06:10");
    await f.locator("#employeeAttendanceEnd").fill("12:05");
    await f.locator("#employeeAttendanceNote").fill("E2E-09 manual actual time");
    await f.locator("#employeeAttendanceSubmit").click({clickCount:2,delay:10});
    await page.waitForFunction(()=>globalThis.__TASK099_QA.state.attendance?.status==="NEEDS_REVIEW");
    const s=await page.evaluate(()=>({attendance:globalThis.__TASK099_QA.state.attendance,count:globalThis.__TASK099_QA.rpcSubmitCount()}));
    if(s.count!==1||s.attendance?.submission_status!=="SUBMITTED"||s.attendance?.confirmed_start!==null||s.attendance?.confirmed_minutes!==null)throw new Error(JSON.stringify(s));
    return "1 RPC; SUBMITTED / NEEDS_REVIEW; confirmed work time absent";
  });

  await check("task099_persisted_status_survives_reload_without_duplicate",async()=>{
    await f.locator(".attendance-status").filter({hasText:"Cần quản lý xem xét"}).waitFor();
    await page.reload({waitUntil:"networkidle",timeout:20000});
    f=await employee();
    await f.locator(".attendance-status").filter({hasText:"Cần quản lý xem xét"}).waitFor();
    const disabled=await f.locator("#employeeAttendanceSubmit").isDisabled();
    const a=await page.evaluate(()=>globalThis.__TASK099_QA.state.attendance);
    if(!disabled||a?.id!=="att-1"||a?.status!=="NEEDS_REVIEW")throw new Error(JSON.stringify({disabled,a}));
    return "reload reflects persisted status and keeps submit disabled";
  });

  await check("task099_stale_owner_fails_closed_and_reconciles_server_truth",async()=>{
    await page.evaluate(()=>{globalThis.__TASK099_QA.resetAttendance();globalThis.__TASK099_QA.restoreOwned()});
    await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.attendance.refresh());
    f=await employee();
    await f.locator("#employeeAttendanceStart").fill("06:15");
    await f.locator("#employeeAttendanceEnd").fill("12:10");
    await page.evaluate(()=>globalThis.__TASK099_QA.transferAway());
    await f.locator("#employeeAttendanceSubmit").click();
    await f.locator("#employeeAttendanceMessage").filter({hasText:"ATTENDANCE_NOT_CURRENT_OWNER"}).waitFor({timeout:10000});
    await f.locator("[data-attendance-empty='1']").waitFor();
    const s=await page.evaluate(()=>({attendance:globalThis.__TASK099_QA.state.attendance,owner:globalThis.__TASK099_QA.state.scheduleOwner,calls:globalThis.__TASK099_QA.calls.map(x=>x.name).filter(Boolean)}));
    if(s.attendance!==null||s.owner!=="u-a")throw new Error(JSON.stringify(s));
    return "stale submit denied; UI refresh removes transferred schedule";
  });

  await check("task099_no_direct_table_or_legacy_mutation_path",async()=>{
    const calls=await page.evaluate(()=>globalThis.__TASK099_QA.calls);
    if(calls.some(x=>x.kind==="from"))throw new Error(JSON.stringify(calls));
    const legacy=calls.filter(x=>["clock_in_for_schedule","clock_out_attendance","manual_attendance_from_schedule","auto_attendance_from_approved_schedules"].includes(x.name));
    if(legacy.length)throw new Error(JSON.stringify(legacy));
    return "0 direct table calls; 0 legacy attendance mutation RPCs";
  });

  await check("task099_mobile_layout_has_no_horizontal_overflow",async()=>{
    const m=await f.locator("body").evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
    if(m.scroll>m.client+2)throw new Error(JSON.stringify(m));
    return m.client+"px mobile viewport fits without overflow";
  });

  await check("browser_diagnostics",async()=>{
    if(report.page_errors.length||report.console_errors.length||report.request_failures.length||report.http_errors.length)throw new Error(JSON.stringify({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures,http_errors:report.http_errors}));
    return "0 page/console/request/5xx errors";
  });
} finally {
  await page.screenshot({path:path.join(OUT,"task-099-employee-attendance-ui.png"),fullPage:true}).catch(()=>{});
  await browserInstance.close();
}
fs.writeFileSync(path.join(OUT,"task-099-employee-attendance-ui-report.json"),JSON.stringify(report,null,2));
console.log("TASK_099_EMPLOYEE_ATTENDANCE_UI="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;