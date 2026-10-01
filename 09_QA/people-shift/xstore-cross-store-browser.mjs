import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
const errors=[];
page.on("pageerror",e=>errors.push(String(e?.message||e)));
page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});

await page.goto(BASE+"/09_QA/people-shift/xstore-cross-store-browser-fixture.html",{waitUntil:"networkidle"});
await page.locator(".xsm").waitFor();
const count=await page.locator(".xsm-store").count();
if(count!==4)throw new Error("expected 4 stores, got "+count);

const auto=page.locator(".xsa");
await auto.waitFor();
const autoText=(await auto.innerText()).replace(/\s+/g," ");
for(const token of [
 "NHU CẦU NHÂN SỰ HÀNG TUẦN",
 "1. Store Priority",
 "2. Nhu cầu nhân sự recurring",
 "3. Auto Schedule",
 "5 khung cố định",
 "4/4 CN đã cấu hình",
 "Tuần mẫu cố định",
 "Tạo DRAFT tự động · Chờ C04"
]){
 if(!autoText.includes(token))throw new Error("missing recurring-board token "+token+" in "+autoText);
}
if(!(await page.locator("#xsaAuto").isDisabled()))throw new Error("Auto Schedule must remain disabled until C04");
if(await page.locator(".xsa-board tbody tr").count()!==4)throw new Error("recurring board must expose 4 store rows");
const boardHeaders=(await page.locator(".xsa-board thead").innerText()).replace(/\s+/g," ");
if(!boardHeaders.includes("T2")||!boardHeaders.includes("CN")||!boardHeaders.includes("Chủ nhật"))throw new Error(boardHeaders);

const cn1Mon=(await page.locator('[data-xsa-cell="s1-1"]').innerText()).replace(/\s+/g," ");
if(!cn1Mon.includes("06:00–12:00 · 2 người"))throw new Error("CN1 Monday recurring block missing: "+cn1Mon);
const cn4Sun=(await page.locator('[data-xsa-cell="s4-7"]').innerText()).replace(/\s+/g," ");
if(!cn4Sun.includes("08:00–13:00 · 2 người"))throw new Error("CN4 Sunday recurring block missing: "+cn4Sun);

const text=(await page.locator(".xsm").innerText()).replace(/\s+/g," ");
for(const token of ["CN1","CN2","CN3","CN4","Như Huỳnh","Mai Chi","1 nhân viên chưa có Store Priority"]){
 if(!text.includes(token))throw new Error("missing "+token+" in "+text);
}
const cn1=page.locator(".xsm-store").filter({has:page.locator(".xsm-store-title b").filter({hasText:/^CN1 · MAGASIN COFFEE CN1$/})});
if(!(await cn1.innerText()).includes("06:00–12:00"))throw new Error("CN1 draft not projected");
const cn3=page.locator(".xsm-store").filter({has:page.locator(".xsm-store-title b").filter({hasText:/^CN3 · MAGASIN COFFEE CN3$/})});
if(!(await cn3.innerText()).includes("17:00–22:00 · Đã phát hành"))throw new Error("CN3 official not projected");

await cn3.locator("[data-xsm-open='s3']").click();
const opened=await page.evaluate(()=>globalThis.__XSTORE_QA.opens.at(-1));
if(opened?.storeId!=="s3"||opened?.week!=="2026-10-05")throw new Error(JSON.stringify(opened));

await page.locator("#xsaConfig").click();
const target=page.locator('[data-xsa-cell="s1-1"] [data-xsa-f="target_headcount"]').first();
await target.waitFor();
await target.fill("3");
await page.locator("#xsaSave").click();
await page.waitForFunction(()=>globalThis.__XSTORE_QA.calls.some(x=>x.name==="replace_workforce_recurring_staffing_requirements_v1"));
await page.locator(".xsa-status.ok").waitFor();
const savedText=(await page.locator(".xsa").innerText()).replace(/\s+/g," ");
if(!savedText.includes("được dùng lại cho mọi tuần"))throw new Error("save persistence message missing: "+savedText);
const savedCn1Mon=(await page.locator('[data-xsa-cell="s1-1"]').innerText()).replace(/\s+/g," ");
if(!savedCn1Mon.includes("06:00–12:00 · 3 người"))throw new Error("saved recurring headcount not rendered: "+savedCn1Mon);

const replace=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.filter(x=>x.name==="replace_workforce_recurring_staffing_requirements_v1").at(-1));
if(!replace||!("p_requirements" in (replace.args||{})))throw new Error(JSON.stringify(replace));
if("p_week_start" in (replace.args||{}))throw new Error("recurring save must not send p_week_start: "+JSON.stringify(replace));
const payload=replace.args.p_requirements||[];
if(payload.length!==5)throw new Error("expected 5 recurring rows, got "+payload.length);
if(payload.some(r=>"work_date" in r))throw new Error("recurring payload must not contain work_date: "+JSON.stringify(payload));
if(payload.some(r=>![1,2,3,4,5,6,7].includes(Number(r.day_of_week))))throw new Error("invalid day_of_week payload: "+JSON.stringify(payload));
const changed=payload.find(r=>r.store_id==="s1"&&Number(r.day_of_week)===1&&r.start_time==="06:00");
if(Number(changed?.target_headcount)!==3)throw new Error("edited recurring headcount not saved: "+JSON.stringify(changed));

await page.evaluate(()=>document.querySelector("#xsaAuto")?.click());
const rpcNames=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.map(x=>x.name));
for(const n of [
 "get_manager_accessible_stores",
 "get_cross_store_weekly_plan_v1",
 "get_cross_store_weekly_availability_v1",
 "list_workforce_recurring_staffing_requirements_v1",
 "replace_workforce_recurring_staffing_requirements_v1"
]){
 if(!rpcNames.includes(n))throw new Error("missing RPC "+n);
}
for(const forbidden of [
 "list_cross_store_staffing_requirements_v1",
 "replace_cross_store_staffing_requirements_v1",
 "auto_generate_cross_store_schedule_v1",
 "auto_generate_schedule_generation",
 "publish_schedule_generation"
]){
 if(rpcNames.includes(forbidden))throw new Error("forbidden C03 RPC "+forbidden+" called: "+JSON.stringify(rpcNames));
}
if(errors.length)throw new Error(errors.join("\n"));

await page.screenshot({path:path.join(OUT,"xstore-four-store-master.png"),fullPage:true});
await browser.close();
console.log("XSTORE_FOUR_STORE_MASTER_BROWSER=PASS");