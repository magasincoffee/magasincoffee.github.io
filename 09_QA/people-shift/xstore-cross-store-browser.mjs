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
for(const token of ["Nhu cầu nhân sự hàng tuần","2. Nhu cầu nhân sự hàng tuần","3. Xếp lịch tự động","5 khung cố định","4/4 CN đã cấu hình","Tạo lịch nháp tự động"]){
 if(!autoText.includes(token))throw new Error("missing "+token+" in "+autoText);
}
for(const forbidden of ["Nhu cầu nhân sự recurring","Auto Schedule","Tạo DRAFT","Store Priority","Robot"]){
 if(autoText.includes(forbidden))throw new Error("technical copy leaked: "+forbidden+" in "+autoText);
}
if(await page.locator("#xsaAuto").isDisabled())throw new Error("automatic draft should be enabled with complete staffing");
if(await page.locator(".xsa-board tbody tr").count()!==4)throw new Error("recurring board must expose 4 stores");

await page.locator("#xsaConfig").click();
const cell=page.locator('[data-xsa-cell="s1-1"]');
await page.waitForFunction(()=>{
 const el=document.querySelector('[data-xsa-cell="s1-1"] [data-xsa-f="start_time"]');
 return el?.tagName==="SELECT" && el.dataset.magasinTimePicker==="1";
});

const starts=cell.locator('[data-xsa-f="start_time"]');
const ends=cell.locator('[data-xsa-f="end_time"]');
const heads=cell.locator('[data-xsa-f="target_headcount"]');
await starts.first().selectOption("07:00");
await ends.first().selectOption("12:00");
await heads.first().fill("3");

await cell.locator("[data-xsa-add-store='s1'][data-xsa-add-day='1']").click();
await page.waitForFunction(()=>document.querySelectorAll('[data-xsa-cell="s1-1"] .xsa-block-edit').length===2);
await page.waitForFunction(()=>{
 const els=[...document.querySelectorAll('[data-xsa-cell="s1-1"] [data-xsa-f="start_time"]')];
 return els.length===2 && els.every(x=>x.tagName==="SELECT");
});

if(await starts.first().inputValue()!=="07:00")throw new Error("existing start time reset after add block");
if(await ends.first().inputValue()!=="12:00")throw new Error("existing end time reset after add block");
if(await heads.first().inputValue()!=="3")throw new Error("existing headcount reset after add block");
if(await starts.nth(1).inputValue()!=="")throw new Error("new block start must be empty, not a default time");
if(await ends.nth(1).inputValue()!=="")throw new Error("new block end must be empty, not a default time");
const newStartLabel=await starts.nth(1).locator("option:checked").innerText();
if(newStartLabel!=="Chọn giờ")throw new Error("new block should prompt Chọn giờ: "+newStartLabel);

await cell.locator("[data-xsa-remove]").nth(1).click();
await page.waitForFunction(()=>document.querySelectorAll('[data-xsa-cell="s1-1"] .xsa-block-edit').length===1);
await page.waitForFunction(()=>document.querySelector('[data-xsa-cell="s1-1"] [data-xsa-f="start_time"]')?.tagName==="SELECT");
if(await starts.first().inputValue()!=="07:00"||await ends.first().inputValue()!=="12:00"||await heads.first().inputValue()!=="3"){
 throw new Error("existing block changed after removing temporary block");
}

await page.locator("#xsaSave").click();
await page.waitForFunction(()=>globalThis.__XSTORE_QA.calls.some(x=>x.name==="replace_workforce_recurring_staffing_requirements_v1"));
await page.locator(".xsa-status.ok").waitFor();

const replace=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.filter(x=>x.name==="replace_workforce_recurring_staffing_requirements_v1").at(-1));
if("p_week_start" in (replace.args||{}))throw new Error("recurring save must not send p_week_start");
if((replace.args?.p_requirements||[]).some(r=>"work_date" in r))throw new Error("recurring save must not contain work_date");
const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem("xstore-c05-recurring-requirements")||"[]"));
if(!persisted.some(r=>r.store_id==="s1"&&Number(r.day_of_week)===1&&r.start_time==="07:00"&&r.end_time==="12:00"&&Number(r.target_headcount)===3)){
 throw new Error("edited recurring requirement not persisted");
}

await page.locator("#xsaAuto").click();
await page.waitForFunction(()=>globalThis.__XSTORE_QA.calls.some(x=>x.name==="auto_generate_cross_store_schedule_v1"));
let autoCall=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.filter(x=>x.name==="auto_generate_cross_store_schedule_v1").at(-1));
if(autoCall?.args?.p_week_start!=="2026-10-05")throw new Error(JSON.stringify(autoCall));
if(autoCall?.args?.p_algorithm_version!=="XSTORE_GLOBAL_RECURRING_V1")throw new Error(JSON.stringify(autoCall));
if(autoCall?.args?.p_replace_existing!==false)throw new Error(JSON.stringify(autoCall));

await page.reload({waitUntil:"networkidle"});
await page.locator(".xsa").waitFor();
const reloadedCell=(await page.locator('[data-xsa-cell="s1-1"]').innerText()).replace(/\s+/g," ");
if(!reloadedCell.includes("07:00–12:00 · 3 người"))throw new Error("recurring edit did not survive reload: "+reloadedCell);

await page.goto(FIXTURE+"?week=2026-10-12",{waitUntil:"networkidle"});
await page.locator(".xsa").waitFor();
const nextWeekCell=(await page.locator('[data-xsa-cell="s1-1"]').innerText()).replace(/\s+/g," ");
if(!nextWeekCell.includes("07:00–12:00 · 3 người"))throw new Error("recurring config not reused in next week: "+nextWeekCell);
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
if(!autoText.includes("áp dụng nhu cầu hàng tuần vào tuần đang chọn và tạo lịch nháp"))throw new Error(autoText);
if(errors.length)throw new Error(errors.join("\n"));

await page.screenshot({path:path.join(OUT,"xstore-recurring-stable-editor.png"),fullPage:true});
await browser.close();
console.log("XSTORE_RECURRING_STABLE_EDITOR_BROWSER=PASS");