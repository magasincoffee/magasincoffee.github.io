import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8774";
const OUT=process.env.QA_OUT||"qa-artifacts/xstore-019b";
fs.mkdirSync(OUT,{recursive:true});

const report={status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)});throw e}};

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1440,height:1000}});
const page=await context.newPage();
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push(r.method()+" "+r.url()+" "+(r.failure()?.errorText||"")));
page.on("response",r=>{if(r.status()>=500)report.http_errors.push(r.status()+" "+r.url())});

await page.goto(BASE+"/09_QA/people-shift/manager-workforce-canonical-fixture.html",{waitUntil:"networkidle",timeout:20000});
await page.locator("#panel-publish .msd").waitFor({timeout:10000});
await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT?.getState?.().stores?.length===1);

await page.locator("#msdStart").click();
await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="DRAFT");

await check("019b_click_empty_calendar_slot_opens_direct_create",async()=>{
  const add=page.locator('[data-x19g-board="edit"] .msd-day[data-msd-date="2026-09-28"] .x19j-day-add');
  await add.click();
  await page.locator("#msdCalendarCreateEmployee").waitFor();
  const state=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
  if(!state.calendarCreate||state.calendarCreate.work_date!=="2026-09-28"||state.calendarCreate.start_time!=="06:00"||state.calendarCreate.end_time!=="07:00")throw new Error(JSON.stringify(state.calendarCreate));
  return JSON.stringify(state.calendarCreate);
});

await page.locator("#msdCalendarCreateEmployee").selectOption("u-1");
await page.locator("#msdCalendarCreateCommit").click();
await page.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return s.assignments.length===1&&s.dirty===true});

await check("019b_direct_create_mutates_draft_only_before_save",async()=>{
  return page.evaluate(()=>{
    const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
    const writes=globalThis.__MW31_QA.calls.filter(x=>x.name==="replace_schedule_generation_assignments");
    const card=document.querySelector('[data-msd-drag-index="0"]');
    if(s.assignments.length!==1||s.assignments[0].user_id!=="u-1"||s.assignments[0].work_date!=="2026-09-28"||s.assignments[0].start_time!=="06:00"||s.assignments[0].end_time!=="07:00"||writes.length!==0||!card?.textContent.includes("06:00–07:00")||!card?.classList.contains("msd-band-morning"))throw new Error(JSON.stringify({s,writes:writes.length,text:card?.textContent,cls:card?.className}));
    return "one guarded morning DRAFT row; 0 canonical writes before Save";
  });
});

await page.locator('[data-msd-open-editor="0"]').click();
const drawer0=page.locator('[data-x19g-drawer="edit"]');
await drawer0.locator('[data-f="work_date"]').selectOption("2026-09-29");
await drawer0.locator('[data-f="start_time"]').selectOption("12:00");
await drawer0.locator('[data-f="end_time"]').selectOption("13:00");
await drawer0.locator('[data-msd-apply-edit="0"]').click();
await page.waitForFunction(()=>{const a=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments[0];return a?.work_date==="2026-09-29"&&a.start_time==="12:00"&&a.end_time==="13:00"});

await check("019b_keyboard_fallback_edits_day_time_and_band",async()=>{
  return page.evaluate(()=>{
    const a=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments[0];
    const card=document.querySelector('[data-msd-drag-index="0"]');
    if(a.work_date!=="2026-09-29"||a.start_time!=="12:00"||a.end_time!=="13:00"||!card?.classList.contains("msd-band-afternoon")||!card?.textContent.includes("12:00–13:00"))throw new Error(JSON.stringify({a,cls:card?.className,text:card?.textContent}));
    return JSON.stringify(a);
  });
});

await page.locator('[data-msd-open-editor="0"]').click();
await page.locator('[data-x19g-drawer="edit"] [data-msd-copy-date="0"]').selectOption("2026-09-30");
await page.locator('[data-x19g-drawer="edit"] [data-msd-duplicate="0"]').click();
await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments.length===2);

await check("019b_duplicate_is_explicit_and_still_unsaved",async()=>{
  return page.evaluate(()=>{
    const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
    const writes=globalThis.__MW31_QA.calls.filter(x=>x.name==="replace_schedule_generation_assignments");
    if(s.assignments.length!==2||s.assignments[1].work_date!=="2026-09-30"||writes.length!==0||!s.dirty)throw new Error(JSON.stringify({s,writes:writes.length}));
    return "duplicate created Wednesday DRAFT row; writer untouched";
  });
});

await page.locator("#msdSave").click();
await page.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return s.dirty===false&&globalThis.__MW31_QA.calls.filter(x=>x.name==="replace_schedule_generation_assignments").length===1});

await check("019b_first_save_uses_single_canonical_writer",async()=>{
  return page.evaluate(()=>{
    const writes=globalThis.__MW31_QA.calls.filter(x=>x.name==="replace_schedule_generation_assignments");
    const payload=writes[0]?.args?.p_assignments||[];
    if(writes.length!==1||payload.length!==2||globalThis.__MW31_QA.state.assignments.length!==2)throw new Error(JSON.stringify({writes:writes.length,payload,backend:globalThis.__MW31_QA.state.assignments}));
    return "replace_schedule_generation_assignments x1 with 2 guarded rows";
  });
});

await page.locator('[data-msd-open-editor="1"]').click();
const drawer1=page.locator('[data-x19g-drawer="edit"]');
await drawer1.locator('[data-f="work_date"]').selectOption("2026-09-29");
await drawer1.locator('[data-f="start_time"]').selectOption("12:00");
await drawer1.locator('[data-f="end_time"]').selectOption("13:00");
await drawer1.locator('[data-msd-apply-edit="1"]').click();
await page.waitForTimeout(80);

await check("019b_hard_overlap_edit_fails_closed_and_reverts_ui",async()=>{
  return page.evaluate(()=>{
    const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
    const status=document.querySelector("#msdStatus")?.textContent||"";
    const row=document.querySelector('[data-msd-row="1"]');
    const date=document.querySelector('[data-x19g-drawer="edit"] [data-f="work_date"]')?.value||row?.querySelector('[data-f="work_date"]')?.value||"";
    if(s.assignments[1].work_date!=="2026-09-30"||date!=="2026-09-30"||!status.includes("Không thể cập nhật ca"))throw new Error(JSON.stringify({assignment:s.assignments[1],date,status}));
    return status;
  });
});

await page.keyboard.press("Escape");
await page.locator('[data-msd-open-editor="0"]').click();
const moveDrawer=page.locator('[data-x19g-drawer="edit"]');
await moveDrawer.locator('[data-f="work_date"]').selectOption("2026-10-01");
await moveDrawer.locator('[data-f="start_time"]').selectOption("14:00");
await moveDrawer.locator('[data-f="end_time"]').selectOption("15:00");
await moveDrawer.locator('[data-msd-apply-edit="0"]').click();
await page.waitForFunction(()=>{const a=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments[0];return a?.work_date==="2026-10-01"&&a.start_time==="14:00"&&a.end_time==="15:00"});
await check("019j_compact_day_editor_moves_shift_without_drag",async()=>{
 const a=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments[0]);
 if(a.work_date!=="2026-10-01"||a.start_time!=="14:00"||a.end_time!=="15:00")throw new Error(JSON.stringify(a));
 return JSON.stringify(a);
});
await page.locator('[data-msd-open-editor="0"]').click();
const sizeDrawer=page.locator('[data-x19g-drawer="edit"]');
await sizeDrawer.locator('[data-f="start_time"]').selectOption("13:00");
await sizeDrawer.locator('[data-f="end_time"]').selectOption("16:00");
await sizeDrawer.locator('[data-msd-apply-edit="0"]').click();
await page.waitForFunction(()=>{const a=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments[0];return a?.start_time==="13:00"&&a.end_time==="16:00"});
await check("019j_compact_drawer_changes_start_end",async()=>{
 const a=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments[0]);
 if(a.start_time!=="13:00"||a.end_time!=="16:00")throw new Error(JSON.stringify(a));
 return JSON.stringify(a);
});

await page.locator('[data-msd-remove-direct="1"]').first().click();
await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments.length===1);

await check("019b_delete_is_direct_and_shortage_recomputes_locally",async()=>{
  return page.evaluate(()=>{
    const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
    if(s.assignments.length!==1||!s.dirty||!["LOCAL","NONE"].includes(s.shortageSource))throw new Error(JSON.stringify(s));
    return JSON.stringify({assignments:s.assignments.length,dirty:s.dirty,shortageSource:s.shortageSource});
  });
});

await page.locator("#msdSave").click();
await page.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return s.dirty===false&&globalThis.__MW31_QA.calls.filter(x=>x.name==="replace_schedule_generation_assignments").length===2});

await check("019b_final_save_persists_direct_move_resize_delete_through_canonical_writer",async()=>{
  return page.evaluate(()=>{
    const writes=globalThis.__MW31_QA.calls.filter(x=>x.name==="replace_schedule_generation_assignments");
    const backend=globalThis.__MW31_QA.state.assignments;
    const a=backend[0];
    if(writes.length!==2||backend.length!==1||a.work_date!=="2026-10-01"||a.start_time!=="13:00"||a.end_time!=="16:00")throw new Error(JSON.stringify({writes:writes.length,backend}));
    return JSON.stringify(a);
  });
});

await page.screenshot({path:path.join(OUT,"xstore-019b-direct-calendar.png"),fullPage:true});
await context.close();
await browser.close();

for(const [name,list] of Object.entries({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures,http_errors:report.http_errors})){
  if(list.length){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:JSON.stringify(list)})}
}
fs.writeFileSync(path.join(OUT,"xstore-019b-direct-calendar-report.json"),JSON.stringify(report,null,2));
console.log("XSTORE_019B_DIRECT_CALENDAR_BROWSER="+report.status);
for(const x of report.checks)console.log("["+x.status+"] "+x.name+(x.detail?" — "+x.detail:""));
if(report.status!=="PASS")process.exitCode=1;
