import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.message||e)});report.status="FAIL"}};

const browserInstance=await chromium.launch({headless:true});
const page=await browserInstance.newPage({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1440,height:1000}});
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
await page.goto(`${BASE}/09_QA/people-shift/day10-fixture.html`,{waitUntil:"networkidle"});
const employee=page.frameLocator("#employeeApp");
await employee.locator("body[data-employee-availability-engine='1']").waitFor();
await employee.locator("button",{hasText:"Đăng ký lịch làm"}).first().click();
await employee.locator("#weeklyRegistrationPanel.open").waitFor();
await employee.locator("#quickRegType").waitFor();

const firstDay=await employee.locator("#quickRegDay option").first().getAttribute("value");
if(!firstDay)throw new Error("missing registration day");

async function submit(start,end,type){
  await employee.locator("#quickRegDay").selectOption(firstDay);
  await employee.locator("#quickRegStart").selectOption(start);
  await employee.locator("#quickRegEnd").selectOption(end);
  await employee.locator("#quickRegType").selectOption(type);
  await employee.locator("#quickRegStore").selectOption("CN-QA");
  await employee.locator("#weeklyRegistrationPanel button",{hasText:"Đăng ký"}).click();
  await employee.locator("#quickRegMsg").filter({hasText:"Đã đăng ký lịch làm"}).waitFor();
}

await check("multiple_windows_same_day_visible_immediately",async()=>{
  await submit("06:00","10:00","AVAILABLE");
  await submit("12:00","17:00","PREFERRED");
  const state=await page.evaluate(()=>globalThis.__PEOPLE_SHIFT_QA.state.availability.map(x=>({...x})));
  if(state.length!==2||state[0].work_date!==state[1].work_date)throw new Error(JSON.stringify(state));
  const cards=await employee.locator(`[data-av-row]`).count();
  if(cards!==2)throw new Error("summary cards="+cards);
  const text=await employee.locator("#weeklyRegistrationPanel .week-summary").innerText();
  if(!text.includes("Có thể làm")||!text.includes("Ưu tiên"))throw new Error(text);
  return "2 intervals rendered from saved RPC state";
});

await check("unavailable_off_is_explicit_and_store_neutral",async()=>{
  await submit("17:00","22:00","UNAVAILABLE");
  const last=await page.evaluate(()=>globalThis.__PEOPLE_SHIFT_QA.state.availability.at(-1));
  if(last.availability_type!=="UNAVAILABLE"||last.preferred_store_id!==null)throw new Error(JSON.stringify(last));
  const text=await employee.locator("#weeklyRegistrationPanel .week-summary").innerText();
  if(!text.includes("Không thể làm / Off"))throw new Error(text);
  return JSON.stringify(last);
});

await check("delete_updates_employee_view_immediately",async()=>{
  const before=await page.evaluate(()=>globalThis.__PEOPLE_SHIFT_QA.state.availability.length);
  await employee.locator("[data-av-delete]").first().click();
  await page.waitForFunction(n=>globalThis.__PEOPLE_SHIFT_QA.state.availability.length===n-1,before);
  const after=await employee.locator("[data-av-row]").count();
  if(after!==before-1)throw new Error(`before=${before} after cards=${after}`);
  const calls=await page.evaluate(()=>globalThis.__PEOPLE_SHIFT_QA.calls.filter(x=>x.name==="delete_my_availability"));
  if(!calls.length)throw new Error("delete RPC missing");
  return `${before} -> ${before-1}`;
});

await check("week_navigation_refreshes_server_state",async()=>{
  const before=await page.evaluate(()=>globalThis.__PEOPLE_SHIFT_QA.calls.filter(x=>x.name==="get_my_availability").at(-1)?.args?.p_week_start);
  await employee.locator('[data-av-week="next"]').click();
  await page.waitForFunction(prev=>globalThis.__PEOPLE_SHIFT_QA.calls.filter(x=>x.name==="get_my_availability").at(-1)?.args?.p_week_start!==prev,before);
  const after=await page.evaluate(()=>globalThis.__PEOPLE_SHIFT_QA.calls.filter(x=>x.name==="get_my_availability").at(-1)?.args?.p_week_start);
  const diff=(Date.parse(after+"T00:00:00Z")-Date.parse(before+"T00:00:00Z"))/86400000;
  if(diff!==7)throw new Error(`${before} -> ${after}`);
  return `${before} -> ${after}`;
});

await check("all_day_semantics_not_silently_invented",async()=>{
  const text=await employee.locator("#availabilityAllDayNote").innerText();
  if(!text.includes("Cả Ngày")||!text.includes("chọn giờ"))throw new Error(text);
  return text;
});

await check("browser_diagnostics",async()=>{
  if(report.page_errors.length)throw new Error(report.page_errors.join("\n"));
  if(report.console_errors.length)throw new Error(report.console_errors.join("\n"));
  return "0 page/console errors";
});

await page.screenshot({path:path.join(OUT,"employee-availability-v2.png"),fullPage:true});
await browserInstance.close();
fs.writeFileSync(path.join(OUT,"employee-availability-v2-report.json"),JSON.stringify(report,null,2));
console.log("EMPLOYEE_AVAILABILITY_V2_BROWSER="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;
