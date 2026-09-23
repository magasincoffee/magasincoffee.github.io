import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={generated_at:new Date().toISOString(),status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
async function check(name,fn){try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.message||e)});report.status="FAIL"}}

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push({url:r.url(),method:r.method(),error:r.failure()?.errorText||"unknown"}));
page.on("response",r=>{if(r.status()>=500)report.http_errors.push({url:r.url(),status:r.status()})});

try{
 await page.goto(BASE+"/09_QA/people-shift/employee-payroll-self-check-fixture.html",{waitUntil:"networkidle",timeout:20000});
 await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.refresh());
 const f=page.frameLocator("#employeeApp");
 await f.locator('.nav [data-view="payroll"]').click();
 await f.locator("#view-payroll").waitFor({state:"visible",timeout:10000});
 await f.locator("#employeePayrollRoot").filter({hasText:"Ước tính"}).waitFor({timeout:10000});

 await check("task104_employee_self_check_renders_exact_payroll_states",async()=>{
   const text=await f.locator("#employeePayrollRoot").innerText();
   if(!text.includes("Ước tính")||!text.includes("Đã chốt"))throw new Error(text);
   if(text.includes("Ước tính")&&text.match(/Ước tính[^]*Đã chốt/)===null)throw new Error("state rows not distinguishable");
   return "ESTIMATED and FINALIZED render as distinct canonical states";
 });

 await check("task104_employee_self_reader_is_parameterless_and_rpc_only",async()=>{
   const calls=await page.evaluate(()=>globalThis.__TASK104_QA.calls.filter(x=>x.actor==="EMPLOYEE"));
   const payroll=calls.filter(x=>x.kind==="rpc"&&x.name==="get_my_payroll_self_check_v1");
   if(!payroll.length)throw new Error(JSON.stringify(calls));
   if(payroll.some(x=>Object.keys(x.args||{}).length))throw new Error(JSON.stringify(payroll));
   if(calls.some(x=>x.kind==="from"))throw new Error(JSON.stringify(calls));
   return "self RPC has no subject parameter and 0 direct table calls";
 });

 await check("task104_employee_projection_hides_monetary_and_pay_rule_internals",async()=>{
   const text=await f.locator("#view-payroll").innerText();
   if(/pay_rule_reference|confirmed_work_source_revision|hourly_rate|gross_pay|net_pay/i.test(text))throw new Error(text);
   if(/\d[\d.,]*\s*(?:đ|₫|VND)(?:\s|$)/i.test(text))throw new Error("synthetic monetary value rendered: "+text);
   if(!text.includes("Số tiền chưa hiển thị"))throw new Error(text);
   return "no monetary/pay-rule internals rendered";
 });

 await check("task104_employee_error_clears_stale_payroll_rows_and_recovers",async()=>{
   await page.evaluate(()=>{globalThis.__TASK104_QA.failEmployee();return globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.refresh()});
   await f.locator("#employeePayrollRoot").filter({hasText:"PAYROLL_SELF_PROFILE_INACTIVE"}).waitFor({timeout:10000});
   const bad=await f.locator("#employeePayrollRoot").innerText();
   if(bad.includes("Đã chốt")||bad.includes("Ước tính"))throw new Error("stale payroll remained: "+bad);
   await page.evaluate(()=>{globalThis.__TASK104_QA.recoverEmployee();return globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.refresh()});
   await f.locator("#employeePayrollRoot").filter({hasText:"Đã chốt"}).waitFor({timeout:10000});
   return "server denial clears stale rows; refresh recovers self payroll";
 });

 await page.evaluate(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.refresh());
 await page.locator('.nav [data-view="payroll-self-check"]').click();
 await page.locator("#view-payroll-self-check").waitFor({state:"visible",timeout:10000});
 await page.locator("#mgrPayrollRoot").filter({hasText:"Nguyễn An"}).waitFor({timeout:10000});

 await check("task104_manager_reader_is_store_scoped_rpc_only",async()=>{
   const calls=await page.evaluate(()=>globalThis.__TASK104_QA.calls.filter(x=>x.actor==="MANAGER"));
   const scoped=calls.filter(x=>x.kind==="rpc"&&x.name==="list_scoped_payroll_self_check_v1");
   if(!scoped.length||scoped.some(x=>x.args?.p_store_id!=="store-a"))throw new Error(JSON.stringify(calls));
   if(calls.some(x=>x.kind==="from"))throw new Error(JSON.stringify(calls));
   return "Manager reader always supplies authorized store id; 0 direct payroll table calls";
 });

 await check("task104_manager_scope_denial_fails_closed_without_stale_rows",async()=>{
   await page.evaluate(()=>{globalThis.__TASK104_QA.failManager();return globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.refresh()});
   await page.locator("#mgrPayrollRoot").filter({hasText:"STORE_NOT_ALLOWED"}).waitFor({timeout:10000});
   const text=await page.locator("#mgrPayrollRoot").innerText();
   if(text.includes("Nguyễn An")||text.includes("Lê Bình"))throw new Error("stale Manager payroll remained: "+text);
   await page.evaluate(()=>{globalThis.__TASK104_QA.recoverManager();return globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.refresh()});
   await page.locator("#mgrPayrollRoot").filter({hasText:"Lê Bình"}).waitFor({timeout:10000});
   return "STORE_NOT_ALLOWED clears scoped payroll rows and refresh recovers";
 });

 await check("task104_manager_ui_is_read_only_and_does_not_expose_transition_controls",async()=>{
   const view=page.locator("#view-payroll-self-check");
   const text=await view.innerText();
   const controls=await view.locator("button").allInnerTexts();
   if(controls.some(x=>/Finalize|Mark paid|Duyệt payroll|Chốt lương|Thanh toán lương/i.test(x)))throw new Error(JSON.stringify(controls));
   if(!text.includes("read-only")&&!text.includes("Read-only"))throw new Error(text);
   if(!text.includes("Không cấp quyền review/finalize"))throw new Error("missing authority warning: "+text);
   return "Manager surface is scoped read-only; no review/finalize/paid controls";
 });

 await check("task104_mobile_layout_has_no_horizontal_overflow",async()=>{
   const emp=await f.locator("body").evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
   const mgr=await page.locator("body").evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
   if(emp.scroll>emp.client+2||mgr.scroll>mgr.client+2)throw new Error(JSON.stringify({emp,mgr}));
   return "390px viewport has no horizontal overflow";
 });

 await check("browser_diagnostics",async()=>{
   if(report.page_errors.length||report.console_errors.length||report.request_failures.length||report.http_errors.length)throw new Error(JSON.stringify({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures,http_errors:report.http_errors}));
   return "0 page/console/request/5xx errors";
 });
} finally {
 await page.screenshot({path:path.join(OUT,"task-104-employee-payroll-self-check.png"),fullPage:true}).catch(()=>{});
 await browser.close();
}
fs.writeFileSync(path.join(OUT,"task-104-employee-payroll-self-check-report.json"),JSON.stringify(report,null,2));
console.log("TASK_104_EMPLOYEE_PAYROLL_SELF_CHECK="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=="PASS")process.exitCode=1;