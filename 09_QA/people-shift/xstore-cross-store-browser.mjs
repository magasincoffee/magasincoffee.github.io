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
for(const token of ["Nhu cầu nhân sự & Xếp tự động","4 khung nhu cầu","Đủ cấu hình 4 CN","Xếp tự động"]){
 if(!autoText.includes(token))throw new Error("missing automation token "+token+" in "+autoText);
}
if(await page.locator("#xsaAuto").isDisabled())throw new Error("auto schedule should be enabled with complete requirements");
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

await page.locator("#xsaAuto").click();
await page.waitForFunction(()=>globalThis.__XSTORE_QA.calls.some(x=>x.name==="auto_generate_cross_store_schedule_v1"));
const postAuto=(await page.locator(".xsa").innerText()).replace(/\s+/g," ");
if(!postAuto.includes("8 ca Robot đã xếp"))throw new Error("auto result not rendered: "+postAuto);
const rpcNames=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.map(x=>x.name));
for(const n of ["get_manager_accessible_stores","get_cross_store_weekly_plan_v1","get_cross_store_weekly_availability_v1","list_cross_store_staffing_requirements_v1","auto_generate_cross_store_schedule_v1"]){
 if(!rpcNames.includes(n))throw new Error("missing RPC "+n);
}
if(rpcNames.includes("auto_generate_schedule_generation"))throw new Error("legacy auto writer must not be called");
if(rpcNames.includes("publish_schedule_generation"))throw new Error("Robot must not publish");
if(errors.length)throw new Error(errors.join("\n"));
await page.screenshot({path:path.join(OUT,"xstore-four-store-master.png"),fullPage:true});
await browser.close();
console.log("XSTORE_FOUR_STORE_MASTER_BROWSER=PASS");
