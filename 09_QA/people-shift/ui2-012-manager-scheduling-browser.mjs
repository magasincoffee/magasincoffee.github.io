import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],screenshots:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)})}};
const attachDiagnostics=page=>{
 page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
 page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
 page.on("requestfailed",r=>report.request_failures.push(r.method()+" "+r.url()+" "+(r.failure()?.errorText||"")));
 page.on("response",r=>{if(r.status()>=500)report.http_errors.push(r.status()+" "+r.url())});
};
async function managerFrame(page){
 const handle=await page.locator("#ui2ManagerScheduling").elementHandle();
 const frame=await handle?.contentFrame();
 if(!frame)throw new Error("UI2_012_MANAGER_FRAME_MISSING");
 await frame.locator(".msd-ui2-012[data-ui2-schedule-board='1']").waitFor({timeout:10000});
 return frame;
}

const browser=await chromium.launch({headless:true});

for(const width of [1280,768,390]){
 const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width,height:900}});
 const page=await context.newPage();attachDiagnostics(page);
 await page.goto(BASE+"/09_QA/people-shift/ui2-012-manager-scheduling-fixture.html",{waitUntil:"networkidle",timeout:20000});
 const frame=await managerFrame(page);

 await frame.locator("#msdStart").click();
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="DRAFT");
 await frame.locator(".msd-source-row").nth(0).locator("[data-add-av]").click();
 await frame.locator(".msd-source-row").nth(1).locator("[data-add-av]").click();
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments.length===2);

 await check("ui2_012_"+width+"_hierarchy_no_page_overflow_touch_focus",async()=>{
  await frame.locator("#msdSave").focus();
  return frame.evaluate(expected=>{
   const html=document.documentElement,root=document.querySelector(".msd-ui2-012"),wrap=root?.querySelector(".msd-board-wrap"),focused=document.activeElement;
   const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return !el.hidden&&s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0};
   const controls=[...root.querySelectorAll("button,select")].filter(visible);
   const metric={
    viewport:innerWidth,expected,
    scrollWidth:html.scrollWidth,clientWidth:html.clientWidth,
    stage:root?.dataset.ui2SchedulingState,
    hierarchy:[".msu2-context-bar",".msu2-stage-rail",".msu2-state-banner",".msd-source",".msd-board-wrap",".msd-downstream"].every(sel=>!!root?.querySelector(sel)),
    touchMin:controls.length?Math.min(...controls.map(x=>x.getBoundingClientRect().height)):0,
    focus:getComputedStyle(focused).outlineStyle,
    boardScroll:wrap?.scrollWidth||0,boardClient:wrap?.clientWidth||0,
    emptyDays:root?.querySelectorAll(".msd-day .msd-empty").length||0
   };
   if(metric.scrollWidth>metric.clientWidth+1||!metric.hierarchy||metric.stage!=="DRAFT"||metric.focus==="none"||metric.emptyDays<5)throw new Error(JSON.stringify(metric));
   if(expected<=768&&metric.touchMin<43.5)throw new Error(JSON.stringify(metric));
   if(expected<=768&&metric.boardScroll<=metric.boardClient)throw new Error("expected contained board scroll: "+JSON.stringify(metric));
   return JSON.stringify(metric);
  },width);
 });

 const outer=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
 await check("ui2_012_"+width+"_outer_fixture_no_overflow",async()=>{
  if(outer.scrollWidth>outer.clientWidth+1)throw new Error(JSON.stringify(outer));
  return JSON.stringify(outer);
 });
 const shot=path.join(OUT,"ui2-012-manager-scheduling-"+width+".png");
 await page.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
 await context.close();
}

const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1280,height:960}});
const page=await context.newPage();attachDiagnostics(page);
await page.goto(BASE+"/09_QA/people-shift/ui2-012-manager-scheduling-fixture.html",{waitUntil:"networkidle",timeout:20000});
const frame=await managerFrame(page);

await check("ui2_012_none_context_and_empty_day_state",async()=>{
 const state=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
 const ui=await frame.locator(".msd-ui2-012").evaluate(r=>({stage:r.dataset.ui2SchedulingState,chip:r.querySelector(".msu2-state-chip")?.textContent,text:r.innerText,emptyDays:r.querySelectorAll(".msd-day .msd-empty").length}));
 if(state.generationStatus!=="NONE"||ui.stage!=="NONE"||ui.chip!=="NONE"||!ui.text.includes("Chưa có phiên xếp lịch")||ui.emptyDays!==7)throw new Error(JSON.stringify({state,ui}));
 return JSON.stringify({stage:ui.stage,emptyDays:ui.emptyDays});
});

await check("ui2_012_busy_locks_controls_during_canonical_start",async()=>{
 await frame.evaluate(()=>globalThis.__MW31_QA.setDelay(120));
 const click=frame.locator("#msdStart").click();
 await frame.locator("#panel-publish[aria-busy='true']").waitFor();
 await frame.waitForFunction(()=>document.querySelector(".msu2-state-chip")?.textContent==="ĐANG ĐỒNG BỘ");
 const during=await frame.evaluate(()=>({busy:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().busy,startDisabled:document.querySelector("#msdStart")?.disabled,saveDisabled:document.querySelector("#msdSave")?.disabled,chip:document.querySelector(".msu2-state-chip")?.textContent}));
 await click;
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="DRAFT"&&!globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().busy);
 await frame.evaluate(()=>globalThis.__MW31_QA.setDelay(0));
 if(!during.busy||!during.startDisabled||!during.saveDisabled||during.chip!=="ĐANG ĐỒNG BỘ")throw new Error(JSON.stringify(during));
 return JSON.stringify(during);
});

await check("ui2_012_assignment_add_edit_remove_save_delegates_to_existing_writer",async()=>{
 await frame.locator(".msd-source-row").nth(0).locator("[data-add-av]").click();
 await frame.locator(".msd-source-row").nth(1).locator("[data-add-av]").click();
 const first=frame.locator("[data-msd-row='0']");
 await first.locator('[data-f="user_id"]').selectOption("u-3");
 await first.locator('[data-f="start_time"]').selectOption("06:30");
 await first.locator('[data-f="end_time"]').selectOption("11:30");
 await frame.locator("#msdSave").click();
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().busy===false&&globalThis.__MW31_QA.calls.some(x=>x.name==="replace_schedule_generation_assignments"));
 const firstSave=await frame.evaluate(()=>{
  const calls=globalThis.__MW31_QA.calls.filter(x=>x.name==="replace_schedule_generation_assignments");
  return calls.at(-1)?.args?.p_assignments||[];
 });
 if(firstSave.length!==2||firstSave[0].user_id!=="u-3"||firstSave[0].start_time!=="06:30"||firstSave[0].end_time!=="11:30")throw new Error(JSON.stringify(firstSave));
 await frame.locator("[data-msd-row='1'] [data-remove]").click();
 await frame.locator("#msdSave").click();
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().busy===false);
 const removed=await frame.evaluate(()=>globalThis.__MW31_QA.state.assignments.length);
 if(removed!==1)throw new Error("removed="+removed);
 await frame.locator(".msd-source-row").filter({hasText:"Nhân viên QA 2"}).locator("[data-add-av]").click();
 await frame.locator("#msdSave").click();
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().busy===false&&globalThis.__MW31_QA.state.assignments.length===2);
 return JSON.stringify({firstSave:firstSave.length,afterRemove:removed,final:2});
});

await check("ui2_012_validation_failure_and_rpc_error_are_explicit",async()=>{
 await frame.evaluate(()=>globalThis.__MW31_QA.setPersonStatus("u-3","INACTIVE"));
 await frame.locator("#msdValidate").click();
 await frame.locator("#msdStatus").filter({hasText:"Nhân viên đã ngừng hoạt động"}).waitFor();
 const invalid=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().lastValidation);
 await frame.evaluate(()=>{globalThis.__MW31_QA.setPersonStatus("u-3","ACTIVE");globalThis.__MW31_QA.setRpcError("validate_schedule_generation_v1","QA_VALIDATE_RPC_ERROR")});
 await frame.locator("#msdValidate").click();
 await frame.locator("#msdStatus").filter({hasText:"Không thể kiểm tra lịch."}).waitFor();
 const errorText=await frame.locator("#msdStatus").innerText();
 if(errorText.includes("QA_VALIDATE_RPC_ERROR"))throw new Error(errorText);
 await frame.evaluate(()=>globalThis.__MW31_QA.setRpcError("validate_schedule_generation_v1",null));
 await frame.locator("#msdValidate").click();
 await frame.locator("#msdStatus").filter({hasText:"Lịch không có xung đột chặn phát hành"}).waitFor();
 if(invalid!=="INVALID")throw new Error("invalid="+invalid);
 return JSON.stringify({invalid,errorText});
});

await check("ui2_012_review_publish_confirmation_official_and_idempotent_retry",async()=>{
 await frame.locator("#msdReview").click();
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="REVIEWED");
 const reviewed=await frame.locator(".msu2-state-chip").innerText();
 let confirmed=false;
 page.once("dialog",async d=>{confirmed=true;await d.accept()});
 await frame.locator("#msdPublish").click();
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="PUBLISHED");
 const before=await frame.evaluate(()=>({inserts:globalThis.__MW31_QA.state.officialInsertCount,transitions:globalThis.__MW31_QA.state.publishTransitions}));
 await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.publish());
 const after=await frame.evaluate(()=>({inserts:globalThis.__MW31_QA.state.officialInsertCount,transitions:globalThis.__MW31_QA.state.publishTransitions,rows:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().officialRows.length}));
 const status=await frame.locator("#msdStatus").innerText();
 const published=await frame.locator(".msu2-state-chip").innerText();
 if(reviewed!=="REVIEWED"||published!=="PUBLISHED"||!confirmed||after.inserts!==before.inserts||after.transitions!==before.transitions||after.rows!==2||!status.includes("đã được phát hành trước đó"))throw new Error(JSON.stringify({reviewed,published,confirmed,before,after,status}));
 return JSON.stringify({reviewed,published,confirmed,before,after});
});

await check("ui2_012_official_schedule_entry_delegates_to_existing_route",async()=>{
 await frame.locator("#msdOfficial").click();
 await frame.locator("#view-schedule.active").waitFor();
 const active=await frame.locator("#view-schedule").getAttribute("class");
 if(!String(active).includes("active"))throw new Error(String(active));
 await frame.locator('[data-view="workforce"]').click();
 await frame.locator("#view-workforce.active").waitFor();
 return "PUBLISHED → existing schedule route";
});

await check("ui2_012_store_and_week_navigation_clear_stale_projection_then_reload",async()=>{
 await frame.locator("#msdStore").selectOption("store-c");
 await frame.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return s.storeId==="store-c"&&!s.busy});
 let state=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
 let text=await frame.locator("#panel-publish").innerText();
 if(state.generationStatus!=="NONE"||state.assignments.length||state.availability.length||state.officialRows.length||!text.includes("Không có availability")||text.includes("Nhân viên QA 1"))throw new Error(JSON.stringify({state,text}));
 await frame.locator("#msdStore").selectOption("store-a");
 await frame.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return s.storeId==="store-a"&&!s.busy&&s.generationStatus==="PUBLISHED"});
 await frame.locator('[data-msd-week="next"]').click();
 await frame.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return s.week==="2026-10-05"&&!s.busy});
 state=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
 if(state.generationStatus!=="NONE"||state.assignments.length||state.officialRows.length)throw new Error(JSON.stringify(state));
 await frame.locator('[data-msd-week="target"]').click();
 await frame.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return s.week==="2026-09-28"&&!s.busy&&s.generationStatus==="PUBLISHED"});
 state=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
 if(state.officialRows.length!==2)throw new Error(JSON.stringify(state));
 return "store-c empty → store-a PUBLISHED → next week NONE → target week PUBLISHED";
});

await check("ui2_012_duplicate_generation_conflict_locks_authoring",async()=>{
 await frame.evaluate(()=>globalThis.__MW31_QA.setCompeting([{id:"gen-compete",status:"DRAFT",store_id:"store-a",week_start:"2026-09-28",algorithm_version:"MANAGER_DIRECT_V1"}]));
 await frame.locator("#msdReload").click();
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="CONFLICT");
 const state=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
 const ui=await frame.locator(".msd-ui2-012").evaluate(r=>({
  chip:r.querySelector(".msu2-state-chip")?.textContent,
  start:r.querySelector("#msdStart")?.disabled,
  save:r.querySelector("#msdSave")?.disabled,
  validate:r.querySelector("#msdValidate")?.disabled,
  text:r.innerText
 }));
 if(state.duplicateDrafts!==1||ui.chip!=="CONFLICT"||!ui.start||!ui.save||!ui.validate||!ui.text.includes("Khóa do nhiều phiên cùng store/week"))throw new Error(JSON.stringify({state,ui}));
 return JSON.stringify({duplicateDrafts:state.duplicateDrafts,chip:ui.chip});
});

await check("ui2_012_no_direct_table_calls_and_clean_diagnostics",async()=>{
 const direct=await frame.evaluate(()=>globalThis.__MW31_QA.calls.filter(x=>x.kind==="from"));
 const relevant=report.request_failures.filter(x=>!x.includes("net::ERR_ABORTED"));
 if(direct.length||report.page_errors.length||report.console_errors.length||relevant.length||report.http_errors.length)throw new Error(JSON.stringify({direct,page_errors:report.page_errors,console_errors:report.console_errors,request_failures:relevant,http_errors:report.http_errors}));
 return "0 direct table / page / console / request / 5xx errors";
});

await context.close();
await browser.close();
fs.writeFileSync(path.join(OUT,"ui2-012-manager-scheduling-report.json"),JSON.stringify(report,null,2));
console.log("UI2_012_MANAGER_SCHEDULING_BROWSER="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=="PASS")process.exitCode=1;
