import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8774";
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
 if(!frame)throw new Error("XSTORE_017_MANAGER_FRAME_MISSING");
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
 globalThis.__MW31_QA.setStaffingRequirements([{
  requirement_id:"req-x17-1",
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
 return s.busy===false&&s.generationStatus==="DRAFT"&&s.shortageSource==="SERVER"&&s.shortages.length===1;
});

await check("xstore_017_server_shortage_is_colocated_in_exact_day_cell",async()=>{
 const day=frame.locator('[data-msd-date="2026-09-28"]');
 const card=day.locator(".msd-shortage-card");
 await card.waitFor();
 const text=(await card.innerText()).replace(/\s+/g," ");
 const shortage=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().shortages[0]);
 const interval=shortage?.shortage_start+"–"+shortage?.shortage_end;
 if(!shortage||!text.includes("Thiếu 1 người")||!text.includes(interval)||!text.includes("+ Bổ sung người"))throw new Error(JSON.stringify({text,shortage}));
 const style=await card.evaluate(el=>({background:getComputedStyle(el).backgroundColor,borderLeft:getComputedStyle(el).borderLeftColor,role:el.getAttribute("role"),label:el.getAttribute("aria-label"),iconHidden:el.querySelector(".msd-shortage-icon")?.getAttribute("aria-hidden"),inline:!!el.closest(".msd-slot-grid")}));
 if(style.background!=="rgb(238, 242, 255)"||style.borderLeft!=="rgb(99, 102, 241)"||style.role!=="status"||!String(style.label).includes("Thiếu nhân sự")||style.iconHidden!=="true"||!style.inline)throw new Error(JSON.stringify(style));
 return JSON.stringify({text,shortage,style});
});

await page.screenshot({path:path.join(OUT,"xstore-017-inline-shortage-before-repair.png"),fullPage:true});

await frame.locator('[data-msd-date="2026-09-28"] [data-msd-supplement]').click();
await check("xstore_017_direct_supplement_prefills_exact_shortage_interval",async()=>{
 const values=await frame.evaluate(()=>({
  date:document.querySelector("#msdManualDate")?.value,
  start:document.querySelector("#msdManualStart")?.value,
  end:document.querySelector("#msdManualEnd")?.value,
  target:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().supplementTarget
 }));
 if(values.date!=="2026-09-28"||values.start!==values.target?.shortage_start||values.end!==values.target?.shortage_end||values.target?.missing_headcount!==1)throw new Error(JSON.stringify(values));
 return JSON.stringify(values);
});

await frame.locator('[data-msd-pool-group="unassigned"] [data-msd-pool-user="u-1"]').click();
await frame.waitForFunction(()=>{
 const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
 return s.dirty===true&&s.shortageSource==="LOCAL"&&s.shortages.length===0;
});

// Normalize the fixture backend before the local-edit assertion so this
// contract does not depend on Auto Schedule hydration timing.
await frame.evaluate(async()=>{
 const qa=globalThis.__MW31_QA;
 const generation=qa.state.generation;
 qa.state.assignments=[{
  id:"asg-x17-edit",
  generation_id:generation.id,
  user_id:"u-1",
  employee_name:"Nhân viên QA 1",
  store_id:"store-a",
  store_code:"CN-QA-A",
  work_date:"2026-09-28",
  start_time:"06:00",
  end_time:"12:00",
  status:"DRAFT"
 }];
 await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.refresh();
});
await frame.waitForFunction(()=>{
 const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
 return s.dirty===false&&s.assignments.length===1&&s.assignments[0].start_time==="06:00"&&s.assignments[0].end_time==="12:00"&&s.shortageSource==="SERVER"&&s.shortages.length===0;
});

await frame.locator('[data-msd-open-editor="0"]').click();
await frame.locator('[data-msd-row="0"] [data-f="end_time"]').selectOption("08:00");
await frame.locator('[data-msd-row="0"] [data-msd-apply-edit="0"]').click();
await frame.waitForFunction(()=>{
 const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
 return s.shortageSource==="LOCAL"&&s.shortages.length===1&&s.shortages[0].shortage_start==="08:00"&&s.shortages[0].shortage_end==="12:00";
});
await check("xstore_017_dirty_edit_recalculates_exact_local_shortage",async()=>{
 const state=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
 const text=(await frame.locator('[data-msd-date="2026-09-28"] .msd-shortage-card').innerText()).replace(/\s+/g," ");
 if(state.shortageSource!=="LOCAL"||state.shortages[0]?.shortage_start!=="08:00"||state.shortages[0]?.shortage_end!=="12:00"||!text.includes("08:00–12:00"))throw new Error(JSON.stringify({text,source:state.shortageSource,shortage:state.shortages[0]}));
 return JSON.stringify({shortage:state.shortages[0],source:state.shortageSource,text});
});

await frame.locator('[data-msd-open-editor="0"]').click();
await frame.locator('[data-msd-row="0"] [data-f="end_time"]').selectOption("12:00");
await frame.locator('[data-msd-row="0"] [data-msd-apply-edit="0"]').click();
await frame.waitForFunction(()=>{
 const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
 return s.shortageSource==="LOCAL"&&s.shortages.length===0;
});
if(await frame.locator(".msd-shortage-card").count())throw new Error("fully repaired local coverage must remove shortage card");

await frame.locator("#msdSave").click();
await frame.waitForFunction(()=>{
 const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
 return s.dirty===false&&s.shortageSource==="SERVER"&&s.shortages.length===0;
});
await check("xstore_017_save_rechecks_authoritative_shortage_reader",async()=>{
 const calls=await frame.evaluate(()=>globalThis.__MW31_QA.calls.filter(x=>x.kind==="rpc").map(x=>x.name));
 const replaceIndex=calls.lastIndexOf("replace_schedule_generation_assignments");
 const shortageIndex=calls.lastIndexOf("list_cross_store_staffing_shortages_v1");
 if(replaceIndex<0||shortageIndex<replaceIndex)throw new Error(JSON.stringify(calls.slice(-12)));
 return JSON.stringify(calls.slice(Math.max(0,replaceIndex-2)));
});

await page.setViewportSize({width:390,height:844});
await check("xstore_017_mobile_has_no_page_overflow",async()=>{
 return frame.evaluate(()=>{
  const metric={scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};
  if(metric.scrollWidth>metric.clientWidth+2)throw new Error(JSON.stringify(metric));
  return JSON.stringify(metric);
 });
});

await page.screenshot({path:path.join(OUT,"xstore-017-inline-shortage-repaired.png"),fullPage:true});
await context.close();
await browser.close();

for(const [name,list] of Object.entries({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures,http_errors:report.http_errors})){
 if(list.length){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:JSON.stringify(list)})}
}
fs.writeFileSync(path.join(OUT,"xstore-017-inline-shortage-report.json"),JSON.stringify(report,null,2));
console.log("XSTORE_017_INLINE_SHORTAGE_BROWSER="+report.status);
for(const item of report.checks)console.log("["+item.status+"] "+item.name+(item.detail?" — "+item.detail:""));
if(report.status!=="PASS")process.exitCode=1;
