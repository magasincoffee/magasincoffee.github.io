import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8775";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
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
 if(!frame)throw new Error("XSTORE_018_MANAGER_FRAME_MISSING");
 await frame.locator(".msd-ui2-012[data-ui2-schedule-board='1']").waitFor({timeout:10000});
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT?.getState?.().stores?.length>=1);
 return frame;
}

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1280,height:960}});
const page=await context.newPage();attach(page);
await page.goto(BASE+"/09_QA/people-shift/ui2-012-manager-scheduling-fixture.html",{waitUntil:"networkidle",timeout:20000});
const frame=await managerFrame(page);

await frame.evaluate(async()=>{
 globalThis.__MW31_QA.setCrossStorePlan([
  {
   plan_source:"DRAFT",generation_id:"gen-other-a",generation_status:"DRAFT",assignment_id:"other-a",
   store_id:"store-c",store_code:"CN-QA-C",store_name:"Cửa hàng QA C",
   user_id:"u-2",employee_name:"Nhân viên QA 2",work_date:"2026-09-28",start_time:"08:00",end_time:"12:00",row_status:"DRAFT"
  },
  {
   plan_source:"DRAFT",generation_id:"gen-other-b",generation_status:"DRAFT",assignment_id:"other-b",
   store_id:"store-c",store_code:"CN-QA-C",store_name:"Cửa hàng QA C",
   user_id:"u-3",employee_name:"Nhân viên QA 3",work_date:"2026-09-29",start_time:"17:00",end_time:"18:00",row_status:"DRAFT"
  }
 ]);
 globalThis.__MW31_QA.setStaffingRequirements([{
  requirement_id:"req-x18-1",
  store_id:"store-a",
  store_code:"CN-QA-A",
  day_of_week:1,
  start_time:"06:00",
  end_time:"12:00",
  target_headcount:1
 }]);
 await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.openDirect({storeId:"store-a",week:"2026-09-28"});
});

await frame.locator("#msdStart").click();
await frame.waitForFunction(()=>{
 const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
 return s.generationStatus==="DRAFT"&&s.shortages.length===1&&s.weeklyPlan.length===2;
});
await frame.locator('[data-msd-date="2026-09-28"] [data-msd-supplement]').click();

await check("xstore_018_shows_three_actionable_groups_without_reference_wording",async()=>{
 const labels=await frame.locator("[data-msd-pool-group] h3").allTextContents();
 const pageText=await frame.locator(".msd-source").innerText();
 for(const expected of ["Chưa được xếp ca nào","Còn thời gian có thể xếp","Có thể điều động thủ công"]){
  if(!labels.some(x=>x.includes(expected)))throw new Error(JSON.stringify(labels));
 }
 if(pageText.includes("Nguồn tham khảo"))throw new Error(pageText);
 return JSON.stringify(labels);
});

await check("xstore_018_exact_shortage_ranking_marks_manual_and_blocks_cross_store_overlap",async()=>{
 const unassigned=frame.locator('[data-msd-pool-group="unassigned"] [data-msd-pool-candidate="u-1"]');
 const manual=frame.locator('[data-msd-pool-group="manual"] [data-msd-pool-candidate="u-3"]');
 const blocked=frame.locator('[data-msd-pool-group="blocked"] [data-msd-pool-candidate="u-2"]');
 await unassigned.waitFor();await manual.waitFor();await blocked.waitFor();
 const u1=(await unassigned.innerText()).replace(/\s+/g," ");
 const u3=(await manual.innerText()).replace(/\s+/g," ");
 const u2=(await blocked.innerText()).replace(/\s+/g," ");
 if(!u1.includes("Trong thời gian còn trống"))throw new Error("u1 "+u1);
 if(!u3.includes("Điều động thủ công"))throw new Error("u3 "+u3);
 if(!u2.includes("Trùng lịch nháp")||!u2.includes("CN-QA-C"))throw new Error("u2 "+u2);
 const disabled=await blocked.locator("button").isDisabled();
 if(!disabled)throw new Error("cross-store conflict candidate must be disabled");
 return JSON.stringify({u1,u3,u2});
});

await frame.locator('[data-msd-pool-group="unassigned"] [data-msd-pool-user="u-1"]').click();
await frame.waitForFunction(()=>{
 const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
 return s.dirty===true&&s.assignments.length===1&&s.shortages.length===0;
});

await frame.locator('[data-msd-row="0"] [data-f="end_time"]').selectOption("08:00");
await frame.waitForFunction(()=>{
 const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
 return s.shortages.length===1&&s.shortages[0].shortage_start==="08:00"&&s.shortages[0].shortage_end==="12:00";
});
await frame.locator('[data-msd-date="2026-09-28"] [data-msd-supplement]').click();

await check("xstore_018_moves_already_assigned_employee_to_remaining_availability_group",async()=>{
 const unassignedCount=await frame.locator('[data-msd-pool-group="unassigned"] [data-msd-pool-candidate="u-1"]').count();
 if(unassignedCount!==0)throw new Error("u-1 mislabeled as unassigned");
 const remaining=frame.locator('[data-msd-pool-group="remaining"] [data-msd-pool-candidate="u-1"]');
 await remaining.waitFor();
 const text=(await remaining.innerText()).replace(/\s+/g," ");
 if(!text.includes("08:00–12:00")||!text.includes("1 ca đã xếp"))throw new Error(text);
 return text;
});

await frame.locator('[data-msd-pool-group="remaining"] [data-msd-pool-user="u-1"]').click();
await frame.waitForFunction(()=>{
 const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
 return s.assignments.length===2&&s.shortages.length===0&&s.dirty===true;
});
await frame.locator("#msdSave").click();
await frame.waitForFunction(()=>{
 const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
 return s.dirty===false&&s.shortages.length===0&&s.assignments.length===2;
});

await check("xstore_018_keeps_canonical_writer_and_refreshes_global_plan_after_save",async()=>{
 const result=await frame.evaluate(()=>({
  calls:globalThis.__MW31_QA.calls.filter(x=>x.kind==="rpc").map(x=>x.name),
  state:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState()
 }));
 const replace=result.calls.lastIndexOf("replace_schedule_generation_assignments");
 const globalPlan=result.calls.lastIndexOf("get_cross_store_weekly_plan_v1");
 if(replace<0||globalPlan<replace)throw new Error(JSON.stringify(result.calls.slice(-15)));
 const own=result.state.weeklyPlan.filter(x=>x.generation_id===result.state.generationId&&x.plan_source==="DRAFT");
 if(own.length!==2)throw new Error(JSON.stringify(own));
 return JSON.stringify({tail:result.calls.slice(-10),own:own.length});
});

await page.setViewportSize({width:390,height:844});
await check("xstore_018_mobile_pool_has_no_page_overflow",async()=>{
 return frame.evaluate(()=>{
  const metric={scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};
  if(metric.scrollWidth>metric.clientWidth+2)throw new Error(JSON.stringify(metric));
  return JSON.stringify(metric);
 });
});

await page.screenshot({path:path.join(OUT,"xstore-018-supplemental-pool.png"),fullPage:true});
await context.close();
await browser.close();

for(const [name,list] of Object.entries({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures,http_errors:report.http_errors})){
 if(list.length){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:JSON.stringify(list)})}
}
fs.writeFileSync(path.join(OUT,"xstore-018-supplemental-pool-report.json"),JSON.stringify(report,null,2));
console.log("XSTORE_018_SUPPLEMENTAL_POOL_BROWSER="+report.status);
for(const item of report.checks)console.log("["+item.status+"] "+item.name+(item.detail?" — "+item.detail:""));
if(report.status!=="PASS")process.exitCode=1;
