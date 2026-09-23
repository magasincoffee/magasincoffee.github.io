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

async function empRefresh(){
 await page.evaluate(async()=>{await globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh();await globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.refresh()});
}
async function mgrRefresh(){
 await page.evaluate(async()=>{await globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.refresh();await globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.refresh()});
}
try{
 await page.goto(BASE+"/09_QA/people-shift/workforce-failure-recovery-security-fixture.html",{waitUntil:"networkidle",timeout:20000});
 await employee.locator("#profileFullName").waitFor({timeout:10000});
 await empRefresh();
 await mgrRefresh();

 await check("e2e14_normal_self_and_store_scoped_reads",async()=>{
   const name=await employee.locator("#profileFullName").inputValue();
   const empRows=await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.state.rows);
   const mgrProfiles=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.getState().rows);
   const mgrPayroll=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.getState().rows);
   if(name!=="Nhân viên A"||empRows.length!==1||mgrProfiles.length!==1||mgrProfiles[0].employee_id!=="emp-a"||mgrPayroll.length!==1||mgrPayroll[0].employee_id!=="emp-a")throw new Error(JSON.stringify({name,empRows,mgrProfiles,mgrPayroll}));
   return "Employee=A only; Manager=store-a only";
 });

 await check("e2e14_employee_cannot_supply_cross_user_subject",async()=>{
   const r=await page.evaluate(async()=>({profile:await globalThis.__TASK107_QA.employeeCrossProfile(),payroll:await globalThis.__TASK107_QA.employeeCrossPayroll()}));
   if(!r.profile.error?.message.includes("RPC_SIGNATURE_DENY")||!r.payroll.error?.message.includes("RPC_SIGNATURE_DENY"))throw new Error(JSON.stringify(r));
   return "parameterized cross-user attempts rejected";
 });

 await check("e2e14_manager_cross_store_denied_and_owner_scope_separate",async()=>{
   const r=await page.evaluate(async()=>({mp:await globalThis.__TASK107_QA.managerCrossProfile(),my:await globalThis.__TASK107_QA.managerCrossPayroll(),op:await globalThis.__TASK107_QA.ownerProfile(),oy:await globalThis.__TASK107_QA.ownerPayroll()}));
   if(!r.mp.error?.message.includes("STORE_NOT_ALLOWED")||!r.my.error?.message.includes("STORE_NOT_ALLOWED"))throw new Error(JSON.stringify(r));
   if(r.op.error||r.oy.error||r.op.data.length!==2||r.oy.data.length!==2)throw new Error(JSON.stringify(r));
   return "Manager store-b denied; Owner enterprise mock sees 2 separately";
 });

 await check("failure_isolation_employee_profile_error_clears_only_profile",async()=>{
   await page.evaluate(()=>globalThis.__TASK107_QA.setMode("employeeProfile","error"));
   await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh());
   await employee.locator("#profileProjectionState").filter({hasText:"PROFILE_INACTIVE"}).waitFor();
   const name=await employee.locator("#profileFullName").inputValue();
   const payrollRows=await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.state.rows.length);
   if(name!=="—"||payrollRows!==1)throw new Error(JSON.stringify({name,payrollRows}));
   await page.evaluate(()=>{globalThis.__TASK107_QA.setMode("employeeProfile","ok");return globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh()});
   await employee.locator("#profileFullName").filter({hasValue:"Nhân viên A"}).waitFor();
   return "stale profile cleared; payroll truth isolated; refresh recovered";
 });

 await check("invalid_employee_profile_projection_fails_closed_then_recovers",async()=>{
   await page.evaluate(()=>globalThis.__TASK107_QA.setMode("employeeProfile","invalid"));
   await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh());
   await employee.locator("#profileProjectionState").filter({hasText:"PROFILE_PROJECTION_INVALID"}).waitFor();
   if(await employee.locator("#profileFullName").inputValue()!=="—")throw new Error("stale profile rendered");
   await page.evaluate(()=>{globalThis.__TASK107_QA.setMode("employeeProfile","ok");return globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh()});
   await employee.locator("#profileFullName").filter({hasValue:"Nhân viên A"}).waitFor();
   return "malformed profile rejected without stale data";
 });

 await check("unresolved_profile_fields_are_explicit_not_invented",async()=>{
   const level=await employee.locator("#profileLevel").inputValue(),join=await employee.locator("#profileJoinDate").inputValue();
   if(level!=="Chưa có nguồn chuẩn"||join!=="Chưa có nguồn chuẩn")throw new Error(JSON.stringify({level,join}));
   return "missing level/join date remain unresolved";
 });

 await check("invalid_employee_payroll_state_fails_closed_then_recovers",async()=>{
   await page.evaluate(()=>globalThis.__TASK107_QA.setMode("employeePayroll","invalid"));
   await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.refresh());
   const st=await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.state);
   if(st.error!=="PAYROLL_PROJECTION_INVALID"||st.rows.length!==0)throw new Error(JSON.stringify(st));
   await page.evaluate(()=>{globalThis.__TASK107_QA.setMode("employeePayroll","ok");return globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.refresh()});
   const ok=await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.state);
   if(ok.error||ok.rows.length!==1||ok.rows[0].state!=="ESTIMATED")throw new Error(JSON.stringify(ok));
   return "unknown payroll state rejected; canonical refresh recovered";
 });

 await check("manager_cross_store_stale_state_clears_and_recovers",async()=>{
   await page.evaluate(async()=>{
     const s=document.getElementById("mspStore");const o=document.createElement("option");o.value="store-b";o.textContent="CN2";s.appendChild(o);s.value="store-b";s.dispatchEvent(new Event("change",{bubbles:true}));
     const p=document.getElementById("mgrPayrollStore");const q=document.createElement("option");q.value="store-b";q.textContent="CN2";p.appendChild(q);p.value="store-b";p.dispatchEvent(new Event("change",{bubbles:true}));
   });
   await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.getState().error==="STORE_NOT_ALLOWED");
   await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.getState().error==="STORE_NOT_ALLOWED");
   const denied=await page.evaluate(()=>({p:globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.getState(),y:globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.getState()}));
   if(denied.p.rows.length||denied.y.rows.length)throw new Error(JSON.stringify(denied));
   await page.evaluate(async()=>{
     document.getElementById("mspStore").value="store-a";document.getElementById("mspStore").dispatchEvent(new Event("change",{bubbles:true}));
     document.getElementById("mgrPayrollStore").value="store-a";document.getElementById("mgrPayrollStore").dispatchEvent(new Event("change",{bubbles:true}));
   });
   await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.getState().rows.length===1);
   await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.getState().rows.length===1);
   return "scope denial clears stale rows; allowed store refresh recovers";
 });

 await check("manager_invalid_payroll_projection_fails_closed",async()=>{
   await page.evaluate(()=>globalThis.__TASK107_QA.setMode("managerPayroll","invalid"));
   await page.evaluate(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.refresh());
   const st=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.getState());
   if(st.error!=="PAYROLL_PROJECTION_INVALID"||st.rows.length!==0)throw new Error(JSON.stringify(st));
   await page.evaluate(()=>{globalThis.__TASK107_QA.setMode("managerPayroll","ok");return globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.refresh()});
   await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.getState().rows.length===1);
   return "invalid scoped payroll cannot render";
 });

 await check("retry_refresh_is_idempotent_read_only",async()=>{
   await empRefresh();await empRefresh();await mgrRefresh();await mgrRefresh();
   const x=await page.evaluate(()=>({calls:globalThis.__TASK107_QA.calls,ep:globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.state.rows.length,mp:globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.getState().rows.length,my:globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.getState().rows.length}));
   if(x.ep!==1||x.mp!==1||x.my!==1)throw new Error(JSON.stringify(x));
   if(x.calls.some(c=>c.kind==="from"))throw new Error("direct table call");
   if(x.calls.some(c=>/build_payroll_estimate|review|finalize|insert|update|delete/i.test(c.name)))throw new Error(JSON.stringify(x.calls));
   return "repeated refresh converges to same rows with RPC reads only";
 });

 await check("reload_recovers_without_cross_user_or_stale_state",async()=>{
   await page.reload({waitUntil:"networkidle",timeout:20000});
   await employee.locator("#profileFullName").waitFor({timeout:10000});
   await empRefresh();await mgrRefresh();
   const x=await page.evaluate(()=>({name:globalThis.MAGASIN_EMPLOYEE.profileProjection.state.row?.full_name,ep:globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.state.rows,mp:globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.getState().rows,my:globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.getState().rows,calls:globalThis.__TASK107_QA.calls}));
   if(x.name!=="Nhân viên A"||x.ep.length!==1||x.mp.length!==1||x.my.length!==1||x.mp[0].employee_id!=="emp-a"||x.my[0].employee_id!=="emp-a")throw new Error(JSON.stringify(x));
   if(x.calls.some(c=>c.kind==="from"))throw new Error("direct table access after reload");
   return "fresh session re-reads self/store-scoped canonical state";
 });

 await check("browser_diagnostics",async()=>{
   if(report.page_errors.length||report.console_errors.length||report.request_failures.length||report.http_errors.length)throw new Error(JSON.stringify({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures,http_errors:report.http_errors}));
   return "0 page/console/request/5xx errors";
 });
} finally {
 await page.screenshot({path:path.join(OUT,"task-107-workforce-failure-recovery-security.png"),fullPage:true}).catch(()=>{});
 await browserInstance.close();
}
fs.writeFileSync(path.join(OUT,"task-107-workforce-failure-recovery-security-report.json"),JSON.stringify(report,null,2));
console.log("TASK_107_WORKFORCE_FAILURE_RECOVERY_SECURITY="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=="PASS")process.exitCode=1;
