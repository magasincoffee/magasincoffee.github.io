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
 await employee.locator("#profileFullName").waitFor({state:"attached",timeout:10000});
 await empRefresh();
 await mgrRefresh();

 await check("e2e14_normal_self_and_store_scoped_reads",async()=>{
   const name=await employee.locator("#profileFullName").inputValue();
   const empRows=await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.state.rows);
   const mgrProfiles=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.getState().rows);
   const mgrPayroll=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.getState().rows);
   if(name!=="Nhân viên A"||empRows.length!==1||mgrProfiles.length!==2||!mgrProfiles.some(x=>x.employee_id==="emp-a")||!mgrProfiles.some(x=>x.employee_id==="emp-b")||mgrPayroll.length!==1||mgrPayroll[0].employee_id!=="emp-a")throw new Error(JSON.stringify({name,empRows,mgrProfiles,mgrPayroll}));
   return "Employee=A only; Store Manager sees shared employee pool; payroll remains selected-store scoped";
 });

 await check("e2e14_employee_cannot_supply_cross_user_subject",async()=>{
   const r=await page.evaluate(async()=>({profile:await globalThis.__TASK107_QA.employeeCrossProfile(),payroll:await globalThis.__TASK107_QA.employeeCrossPayroll()}));
   if(!r.profile.error?.message.includes("RPC_SIGNATURE_DENY")||!r.payroll.error?.message.includes("RPC_SIGNATURE_DENY"))throw new Error(JSON.stringify(r));
   return "parameterized cross-user attempts rejected";
 });

 await check("e2e14_store_manager_all_scope_and_owner_enterprise_scope",async()=>{
   const r=await page.evaluate(async()=>({mp:await globalThis.__TASK107_QA.managerCrossProfile(),my:await globalThis.__TASK107_QA.managerCrossPayroll(),op:await globalThis.__TASK107_QA.ownerProfile(),oy:await globalThis.__TASK107_QA.ownerPayroll()}));
   if(r.mp.error||r.my.error||r.mp.data.length!==1||r.mp.data[0].employee_id!=="emp-b"||r.my.data.length!==1||r.my.data[0].employee_id!=="emp-b")throw new Error(JSON.stringify(r));
   if(r.op.error||r.oy.error||r.op.data.length!==2||r.oy.data.length!==2)throw new Error(JSON.stringify(r));
   return "STORE_MANAGER ALL can operate CN2; Owner enterprise mock remains separate";
 });

 await check("failure_isolation_employee_profile_error_clears_only_profile",async()=>{
   await page.evaluate(()=>globalThis.__TASK107_QA.setMode("employeeProfile","error"));
   await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh());
   await employee.locator("#profileProjectionState").filter({hasText:"PROFILE_INACTIVE"}).waitFor();
   const name=await employee.locator("#profileFullName").inputValue();
   const payrollRows=await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.state.rows.length);
   if(name!=="—"||payrollRows!==1)throw new Error(JSON.stringify({name,payrollRows}));
   await page.evaluate(()=>{globalThis.__TASK107_QA.setMode("employeeProfile","ok");return globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh()});
   await employee.locator("#profileFullName").evaluate(el=>new Promise((resolve,reject)=>{const end=Date.now()+5000;(function poll(){if(el.value==="Nhân viên A")return resolve();if(Date.now()>end)return reject(new Error("profile recovery timeout"));setTimeout(poll,25)})()}));
   return "stale profile cleared; payroll truth isolated; refresh recovered";
 });

 await check("invalid_employee_profile_projection_fails_closed_then_recovers",async()=>{
   await page.evaluate(()=>globalThis.__TASK107_QA.setMode("employeeProfile","invalid"));
   await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh());
   await employee.locator("#profileProjectionState").filter({hasText:"PROFILE_PROJECTION_INVALID"}).waitFor();
   if(await employee.locator("#profileFullName").inputValue()!=="—")throw new Error("stale profile rendered");
   await page.evaluate(()=>{globalThis.__TASK107_QA.setMode("employeeProfile","ok");return globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh()});
   await employee.locator("#profileFullName").evaluate(el=>new Promise((resolve,reject)=>{const end=Date.now()+5000;(function poll(){if(el.value==="Nhân viên A")return resolve();if(Date.now()>end)return reject(new Error("profile recovery timeout"));setTimeout(poll,25)})()}));
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

 await check("store_manager_shared_profile_pool_and_payroll_store_switch",async()=>{
   const initial=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.getState());
   if(initial.error||initial.rows.length!==2)throw new Error(JSON.stringify(initial));
   await page.evaluate(()=>{
     const p=document.getElementById("mgrPayrollStore");
     p.value="store-b";p.dispatchEvent(new Event("change",{bubbles:true}));
   });
   await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.getState().rows[0]?.employee_id==="emp-b");
   const cn2=await page.evaluate(()=>({p:globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.getState(),y:globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.getState()}));
   if(cn2.p.rows.length!==2||cn2.y.rows.length!==1||cn2.y.rows[0].employee_id!=="emp-b")throw new Error(JSON.stringify(cn2));
   await page.evaluate(()=>{
     const p=document.getElementById("mgrPayrollStore");
     p.value="store-a";p.dispatchEvent(new Event("change",{bubbles:true}));
   });
   await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.getState().rows[0]?.employee_id==="emp-a");
   return "shared Employee Profile pool remains stable while payroll store selector switches CN1/CN2";
 });

 await check("manager_invalid_profile_projection_fails_closed",async()=>{
   await page.evaluate(()=>globalThis.__TASK107_QA.setMode("managerProfile","invalid"));
   await page.evaluate(()=>globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.refresh());
   const st=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.getState());
   if(st.error!=="PROFILE_PROJECTION_INVALID"||st.rows.length!==0)throw new Error(JSON.stringify(st));
   await page.evaluate(()=>{globalThis.__TASK107_QA.setMode("managerProfile","ok");return globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.refresh()});
   await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.getState().rows.length===2);
   return "invalid shared-pool profile cannot render; canonical two-employee pool recovers";
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
   if(x.ep!==1||x.mp!==2||x.my!==1)throw new Error(JSON.stringify(x));
   if(x.calls.some(c=>c.kind==="from"))throw new Error("direct table call");
   if(x.calls.some(c=>/build_payroll_estimate|review|finalize|insert|update|delete/i.test(c.name)))throw new Error(JSON.stringify(x.calls));
   return "repeated refresh converges to same rows with RPC reads only";
 });

 await check("reload_recovers_without_cross_user_or_stale_state",async()=>{
   await page.reload({waitUntil:"networkidle",timeout:20000});
   await employee.locator("#profileFullName").waitFor({state:"attached",timeout:10000});
   await empRefresh();await mgrRefresh();
   const x=await page.evaluate(()=>({name:globalThis.MAGASIN_EMPLOYEE.profileProjection.state.row?.full_name,ep:globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.state.rows,mp:globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.getState().rows,my:globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.getState().rows,calls:globalThis.__TASK107_QA.calls}));
   if(x.name!=="Nhân viên A"||x.ep.length!==1||x.mp.length!==2||x.my.length!==1||!x.mp.some(r=>r.employee_id==="emp-a")||!x.mp.some(r=>r.employee_id==="emp-b")||x.my[0].employee_id!=="emp-a")throw new Error(JSON.stringify(x));
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
