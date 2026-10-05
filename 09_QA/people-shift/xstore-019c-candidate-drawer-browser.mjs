import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8781";
const OUT=process.env.QA_OUT||"qa-artifacts/xstore-019c";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)});throw e}};
const attach=page=>{
 page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
 page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
 page.on("requestfailed",r=>report.request_failures.push(r.method()+" "+r.url()+" "+(r.failure()?.errorText||"")));
 page.on("response",r=>{if(r.status()>=500)report.http_errors.push(r.status()+" "+r.url())});
};
async function managerFrame(page){
 const handle=await page.locator("#ui2ManagerScheduling").elementHandle();
 const frame=await handle?.contentFrame();
 if(!frame)throw new Error("XSTORE_019C_MANAGER_FRAME_MISSING");
 await frame.locator(".msd-ui2-012[data-ui2-schedule-board='1']").waitFor({timeout:10000});
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT?.getState?.().stores?.length>=1);
 return frame;
}

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1280,height:900}});
const page=await context.newPage();attach(page);
await page.goto(BASE+"/09_QA/people-shift/ui2-012-manager-scheduling-fixture.html",{waitUntil:"networkidle",timeout:20000});
const frame=await managerFrame(page);

await frame.evaluate(async()=>{
 globalThis.__MW31_QA.setCrossStorePlan([
  {plan_source:"DRAFT",generation_id:"gen-other-a",generation_status:"DRAFT",assignment_id:"other-a",store_id:"store-c",store_code:"CN-QA-C",store_name:"Cửa hàng QA C",user_id:"u-2",employee_name:"Nhân viên QA 2",work_date:"2026-09-28",start_time:"08:00",end_time:"12:00",row_status:"DRAFT"},
  {plan_source:"DRAFT",generation_id:"gen-other-b",generation_status:"DRAFT",assignment_id:"other-b",store_id:"store-c",store_code:"CN-QA-C",store_name:"Cửa hàng QA C",user_id:"u-3",employee_name:"Nhân viên QA 3",work_date:"2026-09-29",start_time:"17:00",end_time:"18:00",row_status:"DRAFT"}
 ]);
 globalThis.__MW31_QA.setStaffingRequirements([{requirement_id:"req-x19c-1",store_id:"store-a",store_code:"CN-QA-A",day_of_week:1,start_time:"06:00",end_time:"12:00",target_headcount:1}]);
 await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.openDirect({storeId:"store-a",week:"2026-09-28"});
});
await frame.locator("#msdStart").click();
await frame.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return s.generationStatus==="DRAFT"&&s.shortages.length===1});

await check("xstore_019c_primary_calendar_has_no_persistent_candidate_pool",async()=>{
 const metric=await frame.evaluate(()=>{
  const wrap=document.querySelector(".msd-board-wrap");
  return {drawer:document.querySelectorAll("[data-msd-candidate-overlay]").length,pool:document.querySelectorAll("[data-msd-pool-candidate]").length,clientWidth:wrap?.clientWidth||0,scrollTop:wrap?.scrollTop||0};
 });
 if(metric.drawer!==0||metric.pool!==0)throw new Error(JSON.stringify(metric));
 return JSON.stringify(metric);
});

await frame.evaluate(()=>{
 const w=document.querySelector(".msd-board-wrap");
 const action=document.querySelector('[data-msd-date="2026-09-28"] [data-msd-supplement]');
 if(w&&action){
   action.scrollIntoView({block:"center",inline:"nearest"});
   w.scrollTop=Math.max(0,w.scrollTop-24);
   w.scrollLeft=Math.min(140,Math.max(0,w.scrollWidth-w.clientWidth));
 }
});
const before=await frame.evaluate(()=>{const w=document.querySelector(".msd-board-wrap");const a=document.querySelector('[data-msd-date="2026-09-28"] [data-msd-supplement]')?.getBoundingClientRect();const r=w?.getBoundingClientRect();return {left:w.scrollLeft,top:w.scrollTop,width:w.clientWidth,actionVisible:!!(a&&r&&a.top>=r.top&&a.bottom<=r.bottom)}});
if(!before.actionVisible)throw new Error("XSTORE_019C_SHORTAGE_ACTION_NOT_VISIBLE_BEFORE_OPEN "+JSON.stringify(before));
await frame.locator('[data-msd-date="2026-09-28"] [data-msd-supplement]').click();
await frame.locator("[data-msd-candidate-overlay]").waitFor();

await check("xstore_019c_shortage_opens_exact_scoped_ranked_drawer",async()=>{
 const target=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().supplementTarget);
 const text=(await frame.locator(".msd-source").innerText()).replace(/\s+/g," ");
 const manual=frame.locator('[data-msd-pool-group="manual"] [data-msd-pool-candidate="u-3"]');
 const blocked=frame.locator('[data-msd-pool-group="blocked"] [data-msd-pool-candidate="u-2"]');
 await manual.waitFor();await blocked.waitFor();
 if(target?.work_date!=="2026-09-28"||target?.shortage_start!=="06:00"||target?.shortage_end!=="12:00")throw new Error(JSON.stringify(target));
 if(!text.includes("06:00–12:00")||!text.includes("Chưa được xếp ca nào")||!text.includes("Còn thời gian có thể xếp")||!text.includes("Có thể điều động thủ công"))throw new Error(text);
 if(!await blocked.locator("button").isDisabled())throw new Error("hard conflict candidate must stay disabled");
 return JSON.stringify({target,manual:(await manual.innerText()).replace(/\s+/g," "),blocked:(await blocked.innerText()).replace(/\s+/g," ")});
});

await frame.locator("[data-msd-candidate-close]").click();
await frame.waitForFunction(()=>!globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().candidateDrawerOpen);
await check("xstore_019c_close_restores_calendar_context_and_full_width",async()=>{
 const after=await frame.evaluate(()=>{const w=document.querySelector(".msd-board-wrap");return {left:w.scrollLeft,top:w.scrollTop,width:w.clientWidth,drawer:document.querySelectorAll("[data-msd-candidate-overlay]").length}});
 if(after.drawer!==0||after.width!==before.width||Math.abs(after.left-before.left)>2||Math.abs(after.top-before.top)>2)throw new Error(JSON.stringify({before,after}));
 const snapshot=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().calendarViewport);
 if(Math.abs(snapshot.left-before.left)>2||Math.abs(snapshot.top-before.top)>2)throw new Error("drawer snapshot drift "+JSON.stringify({before,snapshot}));
 return JSON.stringify({before,after});
});

await frame.locator('[data-msd-date="2026-09-28"] [data-msd-supplement]').click();
const manualCandidate=frame.locator('[data-msd-pool-group="manual"] [data-msd-pool-user="u-3"]');
await manualCandidate.waitFor();
await manualCandidate.click();
await frame.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return !s.candidateDrawerOpen&&s.assignments.length===1&&s.shortages.length===0});
await check("xstore_019c_manual_outside_availability_keeps_audit_marker_and_repairs_shortage",async()=>{
 const s=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
 const a=s.assignments[0];
 if(a.user_id!=="u-3"||a.warning!=="MANAGER_AVAILABILITY_OVERRIDE"||!String(a.note||"").includes("MANAGER_AVAILABILITY_OVERRIDE"))throw new Error(JSON.stringify(a));
 if(s.shortages.length!==0)throw new Error(JSON.stringify(s.shortages));
 return JSON.stringify({user:a.user_id,warning:a.warning,shortages:s.shortages.length});
});

await frame.locator('[data-msd-row="0"] .msd-direct-actions [data-msd-remove-direct="0"]').click();
await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().shortages.length===1);
await frame.locator('[data-msd-date="2026-09-28"] [data-msd-supplement]').click();
await frame.locator('[data-msd-pool-group="unassigned"] [data-msd-pool-user="u-1"]').click();
await frame.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return !s.candidateDrawerOpen&&s.assignments.length===1&&s.shortages.length===0});
await frame.locator("#msdSave").click();
await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().dirty===false);
await check("xstore_019c_selection_updates_draft_and_persists_through_canonical_writer",async()=>{
 const r=await frame.evaluate(()=>({state:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState(),calls:globalThis.__MW31_QA.calls.filter(x=>x.kind==="rpc").map(x=>x.name)}));
 if(r.state.assignments[0]?.user_id!=="u-1"||r.state.assignments[0]?.warning)throw new Error(JSON.stringify(r.state.assignments[0]));
 if(r.calls.lastIndexOf("replace_schedule_generation_assignments")<0)throw new Error(JSON.stringify(r.calls.slice(-12)));
 return JSON.stringify({assignment:r.state.assignments[0],tail:r.calls.slice(-8)});
});

await page.setViewportSize({width:390,height:844});
await frame.locator("#msdOpenCandidateDrawer").click();
await frame.locator("[data-msd-candidate-overlay]").waitFor();
await check("xstore_019c_mobile_drawer_is_on_demand_and_has_no_page_overflow",async()=>{
 const metric=await frame.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,drawerWidth:document.querySelector(".msd-people-secondary")?.getBoundingClientRect().width||0}));
 if(metric.scrollWidth>metric.clientWidth+2||metric.drawerWidth>metric.clientWidth+2)throw new Error(JSON.stringify(metric));
 return JSON.stringify(metric);
});
await frame.locator("[data-msd-candidate-close]").click();

await page.screenshot({path:path.join(OUT,"xstore-019c-candidate-drawer.png"),fullPage:true});
await context.close();await browser.close();
for(const [name,list] of Object.entries({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures,http_errors:report.http_errors})){
 if(list.length){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:JSON.stringify(list)})}
}
fs.writeFileSync(path.join(OUT,"xstore-019c-candidate-drawer-report.json"),JSON.stringify(report,null,2));
console.log("XSTORE_019C_CANDIDATE_DRAWER_BROWSER="+report.status);
for(const item of report.checks)console.log("["+item.status+"] "+item.name+(item.detail?" — "+item.detail:""));
if(report.status!=="PASS")process.exitCode=1;
