import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)})}};

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});

try{
 await page.goto(BASE+"/09_QA/people-shift/mer-cross-role-profile-fixture.html",{waitUntil:"networkidle",timeout:20000});
 await page.evaluate(()=>globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.refresh());
 await page.locator('[data-msp-edit="e1"]').waitFor({timeout:10000});

 await check("mer_manager_initial_unconfigured",async()=>{
   const text=await page.locator("#view-staff").innerText();
   if(!text.includes("Chưa thiết lập"))throw new Error(text);
   return "Manager sees unconfigured canonical profile";
 });

 await page.locator('[data-msp-edit="e1"]').click();
 const editor=page.locator('[data-msp-editor="e1"]');
 await editor.locator('[data-msp-priority="1"]').selectOption("s3");
 await editor.locator('[data-msp-priority="2"]').selectOption("s2");
 await editor.locator('[data-msp-priority="3"]').selectOption("s4");
 await editor.locator('[data-msp-priority="4"]').selectOption("s1");
 await editor.locator('[data-msp-save]').click();
 await page.locator("#view-staff").filter({hasText:"CN3 → CN2 → CN4 → CN1"}).waitFor({timeout:10000});

 await check("mer_manager_save_reload_same_truth",async()=>{
   await page.evaluate(()=>globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.refresh());
   await page.locator("#view-staff").filter({hasText:"CN3 → CN2 → CN4 → CN1"}).waitFor({timeout:10000});
   return "Manager reload reads saved priority";
 });

 const frame=page.frameLocator("#employeeApp");
 await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh());
 await frame.locator("#profileStorePriority").evaluate(el=>new Promise((resolve,reject)=>{
   const end=Date.now()+5000;
   (function poll(){if(el.value==="CN3 → CN2 → CN4 → CN1")return resolve();if(Date.now()>end)return reject(new Error("employee priority did not converge: "+el.value));setTimeout(poll,25)})();
 }));

 await check("mer_employee_reads_same_priority",async()=>{
   const primary=await frame.locator("#profilePrimaryStore").inputValue();
   const priority=await frame.locator("#profileStorePriority").inputValue();
   if(!primary.startsWith("CN3")||priority!=="CN3 → CN2 → CN4 → CN1")throw new Error(JSON.stringify({primary,priority}));
   return "Employee read-only profile matches Manager truth";
 });

 await check("mer_scheduler_reads_same_priority",async()=>{
   const data=await page.evaluate(async()=>{const q=await globalThis.__MER_QA.rpc("get_cross_store_weekly_availability_v1",{p_week_start:"2026-10-05"});return q.data?.[0]});
   if(data.primary_store_code!=="CN3"||JSON.stringify(data.priority_store_codes)!==JSON.stringify(["CN3","CN2","CN4","CN1"]))throw new Error(JSON.stringify(data));
   return "Scheduler availability projection matches Manager/Employee priority";
 });

 await check("mer_single_profile_contract_inventory",async()=>{
   const calls=await page.evaluate(()=>globalThis.__MER_QA.state.calls.map(x=>x.name));
   for(const required of ["list_employee_workforce_profiles_v1","set_employee_store_priority_profile_v1","get_my_employee_workforce_profile_v1","get_cross_store_weekly_availability_v1"]){
     if(!calls.includes(required))throw new Error("missing "+required+" in "+JSON.stringify(calls));
   }
   if(calls.includes("get_my_store_priority_profile_v1"))throw new Error("legacy split employee reader observed");
   return "Manager, Employee and Scheduler use canonical profile path";
 });

 await check("mer_browser_diagnostics",async()=>{
   if(report.page_errors.length||report.console_errors.length)throw new Error(JSON.stringify({page_errors:report.page_errors,console_errors:report.console_errors}));
   return "0 page/console errors";
 });
} finally {
 await page.screenshot({path:path.join(OUT,"mer-cross-role-profile.png"),fullPage:true}).catch(()=>{});
 await browser.close();
}
fs.writeFileSync(path.join(OUT,"mer-cross-role-profile-report.json"),JSON.stringify(report,null,2));
console.log("MER_CROSS_ROLE_PROFILE="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=="PASS")process.exitCode=1;
