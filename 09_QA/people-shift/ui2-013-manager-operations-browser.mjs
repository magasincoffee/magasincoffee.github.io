import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],screenshots:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)})}};
const diagnostics=page=>{
 page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
 page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
 page.on("requestfailed",r=>report.request_failures.push(r.method()+" "+r.url()+" "+(r.failure()?.errorText||"")));
 page.on("response",r=>{if(r.status()>=500)report.http_errors.push(r.status()+" "+r.url())});
};
async function openPage(browser,width,height=980){
 const context=await browser.newContext({viewport:{width,height},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
 const page=await context.newPage();diagnostics(page);
 await page.goto(BASE+"/09_QA/people-shift/ui2-013-manager-operations-fixture.html",{waitUntil:"networkidle",timeout:20000});
 await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_OPERATIONS_UI2_013&&globalThis.MAGASIN_MANAGER_SHIFT_CHANGE&&globalThis.MAGASIN_MANAGER_ATTENDANCE_REVIEW&&globalThis.MAGASIN_MANAGER_STAFF_PROJECTION&&globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK);
 return {context,page};
}
async function activate(page,view,state){
 await page.locator('[data-view="'+view+'"]').click();
 await page.locator("#view-"+view+".active").waitFor();
 if(state)await page.waitForFunction(([id,expected])=>document.getElementById("view-"+id)?.dataset.ui2OperationsState===expected,[view,state]);
}
async function keyboardFocusEvidence(page,selector){
 const el=page.locator(selector).first();await el.waitFor();await el.focus();await page.keyboard.press("Shift+Tab");await page.keyboard.press("Tab");
 return el.evaluate(node=>({id:node.id||"",outline:getComputedStyle(node).outlineStyle,shadow:getComputedStyle(node).boxShadow,height:node.getBoundingClientRect().height}));
}

const browser=await chromium.launch({headless:true});

for(const width of [1280,768,390]){
 const {context,page}=await openPage(browser,width,980);
 const modules=[
  ["swap","ACTION_REQUIRED"],
  ["attendance","ACTION_REQUIRED"],
  ["staff","READY"],
  ["payroll-self-check","READY"]
 ];
 for(const [view,expected] of modules){
  await activate(page,view);
  if(view==="staff")await page.evaluate(()=>globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.refresh());
  if(view==="payroll-self-check")await page.evaluate(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.refresh());
  await page.waitForFunction(([id,expected])=>{
   const root=document.getElementById("view-"+id);if(!root||root.dataset.ui2OperationsState!==expected)return false;
   if(!root.querySelector(".mui2-module-head")||!root.querySelector(".mui2-state-banner"))return false;
   if(id!=="swap"&&!root.querySelector(".mui2-module-controls select"))return false;
   if(["staff","payroll-self-check"].includes(id)&&expected==="READY"&&!root.querySelector(".mui2-table-region"))return false;
   return true;
  },[view,expected]);
  await check("ui2_013_"+width+"_"+view+"_hierarchy_responsive",async()=>{
   const metric=await page.locator("#view-"+view).evaluate((root,expectedWidth)=>{
    const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0};
    const controls=[...root.querySelectorAll("button,select,input")].filter(visible);
    const scoped=root.dataset.ui2OperationsModule!=="swap";
    const banner=root.querySelector(".mui2-state-banner");
    const tables=[...root.querySelectorAll(".mui2-table-region")].map(x=>({scroll:x.scrollWidth,client:x.clientWidth,tab:x.tabIndex}));
    return {
     expectedWidth,viewport:innerWidth,doc:document.documentElement.scrollWidth,
     module:root.dataset.ui2OperationsModule,state:root.dataset.ui2OperationsState,
     hierarchy:root.classList.contains("mui2-module")&&!!root.querySelector(".mui2-module-head")&&!!banner,
     scoped,scopeControl:!!root.querySelector(".mui2-module-controls select"),
     touchMin:controls.length?Math.min(...controls.map(x=>x.getBoundingClientRect().height)):0,
     tables
    };
   },width);
   if(metric.doc>metric.viewport+1||!metric.hierarchy)throw new Error(JSON.stringify(metric));
   if(metric.scoped&&!metric.scopeControl)throw new Error("missing canonical scope control "+JSON.stringify(metric));
   if(!metric.scoped&&metric.scopeControl)throw new Error("Swap/Give gained invented scope "+JSON.stringify(metric));
   if(width<=768&&metric.touchMin<43.5)throw new Error("touch target "+JSON.stringify(metric));
   if(width===390&&["staff","payroll-self-check"].includes(view)&&!metric.tables.some(x=>x.tab===0&&x.scroll>=x.client))throw new Error("table not contained "+JSON.stringify(metric));
   return JSON.stringify(metric);
  });
  const focusSelector=view==="swap"?"#view-swap .js-swap-approve":view==="attendance"?"#view-attendance #marRefresh":view==="staff"?"#view-staff #mspRefresh":"#view-payroll-self-check #mgrPayrollRefresh";
  await check("ui2_013_"+width+"_"+view+"_keyboard_focus",async()=>{
   const ev=await keyboardFocusEvidence(page,focusSelector);
   if(ev.outline==="none"&&ev.shadow==="none")throw new Error(JSON.stringify(ev));
   if(width<=768&&ev.height<43.5)throw new Error(JSON.stringify(ev));
   return JSON.stringify(ev);
  });
  const shot=path.join(OUT,"ui2-013-"+view+"-"+width+".png");
  await page.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
 }
 await context.close();
}

const {context,page}=await openPage(browser,1280,1040);

await check("ui2_013_swap_give_loading_error_empty_pending_states",async()=>{
 await activate(page,"swap","ACTION_REQUIRED");
 await page.evaluate(()=>{globalThis.__UI2_013_QA.setDelay(140);globalThis.MAGASIN_MANAGER_SHIFT_CHANGE.refresh()});
 await page.waitForFunction(()=>document.getElementById("view-swap")?.dataset.ui2OperationsState==="LOADING");
 await page.waitForFunction(()=>!globalThis.MAGASIN_MANAGER_SHIFT_CHANGE.getState().loading);
 await page.evaluate(()=>globalThis.__UI2_013_QA.setDelay(0));
 await page.evaluate(()=>{globalThis.__UI2_013_QA.setRpcError("list_shift_swap_requests_v1","QA_SWAP_READ_ERROR");return globalThis.MAGASIN_MANAGER_SHIFT_CHANGE.refresh()});
 await page.waitForFunction(()=>document.getElementById("view-swap")?.dataset.ui2OperationsState==="ERROR");
 const errorText=await page.locator("#view-swap").innerText();
 if(errorText.includes("QA_SWAP_READ_ERROR"))throw new Error(errorText);
 await page.evaluate(()=>{globalThis.__UI2_013_QA.setRpcError("list_shift_swap_requests_v1",null);globalThis.__UI2_013_QA.clearSwapGive();return globalThis.MAGASIN_MANAGER_SHIFT_CHANGE.refresh()});
 await page.waitForFunction(()=>document.getElementById("view-swap")?.dataset.ui2OperationsState==="EMPTY");
 await page.evaluate(()=>{globalThis.__UI2_013_QA.resetSwapGive();return globalThis.MAGASIN_MANAGER_SHIFT_CHANGE.refresh()});
 await page.waitForFunction(()=>document.getElementById("view-swap")?.dataset.ui2OperationsState==="ACTION_REQUIRED");
 return "LOADING → ERROR → EMPTY → ACTION_REQUIRED";
});

await check("ui2_013_swap_give_approve_reject_delegate_existing_rpc_paths",async()=>{
 await page.evaluate(()=>{globalThis.__UI2_013_QA.clearCalls();globalThis.__UI2_013_QA.resetSwapGive()});
 await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SHIFT_CHANGE.refresh());
 await page.locator(".js-swap-approve").click();
 await page.waitForFunction(()=>globalThis.__UI2_013_QA.state.calls.some(x=>x.name==="approve_shift_swap")&&!globalThis.MAGASIN_MANAGER_SHIFT_CHANGE.getState().loading);
 await page.locator(".js-give-reject").click();
 await page.waitForFunction(()=>globalThis.__UI2_013_QA.state.calls.some(x=>x.name==="reject_shift_give")&&!globalThis.MAGASIN_MANAGER_SHIFT_CHANGE.getState().loading);
 await page.evaluate(()=>{globalThis.__UI2_013_QA.resetSwapGive();return globalThis.MAGASIN_MANAGER_SHIFT_CHANGE.refresh()});
 await page.locator(".js-swap-reject").click();
 await page.waitForFunction(()=>globalThis.__UI2_013_QA.state.calls.some(x=>x.name==="reject_shift_swap")&&!globalThis.MAGASIN_MANAGER_SHIFT_CHANGE.getState().loading);
 await page.locator(".js-give-approve").click();
 await page.waitForFunction(()=>globalThis.__UI2_013_QA.state.calls.some(x=>x.name==="approve_shift_give")&&!globalThis.MAGASIN_MANAGER_SHIFT_CHANGE.getState().loading);
 const calls=await page.evaluate(()=>globalThis.__UI2_013_QA.state.calls.filter(x=>["approve_shift_swap","reject_shift_swap","approve_shift_give","reject_shift_give"].includes(x.name)));
 const names=calls.map(x=>x.name);
 for(const n of ["approve_shift_swap","reject_shift_swap","approve_shift_give","reject_shift_give"])if(!names.includes(n))throw new Error(JSON.stringify(calls));
 const rejectNotes=calls.filter(x=>x.name.startsWith("reject_")).map(x=>x.args.p_note);
 if(rejectNotes.some(x=>x!=="QA rejection"))throw new Error(JSON.stringify(calls));
 return names.join(" → ");
});

await check("ui2_013_attendance_states_actions_and_conflict_refresh",async()=>{
 await activate(page,"attendance");
 await page.evaluate(()=>{globalThis.__UI2_013_QA.resetAttendance();globalThis.__UI2_013_QA.setDelay(140);globalThis.MAGASIN_MANAGER_ATTENDANCE_REVIEW.refresh()});
 await page.waitForFunction(()=>document.getElementById("view-attendance")?.dataset.ui2OperationsState==="LOADING");
 await page.waitForFunction(()=>!globalThis.MAGASIN_MANAGER_ATTENDANCE_REVIEW.getState().loading);
 await page.evaluate(()=>globalThis.__UI2_013_QA.setDelay(0));
 await page.evaluate(()=>{globalThis.__UI2_013_QA.setRpcError("list_manager_attendance_review_v1","QA_ATTENDANCE_READ_ERROR");return globalThis.MAGASIN_MANAGER_ATTENDANCE_REVIEW.refresh()});
 await page.waitForFunction(()=>document.getElementById("view-attendance")?.dataset.ui2OperationsState==="ERROR");
 await page.evaluate(()=>{globalThis.__UI2_013_QA.setRpcError("list_manager_attendance_review_v1",null);globalThis.__UI2_013_QA.setAttendanceRows([]);return globalThis.MAGASIN_MANAGER_ATTENDANCE_REVIEW.refresh()});
 await page.waitForFunction(()=>document.getElementById("view-attendance")?.dataset.ui2OperationsState==="EMPTY");
 await page.evaluate(()=>{globalThis.__UI2_013_QA.resetAttendance();return globalThis.MAGASIN_MANAGER_ATTENDANCE_REVIEW.refresh()});
 await page.waitForFunction(()=>document.getElementById("view-attendance")?.dataset.ui2OperationsState==="ACTION_REQUIRED");
 await page.locator('[data-attendance-id="att-1"] [data-review="APPROVE"]').click();
 await page.waitForFunction(()=>globalThis.__UI2_013_QA.state.attendance.find(x=>x.attendance_id==="att-1")?.status==="APPROVED");
 const adjust=page.locator('[data-attendance-id="att-2"]');
 await adjust.locator("[data-confirmed-start]").fill("12:20");await adjust.locator("[data-confirmed-end]").fill("17:15");await adjust.locator('[data-review="ADJUST"]').click();
 await page.waitForFunction(()=>globalThis.__UI2_013_QA.state.attendance.find(x=>x.attendance_id==="att-2")?.status==="ADJUSTED");
 await page.locator('[data-attendance-id="att-3"] [data-review="REJECT"]').click();
 await page.waitForFunction(()=>globalThis.__UI2_013_QA.state.attendance.find(x=>x.attendance_id==="att-3")?.status==="REJECTED");
 await page.evaluate(()=>globalThis.__UI2_013_QA.conflictAttendanceOnce());
 await page.locator('[data-attendance-id="att-4"] [data-review="APPROVE"]').click();
 await page.waitForFunction(()=>document.getElementById("view-attendance")?.dataset.ui2OperationsState==="READY");
 const data=await page.evaluate(()=>({
  rows:globalThis.__UI2_013_QA.state.attendance.map(x=>({id:x.attendance_id,status:x.status,start:x.confirmed_start,end:x.confirmed_end})),
  calls:globalThis.__UI2_013_QA.state.calls.filter(x=>x.name==="review_attendance_v1").map(x=>x.args.p_decision)
 }));
 if(!data.calls.includes("APPROVE")||!data.calls.includes("ADJUST")||!data.calls.includes("REJECT"))throw new Error(JSON.stringify(data));
 if(await page.locator('[data-attendance-id="att-4"]').count())throw new Error("stale conflict card remained");
 const reviewed=await page.locator("#view-attendance .mar-reviewed").innerText();
 if(!reviewed.includes("Nhân viên QA 4"))throw new Error(reviewed);
 return JSON.stringify(data);
});

await check("ui2_013_employees_loading_error_empty_rows_store_switch_clears_stale",async()=>{
 await activate(page,"staff");
 await page.evaluate(()=>globalThis.__UI2_013_QA.resetStaff());
 await page.evaluate(()=>globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.refresh());
 await page.waitForFunction(()=>document.getElementById("view-staff")?.dataset.ui2OperationsState==="READY");
 await page.evaluate(()=>globalThis.__UI2_013_QA.setDelay(140));
 await page.locator("#mspStore").selectOption("store-b");
 await page.waitForFunction(()=>document.getElementById("view-staff")?.dataset.ui2OperationsState==="LOADING");
 const during=await page.locator("#view-staff").innerText();if(during.includes("Nhân viên QA A"))throw new Error("stale store-a row during loading");
 await page.waitForFunction(()=>document.getElementById("view-staff")?.dataset.ui2OperationsState==="READY");
 if(!(await page.locator("#view-staff").innerText()).includes("Nhân viên QA B"))throw new Error("store-b row missing");
 await page.evaluate(()=>globalThis.__UI2_013_QA.setDelay(0));
 await page.evaluate(()=>{globalThis.__UI2_013_QA.setRpcError("list_employee_profile_projection_v1","QA_PROFILE_ERROR")});
 await page.locator("#mspStore").selectOption("store-a");
 await page.waitForFunction(()=>document.getElementById("view-staff")?.dataset.ui2OperationsState==="ERROR");
 if((await page.locator("#view-staff").innerText()).includes("Nhân viên QA B"))throw new Error("stale row after error");
 await page.evaluate(()=>{globalThis.__UI2_013_QA.setRpcError("list_employee_profile_projection_v1",null);globalThis.__UI2_013_QA.setStaffRows("store-a",[])});
 await page.evaluate(()=>globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.refresh());
 await page.waitForFunction(()=>document.getElementById("view-staff")?.dataset.ui2OperationsState==="EMPTY");
 await page.evaluate(()=>{globalThis.__UI2_013_QA.resetStaff();return globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.refresh()});
 await page.waitForFunction(()=>document.getElementById("view-staff")?.dataset.ui2OperationsState==="READY");
 return "READY → store switch LOADING(no stale) → READY → ERROR(no stale) → EMPTY → READY";
});

await check("ui2_013_payroll_loading_error_empty_rows_store_switch_read_only",async()=>{
 await activate(page,"payroll-self-check");
 await page.evaluate(()=>globalThis.__UI2_013_QA.resetPayroll());
 await page.evaluate(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.refresh());
 await page.waitForFunction(()=>document.getElementById("view-payroll-self-check")?.dataset.ui2OperationsState==="READY");
 await page.evaluate(()=>globalThis.__UI2_013_QA.setDelay(140));
 await page.locator("#mgrPayrollStore").selectOption("store-b");
 await page.waitForFunction(()=>document.getElementById("view-payroll-self-check")?.dataset.ui2OperationsState==="LOADING");
 const during=await page.locator("#view-payroll-self-check").innerText();if(during.includes("Nhân viên QA A"))throw new Error("stale payroll row during store switch");
 await page.waitForFunction(()=>document.getElementById("view-payroll-self-check")?.dataset.ui2OperationsState==="READY");
 if(!(await page.locator("#view-payroll-self-check").innerText()).includes("Nhân viên QA B"))throw new Error("store-b payroll missing");
 await page.evaluate(()=>globalThis.__UI2_013_QA.setDelay(0));
 await page.evaluate(()=>globalThis.__UI2_013_QA.setRpcError("list_scoped_payroll_self_check_v1","QA_PAYROLL_ERROR"));
 await page.locator("#mgrPayrollStore").selectOption("store-a");
 await page.waitForFunction(()=>document.getElementById("view-payroll-self-check")?.dataset.ui2OperationsState==="ERROR");
 await page.evaluate(()=>{globalThis.__UI2_013_QA.setRpcError("list_scoped_payroll_self_check_v1",null);globalThis.__UI2_013_QA.setPayrollRows("store-a",[])});
 await page.evaluate(()=>globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.refresh());
 await page.waitForFunction(()=>document.getElementById("view-payroll-self-check")?.dataset.ui2OperationsState==="EMPTY");
 await page.evaluate(()=>{globalThis.__UI2_013_QA.resetPayroll();return globalThis.MAGASIN_MANAGER_PAYROLL_SELF_CHECK.refresh()});
 await page.waitForFunction(()=>document.getElementById("view-payroll-self-check")?.dataset.ui2OperationsState==="READY");
 const ui=await page.locator("#view-payroll-self-check").evaluate(root=>({buttons:[...root.querySelectorAll("button")].map(x=>x.textContent.trim()),text:root.innerText}));
 const calls=await page.evaluate(()=>globalThis.__UI2_013_QA.state.calls);
 if(ui.buttons.some(x=>/review|final|paid|chốt|duyệt/i.test(x)))throw new Error(JSON.stringify(ui.buttons));
 const scrubbed=ui.text.replace("monetary amount/pay-rate/pay-rule internals","");
 if(/₫|VND|pay rate|hourly rate|amount/i.test(scrubbed))throw new Error(ui.text);
 if(calls.some(x=>x.kind==="from"))throw new Error(JSON.stringify(calls.filter(x=>x.kind==="from")));
 if(calls.some(x=>/payroll.*(?:review|final|transition)|finalize/i.test(x.name||"")))throw new Error(JSON.stringify(calls));
 return JSON.stringify({buttons:ui.buttons,rpc:[...new Set(calls.filter(x=>x.kind==="rpc"&&x.name.includes("payroll")).map(x=>x.name))]});
});

await check("ui2_013_authority_boundary_and_diagnostics",async()=>{
 const calls=await page.evaluate(()=>globalThis.__UI2_013_QA.state.calls);
 const direct=calls.filter(x=>x.kind==="from");
 const listSwap=calls.filter(x=>x.name==="list_shift_swap_requests_v1");
 const listGive=calls.filter(x=>x.name==="list_shift_give_requests_v1");
 if(direct.length)throw new Error(JSON.stringify(direct));
 if(listSwap.some(x=>x.args.p_status!=="PEER_ACCEPTED")||listGive.some(x=>x.args.p_status!=="PENDING_MANAGER"))throw new Error(JSON.stringify({listSwap,listGive}));
 const relevant=report.request_failures.filter(x=>!x.includes("net::ERR_ABORTED"));
 if(report.page_errors.length||report.console_errors.length||relevant.length||report.http_errors.length)throw new Error(JSON.stringify({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:relevant,http_errors:report.http_errors}));
 return "PEER_ACCEPTED/PENDING_MANAGER gates preserved; 0 direct table/page/console/request/5xx errors";
});

await context.close();
await browser.close();
fs.writeFileSync(path.join(OUT,"ui2-013-manager-operations-report.json"),JSON.stringify(report,null,2));
console.log("UI2_013_MANAGER_OPERATIONS_BROWSER="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=="PASS")process.exitCode=1;
