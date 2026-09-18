import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:8767";
const OUT = process.env.QA_OUT || "qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});

const report={status:"PASS",checks:[],page_errors:[],console_errors:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.message||e)});report.status="FAIL"}};

const browserInstance=await chromium.launch({headless:true});
const page=await browserInstance.newPage({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1440,height:900}});
page.on("pageerror",e=>report.page_errors.push(String(e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});

await page.goto(`${BASE}/09_QA/people-shift/manager-registration-review-fixture.html`,{waitUntil:"networkidle"});
await page.locator(".mwr2-card").waitFor();

await check("initial_scoped_registration_board",async()=>{
  const text=await page.locator("#panel-review").innerText();
  if(!text.includes("Nhân viên QA A")||!text.includes("Nhân viên QA B")) throw new Error(text);
  const last=await page.evaluate(()=>globalThis.__MANAGER_REVIEW_QA.calls.filter(x=>x.name==="get_manager_weekly_availability").at(-1));
  if(last?.args?.p_store_id!==null) throw new Error(JSON.stringify(last));
  return "all accessible registrations visible";
});

await check("store_filter_is_forwarded_to_manager_reader",async()=>{
  await page.locator("#mwr2StoreFilter").selectOption("store-b");
  await page.waitForFunction(()=>globalThis.__MANAGER_REVIEW_QA.calls.filter(x=>x.name==="get_manager_weekly_availability").at(-1)?.args?.p_store_id==="store-b");
  const text=await page.locator("#panel-review").innerText();
  if(text.includes("Nhân viên QA A")||!text.includes("Nhân viên QA B")) throw new Error(text);
  return "p_store_id=store-b";
});

await check("week_navigation_changes_rpc_week",async()=>{
  const before=await page.evaluate(()=>globalThis.__MANAGER_REVIEW_QA.calls.filter(x=>x.name==="get_manager_weekly_availability").at(-1)?.args?.p_week_start);
  await page.locator('[data-mwr2-week="next"]').click();
  await page.waitForFunction(prev=>globalThis.__MANAGER_REVIEW_QA.calls.filter(x=>x.name==="get_manager_weekly_availability").at(-1)?.args?.p_week_start!==prev,before);
  const after=await page.evaluate(()=>globalThis.__MANAGER_REVIEW_QA.calls.filter(x=>x.name==="get_manager_weekly_availability").at(-1)?.args?.p_week_start);
  const diff=(Date.parse(after+"T00:00:00Z")-Date.parse(before+"T00:00:00Z"))/86400000;
  if(diff!==7) throw new Error(`${before} -> ${after}`);
  return `${before} -> ${after}`;
});

await check("manager_edit_uses_server_rpc",async()=>{
  await page.locator("#mwr2StoreFilter").selectOption("");
  await page.waitForFunction(()=>globalThis.__MANAGER_REVIEW_QA.calls.filter(x=>x.name==="get_manager_weekly_availability").at(-1)?.args?.p_store_id===null);
  await page.locator('[data-edit]').first().click();
  const card=page.locator(".mwr2-shift").first();
  await card.locator('[data-k="start_time"]').selectOption("07:00");
  await card.locator('[data-k="end_time"]').selectOption("12:00");
  await card.locator('[data-k="preferred_store_id"]').selectOption("store-b");
  await card.locator('[data-save]').click();
  await page.waitForFunction(()=>globalThis.__MANAGER_REVIEW_QA.calls.some(x=>x.name==="manager_update_employee_availability"));
  const call=await page.evaluate(()=>globalThis.__MANAGER_REVIEW_QA.calls.filter(x=>x.name==="manager_update_employee_availability").at(-1));
  if(call.args.p_start_time!=="07:00"||call.args.p_preferred_store_id!=="store-b") throw new Error(JSON.stringify(call));
  const direct=await page.evaluate(()=>globalThis.__MANAGER_REVIEW_QA.calls.filter(x=>x.kind==="from"));
  if(direct.length) throw new Error(JSON.stringify(direct));
  return "manager_update_employee_availability; no direct table update";
});

await check("robot_requires_concrete_store_before_handoff",async()=>{
  await page.locator("#mwr2StoreFilter").selectOption("");
  await page.locator("#mwr2Auto").click();
  const text=await page.locator("#mwr2Info").innerText();
  if(!text.includes("chọn một chi nhánh cụ thể")) throw new Error(text);
  const autoCalls=await page.evaluate(()=>globalThis.__MANAGER_REVIEW_QA.calls.filter(x=>x.name==="auto_generate_schedule_generation").length);
  if(autoCalls!==0) throw new Error("robot should not run without a concrete store");
  return text;
});

await check("browser_diagnostics",async()=>{
  if(report.page_errors.length) throw new Error(report.page_errors.join("\n"));
  if(report.console_errors.length) throw new Error(report.console_errors.join("\n"));
  return "0 page/console errors";
});

await page.screenshot({path:path.join(OUT,"manager-registration-review.png"),fullPage:true});
await browserInstance.close();

fs.writeFileSync(path.join(OUT,"manager-registration-review-report.json"),JSON.stringify(report,null,2));
console.log("MANAGER_REGISTRATION_REVIEW_BROWSER="+report.status);
for(const c of report.checks) console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS") process.exitCode=1;
