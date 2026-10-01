import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
const FIXTURE=BASE+"/09_QA/people-shift/xstore-cross-store-browser-fixture.html";
fs.mkdirSync(OUT,{recursive:true});

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
const errors=[];
page.on("pageerror",e=>errors.push(String(e?.message||e)));
page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});

await page.goto(FIXTURE,{waitUntil:"networkidle"});
await page.evaluate(()=>localStorage.removeItem("xstore-c05-recurring-requirements"));
await page.reload({waitUntil:"networkidle"});

await page.locator(".xsm").waitFor();
if(await page.locator(".xsm-store").count()!==4)throw new Error("expected 4 stores");

const auto=page.locator(".xsa");
await auto.waitFor();
let autoText=(await auto.innerText()).replace(/\s+/g," ");
for(const token of ["NHU CẦU NHÂN SỰ HÀNG TUẦN","2. Nhu cầu nhân sự recurring","3. Auto Schedule","5 khung cố định","4/4 CN đã cấu hình","Tạo DRAFT tự động"]){
 if(!autoText.includes(token))throw new Error("missing "+token+" in "+autoText);
}
if(await page.locator("#xsaAuto").isDisabled())throw new Error("Auto Schedule should be enabled with complete recurring staffing");
if(await page.locator(".xsa-board tbody tr").count()!==4)throw new Error("recurring board must expose 4 stores");

await page.locator("#xsaConfig").click();
const target=page.locator('[data-xsa-cell="s1-1"] [data-xsa-f="target_headcount"]').first();
await target.fill("3");
await page.locator("#xsaSave").click();
await page.waitForFunction(()=>globalThis.__XSTORE_QA.calls.some(x=>x.name==="replace_workforce_recurring_staffing_requirements_v1"));
await page.locator(".xsa-status.ok").waitFor();

const replace=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.filter(x=>x.name==="replace_workforce_recurring_staffing_requirements_v1").at(-1));
if("p_week_start" in (replace.args||{}))throw new Error("recurring save must not send p_week_start");
if((replace.args?.p_requirements||[]).some(r=>"work_date" in r))throw new Error("recurring save must not contain work_date");
const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem("xstore-c05-recurring-requirements")||"[]"));
if(!persisted.some(r=>r.store_id==="s1"&&Number(r.day_of_week)===1&&Number(r.target_headcount)===3))throw new Error("edited recurring requirement not persisted");

await page.locator("#xsaAuto").click();
await page.waitForFunction(()=>globalThis.__XSTORE_QA.calls.some(x=>x.name==="auto_generate_cross_store_schedule_v1"));
let autoCall=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.filter(x=>x.name==="auto_generate_cross_store_schedule_v1").at(-1));
if(autoCall?.args?.p_week_start!=="2026-10-05")throw new Error(JSON.stringify(autoCall));
if(autoCall?.args?.p_algorithm_version!=="XSTORE_GLOBAL_RECURRING_V1")throw new Error(JSON.stringify(autoCall));
if(autoCall?.args?.p_replace_existing!==false)throw new Error(JSON.stringify(autoCall));

await page.reload({waitUntil:"networkidle"});
await page.locator(".xsa").waitFor();
const reloadedCell=(await page.locator('[data-xsa-cell="s1-1"]').innerText()).replace(/\s+/g," ");
if(!reloadedCell.includes("06:00–12:00 · 3 người"))throw new Error("recurring edit did not survive reload: "+reloadedCell);

await page.goto(FIXTURE+"?week=2026-10-12",{waitUntil:"networkidle"});
await page.locator(".xsa").waitFor();
const nextWeekCell=(await page.locator('[data-xsa-cell="s1-1"]').innerText()).replace(/\s+/g," ");
if(!nextWeekCell.includes("06:00–12:00 · 3 người"))throw new Error("recurring config not reused in next week: "+nextWeekCell);
await page.locator("#xsaAuto").click();
await page.waitForFunction(()=>globalThis.__XSTORE_QA.calls.some(x=>x.name==="auto_generate_cross_store_schedule_v1"));
autoCall=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.filter(x=>x.name==="auto_generate_cross_store_schedule_v1").at(-1));
if(autoCall?.args?.p_week_start!=="2026-10-12")throw new Error("next-week projection mismatch: "+JSON.stringify(autoCall));
if(autoCall?.args?.p_algorithm_version!=="XSTORE_GLOBAL_RECURRING_V1")throw new Error(JSON.stringify(autoCall));

const rpcNames=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.map(x=>x.name));
for(const n of ["get_manager_accessible_stores","get_cross_store_weekly_plan_v1","get_cross_store_weekly_availability_v1","list_workforce_recurring_staffing_requirements_v1","auto_generate_cross_store_schedule_v1"]){
 if(!rpcNames.includes(n))throw new Error("missing RPC "+n);
}
for(const forbidden of ["list_cross_store_staffing_requirements_v1","replace_cross_store_staffing_requirements_v1","auto_generate_schedule_generation","publish_schedule_generation"]){
 if(rpcNames.includes(forbidden))throw new Error("forbidden RPC "+forbidden);
}

autoText=(await page.locator(".xsa").innerText()).replace(/\s+/g," ");
if(!autoText.includes("project nhu cầu tuần mẫu recurring vào tuần đang chọn và tạo DRAFT"))throw new Error(autoText);
if(errors.length)throw new Error(errors.join("\n"));

await page.screenshot({path:path.join(OUT,"xstore-c05-recurring-reload.png"),fullPage:true});
await browser.close();
console.log("XSTORE_C05_RECURRING_BROWSER_RELOAD=PASS");