import fs from "node:fs";import path from "node:path";import {chromium} from "playwright";
const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8782",OUT=process.env.QA_OUT||"qa-artifacts/xstore-019d";fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)});throw e}};
const browser=await chromium.launch({headless:true}),context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1280,height:900}}),page=await context.newPage();
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});page.on("requestfailed",r=>report.request_failures.push(r.method()+" "+r.url()+" "+(r.failure()?.errorText||"")));page.on("response",r=>{if(r.status()>=500)report.http_errors.push(r.status()+" "+r.url())});
const html5Drag=async(source,targetSelector)=>source.evaluate((src,selector)=>{
  const target=src.ownerDocument.querySelector(selector);
  if(!target)throw new Error("drag target missing: "+selector);
  const dt=new DataTransfer();
  const fire=(el,type)=>el.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer:dt}));
  fire(src,"dragstart");fire(target,"dragenter");fire(target,"dragover");fire(target,"drop");fire(src,"dragend");
},targetSelector);
await page.goto(BASE+"/09_QA/people-shift/ui2-008-employee-secondary-fixture.html",{waitUntil:"networkidle",timeout:20000});const employee=page.frameLocator("#employeeApp");await employee.locator("#view-schedule.active").waitFor({timeout:10000});await employee.locator(".employee-schedule-secondary [data-schedule-availability]").click();await employee.locator("#weeklyRegistrationPanel.open").waitFor({timeout:10000});await employee.locator("[data-availability-calendar]").waitFor({timeout:10000});
await check("xstore_019d_weekly_calendar_is_time_only_and_existing_rows_visible",async()=>{const m=await employee.locator("#weeklyRegistrationPanel").evaluate(p=>({days:p.querySelectorAll("[data-av-day]").length,slots:p.querySelectorAll("[data-av-slot]").length,cards:[...p.querySelectorAll("[data-av-card]")].map(x=>x.textContent.replace(/\s+/g," ").trim()),storeControls:p.querySelectorAll("#quickRegStore,[name*=store i],[data-store-priority]").length,text:p.textContent}));if(m.days!==7||m.slots!==238||!m.cards.some(x=>x.includes("09:00–13:00"))||m.storeControls!==0||/Chi nhánh mong muốn|Store Priority/i.test(m.text))throw new Error(JSON.stringify(m));return JSON.stringify({days:m.days,slots:m.slots,cards:m.cards})});
await check("xstore_019j_painted_slots_are_staged_before_explicit_save",async()=>{
 const prior=await page.evaluate(()=>globalThis.__UI2_008_QA.calls.filter(x=>x.name==="save_my_availability").length);
 const a=employee.locator('[data-av-slot-date="2026-09-28"][data-av-slot-time="06:00"]');
 const b=employee.locator('[data-av-slot-date="2026-09-28"][data-av-slot-time="06:30"]');
 await a.click();await b.click();
 const m=await employee.locator("#weeklyRegistrationPanel").evaluate(p=>({count:p.querySelectorAll('[data-av-staged="true"]').length,save:p.querySelector('[data-av-paint-save]')?.textContent,disabled:p.querySelector('[data-av-paint-save]')?.disabled}));
 const after=await page.evaluate(()=>globalThis.__UI2_008_QA.calls.filter(x=>x.name==="save_my_availability").length);
 if(m.count!==2||m.disabled||after!==prior)throw new Error(JSON.stringify({m,prior,after}));
 return JSON.stringify(m);
});
await check("xstore_019j_explicit_bottom_save_merges_adjacent_intervals",async()=>{
 await employee.locator('[data-av-paint-save]').click();
 await page.waitForFunction(()=>globalThis.__UI2_008_QA.availability.some(r=>r.work_date==="2026-09-28"&&r.start_time==="06:00"&&r.end_time==="07:00"));
 const row=await page.evaluate(()=>globalThis.__UI2_008_QA.availability.find(r=>r.work_date==="2026-09-28"&&r.start_time==="06:00")),call=await page.evaluate(()=>globalThis.__UI2_008_QA.calls.filter(x=>x.name==="save_my_availability").at(-1));
 if(!row?.id||call?.args?.p_availability_id!==null||call?.args?.p_preferred_store_id!==null||call.args.p_end_time!=="07:00")throw new Error(JSON.stringify({row,call}));
 return row.id;
});
await check("xstore_019j_pointer_drag_paints_contiguous_unsaved_cells",async()=>{
 const date="2026-10-01",times=["12:00","12:30","13:00"];
 const first=employee.locator('[data-av-slot-date="'+date+'"][data-av-slot-time="'+times[0]+'"]');
 await first.scrollIntoViewIfNeeded();
 const centers=[];
 for(const time of times){const box=await employee.locator('[data-av-slot-date="'+date+'"][data-av-slot-time="'+time+'"]').boundingBox();if(!box)throw new Error("Missing paint cell "+time);centers.push({x:box.x+box.width/2,y:box.y+box.height/2})}
 await page.mouse.move(centers[0].x,centers[0].y);await page.mouse.down();
 for(const pt of centers.slice(1))await page.mouse.move(pt.x,pt.y,{steps:5});
 await page.mouse.up();
 const staged=await employee.locator('[data-av-slot-date="'+date+'"][data-av-staged="true"]').count();
 if(staged!==3)throw new Error("Expected three painted cells, got "+staged);
 for(const time of times)await employee.locator('[data-av-slot-date="'+date+'"][data-av-slot-time="'+time+'"]').click();
 const remaining=await employee.locator('[data-av-slot-date="'+date+'"][data-av-staged="true"]').count();
 if(remaining!==0)throw new Error("Toggling should remove all three draft cells");
 return "painted 3 contiguous half-hour cells and toggled back to 0";
});
await check("xstore_019j_multi_day_partial_write_retains_only_unsaved_cells",async()=>{
 // Fixture-only simulated second-write failure; production RPC semantics remain unchanged.
 await employee.locator('[data-av-slot-date="2026-09-28"][data-av-slot-time="17:00"]').click();
 await employee.locator('[data-av-slot-date="2026-09-30"][data-av-slot-time="10:00"]').click();
 await page.evaluate(()=>{
  const q=globalThis.MAGASIN_CORE.supabase,orig=q.rpc.bind(q);let attempts=0;
  q.rpc=async(name,args)=>{if(name==="save_my_availability"&&++attempts===2){q.rpc=orig;return {data:null,error:{message:"SIMULATED_SECOND_WRITE_FAILURE"}}}return orig(name,args)};
 });
 await employee.locator('[data-av-paint-save]').click();
 await employee.locator('[data-av-paint-save]:not([disabled])').waitFor({timeout:10000});
 const state=await employee.locator('#weeklyRegistrationPanel').evaluate(p=>({
  remaining:[...p.querySelectorAll('[data-av-staged="true"]')].map(x=>x.dataset.avSlotDate+' '+x.dataset.avSlotTime),
  status:p.querySelector('#quickRegMsg')?.textContent||'',count:p.querySelector('[data-av-paint-save]')?.textContent
 }));
 if(state.remaining.length!==1||!state.remaining[0].includes('2026-09-30 10:00')||!/1\/2/.test(state.status))throw new Error(JSON.stringify(state));
 const before=await page.evaluate(()=>globalThis.__UI2_008_QA.calls.filter(x=>x.name==='save_my_availability'&&x.args.p_work_date==='2026-09-28'&&x.args.p_start_time==='17:00').length);
 await employee.locator('[data-av-paint-save]').click();
 await page.waitForFunction(()=>globalThis.__UI2_008_QA.availability.some(x=>x.work_date==='2026-09-30'&&x.start_time==='10:00'&&x.end_time==='10:30'));
 const after=await page.evaluate(()=>globalThis.__UI2_008_QA.calls.filter(x=>x.name==='save_my_availability'&&x.args.p_work_date==='2026-09-28'&&x.args.p_start_time==='17:00').length);
 if(after!==before)throw new Error("Retry duplicated confirmed Monday write");
 return JSON.stringify(state);
});
const createdId=await page.evaluate(()=>globalThis.__UI2_008_QA.availability.find(r=>r.work_date==="2026-09-28"&&r.start_time==="06:00")?.id);
await employee.locator("#saveReg:not([disabled])").waitFor({timeout:10000});
await check("xstore_019d_card_edit_updates_existing_id_without_duplicate",async()=>{await employee.locator('[data-av-card="'+createdId+'"] [data-av-edit]').click();await employee.locator("#saveReg").filter({hasText:"Lưu thay đổi"}).waitFor({timeout:10000});await employee.locator("#quickRegEnd").selectOption("08:00");const before=await page.evaluate(()=>globalThis.__UI2_008_QA.availability.length);await employee.locator("#saveReg").click();await page.waitForFunction(id=>globalThis.__UI2_008_QA.availability.find(x=>x.id===id)?.end_time==="08:00",createdId);const v=await page.evaluate(id=>({rows:globalThis.__UI2_008_QA.availability.length,call:globalThis.__UI2_008_QA.calls.filter(x=>x.name==="save_my_availability").at(-1)}),createdId);if(v.rows!==before||v.call?.args?.p_availability_id!==createdId||v.call?.args?.p_preferred_store_id!==null)throw new Error(JSON.stringify(v));return JSON.stringify(v)});
await check("xstore_019d_drag_move_and_resize_persist_same_availability_id",async()=>{
  await employee.locator("#saveReg:not([disabled])").waitFor({timeout:10000});
  let card=employee.locator('[data-av-card="'+createdId+'"]');
  await html5Drag(card,'[data-av-slot-date="2026-09-30"][data-av-slot-time="08:00"]');
  await page.waitForFunction(id=>{const r=globalThis.__UI2_008_QA.availability.find(x=>x.id===id);return r?.work_date==="2026-09-30"&&r?.start_time==="08:00"&&r?.end_time==="10:00"},createdId);
  await employee.locator("#saveReg:not([disabled])").waitFor({timeout:10000});
  card=employee.locator('[data-av-card="'+createdId+'"]');
  await html5Drag(card.locator("[data-av-resize-end]"),'[data-av-slot-date="2026-09-30"][data-av-slot-time="10:30"]');
  await page.waitForFunction(id=>globalThis.__UI2_008_QA.availability.find(x=>x.id===id)?.end_time==="11:00",createdId);
  await employee.locator("#saveReg:not([disabled])").waitFor({timeout:10000});
  card=employee.locator('[data-av-card="'+createdId+'"]');
  await html5Drag(card.locator("[data-av-resize-start]"),'[data-av-slot-date="2026-09-30"][data-av-slot-time="07:30"]');
  await page.waitForFunction(id=>globalThis.__UI2_008_QA.availability.find(x=>x.id===id)?.start_time==="07:30",createdId);
  await employee.locator("#saveReg:not([disabled])").waitFor({timeout:10000});
  const v=await page.evaluate(id=>({row:globalThis.__UI2_008_QA.availability.find(x=>x.id===id),updates:globalThis.__UI2_008_QA.calls.filter(x=>x.name==="save_my_availability"&&x.args.p_availability_id===id)}),createdId);
  if(v.updates.length<3||v.updates.some(x=>x.args.p_preferred_store_id!==null))throw new Error(JSON.stringify(v));
  return JSON.stringify(v)
});
await check("xstore_019d_availability_visual_is_distinct_from_assigned_shift",async()=>{const style=await employee.locator('[data-av-card="'+createdId+'"]').evaluate(el=>({borderStyle:getComputedStyle(el).borderStyle,after:getComputedStyle(el,"::after").content})),officialStyle=await employee.locator("#view-schedule .shift").first().evaluate(el=>({borderStyle:getComputedStyle(el).borderStyle,after:getComputedStyle(el,"::after").content}));if(style.borderStyle!=="dashed"||!style.after.includes("CÓ THỂ LÀM")||(style.borderStyle===officialStyle.borderStyle&&style.after===officialStyle.after))throw new Error(JSON.stringify({style,officialStyle}));return JSON.stringify({style,officialStyle})});
await check("xstore_019j_mobile_05_to_22_one_day_and_paint_targets",async()=>{
 await page.setViewportSize({width:390,height:844});
 const m=await employee.locator("#weeklyRegistrationPanel").evaluate(p=>{
  const html=p.ownerDocument.documentElement,wrap=p.querySelector('.availability-calendar-wrap'),
  slots=[...p.querySelectorAll('[data-av-slot]')],visible=slots.filter(x=>getComputedStyle(x).display!=="none"&&x.getBoundingClientRect().width>0);
  return {pageScroll:html.scrollWidth,pageClient:html.clientWidth,wrapScroll:wrap.scrollWidth,wrapClient:wrap.clientWidth,
    total:slots.length,visible:visible.length,first:visible[0]?.dataset.avSlotTime,last:visible.at(-1)?.dataset.avSlotTime,
    minSlot:Math.min(...visible.map(x=>x.getBoundingClientRect().height)),
    visibleDays:[...p.querySelectorAll('[data-av-day]')].filter(x=>getComputedStyle(x).display!=="none").length};
 });
 if(m.pageScroll>m.pageClient+2||m.wrapScroll>m.wrapClient+2||m.total!==238||m.visible!==34||m.first!=="05:00"||m.last!=="21:30"||m.minSlot<42||m.visibleDays!==1)throw new Error(JSON.stringify(m));
 await employee.locator('[data-av-paint-next]').click();
 const day=await employee.locator('[data-av-day][data-av-active-day="true"]').getAttribute('data-av-day');
 if(day!=="2026-09-29")throw new Error("Cannot navigate days: "+day);
 return JSON.stringify(m);
});
await page.setViewportSize({width:1280,height:900});await check("xstore_019d_direct_delete_removes_selected_interval",async()=>{page.once("dialog",d=>d.accept());await employee.locator('[data-av-card="'+createdId+'"] [data-av-delete]').click();await page.waitForFunction(id=>!globalThis.__UI2_008_QA.availability.some(x=>x.id===id),createdId);if(await employee.locator('[data-av-card="'+createdId+'"]').count())throw new Error("deleted card still visible");return createdId});
await check("xstore_019j_sunday_closed_disables_paint_and_submit",async()=>{
 await page.evaluate(()=>{globalThis.__UI2_008_QA.state.today="2026-09-27"});
 await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.availability.refresh());
 const r=await employee.locator('#weeklyRegistrationPanel').evaluate(p=>({
  closed:p.dataset.availabilityReadonly,save:p.querySelector('[data-av-paint-save]')?.disabled,
  selectable:[...p.querySelectorAll('[data-av-slot]')].filter(x=>!x.disabled).length
 }));
 if(r.closed!=="true"||!r.save||r.selectable)throw new Error(JSON.stringify(r));
 await page.evaluate(()=>{globalThis.__UI2_008_QA.state.today="2026-09-25"});
 await page.evaluate(()=>globalThis.MAGASIN_EMPLOYEE.availability.refresh());
 return JSON.stringify(r);
});
await check("xstore_019d_rpc_and_browser_diagnostics_are_clean",async()=>{const e=await page.evaluate(()=>({direct:globalThis.__UI2_008_QA.calls.filter(x=>x.kind==="from"),saves:globalThis.__UI2_008_QA.calls.filter(x=>x.name==="save_my_availability").map(x=>x.args)}));if(e.direct.length||e.saves.some(x=>x.p_preferred_store_id!==null)||report.page_errors.length||report.console_errors.length||report.request_failures.length||report.http_errors.length)throw new Error(JSON.stringify({e,report}));return JSON.stringify({saveCount:e.saves.length,direct:0})});
await page.screenshot({path:path.join(OUT,"xstore-019d-employee-availability-calendar.png"),fullPage:true});await context.close();await browser.close();fs.writeFileSync(path.join(OUT,"xstore-019d-employee-availability-calendar-report.json"),JSON.stringify(report,null,2));console.log("XSTORE_019D_EMPLOYEE_AVAILABILITY_CALENDAR_BROWSER="+report.status);for(const item of report.checks)console.log("["+item.status+"] "+item.name+(item.detail?" — "+item.detail:""));if(report.status!=="PASS")process.exitCode=1;
