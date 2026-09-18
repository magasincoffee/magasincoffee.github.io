import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.message||e)});report.status="FAIL"}};

const browserInstance=await chromium.launch({headless:true});
const page=await browserInstance.newPage({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1200,height:900}});
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
await page.goto(`${BASE}/09_QA/people-shift/employee-attendance-schedule-linked-fixture.html`,{waitUntil:"networkidle"});
const employee=page.frameLocator("#employeeApp");

await check("approved_schedule_is_attendance_source",async()=>{
  await employee.locator("[data-att-in='sch-1']").waitFor();
  const calls=await page.evaluate(()=>globalThis.__EMPLOYEE_ATTENDANCE_QA.calls.filter(x=>x.kind==="rpc").map(x=>x.name));
  if(!calls.includes("get_my_today_schedules"))throw new Error(JSON.stringify(calls));
  return "sch-1 APPROVED -> clock-in action";
});

await check("clock_in_is_schedule_linked_rpc",async()=>{
  await employee.locator("[data-att-in='sch-1']").click();
  await employee.locator("[data-att-out='att-1']").waitFor();
  const call=await page.evaluate(()=>globalThis.__EMPLOYEE_ATTENDANCE_QA.calls.filter(x=>x.name==="clock_in_for_schedule").at(-1));
  if(call.args.p_schedule_id!=="sch-1")throw new Error(JSON.stringify(call));
  return JSON.stringify(call.args);
});

await check("clock_out_closes_same_attendance_and_refreshes_history",async()=>{
  await employee.locator("[data-att-out='att-1']").click();
  await page.waitForFunction(()=>globalThis.__EMPLOYEE_ATTENDANCE_QA.state.history.length===1);
  await employee.locator("#attendanceHistoryTable").filter({hasText:"96.000đ"}).waitFor();
  const call=await page.evaluate(()=>globalThis.__EMPLOYEE_ATTENDANCE_QA.calls.filter(x=>x.name==="clock_out_attendance").at(-1));
  if(call.args.p_attendance_id!=="att-1")throw new Error(JSON.stringify(call));
  const state=await page.evaluate(()=>globalThis.__EMPLOYEE_ATTENDANCE_QA.state.attendance);
  if(state.status!=="COMPLETED"||state.hours_worked!==6||state.amount!==96000)throw new Error(JSON.stringify(state));
  return "att-1 COMPLETED · 6h · 96,000";
});

await check("attendance_engine_has_no_direct_table_access",async()=>{
  const direct=await page.evaluate(()=>globalThis.__EMPLOYEE_ATTENDANCE_QA.calls.filter(x=>x.kind==="from"));
  if(direct.length)throw new Error(JSON.stringify(direct));
  return "0 direct table calls";
});

await check("browser_diagnostics",async()=>{
  if(report.page_errors.length)throw new Error(report.page_errors.join("\n"));
  if(report.console_errors.length)throw new Error(report.console_errors.join("\n"));
  return "0 page/console errors";
});

await page.screenshot({path:path.join(OUT,"employee-attendance-schedule-linked.png"),fullPage:true});
await browserInstance.close();
fs.writeFileSync(path.join(OUT,"employee-attendance-schedule-linked-report.json"),JSON.stringify(report,null,2));
console.log("EMPLOYEE_ATTENDANCE_SCHEDULE_LINKED="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;
