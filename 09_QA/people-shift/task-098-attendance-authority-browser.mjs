import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});

const report={generated_at:new Date().toISOString(),status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
async function check(name,fn){
  try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}
  catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.message||e)});report.status="FAIL"}
}

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1200,height:900},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push({url:r.url(),method:r.method(),error:r.failure()?.errorText||"unknown"}));
page.on("response",r=>{if(r.status()>=500)report.http_errors.push({url:r.url(),status:r.status()})});

async function reloadAs(id){
  await page.evaluate(id=>globalThis.__GIVE97_QA.switchUserPersist(id),id);
  await page.reload({waitUntil:"networkidle",timeout:20000});
  const employee=page.frameLocator("#employeeApp");
  await employee.locator("#view-swap[data-employee-swap-engine='1']").waitFor({timeout:10000});
  await page.waitForFunction(()=>!!globalThis.MAGASIN_MANAGER_SHIFT_CHANGE);
  return employee;
}

try{
  await page.goto(BASE+"/09_QA/people-shift/shift-give-lifecycle-fixture.html",{waitUntil:"networkidle",timeout:20000});
  let employee=page.frameLocator("#employeeApp");

  await check("e2e08_transfer_uses_real_give_employee_and_manager_engines",async()=>{
    await employee.locator("#view-swap[data-employee-swap-engine='1']").waitFor({timeout:10000});
    await employee.locator("#swapChoices button").filter({hasText:"Cho ca"}).click();
    await employee.locator("#employeeRequesterSchedule").waitFor();
    await employee.locator("#employeeSwapTarget").selectOption("u-b");
    await employee.locator("#employeeSwapReason").fill("E2E-08 attendance authority");
    await employee.locator("#swapForm .swap-actions .btn.primary").click();
    await page.waitForFunction(()=>globalThis.__GIVE97_QA.give?.status==="PENDING_RECIPIENT");

    employee=await reloadAs("u-b");
    await employee.locator(".js-give-accept").waitFor({timeout:10000});
    await employee.locator(".js-give-accept").click();
    await page.waitForFunction(()=>globalThis.__GIVE97_QA.give?.status==="PENDING_MANAGER");

    await page.evaluate(()=>globalThis.__GIVE97_QA.refreshManager());
    await page.locator("#view-swap .js-give-approve").waitFor({timeout:10000});
    await page.locator("#view-swap .js-give-approve").click();
    await page.waitForFunction(()=>globalThis.__GIVE97_QA.give?.status==="APPROVED"&&globalThis.__GIVE97_QA.schedule.user_id==="u-b");
    const s=await page.evaluate(()=>({give:globalThis.__GIVE97_QA.give,schedule:globalThis.__GIVE97_QA.schedule,transferCount:globalThis.__GIVE97_QA.transferCount}));
    if(s.transferCount!==1||s.schedule.user_id!=="u-b")throw new Error(JSON.stringify(s));
    return "same schedule sch-give transferred u-a -> u-b";
  });

  await check("e2e08_old_owner_is_denied_manual_time_attendance",async()=>{
    const r=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","submit_manual_time_attendance_v1",{
      p_schedule_id:"sch-give",p_actual_start:"06:10",p_actual_end:"12:05",p_note:"old owner stale UI"
    }));
    const state=await page.evaluate(()=>globalThis.__GIVE97_QA.attendance);
    if(!r.error?.message.includes("ATTENDANCE_NOT_CURRENT_OWNER")||state!==null)throw new Error(JSON.stringify({r,state}));
    return "ATTENDANCE_NOT_CURRENT_OWNER; no attendance created";
  });

  await check("e2e08_new_owner_can_submit_current_truth_only",async()=>{
    const r=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-b","submit_manual_time_attendance_v1",{
      p_schedule_id:"sch-give",p_actual_start:"06:10",p_actual_end:"12:05",p_note:"manual actual time"
    }));
    const a=await page.evaluate(()=>globalThis.__GIVE97_QA.attendance);
    if(r.error||r.data?.already_submitted!==false||r.data?.status!=="NEEDS_REVIEW"||r.data?.submission_status!=="SUBMITTED")throw new Error(JSON.stringify({r,a}));
    if(a?.user_id!=="u-b"||a?.schedule_id!=="sch-give"||a?.confirmed_start!==null||a?.confirmed_minutes!==null)throw new Error(JSON.stringify(a));
    return "u-b SUBMITTED -> NEEDS_REVIEW; confirmed work time remains absent";
  });

  await check("e2e08_retry_is_idempotent_and_does_not_duplicate_attendance",async()=>{
    const r=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-b","submit_manual_time_attendance_v1",{
      p_schedule_id:"sch-give",p_actual_start:"06:10",p_actual_end:"12:05",p_note:"retry"
    }));
    const a=await page.evaluate(()=>globalThis.__GIVE97_QA.attendance);
    const calls=await page.evaluate(()=>globalThis.__GIVE97_QA.calls.filter(x=>x.name==="submit_manual_time_attendance_v1"));
    if(r.error||r.data?.already_submitted!==true||r.data?.attendance_id!=="att-1"||a?.id!=="att-1")throw new Error(JSON.stringify({r,a,calls}));
    return "same attendance_id att-1; already_submitted=true";
  });

  await check("e2e08_old_owner_does_not_resurrect_after_retry_or_reload",async()=>{
    await reloadAs("u-a");
    const r=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","submit_manual_time_attendance_v1",{
      p_schedule_id:"sch-give",p_actual_start:"06:10",p_actual_end:"12:05",p_note:"stale reload"
    }));
    const state=await page.evaluate(()=>({schedule:globalThis.__GIVE97_QA.schedule,attendance:globalThis.__GIVE97_QA.attendance,transferCount:globalThis.__GIVE97_QA.transferCount}));
    if(!r.error?.message.includes("ATTENDANCE_NOT_CURRENT_OWNER")||state.schedule.user_id!=="u-b"||state.attendance?.user_id!=="u-b"||state.transferCount!==1)throw new Error(JSON.stringify({r,state}));
    return "reload preserves owner u-b and attendance authority u-b";
  });

  await check("e2e08_notifications_are_submission_semantics_not_clock_events",async()=>{
    const types=await page.evaluate(()=>[...globalThis.__GIVE97_QA.notifications.values()].map(x=>x.type));
    if(!types.includes("ATTENDANCE_SUBMITTED")||!types.includes("ATTENDANCE_NEEDS_REVIEW"))throw new Error(JSON.stringify(types));
    const newClock=types.filter(x=>x==="ATTENDANCE_CLOCKED_IN"||x==="ATTENDANCE_CLOCKED_OUT");
    if(newClock.length)throw new Error(JSON.stringify(newClock));
    return "ATTENDANCE_SUBMITTED + ATTENDANCE_NEEDS_REVIEW; 0 clock events";
  });

  await check("browser_diagnostics",async()=>{
    if(report.page_errors.length||report.console_errors.length||report.request_failures.length||report.http_errors.length){
      throw new Error(JSON.stringify({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures,http_errors:report.http_errors}));
    }
    return "0 page/console/request/5xx errors";
  });
} finally {
  await page.screenshot({path:path.join(OUT,"task-098-e2e08-attendance-authority.png"),fullPage:true}).catch(()=>{});
  await browser.close();
}

fs.writeFileSync(path.join(OUT,"task-098-e2e08-attendance-authority-report.json"),JSON.stringify(report,null,2));
console.log("TASK_098_E2E_08="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;
