import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

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

try{
  await page.goto(BASE+"/09_QA/people-shift/employee-profile-projection-fixture.html",{waitUntil:"networkidle",timeout:20000});
  const f=page.frameLocator("#employeeApp");
  await f.locator("#profileFullName").waitFor({timeout:10000});
  await f.locator("#profileFullName").evaluate(el=>new Promise((resolve,reject)=>{const end=Date.now()+5000;(function poll(){if(el.value==="Nguyễn An")return resolve();if(Date.now()>end)return reject(new Error("profile did not load"));setTimeout(poll,25)})()}));

  await check("task101_employee_self_projection_renders_operational_allowlist",async()=>{
    const vals=await f.locator("#view-profile").evaluate(root=>Object.fromEntries(["profileFullName","profileUsername","profilePhone","profileRole","profileStatus","profilePrimaryStore","profileLevel","profileJoinDate"].map(id=>[id,root.querySelector("#"+id)?.value])));
    if(vals.profileFullName!=="Nguyễn An"||vals.profileUsername!=="an.nguyen"||vals.profilePhone!=="0900000000"||!vals.profilePrimaryStore.includes("CN1"))throw new Error(JSON.stringify(vals));
    if(vals.profileLevel!=="Chưa có nguồn chuẩn"||vals.profileJoinDate!=="Chưa có nguồn chuẩn")throw new Error(JSON.stringify(vals));
    return "own operational profile rendered; missing canonical sources remain explicit";
  });

  await check("task101_browser_uses_self_rpc_only_and_no_direct_profile_table",async()=>{
    const calls=await page.evaluate(()=>globalThis.__TASK101_QA.calls);
    if(calls.some(x=>x.kind==="from"))throw new Error(JSON.stringify(calls));
    if(calls.some(x=>x.kind==="rpc"&&x.name!=="get_my_employee_profile_v1"))throw new Error(JSON.stringify(calls));
    return "RPC-only self projection; 0 direct table calls";
  });

  await check("task101_privacy_fields_not_rendered",async()=>{
    const text=await f.locator("body").innerText();
    if(/access_scope|hourly_rate|pay_rule_reference|email/i.test(text))throw new Error(text);
    return "no email/access scope/hourly rate/pay-rule internals rendered";
  });

  await check("task101_error_fails_closed_and_clears_stale_profile",async()=>{
    await page.evaluate(()=>{globalThis.__TASK101_QA.fail();return globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh()});
    await f.locator("#profileProjectionState").filter({hasText:"PROFILE_INACTIVE"}).waitFor({timeout:10000});
    const value=await f.locator("#profileFullName").inputValue();
    if(value!=="—")throw new Error("stale profile remained: "+value);
    await page.evaluate(()=>{globalThis.__TASK101_QA.recover();return globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh()});
    await f.locator("#profileFullName").evaluate(el=>new Promise((resolve,reject)=>{const end=Date.now()+5000;(function poll(){if(el.value==="Nguyễn An")return resolve();if(Date.now()>end)return reject(new Error("profile did not recover"));setTimeout(poll,25)})()}));
    return "backend denial clears stale projection; refresh recovers canonical self data";
  });

  await check("task101_reload_converges_without_cross_user_state",async()=>{
    await page.reload({waitUntil:"networkidle",timeout:20000});
    const f2=page.frameLocator("#employeeApp");
    await f2.locator("#profileFullName").evaluate(el=>new Promise((resolve,reject)=>{const end=Date.now()+5000;(function poll(){if(el.value==="Nguyễn An")return resolve();if(Date.now()>end)return reject(new Error("reload did not converge"));setTimeout(poll,25)})()}));
    const calls=await page.evaluate(()=>globalThis.__TASK101_QA.calls);
    if(calls.some(x=>x.args&&Object.keys(x.args).length))throw new Error(JSON.stringify(calls));
    return "reload converges through parameterless self RPC";
  });

  await check("task101_mobile_layout_has_no_horizontal_overflow",async()=>{
    const m=await page.frameLocator("#employeeApp").locator("body").evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
    if(m.scroll>m.client+2)throw new Error(JSON.stringify(m));
    return m.client+"px mobile viewport fits without overflow";
  });

  await check("browser_diagnostics",async()=>{
    if(report.page_errors.length||report.console_errors.length||report.request_failures.length||report.http_errors.length)throw new Error(JSON.stringify({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures,http_errors:report.http_errors}));
    return "0 page/console/request/5xx errors";
  });
} finally {
  await page.screenshot({path:path.join(OUT,"task-101-employee-profile-projection.png"),fullPage:true}).catch(()=>{});
  await browserInstance.close();
}
fs.writeFileSync(path.join(OUT,"task-101-employee-profile-projection-report.json"),JSON.stringify(report,null,2));
console.log("TASK_101_EMPLOYEE_PROFILE_PROJECTION="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=="PASS")process.exitCode=1;