import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});

const report={generated_at:new Date().toISOString(),status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
const add=(name,status,detail="")=>report.checks.push({name,status,detail:String(detail||"")});
async function check(name,fn){try{add(name,"PASS",await fn())}catch(e){add(name,"FAIL",e?.message||e)}}

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1200,height:900},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push({url:r.url(),method:r.method(),error:r.failure()?.errorText||"unknown"}));
page.on("response",r=>{if(r.status()>=500)report.http_errors.push({url:r.url(),status:r.status()})});

async function reloadAs(id){
  await page.evaluate(id=>globalThis.__GIVE97_QA.switchUserPersist(id),id);
  await page.reload({waitUntil:"networkidle",timeout:20000});
  const employee=page.frameLocator("#employeeApp");
  await employee.locator("#view-swap[data-employee-swap-engine='1']").waitFor({timeout:10000});
  await page.waitForFunction(()=>!!globalThis.MAGASIN_MANAGER_SHIFT_CHANGE);
  return employee;
}

try{
 await page.goto(BASE+"/09_QA/people-shift/shift-give-lifecycle-fixture.html",{waitUntil:"networkidle",timeout:20000});
 let employee=page.frameLocator("#employeeApp");

 await check("fixture_initializes_employee_and_manager_engines",async()=>{
  await employee.locator("#view-swap[data-employee-swap-engine='1']").waitFor({timeout:10000});
  await page.waitForFunction(()=>!!globalThis.MAGASIN_MANAGER_SHIFT_CHANGE);
  return "Employee + Manager canonical engines active";
 });

 await check("giver_opens_real_give_flow_and_sees_eligible_recipient",async()=>{
  await employee.locator("#swapChoices button").filter({hasText:"Cho ca"}).click();
  await employee.locator("#employeeRequesterSchedule").waitFor();
  await employee.locator("#employeeSwapTarget").waitFor();
  const optionCount=await employee.locator("#employeeSwapTarget option[value='u-b']").count();
  const label=await employee.locator("#partnerTitle").innerText();
  if(optionCount!==1||!label.includes("Người nhận ca"))throw new Error(JSON.stringify({optionCount,label}));
  return "u-b eligible";
 });

 await check("giver_submit_creates_pending_recipient_without_ownership_change",async()=>{
  await employee.locator("#employeeSwapTarget").selectOption("u-b");
  await employee.locator("#employeeSwapReason").fill("Nhờ nhận ca");
  await employee.locator("#swapForm .swap-actions .btn.primary").click();
  await page.waitForFunction(()=>globalThis.__GIVE97_QA.give?.status==="PENDING_RECIPIENT");
  await employee.locator("#historyList").filter({hasText:"Chờ người nhận"}).waitFor();
  const s=await page.evaluate(()=>({g:globalThis.__GIVE97_QA.give,sch:globalThis.__GIVE97_QA.schedule}));
  if(s.sch.user_id!=="u-a"||s.g.giver_id!=="u-a"||s.g.recipient_id!=="u-b")throw new Error(JSON.stringify(s));
  return JSON.stringify({status:s.g.status,owner:s.sch.user_id});
 });

 await check("manager_queue_not_actionable_before_recipient_acceptance",async()=>{
  await page.evaluate(()=>globalThis.__GIVE97_QA.refreshManager());
  await page.waitForTimeout(30);
  const buttons=await page.locator("#view-swap .js-give-approve").count();
  const call=await page.evaluate(()=>globalThis.__GIVE97_QA.managerCalls.filter(x=>x.name==="list_shift_give_requests_v1").at(-1));
  const keys=await page.evaluate(()=>[...globalThis.__GIVE97_QA.notifications.keys()]);
  if(buttons!==0||call?.args?.p_status!=="PENDING_MANAGER"||keys.some(k=>k.endsWith(":manager_review")))throw new Error(JSON.stringify({buttons,call,keys}));
  return "Manager only queries PENDING_MANAGER; 0 actionable before consent";
 });

 await check("recipient_b_sees_incoming_and_accepts",async()=>{
  employee=await reloadAs("u-b");
  await employee.locator(".js-give-accept").waitFor({timeout:10000});
  const before=await employee.locator("#historyList").innerText();
  if(!before.includes("Từ Nhân viên A")||!before.includes("Nhờ nhận ca"))throw new Error(before);
  await employee.locator(".js-give-accept").click();
  await page.waitForFunction(()=>globalThis.__GIVE97_QA.give?.status==="PENDING_MANAGER");
  await employee.locator("#historyList").filter({hasText:"Đã đồng ý nhận ca · Chờ quản lý duyệt"}).waitFor();
  return "PENDING_MANAGER";
 });

 await check("recipient_accept_retry_is_idempotent_and_manager_review_once",async()=>{
  const r=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-b","respond_shift_give_request",{p_give_id:"give-1",p_accept:true}));
  const keys=await page.evaluate(()=>[...globalThis.__GIVE97_QA.notifications.keys()]);
  if(r.error||r.data?.already_accepted!==true||keys.filter(k=>k==="give:give-1:manager_review").length!==1)throw new Error(JSON.stringify({r,keys}));
  return "already_accepted=true; one manager_review key";
 });

 await check("giver_sees_recipient_accepted_waiting_manager",async()=>{
  employee=await reloadAs("u-a");
  await employee.locator("#historyList").filter({hasText:"Đã đồng ý nhận ca · Chờ quản lý duyệt"}).waitFor({timeout:10000});
  return "giver projection updated";
 });

 await check("manager_sees_only_recipient_accepted_and_applies_atomic_transfer",async()=>{
  await page.evaluate(()=>globalThis.__GIVE97_QA.refreshManager());
  await page.locator("#view-swap .js-give-approve").waitFor({timeout:10000});
  const txt=await page.locator("#view-swap").innerText();
  if(!txt.includes("Người nhận đã đồng ý"))throw new Error(txt);
  await page.locator("#view-swap .js-give-approve").click();
  await page.waitForFunction(()=>globalThis.__GIVE97_QA.give?.status==="APPROVED");
  const state=await page.evaluate(()=>({g:globalThis.__GIVE97_QA.give,sch:globalThis.__GIVE97_QA.schedule,count:globalThis.__GIVE97_QA.transferCount}));
  if(state.sch.user_id!=="u-b"||state.count!==1||state.g.status!=="APPROVED")throw new Error(JSON.stringify(state));
  return JSON.stringify({owner:state.sch.user_id,status:state.g.status,transferCount:state.count});
 });

 await check("manager_approve_retry_is_stable_and_never_transfers_twice",async()=>{
  const r=await page.evaluate(()=>globalThis.__GIVE97_QA.managerRpc("approve_shift_give",{p_give_id:"give-1"}));
  const state=await page.evaluate(()=>({owner:globalThis.__GIVE97_QA.schedule.user_id,count:globalThis.__GIVE97_QA.transferCount}));
  if(r.error||r.data?.already_applied!==true||r.data?.transferred!==false||state.owner!=="u-b"||state.count!==1)throw new Error(JSON.stringify({r,state}));
  return "already_applied=true; transferCount=1";
 });

 await check("old_owner_schedule_refresh_removes_assignment",async()=>{
  employee=await reloadAs("u-a");
  await employee.locator("#swapChoices button").filter({hasText:"Cho ca"}).click();
  await page.waitForTimeout(50);
  const own=await employee.locator("#employeeRequesterSchedule option[value='sch-give']").count();
  if(own!==0)throw new Error("old owner still sees transferred assignment");
  return "u-a no longer owns sch-give";
 });

 await check("new_owner_schedule_refresh_shows_same_assignment_identity",async()=>{
  employee=await reloadAs("u-b");
  await employee.locator("#swapChoices button").filter({hasText:"Cho ca"}).click();
  await employee.locator("#employeeRequesterSchedule").waitFor({timeout:10000});
  const optionCount=await employee.locator("#employeeRequesterSchedule option[value='sch-give']").count();
  const value=await employee.locator("#employeeRequesterSchedule").inputValue();
  if(optionCount!==1||value!=="sch-give")throw new Error(JSON.stringify({optionCount,value}));
  return "u-b owns canonical schedule_id sch-give";
 });

 await check("notification_order_is_recipient_first_and_idempotent",async()=>{
  const events=await page.evaluate(()=>[...globalThis.__GIVE97_QA.notifications.values()]);
  const types=events.map(x=>x.type);
  const requested=types.indexOf("SHIFT_GIVE_REQUESTED");
  const accepted=types.indexOf("SHIFT_GIVE_RECIPIENT_ACCEPTED");
  const manager=types.indexOf("SHIFT_GIVE_MANAGER_REVIEW");
  const approved=types.indexOf("SHIFT_GIVE_APPROVED");
  if(requested<0||accepted<0||manager<0||approved<0||!(requested<accepted&&accepted<manager&&manager<approved))throw new Error(JSON.stringify(types));
  if(types.filter(x=>x==="SHIFT_GIVE_MANAGER_REVIEW").length!==1)throw new Error("duplicate Manager review");
  if(types.filter(x=>x==="SHIFT_GIVE_APPROVED").length!==2)throw new Error("expected giver+recipient approval events");
  if(!types.includes("SCHEDULE_TRANSFERRED_OUT")||!types.includes("SCHEDULE_TRANSFERRED_IN"))throw new Error("schedule transfer events missing");
  return JSON.stringify(types);
 });

 await check("reload_retains_applied_state_and_new_owner",async()=>{
  await page.reload({waitUntil:"networkidle",timeout:20000});
  employee=page.frameLocator("#employeeApp");
  await employee.locator("#view-swap[data-employee-swap-engine='1']").waitFor({timeout:10000});
  await page.waitForFunction(()=>globalThis.__GIVE97_QA.give?.status==="APPROVED"&&globalThis.__GIVE97_QA.schedule.user_id==="u-b");
  await employee.locator("#swapChoices button").filter({hasText:"Cho ca"}).click();
  await employee.locator("#employeeRequesterSchedule").waitFor({timeout:10000});
  const optionCount=await employee.locator("#employeeRequesterSchedule option[value='sch-give']").count();
  if(optionCount!==1)throw new Error("new owner schedule option missing after reload");
  const count=await page.evaluate(()=>globalThis.__GIVE97_QA.transferCount);
  if(count!==1)throw new Error("transfer repeated after reload");
  return "APPROVED + owner u-b persisted";
 });

 await check("negative_wrong_recipient_cannot_accept",async()=>{
  await page.evaluate(()=>globalThis.__GIVE97_QA.reset());
  await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","submit_shift_give_request",{p_schedule_id:"sch-give",p_recipient_user_id:"u-b",p_reason:"QA"}));
  const r=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","respond_shift_give_request",{p_give_id:"give-1",p_accept:true}));
  if(!r.error?.message.includes("RECIPIENT_NOT_ALLOWED"))throw new Error(JSON.stringify(r));
  return "RECIPIENT_NOT_ALLOWED";
 });

 await check("negative_manager_cannot_approve_before_recipient_acceptance",async()=>{
  const r=await page.evaluate(()=>globalThis.__GIVE97_QA.managerRpc("approve_shift_give",{p_give_id:"give-1"}));
  if(!r.error?.message.includes("SHIFT_GIVE_NOT_PENDING_MANAGER"))throw new Error(JSON.stringify(r));
  return "SHIFT_GIVE_NOT_PENDING_MANAGER";
 });

 await check("negative_recipient_reject_prevents_manager_apply",async()=>{
  const peer=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-b","respond_shift_give_request",{p_give_id:"give-1",p_accept:false}));
  const mgr=await page.evaluate(()=>globalThis.__GIVE97_QA.managerRpc("approve_shift_give",{p_give_id:"give-1"}));
  if(peer.error||peer.data?.status!=="REJECTED_RECIPIENT"||!mgr.error?.message.includes("SHIFT_GIVE_NOT_PENDING_MANAGER"))throw new Error(JSON.stringify({peer,mgr}));
  return "REJECTED_RECIPIENT terminal";
 });

 const negativeSubmit=[
  ["recipient_inactive","recipientInactive","RECIPIENT_INACTIVE"],
  ["recipient_non_staff","recipientNonStaff","RECIPIENT_NOT_STAFF"],
  ["giver_inactive","giverInactive","GIVER_INACTIVE"],
  ["giver_non_staff","giverNonStaff","GIVER_NOT_STAFF"],
  ["attendance_exists","attendance","ATTENDANCE_ALREADY_EXISTS"],
  ["availability_missing","availability","RECIPIENT_NOT_AVAILABLE"],
  ["explicit_unavailable","explicitUnavailable","RECIPIENT_UNAVAILABLE"],
  ["resulting_overlap","overlap","RECIPIENT_RESULTING_OVERLAP"],
  ["resulting_max_two","maxTwo","RECIPIENT_MAX_TWO_ASSIGNMENTS_PER_DAY"],
  ["daily_hours_cap","dailyHours","RECIPIENT_DAILY_HOURS_LIMIT"],
  ["weekly_hours_cap","weeklyHours","RECIPIENT_WEEKLY_HOURS_LIMIT"],
  ["active_swap_pending","swapPending","SCHEDULE_HAS_ACTIVE_SWAP"],
  ["active_swap_peer_accepted","swapPeerAccepted","SCHEDULE_HAS_ACTIVE_SWAP"]
 ];
 for(const [name,fault,code] of negativeSubmit){
  await check("negative_"+name+"_blocks_submit",async()=>{
   const r=await page.evaluate(async({fault})=>{
    globalThis.__GIVE97_QA.reset();
    globalThis.__GIVE97_QA.faults[fault]=true;
    return globalThis.__GIVE97_QA.employeeRpcAs("u-a","submit_shift_give_request",{p_schedule_id:"sch-give",p_recipient_user_id:"u-b",p_reason:"QA"});
   },{fault});
   if(!r.error?.message.includes(code))throw new Error(JSON.stringify(r));
   return code;
  });
 }

 await check("negative_recipient_equals_giver_fails",async()=>{
  await page.evaluate(()=>globalThis.__GIVE97_QA.reset());
  const r=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","submit_shift_give_request",{p_schedule_id:"sch-give",p_recipient_user_id:"u-a",p_reason:"QA"}));
  if(!r.error?.message.includes("SAME_EMPLOYEE_GIVE"))throw new Error(JSON.stringify(r));
  return "SAME_EMPLOYEE_GIVE";
 });

 await check("negative_duplicate_active_give_is_rejected",async()=>{
  await page.evaluate(()=>globalThis.__GIVE97_QA.reset());
  const a=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","submit_shift_give_request",{p_schedule_id:"sch-give",p_recipient_user_id:"u-b",p_reason:"QA"}));
  const b=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","submit_shift_give_request",{p_schedule_id:"sch-give",p_recipient_user_id:"u-b",p_reason:"QA2"}));
  if(a.error||!b.error?.message.includes("SHIFT_GIVE_ALREADY_PENDING"))throw new Error(JSON.stringify({a,b}));
  return "SHIFT_GIVE_ALREADY_PENDING";
 });

 await check("negative_stale_giver_ownership_fails_recipient_accept",async()=>{
  await page.evaluate(()=>globalThis.__GIVE97_QA.reset());
  await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","submit_shift_give_request",{p_schedule_id:"sch-give",p_recipient_user_id:"u-b",p_reason:"QA"}));
  await page.evaluate(()=>globalThis.__GIVE97_QA.setScheduleOwner("u-b"));
  const r=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-b","respond_shift_give_request",{p_give_id:"give-1",p_accept:true}));
  if(!r.error?.message.includes("GIVER_OWNERSHIP_CHANGED"))throw new Error(JSON.stringify(r));
  return "GIVER_OWNERSHIP_CHANGED";
 });

 await check("negative_schedule_non_approved_fails_recipient_accept",async()=>{
  await page.evaluate(()=>globalThis.__GIVE97_QA.reset());
  await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","submit_shift_give_request",{p_schedule_id:"sch-give",p_recipient_user_id:"u-b",p_reason:"QA"}));
  await page.evaluate(()=>globalThis.__GIVE97_QA.setScheduleStatus("CANCELLED"));
  const r=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-b","respond_shift_give_request",{p_give_id:"give-1",p_accept:true}));
  if(!r.error?.message.includes("SCHEDULE_NOT_APPROVED"))throw new Error(JSON.stringify(r));
  return "SCHEDULE_NOT_APPROVED";
 });

 await check("negative_manager_outside_store_scope_denied",async()=>{
  await page.evaluate(()=>globalThis.__GIVE97_QA.reset());
  await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","submit_shift_give_request",{p_schedule_id:"sch-give",p_recipient_user_id:"u-b",p_reason:"QA"}));
  await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-b","respond_shift_give_request",{p_give_id:"give-1",p_accept:true}));
  await page.evaluate(()=>globalThis.__GIVE97_QA.setManagerScope(false));
  const r=await page.evaluate(()=>globalThis.__GIVE97_QA.managerRpc("approve_shift_give",{p_give_id:"give-1"}));
  if(!r.error?.message.includes("STORE_NOT_ALLOWED"))throw new Error(JSON.stringify(r));
  return "STORE_NOT_ALLOWED";
 });

 await check("negative_nonexistent_schedule_fails_closed",async()=>{
  await page.evaluate(()=>globalThis.__GIVE97_QA.reset());
  const r=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","submit_shift_give_request",{p_schedule_id:"missing",p_recipient_user_id:"u-b",p_reason:"QA"}));
  if(!r.error?.message.includes("SCHEDULE_NOT_FOUND"))throw new Error(JSON.stringify(r));
  return "SCHEDULE_NOT_FOUND";
 });

 await check("browser_uses_rpc_contract_not_direct_give_or_schedule_table_mutation",async()=>{
  const calls=await page.evaluate(()=>({employee:globalThis.__GIVE97_QA.calls,manager:globalThis.__GIVE97_QA.managerCalls}));
  if(calls.employee.some(x=>String(x.name).startsWith(".from"))||calls.manager.some(x=>String(x.name).startsWith(".from")))throw new Error(JSON.stringify(calls));
  return "RPC-only canonical mutation path";
 });

 add("page_errors",report.page_errors.length?"FAIL":"PASS",report.page_errors.length?JSON.stringify(report.page_errors):"0");
 add("console_errors",report.console_errors.length?"FAIL":"PASS",report.console_errors.length?JSON.stringify(report.console_errors):"0");
 add("request_failures",report.request_failures.length?"FAIL":"PASS",report.request_failures.length?JSON.stringify(report.request_failures):"0");
 add("http_5xx",report.http_errors.length?"FAIL":"PASS",report.http_errors.length?JSON.stringify(report.http_errors):"0");

 await page.screenshot({path:path.join(OUT,"shift-give-lifecycle-v1.png"),fullPage:true});
}catch(e){
 add("browser_harness","FAIL",e?.stack||e);
}finally{
 await browser.close();
}

const failed=report.checks.filter(x=>x.status==="FAIL");
report.status=failed.length?"FAIL":"PASS";
fs.writeFileSync(path.join(OUT,"shift-give-lifecycle-v1.json"),JSON.stringify(report,null,2));
console.log("SHIFT_GIVE_LIFECYCLE_BROWSER="+report.status);
for(const item of report.checks)console.log("["+item.status+"] "+item.name+(item.detail?" — "+item.detail:""));
if(failed.length)process.exit(1);
