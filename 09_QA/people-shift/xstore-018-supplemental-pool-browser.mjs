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
 globalThis.__MW31_QA.setStaffingRequirements([{requirement_id:"req-x18-1",store_id:"store-a",store_code:"CN-QA-A",day_of_week:1,start_time:"06:00",end_time:"12:00",target_headcount:1}]);
 await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.openDirect({storeId:"store-a",week:"2026-09-28"});
});
await frame.locator("#msdStart").click();
await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="DRAFT"&&globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().shortages.length===1);
await frame.locator('[data-msd-date="2026-09-28"] [data-msd-supplement]').click();

await check("xstore_018_exact_shortage_filters_three_actionable_groups",async()=>{
 const groups=await frame.evaluate(()=>({
  pool:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getSupplementalPool(),
  text:document.querySelector("#msdSupplementalPool")?.innerText||"",
  all:document.querySelector("#panel-publish")?.innerText||""
 }));
 if(!groups.text.includes("Chưa được xếp ca nào")||!groups.text.includes("Còn thời gian có thể xếp")||!groups.text.includes("Có thể điều động thủ công"))throw new Error(groups.text);
 if(groups.all.includes("Nguồn tham khảo"))throw new Error("legacy wording still visible");
 if(groups.pool.unassigned.map(x=>x.user_id).join(",")!=="u-1")throw new Error(JSON.stringify(groups.pool));
 if(!groups.pool.manual.some(x=>x.user_id==="u-2")||!groups.pool.manual.some(x=>x.user_id==="u-3"))throw new Error(JSON.stringify(groups.pool));
 return JSON.stringify(groups.pool);
});

await frame.locator(".msd-pool-details").evaluate(el=>{el.open=true});
await frame.locator('.msd-pool-details [data-add-av="0"]').click();
await frame.locator('[data-msd-row="0"] [data-f="end_time"]').selectOption("08:00");
await frame.locator("#msdSave").click();
await frame.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return s.dirty===false&&s.shortages.length===1&&s.shortages[0].shortage_start==="08:00"});
await frame.locator('[data-msd-date="2026-09-28"] [data-msd-supplement]').click();

await check("xstore_018_assigned_employee_moves_to_remaining_availability_group",async()=>{
 const pool=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getSupplementalPool());
 if(pool.unassigned.some(x=>x.user_id==="u-1"))throw new Error("assigned employee mislabeled unassigned");
 const row=pool.remaining.find(x=>x.user_id==="u-1");
 if(!row||!row.remaining.some(x=>x.work_date==="2026-09-28"&&x.start_time==="08:00"&&x.end_time==="12:00"))throw new Error(JSON.stringify(pool));
 return JSON.stringify(row);
});

await frame.evaluate(async()=>{
 globalThis.__MW31_QA.setStaffingRequirements([{requirement_id:"req-x18-1",store_id:"store-a",store_code:"CN-QA-A",day_of_week:1,start_time:"06:00",end_time:"12:00",target_headcount:2}]);
 await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.refresh();
});
await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().shortages.length===2);
await frame.locator('[data-msd-date="2026-09-28"] [data-msd-supplement]').first().click();

await check("xstore_018_known_draft_overlap_is_not_selectable_for_target",async()=>{
 const result=await frame.evaluate(()=>({
  pool:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getSupplementalPool(),
  options:[...document.querySelectorAll("#msdManualEmployee option")].map(x=>x.value)
 }));
 if(!result.pool.blocked.some(x=>x.user_id==="u-1"))throw new Error(JSON.stringify(result));
 if(result.options.includes("u-1"))throw new Error("hard-conflict candidate remained selectable");
 return JSON.stringify(result);
});

await frame.evaluate(async()=>{
 globalThis.__MW31_QA.setStaffingRequirements([{requirement_id:"req-x18-1",store_id:"store-a",store_code:"CN-QA-A",day_of_week:1,start_time:"06:00",end_time:"12:00",target_headcount:1}]);
 await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.refresh();
});
await frame.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return s.shortages.length===1&&s.shortages[0].shortage_start==="08:00"});
await frame.locator('[data-msd-date="2026-09-28"] [data-msd-supplement]').click();
await frame.locator('[data-msd-pool-user="u-1"]').click();

await check("xstore_018_pool_action_prefills_canonical_picker_for_exact_gap",async()=>{
 const v=await frame.evaluate(()=>({user:document.querySelector("#msdManualEmployee")?.value,date:document.querySelector("#msdManualDate")?.value,start:document.querySelector("#msdManualStart")?.value,end:document.querySelector("#msdManualEnd")?.value}));
 if(v.user!=="u-1"||v.date!=="2026-09-28"||v.start!=="08:00"||v.end!=="12:00")throw new Error(JSON.stringify(v));
 return JSON.stringify(v);
});
await frame.locator("#msdManualAdd").click();
await frame.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return s.dirty===true&&s.shortages.length===0});

await check("xstore_018_exact_gap_resolution_removes_shortage_without_manual_override",async()=>{
 const s=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
 const added=s.assignments.find(x=>x.user_id==="u-1"&&x.start_time==="08:00");
 if(!added||added.warning==="MANAGER_AVAILABILITY_OVERRIDE")throw new Error(JSON.stringify(s.assignments));
 return JSON.stringify(added);
});

await page.setViewportSize({width:390,height:844});
await check("xstore_018_mobile_has_no_page_overflow",async()=>frame.evaluate(()=>{
 const metric={scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};
 if(metric.scrollWidth>metric.clientWidth+2)throw new Error(JSON.stringify(metric));
 return JSON.stringify(metric);
}));

await page.screenshot({path:path.join(OUT,"xstore-018-supplemental-pool.png"),fullPage:true});
await context.close();await browser.close();
for(const [name,list] of Object.entries({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures,http_errors:report.http_errors})){
 if(list.length){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:JSON.stringify(list)})}
}
fs.writeFileSync(path.join(OUT,"xstore-018-supplemental-pool-report.json"),JSON.stringify(report,null,2));
console.log("XSTORE_018_SUPPLEMENTAL_POOL_BROWSER="+report.status);
for(const item of report.checks)console.log("["+item.status+"] "+item.name+(item.detail?" — "+item.detail:""));
if(report.status!=="PASS")process.exitCode=1;
