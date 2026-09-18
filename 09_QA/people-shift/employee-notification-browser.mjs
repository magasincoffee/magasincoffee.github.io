import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.message||e)});report.status="FAIL"}};
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
page.on("pageerror",e=>report.page_errors.push(String(e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
await page.goto(BASE+"/09_QA/people-shift/employee-notification-fixture.html",{waitUntil:"networkidle"});
const employee=page.frameLocator("#employeeApp");

await check("notification_reads_canonical_rpc",async()=>{
  await employee.locator("[data-notification-id='n-1']").waitFor();
  const calls=await page.evaluate(()=>globalThis.__NOTIFICATION_QA.calls);
  const rpc=calls.find(x=>x.name==="list_my_notifications_v1");
  if(!rpc||rpc.args.p_limit!==50)throw new Error(JSON.stringify(calls));
  if(calls.some(x=>x.kind==="from"))throw new Error("direct table access detected");
  return "list_my_notifications_v1 p_limit=50";
});

await check("notification_renders_schedule_and_clockout_events",async()=>{
  const text=await employee.locator("#view-notice").innerText();
  if(!text.includes("Lịch làm đã thay đổi"))throw new Error(text);
  if(!text.includes("Nhắc chấm công ra ca"))throw new Error(text);
  if(!text.includes("Hãy chấm công ra ca"))throw new Error(text);
  return "2 canonical notifications visible";
});

await check("notification_empty_state_is_truthful",async()=>{
  await page.evaluate(()=>{globalThis.__NOTIFICATION_QA.rows.splice(0)});
  await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.notification.refresh());
  await employee.locator("#view-notice").filter({hasText:"Chưa có thông báo mới"}).waitFor();
  return "empty state";
});

if(report.page_errors.length){report.checks.push({name:"page_errors",status:"FAIL",detail:report.page_errors.join("\n")});report.status="FAIL"}
else report.checks.push({name:"page_errors",status:"PASS",detail:"0"});
if(report.console_errors.length){report.checks.push({name:"console_errors",status:"FAIL",detail:report.console_errors.join("\n")});report.status="FAIL"}
else report.checks.push({name:"console_errors",status:"PASS",detail:"0"});
await page.screenshot({path:path.join(OUT,"employee-notification.png"),fullPage:true});
await browser.close();
fs.writeFileSync(path.join(OUT,"employee-notification-report.json"),JSON.stringify(report,null,2));
console.log("EMPLOYEE_NOTIFICATION="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;