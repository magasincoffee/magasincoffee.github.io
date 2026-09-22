import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={generated_at:new Date().toISOString(),status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
async function check(name,fn){try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.message||e)});report.status="FAIL"}}

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:1000},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push({url:r.url(),method:r.method(),error:r.failure()?.errorText||"unknown"}));
page.on("response",r=>{if(r.status()>=500)report.http_errors.push({url:r.url(),status:r.status()})});

const employee=page.frameLocator("#employeeApp");
async function selectSchedule(index,start,end,note=""){
  await employee.locator("#employeeAttendanceSchedule").selectOption(String(index));
  await employee.locator("#employeeAttendanceStart").fill(start);
  await employee.locator("#employeeAttendanceEnd").fill(end);
  if(note)await employee.locator("#employeeAttendanceNote").fill(note);
  await employee.locator("#employeeAttendanceSubmit").click();
}

try{
  await page.goto(BASE+"/09_QA/people-shift/manager-attendance-review-fixture.html",{waitUntil:"networkidle",timeout:20000});
  await employee.locator("#employeeAttendanceSchedule").waitFor({timeout:10000});
  await page.waitForFunction(()=>!!globalThis.MAGASIN_MANAGER_ATTENDANCE_REVIEW);

  await check("e2e09_employee_task099_path_submits_raw_attendance",async()=>{
    await selectSchedule(0,"06:10","12:05","TASK-100 full lifecycle");
    await page.waitForFunction(()=>globalThis.__ATT100_QA.attendance.length===1);
    const a=await page.evaluate(()=>globalThis.__ATT100_QA.attendance[0]);
    if(a.status!=="NEEDS_REVIEW"||a.submission_status!=="SUBMITTED"||a.confirmed_start!==null||a.confirmed_minutes!==null)throw new Error(JSON.stringify(a));
    return "sch-1 raw SUBMITTED / NEEDS_REVIEW; confirmed work time absent";
  });

  await check("manager_queue_reads_canonical_pending_submission",async()=>{
    await page.evaluate(()=>globalThis.MAGASIN_MANAGER_ATTENDANCE_REVIEW.refresh());
    await page.locator("#view-attendance .mar-card[data-attendance-id='att-1']").waitFor();
    const text=await page.locator("#view-attendance .mar-card[data-attendance-id='att-1']").innerText();
    if(!text.includes("Nhân viên B")||!text.includes("06:10–12:05")||!text.includes("Chưa có"))throw new Error(text);
    return "pending queue shows employee raw actual time without confirmed truth";
  });

  await check("manager_double_click_approve_is_single_confirmation",async()=>{
    const card=page.locator("#view-attendance .mar-card[data-attendance-id='att-1']");
    await card.locator('[data-review="APPROVE"]').evaluate(b=>{b.click();b.click()});
    await page.waitForFunction(()=>globalThis.__ATT100_QA.attendance[0]?.status==="APPROVED");
    const s=await page.evaluate(()=>globalThis.__ATT100_QA.state());
    const a=s.attendance[0];
    if(s.reviewTransitions!==1||a.review_decision!=="APPROVE"||a.confirmed_start!=="06:10"||a.confirmed_end!=="12:05"||a.confirmed_minutes!==355)throw new Error(JSON.stringify(s));
    return "APPROVED once; confirmed 06:10–12:05 = 355 minutes";
  });

  await check("manager_exact_retry_is_idempotent_and_conflicting_review_fails_closed",async()=>{
    const retry=await page.evaluate(()=>globalThis.__ATT100_QA.managerRpc("review_attendance_v1",{p_attendance_id:"att-1",p_decision:"APPROVE",p_confirmed_start:null,p_confirmed_end:null}));
    const conflict=await page.evaluate(()=>globalThis.__ATT100_QA.managerRpc("review_attendance_v1",{p_attendance_id:"att-1",p_decision:"REJECT",p_confirmed_start:null,p_confirmed_end:null}));
    const transitions=await page.evaluate(()=>globalThis.__ATT100_QA.reviewTransitions);
    if(retry.error||retry.data?.already_reviewed!==true||!conflict.error?.message.includes("ATTENDANCE_ALREADY_REVIEWED")||transitions!==1)throw new Error(JSON.stringify({retry,conflict,transitions}));
    return "exact retry converges; competing terminal decision rejected";
  });

  await check("confirmed_notification_is_exact_once",async()=>{
    const n=await page.evaluate(()=>globalThis.__ATT100_QA.state().notifications.filter(([,v])=>v.type==="ATTENDANCE_CONFIRMED"));
    if(n.length!==1||n[0][0]!=="attendance:att-1:confirmed")throw new Error(JSON.stringify(n));
    return "one ATTENDANCE_CONFIRMED event key";
  });

  await check("employee_reload_reflects_manager_confirmed_state",async()=>{
    await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.attendance.refresh());
    await employee.locator("#attendanceHistoryTable").filter({hasText:"Đã xác nhận"}).waitFor();
    const text=await employee.locator("#attendanceHistoryTable").innerText();
    if(!text.includes("Đã xác nhận"))throw new Error(text);
    return "Employee canonical reader shows APPROVED after Manager review";
  });

  await check("manager_adjust_flow_persists_explicit_confirmed_time",async()=>{
    await selectSchedule(1,"12:15","17:20","cần điều chỉnh");
    await page.waitForFunction(()=>globalThis.__ATT100_QA.attendance.length===2);
    await page.evaluate(()=>globalThis.MAGASIN_MANAGER_ATTENDANCE_REVIEW.refresh());
    const card=page.locator("#view-attendance .mar-card[data-attendance-id='att-2']");
    await card.waitFor();
    await card.locator("[data-confirmed-start]").fill("12:20");
    await card.locator("[data-confirmed-end]").fill("17:15");
    await card.locator('[data-review="ADJUST"]').click();
    await page.waitForFunction(()=>globalThis.__ATT100_QA.attendance[1]?.status==="ADJUSTED");
    const a=await page.evaluate(()=>globalThis.__ATT100_QA.attendance[1]);
    if(a.review_decision!=="ADJUST"||a.confirmed_start!=="12:20"||a.confirmed_end!=="17:15"||a.confirmed_minutes!==295)throw new Error(JSON.stringify(a));
    return "ADJUSTED 12:20–17:15 = 295 minutes";
  });

  await check("manager_reject_flow_creates_no_confirmed_work_time",async()=>{
    await selectSchedule(2,"17:10","22:10","raw cần từ chối");
    await page.waitForFunction(()=>globalThis.__ATT100_QA.attendance.length===3);
    await page.evaluate(()=>globalThis.MAGASIN_MANAGER_ATTENDANCE_REVIEW.refresh());
    const card=page.locator("#view-attendance .mar-card[data-attendance-id='att-3']");
    await card.waitFor();
    await card.locator('[data-review="REJECT"]').click();
    await page.waitForFunction(()=>globalThis.__ATT100_QA.attendance[2]?.status==="REJECTED");
    const a=await page.evaluate(()=>globalThis.__ATT100_QA.attendance[2]);
    if(a.review_decision!=="REJECT"||a.confirmed_start!==null||a.confirmed_end!==null||a.confirmed_minutes!==null)throw new Error(JSON.stringify(a));
    return "REJECTED with confirmed fields null";
  });

  await check("unauthorized_manager_and_stale_schedule_review_fail_closed",async()=>{
    await selectSchedule(3,"06:05","12:00","authorization race");
    await page.waitForFunction(()=>globalThis.__ATT100_QA.attendance.length===4);
    await page.evaluate(()=>globalThis.__ATT100_QA.setManagerStores([]));
    const denied=await page.evaluate(()=>globalThis.__ATT100_QA.managerRpc("review_attendance_v1",{p_attendance_id:"att-4",p_decision:"APPROVE",p_confirmed_start:null,p_confirmed_end:null}));
    await page.evaluate(()=>{globalThis.__ATT100_QA.setManagerStores(["store-a"]);globalThis.__ATT100_QA.setScheduleOwner("sch-4","u-c")});
    const stale=await page.evaluate(()=>globalThis.__ATT100_QA.managerRpc("review_attendance_v1",{p_attendance_id:"att-4",p_decision:"APPROVE",p_confirmed_start:null,p_confirmed_end:null}));
    const a=await page.evaluate(()=>globalThis.__ATT100_QA.attendance[3]);
    if(!denied.error?.message.includes("STORE_NOT_ALLOWED")||!stale.error?.message.includes("ATTENDANCE_NOT_CURRENT_OWNER")||a.status!=="NEEDS_REVIEW"||a.confirmed_start!==null)throw new Error(JSON.stringify({denied,stale,a}));
    return "STORE_NOT_ALLOWED + ATTENDANCE_NOT_CURRENT_OWNER; raw row unchanged";
  });

  await check("manager_ui_uses_rpc_only_no_direct_attendance_table_dml",async()=>{
    const calls=await page.evaluate(()=>globalThis.__ATT100_QA.calls);
    const direct=calls.filter(x=>x.kind==="from");
    const reviewCalls=calls.filter(x=>x.name==="review_attendance_v1");
    if(direct.length||reviewCalls.length<5)throw new Error(JSON.stringify({direct,reviewCalls}));
    return `${reviewCalls.length} review RPC calls; 0 direct table calls`;
  });

  await check("manager_and_employee_views_reload_to_terminal_truth",async()=>{
    await page.evaluate(()=>globalThis.MAGASIN_MANAGER_ATTENDANCE_REVIEW.refresh());
    await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.attendance.refresh());
    const m=await page.locator("#view-attendance").innerText();
    const e=await employee.locator("#attendanceHistoryTable").innerText();
    if(!m.includes("Đã xác nhận")||!m.includes("Đã điều chỉnh")||!m.includes("Đã từ chối")||!e.includes("Đã xác nhận")||!e.includes("Đã điều chỉnh")||!e.includes("Bị từ chối"))throw new Error(JSON.stringify({m,e}));
    return "APPROVED / ADJUSTED / REJECTED persist across both views";
  });

  await check("mobile_layout_has_no_horizontal_overflow",async()=>{
    await page.setViewportSize({width:390,height:900});
    await page.waitForTimeout(50);
    const dims=await page.evaluate(()=>({inner:innerWidth,doc:document.documentElement.scrollWidth}));
    if(dims.doc>dims.inner+1)throw new Error(JSON.stringify(dims));
    return `${dims.inner}px viewport / ${dims.doc}px document`;
  });

  await check("browser_diagnostics",async()=>{
    if(report.page_errors.length||report.console_errors.length||report.request_failures.length||report.http_errors.length)throw new Error(JSON.stringify({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures,http_errors:report.http_errors}));
    return "0 page/console/request/5xx errors";
  });
} finally {
  await page.screenshot({path:path.join(OUT,"task-100-manager-attendance-review.png"),fullPage:true}).catch(()=>{});
  await browser.close();
}
fs.writeFileSync(path.join(OUT,"task-100-manager-attendance-review-report.json"),JSON.stringify(report,null,2));
console.log("TASK_100_MANAGER_ATTENDANCE_REVIEW="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;
