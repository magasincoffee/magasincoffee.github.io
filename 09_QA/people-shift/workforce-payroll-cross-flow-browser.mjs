import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={generated_at:new Date().toISOString(),status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
async function check(name,fn){try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.message||e)});report.status="FAIL"}}

const browserInstance=await chromium.launch({headless:true});
const page=await browserInstance.newPage({viewport:{width:1280,height:1000},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push({url:r.url(),method:r.method(),error:r.failure()?.errorText||"unknown"}));
page.on("response",r=>{if(r.status()>=500)report.http_errors.push({url:r.url(),status:r.status()})});
const employee=page.frameLocator("#employeeApp");

async function submit(index,start,end,note){
 await employee.locator("#employeeAttendanceSchedule").selectOption(String(index));
 await employee.locator("#employeeAttendanceStart").fill(start);
 await employee.locator("#employeeAttendanceEnd").fill(end);
 await employee.locator("#employeeAttendanceNote").fill(note||"");
 await employee.locator("#employeeAttendanceSubmit").click();
 await page.waitForFunction(n=>globalThis.__TASK106_QA.attendance.length>=n,index+1);
}
async function refreshManagerAttendance(){await page.evaluate(()=>globalThis.MAGASIN_MANAGER_ATTENDANCE_REVIEW.refresh())}

try{
 await page.goto(BASE+"/09_QA/people-shift/workforce-payroll-cross-flow-fixture.html",{waitUntil:"networkidle",timeout:20000});
 await page.waitForFunction(()=>globalThis.__TASK106_READY__===true);
 await employee.locator("#employeeAttendanceSchedule").waitFor({timeout:10000});

 await check("crossflow_employee_submits_four_raw_attendance_rows",async()=>{
   await submit(0,"06:10","12:05","approve");
   await submit(1,"12:15","17:20","adjust");
   await submit(2,"06:10","10:05","reject");
   await submit(3,"10:05","14:00","leave raw");
   const rows=await page.evaluate(()=>globalThis.__TASK106_QA.attendance.map(x=>({id:x.id,status:x.status,confirmed:x.confirmed_minutes})));
   if(rows.length!==4||rows.some(x=>x.status!=="NEEDS_REVIEW"||x.confirmed!==null))throw new Error(JSON.stringify(rows));
   return "4 raw NEEDS_REVIEW rows; 0 confirmed work time before Manager review";
 });

 await check("crossflow_manager_creates_approved_adjusted_rejected_truth",async()=>{
   await refreshManagerAttendance();
   let card=page.locator('[data-attendance-id="att-1"]');await card.waitFor();await card.locator('[data-review="APPROVE"]').click();
   await page.waitForFunction(()=>globalThis.__TASK106_QA.attendance[0]?.status==="APPROVED");
   await refreshManagerAttendance();
   card=page.locator('[data-attendance-id="att-2"]');await card.waitFor();await card.locator("[data-confirmed-start]").fill("12:20");await card.locator("[data-confirmed-end]").fill("17:15");await card.locator('[data-review="ADJUST"]').click();
   await page.waitForFunction(()=>globalThis.__TASK106_QA.attendance[1]?.status==="ADJUSTED");
   await refreshManagerAttendance();
   card=page.locator('[data-attendance-id="att-3"]');await card.waitFor();await card.locator('[data-review="REJECT"]').click();
   await page.waitForFunction(()=>globalThis.__TASK106_QA.attendance[2]?.status==="REJECTED");
   const s=await page.evaluate(()=>globalThis.__TASK106_QA.state());
   const [a,b,c,d]=s.attendance;
   if(a.confirmed_minutes!==355||b.confirmed_minutes!==295||c.confirmed_minutes!==null||d.status!=="NEEDS_REVIEW"||s.reviewTransitions!==3)throw new Error(JSON.stringify(s.attendance));
   return "APPROVED=355 + ADJUSTED=295; REJECTED/raw remain non-confirmed";
 });

 await check("e2e12_unvalidated_pay_rule_is_rejected_before_payroll_persistence",async()=>{
   const r=await page.evaluate(()=>globalThis.__TASK106_QA.serverBuildPayroll({validated:false}));
   if(!r.error?.message.includes("PAY_RULE_NOT_VALIDATED"))throw new Error(JSON.stringify(r));
   const n=await page.evaluate(()=>globalThis.__TASK106_QA.payrollEntries.length);
   if(n!==0)throw new Error("payroll entries="+n);
   return "PAY_RULE_NOT_VALIDATED; no payroll entry";
 });

 await check("e2e12_payroll_estimate_consumes_confirmed_only_and_excludes_raw_rejected",async()=>{
   const r=await page.evaluate(()=>globalThis.__TASK106_QA.serverBuildPayroll({validated:true}));
   if(r.error)throw new Error(JSON.stringify(r));
   if(r.data.state!=="ESTIMATED"||r.data.confirmed_work_item_count!==2||r.data.confirmed_work_minutes!==650||r.data.monetary_amount!==null)throw new Error(JSON.stringify(r.data));
   const source=await page.evaluate(()=>globalThis.__TASK106_QA.canonicalConfirmedRows().map(x=>({date:x.work_date,state:x.confirmed_work_time_state,minutes:x.confirmed_minutes})));
   if(source.length!==2||source.some(x=>!["CONFIRMED","REVISED"].includes(x.state)))throw new Error(JSON.stringify(source));
   return "2 confirmed/revised items = 650 minutes; raw + rejected excluded; amount=null";
 });

 await check("e2e12_exact_server_build_retry_is_idempotent",async()=>{
   const r=await page.evaluate(()=>globalThis.__TASK106_QA.serverBuildPayroll({validated:true}));
   const s=await page.evaluate(()=>globalThis.__TASK106_QA.state());
   if(r.error||r.data.already_existing!==true||s.payrollEntries.length!==1||s.payrollBuildCount!==1)throw new Error(JSON.stringify({r,s}));
   return "same payroll identity/source returns existing; 1 persisted QA entry";
 });

 await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.refresh());
 await employee.locator('.nav [data-view="payroll"]').click();
 await employee.locator("#view-payroll").waitFor({state:"visible"});
 await check("e2e13_employee_self_check_sees_estimated_truth_not_finalized",async()=>{
   const text=await employee.locator("#employeePayrollRoot").innerText();
   if(!text.includes("Ước tính")||text.includes("Đã chốt")||!text.includes("10 giờ 50 phút"))throw new Error(text);
   return "ESTIMATED renders as Ước tính with 650 confirmed minutes; not FINALIZED";
 });

 await check("e2e13_manager_scoped_reader_sees_same_payroll_truth_read_only",async()=>{
   await page.evaluate(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.refresh());
   await page.locator('.nav [data-view="payroll-self-check"]').click();
   await page.locator("#mgrPayrollRoot").filter({hasText:"Nhân viên QA A"}).waitFor();
   const text=await page.locator("#mgrPayrollRoot").innerText();
   if(!text.includes("Ước tính")||!text.includes("10 giờ 50 phút"))throw new Error(text);
   return "Manager read-only projection sees same ESTIMATED/650-minute entry";
 });

 await check("e2e13_invalid_state_skip_is_rejected_by_canonical_contract",async()=>{
   const r=await page.evaluate(()=>globalThis.__TASK106_QA.serverTransitionPayroll("FINALIZED"));
   if(!r.error?.message.includes("TRANSITION_NOT_ALLOWED"))throw new Error(JSON.stringify(r));
   const state=await page.evaluate(()=>globalThis.__TASK106_QA.payrollEntries[0].state);
   if(state!=="ESTIMATED")throw new Error(state);
   return "ESTIMATED→FINALIZED rejected; state remains ESTIMATED";
 });

 for(const [next,label] of [["REVIEWED","Đã review"],["FINALIZED","Đã chốt"],["PAID","Đã thanh toán"]]){
   await check("e2e13_employee_self_check_renders_"+next.toLowerCase(),async()=>{
     const r=await page.evaluate(next=>globalThis.__TASK106_QA.serverTransitionPayroll(next),next);
     if(r.error)throw new Error(JSON.stringify(r));
     await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.refresh());
     const root=employee.locator("#employeePayrollRoot");
     await root.filter({hasText:label}).waitFor();
     const text=await root.innerText();if(!text.includes(label))throw new Error(text);
     return next+" rendered exactly through self-only reader";
   });
 }

 await check("e2e13_does_not_invent_live_payroll_authorized_mapping",async()=>{
   const x=await page.evaluate(()=>({mapping:globalThis.__TASK106_QA.liveActorMapping,transitions:globalThis.__TASK106_QA.payrollStateTransitions}));
   if(x.mapping!=="UNRESOLVED_NOT_TESTED"||x.transitions!==3)throw new Error(JSON.stringify(x));
   return "abstract PAYROLL_AUTHORIZED contract exercised; live actor mapping remains unresolved/not tested";
 });

 await check("crossflow_browser_has_no_direct_table_dml_or_browser_builder_authority",async()=>{
   const calls=await page.evaluate(()=>globalThis.__TASK106_QA.calls);
   const direct=calls.filter(x=>x.kind==="from");
   const builderRpc=calls.filter(x=>x.name==="build_payroll_estimate_v1");
   if(direct.length||builderRpc.length)throw new Error(JSON.stringify({direct,builderRpc}));
   return "0 direct table calls; 0 browser build_payroll_estimate_v1 RPC calls";
 });

 await check("crossflow_no_monetary_semantics_rendered",async()=>{
   const emp=await employee.locator("#view-payroll").innerText();
   const mgr=await page.locator("#view-payroll-self-check").innerText();
   if(/hourly_rate|gross_pay|net_pay|overtime|allowance|deduction/i.test(emp+" "+mgr))throw new Error(emp+" "+mgr);
   if(/\d[\d.,]*\s*(?:đ|₫|VND)(?:\s|$)/i.test(emp+" "+mgr))throw new Error("monetary value rendered");
   return "no rate/formula/monetary output";
 });

 await check("browser_diagnostics",async()=>{
   if(report.page_errors.length||report.console_errors.length||report.request_failures.length||report.http_errors.length)throw new Error(JSON.stringify(report));
   return "0 page/console/request/5xx errors";
 });
} finally {
 await page.screenshot({path:path.join(OUT,"task-106-workforce-payroll-cross-flow.png"),fullPage:true}).catch(()=>{});
 await browserInstance.close();
}
fs.writeFileSync(path.join(OUT,"task-106-workforce-payroll-cross-flow-report.json"),JSON.stringify(report,null,2));
console.log("TASK_106_WORKFORCE_PAYROLL_CROSS_FLOW="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=="PASS")process.exitCode=1;
