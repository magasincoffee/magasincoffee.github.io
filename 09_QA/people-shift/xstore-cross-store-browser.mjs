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
await page.evaluate(()=>{
 localStorage.removeItem("xstore-c05-recurring-requirements");
 localStorage.removeItem("xstore-c05-priority-e3");
});
await page.reload({waitUntil:"networkidle"});

await page.locator(".xsm").waitFor();
if(await page.locator(".xsm-store").count()!==4)throw new Error("expected 4 stores");

const auto=page.locator(".xsa");
await auto.waitFor();
let autoText=(await auto.innerText()).replace(/\s+/g," ");
for(const token of ["Lập lịch tuần","Thiết lập xếp lịch","1. Chuẩn bị","2. Tạo lịch nháp","3. Chỉnh lịch","4. Kiểm tra","5. Duyệt & phát hành","Việc cần làm tiếp theo","Hoàn thiện ưu tiên cửa hàng","5 khung cố định","4/4 CN đã cấu hình"]){
 if(!autoText.includes(token))throw new Error("missing "+token+" in "+autoText);
}
for(const forbidden of ["Nhu cầu nhân sự recurring","Auto Schedule","Tạo DRAFT","Store Priority","Robot"]){
 if(autoText.includes(forbidden))throw new Error("technical copy leaked: "+forbidden+" in "+autoText);
}
if((await auto.getAttribute("data-xsa-active-surface"))!=="week")throw new Error("weekly operation must be the default surface");
if(await page.locator(".xsa-board").count())throw new Error("recurring board must not be forced into the default weekly surface");
const blockedAction=page.locator('#xsaNextAction[data-xsa-next-action="setup-priority"]');
await blockedAction.waitFor();
const beforePriorityRpc=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.filter(x=>x.name==="auto_generate_cross_store_schedule_v1").length);
if(beforePriorityRpc!==0)throw new Error("Auto Schedule ran before Store Priority prerequisites were complete");
await page.evaluate(async()=>{
 const row=globalThis.__XSTORE_QA.availability.find(x=>x.user_id==="e3");
 row.priority_store_ids=["s1"];row.priority_store_codes=["CN1"];
 localStorage.setItem("xstore-c05-priority-e3","1");
 await globalThis.MAGASIN_CROSS_STORE_MASTER.refresh();
});
await page.waitForFunction(()=>document.querySelector('#xsaNextAction')?.dataset.xsaNextAction==="auto");
autoText=(await auto.innerText()).replace(/\s+/g," ");
if(!autoText.includes("Tạo lịch nháp tự động"))throw new Error(autoText);
await page.locator("#xsaSetupOpen").click();
await page.waitForFunction(()=>document.querySelector('.xsa')?.dataset.xsaActiveSurface==="setup");
const setupText=(await auto.innerText()).replace(/\s+/g," ");
for(const token of ["Thiết lập xếp lịch","Ưu tiên cửa hàng","Nhu cầu nhân sự cố định hàng tuần","Mở ưu tiên cửa hàng","Chỉnh nhu cầu hàng tuần"]){
 if(!setupText.includes(token))throw new Error("missing setup token "+token+" in "+setupText);
}
if(await page.locator(".xsa-board tbody tr").count()!==4)throw new Error("recurring board must expose 4 stores inside setup");

const cell=page.locator('[data-xsa-cell="s1-1"]');
await cell.locator(".xsa-cell-open").click();
const editor=page.locator(".xsa-editor-panel");
await editor.waitFor();
await page.waitForFunction(()=>{
 const el=document.querySelector('.xsa-editor-panel [data-xsa-f="start_time"]');
 return el?.tagName==="SELECT" && el.dataset.magasinTimePicker==="1";
});
const editorText=(await editor.innerText()).replace(/\s+/g," ");
for(const label of ["Bắt đầu","Kết thúc","Số người","Xóa khung","+ Thêm khung","Hủy thay đổi","Lưu nhu cầu hàng tuần"]){
 if(!editorText.includes(label))throw new Error("missing editor label "+label+" in "+editorText);
}
const editorBox=await editor.boundingBox();
if(!editorBox||editorBox.width<340)throw new Error("desktop editor is not a wide dedicated panel: "+JSON.stringify(editorBox));

const starts=editor.locator('[data-xsa-f="start_time"]');
const ends=editor.locator('[data-xsa-f="end_time"]');
const heads=editor.locator('[data-xsa-f="target_headcount"]');
const firstBlock=editor.locator('.xsa-editor-block').first();
if(!(await firstBlock.getAttribute('class')).includes('xsa-band-morning'))throw new Error("06:00 block should be yellow/morning");
await starts.first().selectOption("12:00");
if(!(await firstBlock.getAttribute('class')).includes('xsa-band-afternoon'))throw new Error("12:00 block should be red/afternoon");
await starts.first().selectOption("17:00");
if(!(await firstBlock.getAttribute('class')).includes('xsa-band-evening'))throw new Error("17:00 block should be light-blue/evening");
await starts.first().selectOption("07:00");
await ends.first().selectOption("12:00");
await heads.first().fill("3");

await editor.locator("#xsaAddBlock").click();
await page.waitForFunction(()=>document.querySelectorAll('.xsa-editor-panel .xsa-editor-block').length===2);
await page.waitForFunction(()=>{
 const els=[...document.querySelectorAll('.xsa-editor-panel [data-xsa-f="start_time"]')];
 return els.length===2 && els.every(x=>x.tagName==="SELECT");
});

if(await starts.first().inputValue()!=="07:00")throw new Error("existing start time reset after add block");
if(await ends.first().inputValue()!=="12:00")throw new Error("existing end time reset after add block");
if(await heads.first().inputValue()!=="3")throw new Error("existing headcount reset after add block");
if(await starts.nth(1).inputValue()!=="")throw new Error("new block start must be empty, not a default time");
if(await ends.nth(1).inputValue()!=="")throw new Error("new block end must be empty, not a default time");
const newStartLabel=await starts.nth(1).locator("option:checked").innerText();
if(newStartLabel!=="Chọn giờ")throw new Error("new block should prompt Chọn giờ: "+newStartLabel);

await editor.locator("[data-xsa-remove]").nth(1).click();
await page.waitForFunction(()=>document.querySelectorAll('.xsa-editor-panel .xsa-editor-block').length===1);
await page.waitForFunction(()=>document.querySelector('.xsa-editor-panel [data-xsa-f="start_time"]')?.tagName==="SELECT");
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

await page.locator("#xsaWeekOpen").click();
await page.waitForFunction(()=>document.querySelector('.xsa')?.dataset.xsaActiveSurface==="week");
if(await page.locator(".xsa-board").count())throw new Error("recurring board leaked back into weekly operation");
await page.locator('#xsaNextAction[data-xsa-next-action="auto"]').click();
await page.waitForFunction(()=>globalThis.__XSTORE_QA.calls.some(x=>x.name==="auto_generate_cross_store_schedule_v1"));
let autoCall=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.filter(x=>x.name==="auto_generate_cross_store_schedule_v1").at(-1));
if(autoCall?.args?.p_week_start!=="2026-10-05")throw new Error(JSON.stringify(autoCall));
if(autoCall?.args?.p_algorithm_version!=="XSTORE_GLOBAL_RECURRING_V1")throw new Error(JSON.stringify(autoCall));
if(autoCall?.args?.p_replace_existing!==false)throw new Error(JSON.stringify(autoCall));

await page.reload({waitUntil:"networkidle"});
await page.locator(".xsa").waitFor();
if((await page.locator(".xsa").getAttribute("data-xsa-active-surface"))!=="week")throw new Error("reload must return to weekly operation");
if(await page.locator(".xsa-board").count())throw new Error("reload exposed recurring setup by default");
await page.locator('[data-xsa-nav="setup"]').click();
const reloadedCell=(await page.locator('[data-xsa-cell="s1-1"]').innerText()).replace(/\s+/g," ");
if(!reloadedCell.includes("07:00–12:00 · 3 người"))throw new Error("recurring edit did not survive reload: "+reloadedCell);

await page.goto(FIXTURE+"?week=2026-10-12",{waitUntil:"networkidle"});
await page.locator(".xsa").waitFor();
if(await page.locator(".xsa-board").count())throw new Error("next week should also open on weekly operation");
await page.locator('[data-xsa-nav="setup"]').click();
const nextWeekCell=(await page.locator('[data-xsa-cell="s1-1"]').innerText()).replace(/\s+/g," ");
if(!nextWeekCell.includes("07:00–12:00 · 3 người"))throw new Error("recurring config not reused in next week: "+nextWeekCell);
await page.locator("#xsaWeekOpen").click();
await page.locator('#xsaNextAction[data-xsa-next-action="auto"]').click();
await page.waitForFunction(()=>globalThis.__XSTORE_QA.calls.some(x=>x.name==="auto_generate_cross_store_schedule_v1"));
autoCall=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.filter(x=>x.name==="auto_generate_cross_store_schedule_v1").at(-1));
if(autoCall?.args?.p_week_start!=="2026-10-12")throw new Error("next-week projection mismatch: "+JSON.stringify(autoCall));
if(autoCall?.args?.p_algorithm_version!=="XSTORE_GLOBAL_RECURRING_V1")throw new Error(JSON.stringify(autoCall));

autoText=(await page.locator(".xsa").innerText()).replace(/\s+/g," ");
if(!autoText.includes("áp dụng nhu cầu hàng tuần vào tuần đang chọn và tạo lịch nháp"))throw new Error(autoText);

const rpcNamesBeforeResponsive=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.map(x=>x.name));
for(const width of [1440,1024,768,430,390,360]){
 await page.setViewportSize({width,height:width<=430?844:1000});
 await page.goto(FIXTURE+"?week=2026-10-12",{waitUntil:"networkidle"});
 await page.locator(".xsa").waitFor();
 await page.locator('[data-xsa-nav="setup"]').click();
 await page.waitForFunction(()=>document.querySelector('.xsa')?.dataset.xsaActiveSurface==="setup");
 const metric=await page.evaluate(expected=>{
  const html=document.documentElement,wrap=document.querySelector(".xsa-board-wrap"),board=document.querySelector(".xsa-board");
  const row=board?.querySelector("tbody tr"),head=board?.querySelector("thead"),cell=document.querySelector('[data-xsa-cell="s1-1"] .xsa-cell-open');
  const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return !el.disabled&&!el.hidden&&s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0};
  const controls=[...document.querySelectorAll(".xsa button,.xsa input,.xsa select")].filter(visible);
  return {
   expected,scrollWidth:html.scrollWidth,clientWidth:html.clientWidth,
   boardScroll:wrap?.scrollWidth||0,boardClient:wrap?.clientWidth||0,
   boardDisplay:board?getComputedStyle(board).display:"",
   rowDisplay:row?getComputedStyle(row).display:"",
   headDisplay:head?getComputedStyle(head).display:"",
   cellHeight:cell?.getBoundingClientRect().height||0,
   cellLabel:cell?.getAttribute("data-xsa-day-label")||"",
   clippedTimeBlocks:[...document.querySelectorAll(".xsa-block")].filter(el=>{
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return r.width>0&&r.height>0&&s.visibility!=="hidden"&&s.display!=="none"&&(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1);
   }).map(el=>el.textContent.trim()),
   touchMin:controls.length?Math.min(...controls.map(x=>x.getBoundingClientRect().height)):0
  };
 },width);
 if(metric.scrollWidth>metric.clientWidth+1)throw new Error("recurring setup page overflow: "+JSON.stringify(metric));
 if(metric.clippedTimeBlocks.length)throw new Error("recurring time text clipped: "+JSON.stringify(metric));
 if(width<=1024&&metric.touchMin<43.5)throw new Error("recurring setup touch target: "+JSON.stringify(metric));
 if(width<=430&&(metric.boardDisplay!=="block"||metric.rowDisplay!=="grid"||metric.headDisplay!=="none"||metric.boardScroll>metric.boardClient+1||metric.cellHeight<63.5||!metric.cellLabel.includes("Thứ 2")))throw new Error("phone recurring cards: "+JSON.stringify(metric));
 if((width===768||width===1024)&&metric.boardScroll<=metric.boardClient)throw new Error("tablet recurring board should scroll internally: "+JSON.stringify(metric));
 if(width===1440&&metric.boardScroll>metric.boardClient+1)throw new Error("desktop recurring board should fit: "+JSON.stringify(metric));
}

await page.setViewportSize({width:390,height:844});
await page.goto(FIXTURE+"?week=2026-10-12",{waitUntil:"networkidle"});
await page.locator(".xsa").waitFor();
await page.locator('[data-xsa-nav="setup"]').click();
await page.locator('[data-xsa-cell="s1-1"] .xsa-cell-open').click();
const mobileEditor=page.locator(".xsa-editor-panel");
await mobileEditor.waitFor();
const mobileState=await mobileEditor.evaluate(el=>{
 const r=el.getBoundingClientRect(),actions=[...el.querySelectorAll("button")].filter(x=>getComputedStyle(x).display!=="none");
 return {position:getComputedStyle(el).position,width:r.width,viewport:innerWidth,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,minAction:actions.length?Math.min(...actions.map(x=>x.getBoundingClientRect().height)):0};
});
if(mobileState.position==="fixed"||mobileState.position==="sticky"||mobileState.width>mobileState.viewport+1||mobileState.scroll>mobileState.client+1||mobileState.minAction<43.5)throw new Error("mobile recurring editor must be inline and unobstructed: "+JSON.stringify(mobileState));
await mobileEditor.locator("#xsaCancel").click();
await page.waitForFunction(()=>!document.querySelector(".xsa-editor-panel"));

const rpcNamesAfterResponsive=await page.evaluate(()=>globalThis.__XSTORE_QA.calls.map(x=>x.name));
const rpcNames=[...new Set([...rpcNamesBeforeResponsive,...rpcNamesAfterResponsive])];
for(const n of ["get_manager_accessible_stores","get_cross_store_weekly_plan_v1","get_cross_store_weekly_availability_v1","list_workforce_recurring_staffing_requirements_v1","auto_generate_cross_store_schedule_v1"]){
 if(!rpcNames.includes(n))throw new Error("missing RPC "+n);
}
for(const forbidden of ["list_cross_store_staffing_requirements_v1","replace_cross_store_staffing_requirements_v1","auto_generate_schedule_generation","publish_schedule_generation"]){
 if(rpcNames.includes(forbidden))throw new Error("forbidden RPC "+forbidden);
}

if(errors.length)throw new Error(errors.join("\n"));

await page.screenshot({path:path.join(OUT,"xstore-recurring-stable-editor.png"),fullPage:true});
await browser.close();
console.log("SCHED_UI_013_RECURRING_EDITOR_REGRESSION=PASS");
console.log("SCHED_UI_011_RECURRING_RESPONSIVE=PASS");
console.log("XSTORE_RECURRING_STABLE_EDITOR_BROWSER=PASS");