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

await page.goto(`${BASE}/09_QA/people-shift/employee-availability-canonical-fixture.html`,{waitUntil:"networkidle"});
const employee=page.frameLocator("#employeeApp");
await employee.locator("body[data-employee-availability-engine='1']").waitFor();

await check("single_canonical_engine_initialized",async()=>{
  const api=await page.evaluate(()=>({
    refresh:typeof globalThis.MAGASIN_EMPLOYEE?.availability?.refresh,
    remove:typeof globalThis.MAGASIN_EMPLOYEE?.availability?.remove,
    week:globalThis.MAGASIN_EMPLOYEE?.availability?.getWeek?.()
  }));
  if(api.refresh!=="function"||api.remove!=="function"||api.week!=="2026-09-21")throw new Error(JSON.stringify(api));
  return JSON.stringify(api);
});

await check("first_interval_saves_and_is_immediately_visible",async()=>{
  await employee.locator("#quickRegDay").selectOption("2026-09-21");
  await employee.locator("#quickRegStart").selectOption("06:00");
  await employee.locator("#quickRegEnd").selectOption("12:00");
  await employee.locator("#quickRegStore").selectOption("CN1");
  await employee.locator("#saveReg").click();
  await employee.locator(".week-summary").filter({hasText:"06:00–12:00"}).waitFor();
  const rows=await page.evaluate(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.rows.map(x=>({...x})));
  if(rows.length!==1||rows[0].availability_type!=="AVAILABLE"||rows[0].preferred_store_id!=="store-a")throw new Error(JSON.stringify(rows));
  return JSON.stringify(rows[0]);
});

await check("multiple_windows_same_day_are_preserved",async()=>{
  await employee.locator("#quickRegStart").selectOption("17:00");
  await employee.locator("#quickRegEnd").selectOption("22:00");
  await employee.locator("#saveReg").click();
  await employee.locator(".week-summary").filter({hasText:"17:00–22:00"}).waitFor();
  const count=await employee.locator(".miniShift").count();
  if(count!==2)throw new Error("miniShift count="+count);
  const rows=await page.evaluate(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.rows.length);
  if(rows!==2)throw new Error("rows="+rows);
  return "2 windows on 2026-09-21";
});

await check("delete_uses_canonical_rpc_and_refreshes_immediately",async()=>{
  page.once("dialog",d=>d.accept());
  await employee.locator("[data-av-delete]").first().click();
  await page.waitForFunction(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.rows.length===1);
  await employee.locator(".miniShift").filter({hasText:"17:00–22:00"}).waitFor();
  const count=await employee.locator(".miniShift").count();
  if(count!==1)throw new Error("miniShift count="+count);
  const call=await page.evaluate(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="delete_my_availability").at(-1));
  if(!call?.args?.p_availability_id)throw new Error(JSON.stringify(call));
  return JSON.stringify(call);
});

await check("only_canonical_rpc_boundary_is_used",async()=>{
  const calls=await page.evaluate(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.calls);
  const direct=calls.filter(x=>x.kind==="from");
  if(direct.length)throw new Error(JSON.stringify(direct));
  const names=calls.filter(x=>x.kind==="rpc").map(x=>x.name);
  for(const n of ["get_my_availability","save_my_availability","delete_my_availability"]){
    if(!names.includes(n))throw new Error("missing "+n+": "+JSON.stringify(names));
  }
  return [...new Set(names)].join(" → ");
});

await check("browser_diagnostics",async()=>{
  if(report.page_errors.length)throw new Error(report.page_errors.join("\n"));
  if(report.console_errors.length)throw new Error(report.console_errors.join("\n"));
  return "0 page/console errors";
});

await page.screenshot({path:path.join(OUT,"employee-availability-canonical.png"),fullPage:true});
await browserInstance.close();
fs.writeFileSync(path.join(OUT,"employee-availability-canonical-report.json"),JSON.stringify(report,null,2));
console.log("EMPLOYEE_AVAILABILITY_CANONICAL_BROWSER="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;
