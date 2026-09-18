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
await page.goto(`${BASE}/09_QA/people-shift/manager-official-schedule-fixture.html`,{waitUntil:"networkidle"});

await page.evaluate(()=>document.dispatchEvent(new CustomEvent("magasin:schedule-robot-request",{detail:{storeId:"store-a",week:"2026-09-21"}})));
await page.locator("#panel-publish .msd").waitFor();

await check("robot_does_not_auto_publish",async()=>{
  const calls=await page.evaluate(()=>globalThis.__MANAGER_OFFICIAL_QA.calls.map(x=>x.name).filter(Boolean));
  if(calls.includes("review_schedule_generation")||calls.includes("publish_schedule_generation"))throw new Error(JSON.stringify(calls));
  return "DRAFT only";
});

await check("manager_explicit_review",async()=>{
  await page.locator("#msdReview").click();
  await page.locator("#msdStatus").filter({hasText:"REVIEWED"}).waitFor();
  const st=await page.evaluate(()=>globalThis.__MANAGER_OFFICIAL_QA.state.generation.status);
  if(st!=="REVIEWED")throw new Error(st);
  return st;
});

await check("manager_explicit_publish_emits_official_schedule",async()=>{
  page.once("dialog",d=>d.accept());
  await page.locator("#msdPublish").click();
  await page.locator("#msdStatus").filter({hasText:"Đã phát hành 1 ca"}).waitFor();
  const state=await page.evaluate(()=>({generation:globalThis.__MANAGER_OFFICIAL_QA.state.generation.status,official:globalThis.__MANAGER_OFFICIAL_QA.state.official.length}));
  if(state.generation!=="PUBLISHED"||state.official!==1)throw new Error(JSON.stringify(state));
  return JSON.stringify(state);
});

await check("official_workspace_reads_approved_schedule",async()=>{
  await page.locator('[data-view="schedule"]').click();
  await page.locator("#view-schedule .mos-head").waitFor();
  const text=await page.locator("#view-schedule").innerText();
  if(!text.includes("Nhân viên QA")||!text.includes("06:00–12:00")||!text.includes("CN-QA-A"))throw new Error(text);
  const rpc=await page.evaluate(()=>globalThis.__MANAGER_OFFICIAL_QA.calls.filter(x=>x.name==="get_manager_weekly_schedule").at(-1));
  if(rpc.args.p_week_start!=="2026-09-21")throw new Error(JSON.stringify(rpc));
  return "APPROVED row visible";
});

await check("store_filter_and_week_navigation_are_scoped",async()=>{
  await page.locator("#mosStore").selectOption("store-a");
  await page.waitForFunction(()=>globalThis.__MANAGER_OFFICIAL_QA.calls.filter(x=>x.name==="get_manager_weekly_schedule").at(-1)?.args?.p_store_id==="store-a");
  const before=await page.evaluate(()=>globalThis.__MANAGER_OFFICIAL_QA.calls.filter(x=>x.name==="get_manager_weekly_schedule").at(-1)?.args?.p_week_start);
  await page.locator('[data-mos-week="next"]').click();
  await page.waitForFunction(prev=>globalThis.__MANAGER_OFFICIAL_QA.calls.filter(x=>x.name==="get_manager_weekly_schedule").at(-1)?.args?.p_week_start!==prev,before);
  const after=await page.evaluate(()=>globalThis.__MANAGER_OFFICIAL_QA.calls.filter(x=>x.name==="get_manager_weekly_schedule").at(-1)?.args?.p_week_start);
  if((Date.parse(after+"T00:00:00Z")-Date.parse(before+"T00:00:00Z"))/86400000!==7)throw new Error(`${before}->${after}`);
  return `${before} -> ${after}`;
});

await check("official_workspace_never_writes_work_schedules_directly",async()=>{
  const direct=await page.evaluate(()=>globalThis.__MANAGER_OFFICIAL_QA.calls.filter(x=>x.kind==="from"));
  if(direct.length)throw new Error(JSON.stringify(direct));
  return "0 direct table calls";
});

await check("workforce_handoff_returns_to_review",async()=>{
  await page.locator("#mosWorkforce").click();
  if(!await page.locator("#view-workforce").evaluate(el=>el.classList.contains("active")))throw new Error("workforce inactive");
  if(!await page.locator("#panel-review").evaluate(el=>el.classList.contains("active")))throw new Error("review panel inactive");
  return "official -> workforce review";
});

await check("browser_diagnostics",async()=>{
  if(report.page_errors.length)throw new Error(report.page_errors.join("\n"));
  if(report.console_errors.length)throw new Error(report.console_errors.join("\n"));
  return "0 page/console errors";
});

await page.screenshot({path:path.join(OUT,"manager-official-schedule.png"),fullPage:true});
await browserInstance.close();
fs.writeFileSync(path.join(OUT,"manager-official-schedule-report.json"),JSON.stringify(report,null,2));
console.log("MANAGER_OFFICIAL_SCHEDULE_BROWSER="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;
