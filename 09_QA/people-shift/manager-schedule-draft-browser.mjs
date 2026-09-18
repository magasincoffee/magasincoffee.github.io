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

await page.goto(`${BASE}/09_QA/people-shift/manager-schedule-draft-fixture.html`,{waitUntil:"networkidle"});
await page.locator("#mwr2StoreFilter").waitFor();

await check("robot_requires_concrete_store",async()=>{
  await page.locator("#mwr2Auto").click();
  const msg=await page.locator("#mwr2Info").innerText();
  if(!msg.includes("chọn một chi nhánh"))throw new Error(msg);
  const autos=await page.evaluate(()=>globalThis.__MANAGER_DRAFT_QA.calls.filter(x=>x.name==="auto_generate_schedule_generation").length);
  if(autos!==0)throw new Error("robot called without store");
  return msg;
});

await page.locator("#mwr2StoreFilter").selectOption("store-a");
await page.locator("#mwr2Auto").click();
await page.locator("#panel-publish .msd").waitFor();

await check("robot_creates_draft_only",async()=>{
  const calls=await page.evaluate(()=>globalThis.__MANAGER_DRAFT_QA.calls.filter(x=>x.kind==="rpc").map(x=>({name:x.name,args:x.args})));
  const auto=calls.find(x=>x.name==="auto_generate_schedule_generation");
  if(!auto||auto.args.p_store_id!=="store-a"||auto.args.p_algorithm_version!=="GREEDY_V1")throw new Error(JSON.stringify(auto));
  const forbidden=calls.filter(x=>["review_schedule_generation","publish_schedule_generation"].includes(x.name));
  if(forbidden.length)throw new Error(JSON.stringify(forbidden));
  const text=await page.locator("#panel-publish").innerText();
  if(!text.includes("Không tự Publish"))throw new Error(text);
  return "DRAFT created; no review/publish RPC";
});

await check("existing_assignment_is_editable",async()=>{
  const row=page.locator("[data-msd-row]").first();
  await row.locator('[data-f="start_time"]').selectOption("06:30");
  await row.locator('[data-f="end_time"]').selectOption("12:00");
  return "time edited locally";
});

await check("manager_can_add_from_registered_availability",async()=>{
  await page.locator("#msdAddAvailability").selectOption("1");
  await page.locator("#msdAdd").click();
  const count=await page.locator("[data-msd-row]").count();
  if(count!==2)throw new Error("rows="+count);
  return "2 draft allocations";
});

await check("save_replaces_draft_then_validates",async()=>{
  await page.locator("#msdSave").click();
  await page.waitForFunction(()=>globalThis.__MANAGER_DRAFT_QA.calls.some(x=>x.name==="replace_schedule_generation_assignments"));
  await page.waitForFunction(()=>globalThis.__MANAGER_DRAFT_QA.calls.some(x=>x.name==="validate_schedule_generation_v1"));
  const replace=await page.evaluate(()=>globalThis.__MANAGER_DRAFT_QA.calls.filter(x=>x.name==="replace_schedule_generation_assignments").at(-1));
  if(replace.args.p_generation_id!=="gen-qa"||replace.args.p_assignments.length!==2)throw new Error(JSON.stringify(replace));
  if(replace.args.p_assignments.some(x=>x.status!=="DRAFT"||x.store_id!=="store-a"))throw new Error(JSON.stringify(replace.args.p_assignments));
  const text=await page.locator("#msdStatus").innerText();
  if(!text.includes("Lịch nháp hợp lệ"))throw new Error(text);
  return "replace -> validate PASS";
});

await check("no_direct_table_or_auto_publish",async()=>{
  const result=await page.evaluate(()=>({
    direct:globalThis.__MANAGER_DRAFT_QA.calls.filter(x=>x.kind==="from"),
    forbidden:globalThis.__MANAGER_DRAFT_QA.calls.filter(x=>["review_schedule_generation","publish_schedule_generation"].includes(x.name))
  }));
  if(result.direct.length||result.forbidden.length)throw new Error(JSON.stringify(result));
  return "0 direct table; 0 review/publish";
});

await check("browser_diagnostics",async()=>{
  if(report.page_errors.length)throw new Error(report.page_errors.join("\n"));
  if(report.console_errors.length)throw new Error(report.console_errors.join("\n"));
  return "0 page/console errors";
});

await page.screenshot({path:path.join(OUT,"manager-schedule-draft.png"),fullPage:true});
await browserInstance.close();
fs.writeFileSync(path.join(OUT,"manager-schedule-draft-report.json"),JSON.stringify(report,null,2));
console.log("MANAGER_SCHEDULE_DRAFT_BROWSER="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;
