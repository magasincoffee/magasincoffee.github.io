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

try{
  await page.goto(BASE+"/09_QA/people-shift/shift-swap-lifecycle-fixture.html",{waitUntil:"networkidle",timeout:20000});
  const employee=page.frameLocator("#employeeApp");

  await check("fixture_initializes_canonical_employee_and_manager_engines",async()=>{
    await employee.locator("#view-swap[data-employee-swap-engine='1']").waitFor({timeout:10000});
    await page.waitForFunction(()=>!!globalThis.MAGASIN_MANAGER_SWAP_APPROVAL);
    return "Employee + Manager engines active";
  });

  await check("employee_a_submits_requested_swap_with_required_reason",async()=>{
    await employee.locator("#swapChoices button").first().click();
    await employee.locator("#employeeRequesterSchedule").waitFor();
    await employee.locator("#employeeSwapTarget").selectOption("sch-b");
    await employee.locator("#employeeSwapReason").fill("Đổi ca vì lịch học");
    await employee.locator("#swapForm .swap-actions .btn.primary").click();
    await page.waitForFunction(()=>globalThis.__SWAP96_QA.swap?.status==="PENDING");
    await employee.locator("#historyList").filter({hasText:"Chờ người kia đồng ý"}).waitFor();
    const s=await page.evaluate(()=>globalThis.__SWAP96_QA.swap);
    if(s.requester_id!=="u-a"||s.target_user_id!=="u-b")throw new Error(JSON.stringify(s));
    return JSON.stringify({id:s.id,status:s.status});
  });

  await check("manager_queue_is_not_actionable_before_peer_acceptance",async()=>{
    await page.evaluate(()=>globalThis.__SWAP96_QA.refreshManager());
    await page.waitForTimeout(30);
    const buttons=await page.locator("#view-swap .js-swap-approve").count();
    const call=await page.evaluate(()=>globalThis.__SWAP96_QA.managerCalls.filter(x=>x.name==="list_shift_swap_requests_v1").at(-1));
    const keys=await page.evaluate(()=>[...globalThis.__SWAP96_QA.notifications.keys()]);
    if(buttons!==0||call?.args?.p_status!=="PEER_ACCEPTED"||keys.some(k=>k.endsWith(":manager_review")))throw new Error(JSON.stringify({buttons,call,keys}));
    return "0 actionable rows; Manager reader requests PEER_ACCEPTED only";
  });

  await check("target_employee_b_sees_incoming_and_accepts",async()=>{
    await page.evaluate(async()=>{globalThis.__SWAP96_QA.setUser("u-b");globalThis.__SWAP96_QA.refreshEmployee()});
    await employee.locator(".js-swap-peer-accept").waitFor({timeout:10000});
    const text=await employee.locator("#historyList").innerText();
    if(!text.includes("Đổi ca gửi đến bạn")||!text.includes("Nhân viên A"))throw new Error(text);
    await employee.locator(".js-swap-peer-accept").click();
    await page.waitForFunction(()=>globalThis.__SWAP96_QA.swap?.status==="PEER_ACCEPTED");
    await employee.locator("#historyList").filter({hasText:"Đã đồng ý · Chờ quản lý duyệt"}).waitFor();
    return "PEER_ACCEPTED";
  });

  await check("peer_accept_retry_is_idempotent_and_manager_notification_once",async()=>{
    const r=await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-b","respond_shift_swap_request",{p_swap_id:"swap-1",p_accept:true}));
    const keys=await page.evaluate(()=>[...globalThis.__SWAP96_QA.notifications.keys()]);
    const managerKeys=keys.filter(k=>k==="swap:swap-1:manager_review");
    if(r.error||r.data?.already_accepted!==true||managerKeys.length!==1)throw new Error(JSON.stringify({r,keys}));
    return "already_accepted=true; one manager_review key";
  });

  await check("requester_sees_peer_accepted_waiting_manager",async()=>{
    await page.evaluate(()=>{globalThis.__SWAP96_QA.setUser("u-a");globalThis.__SWAP96_QA.refreshEmployee()});
    await employee.locator("#historyList").filter({hasText:"Người kia đã đồng ý · Chờ quản lý"}).waitFor({timeout:10000});
    return "requester projection updated";
  });

  await check("manager_sees_only_peer_accepted_and_applies_atomic_swap",async()=>{
    await page.evaluate(()=>globalThis.__SWAP96_QA.refreshManager());
    await page.locator("#view-swap .js-swap-approve").waitFor({timeout:10000});
    const before=await page.locator("#view-swap").innerText();
    if(!before.includes("Người nhận đã đồng ý"))throw new Error(before);
    await page.locator("#view-swap .js-swap-approve").click();
    await page.waitForFunction(()=>globalThis.__SWAP96_QA.swap?.status==="APPROVED");
    const state=await page.evaluate(()=>({s:globalThis.__SWAP96_QA.schedules,applyCount:globalThis.__SWAP96_QA.applyCount}));
    if(state.s["sch-a"].user_id!=="u-b"||state.s["sch-b"].user_id!=="u-a"||state.applyCount!==1)throw new Error(JSON.stringify(state));
    return JSON.stringify({schA:state.s["sch-a"].user_id,schB:state.s["sch-b"].user_id,applyCount:state.applyCount});
  });

  await check("manager_approve_retry_never_swaps_ownership_back",async()=>{
    const r=await page.evaluate(()=>globalThis.__SWAP96_QA.managerRpc("approve_shift_swap",{p_swap_id:"swap-1"}));
    const state=await page.evaluate(()=>({s:globalThis.__SWAP96_QA.schedules,applyCount:globalThis.__SWAP96_QA.applyCount}));
    if(r.error||r.data?.already_applied!==true||state.applyCount!==1||state.s["sch-a"].user_id!=="u-b"||state.s["sch-b"].user_id!=="u-a")throw new Error(JSON.stringify({r,state}));
    return "already_applied=true; ownership unchanged";
  });

  await check("both_employee_schedule_sources_refresh_to_new_ownership",async()=>{
    await page.evaluate(()=>{globalThis.__SWAP96_QA.setUser("u-a");globalThis.__SWAP96_QA.refreshEmployee()});
    await employee.locator("#employeeRequesterSchedule option[value='sch-b']").waitFor({state:"attached",timeout:10000});
    if(await employee.locator("#employeeRequesterSchedule option[value='sch-a']").count())throw new Error("A still owns sch-a");

    await page.evaluate(()=>{globalThis.__SWAP96_QA.setUser("u-b");globalThis.__SWAP96_QA.refreshEmployee()});
    await employee.locator("#employeeRequesterSchedule option[value='sch-a']").waitFor({state:"attached",timeout:10000});
    if(await employee.locator("#employeeRequesterSchedule option[value='sch-b']").count())throw new Error("B still owns sch-b");
    return "A→sch-b; B→sch-a";
  });

  await check("notification_order_is_peer_first_and_idempotent",async()=>{
    const events=await page.evaluate(()=>[...globalThis.__SWAP96_QA.notifications.values()]);
    const types=events.map(x=>x.type);
    const requested=types.indexOf("SHIFT_SWAP_REQUESTED");
    const peer=types.indexOf("SHIFT_SWAP_PEER_ACCEPTED");
    const manager=types.indexOf("SHIFT_SWAP_MANAGER_REVIEW");
    const approved=types.indexOf("SHIFT_SWAP_APPROVED");
    if(requested<0||peer<0||manager<0||approved<0||!(requested<peer&&peer<manager&&manager<approved))throw new Error(JSON.stringify(types));
    if(types.filter(x=>x==="SHIFT_SWAP_MANAGER_REVIEW").length!==1)throw new Error("duplicate Manager notification");
    if(types.filter(x=>x==="SHIFT_SWAP_APPROVED").length!==2)throw new Error("expected approved notifications for both Employees");
    if(!types.includes("SCHEDULE_TRANSFERRED_OUT")||!types.includes("SCHEDULE_TRANSFERRED_IN"))throw new Error("schedule transfer notifications missing");
    return JSON.stringify(types);
  });

  await check("reload_retains_applied_state_and_employee_b_ownership",async()=>{
    await page.reload({waitUntil:"networkidle",timeout:20000});
    const e=page.frameLocator("#employeeApp");
    await e.locator("#view-swap[data-employee-swap-engine='1']").waitFor({timeout:10000});
    await page.waitForFunction(()=>globalThis.__SWAP96_QA.swap?.status==="APPROVED"&&globalThis.__SWAP96_QA.schedules["sch-a"].user_id==="u-b");
    await e.locator("#employeeRequesterSchedule option[value='sch-a']").waitFor({state:"attached",timeout:10000});
    const state=await page.evaluate(()=>({swap:globalThis.__SWAP96_QA.swap,s:globalThis.__SWAP96_QA.schedules,applyCount:globalThis.__SWAP96_QA.applyCount}));
    if(state.applyCount!==1||state.s["sch-b"].user_id!=="u-a")throw new Error(JSON.stringify(state));
    return "reload kept APPROVED + swapped ownership";
  });

  await check("negative_target_cannot_accept_another_persons_swap",async()=>{
    await page.evaluate(()=>globalThis.__SWAP96_QA.reset());
    await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-a","submit_shift_swap_request",{p_requester_schedule_id:"sch-a",p_target_schedule_id:"sch-b",p_reason:"QA"}));
    const r=await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-a","respond_shift_swap_request",{p_swap_id:"swap-1",p_accept:true}));
    if(!r.error?.message.includes("SHIFT_SWAP_NOT_TARGET"))throw new Error(JSON.stringify(r));
    return "SHIFT_SWAP_NOT_TARGET";
  });

  await check("negative_manager_cannot_approve_before_peer_acceptance",async()=>{
    const r=await page.evaluate(()=>globalThis.__SWAP96_QA.managerRpc("approve_shift_swap",{p_swap_id:"swap-1"}));
    if(!r.error?.message.includes("SHIFT_SWAP_PEER_ACCEPTANCE_REQUIRED"))throw new Error(JSON.stringify(r));
    return "SHIFT_SWAP_PEER_ACCEPTANCE_REQUIRED";
  });

  await check("negative_peer_reject_blocks_manager_apply",async()=>{
    const peer=await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-b","respond_shift_swap_request",{p_swap_id:"swap-1",p_accept:false}));
    const mgr=await page.evaluate(()=>globalThis.__SWAP96_QA.managerRpc("approve_shift_swap",{p_swap_id:"swap-1"}));
    if(peer.error||peer.data?.status!=="REJECTED"||!mgr.error?.message.includes("SHIFT_SWAP_PEER_ACCEPTANCE_REQUIRED"))throw new Error(JSON.stringify({peer,mgr}));
    return "peer REJECTED terminal";
  });

  await check("negative_cancelled_request_cannot_be_accepted",async()=>{
    await page.evaluate(()=>globalThis.__SWAP96_QA.reset());
    await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-a","submit_shift_swap_request",{p_requester_schedule_id:"sch-a",p_target_schedule_id:"sch-b",p_reason:"QA"}));
    await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-a","cancel_shift_swap",{p_swap_id:"swap-1"}));
    const r=await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-b","respond_shift_swap_request",{p_swap_id:"swap-1",p_accept:true}));
    if(!r.error?.message.includes("SHIFT_SWAP_NOT_AWAITING_PEER"))throw new Error(JSON.stringify(r));
    return "CANCELLED fail closed";
  });

  await check("negative_stale_ownership_fails_peer_revalidation",async()=>{
    await page.evaluate(()=>globalThis.__SWAP96_QA.reset());
    await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-a","submit_shift_swap_request",{p_requester_schedule_id:"sch-a",p_target_schedule_id:"sch-b",p_reason:"QA"}));
    await page.evaluate(()=>globalThis.__SWAP96_QA.setScheduleOwner("sch-a","u-b"));
    const r=await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-b","respond_shift_swap_request",{p_swap_id:"swap-1",p_accept:true}));
    if(!r.error?.message.includes("REQUESTER_OWNERSHIP_CHANGED"))throw new Error(JSON.stringify(r));
    return "REQUESTER_OWNERSHIP_CHANGED";
  });

  for(const [name,fault,code] of [
    ["inactive_requester","requesterInactive","REQUESTER_INACTIVE"],
    ["inactive_target","targetInactive","TARGET_INACTIVE"],
    ["attendance_existing","attendance","ATTENDANCE_ALREADY_EXISTS"],
    ["pending_give","give","SCHEDULE_HAS_PENDING_GIVE"],
    ["resulting_overlap","overlap","REQUESTER_RESULTING_OVERLAP"],
    ["max_two_day","maxTwo","REQUESTER_MAX_TWO_ASSIGNMENTS_PER_DAY"],
    ["availability_mismatch","availability","REQUESTER_NOT_AVAILABLE_FOR_TARGET_SHIFT"]
  ]){
    await check("negative_"+name+"_blocks_submit",async()=>{
      const r=await page.evaluate(async({fault,code})=>{
        globalThis.__SWAP96_QA.reset();
        globalThis.__SWAP96_QA.faults[fault]=true;
        return globalThis.__SWAP96_QA.employeeRpcAs("u-a","submit_shift_swap_request",{p_requester_schedule_id:"sch-a",p_target_schedule_id:"sch-b",p_reason:"QA"});
      },{fault,code});
      if(!r.error?.message.includes(code))throw new Error(JSON.stringify(r));
      return code;
    });
  }

  await check("negative_duplicate_active_swap_is_rejected",async()=>{
    await page.evaluate(()=>globalThis.__SWAP96_QA.reset());
    const a=await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-a","submit_shift_swap_request",{p_requester_schedule_id:"sch-a",p_target_schedule_id:"sch-b",p_reason:"QA"}));
    const b=await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-a","submit_shift_swap_request",{p_requester_schedule_id:"sch-a",p_target_schedule_id:"sch-b",p_reason:"QA2"}));
    if(a.error||!b.error?.message.includes("SHIFT_SWAP_ALREADY_ACTIVE"))throw new Error(JSON.stringify({a,b}));
    return "SHIFT_SWAP_ALREADY_ACTIVE";
  });

  await check("negative_nonexistent_schedule_fails_closed",async()=>{
    await page.evaluate(()=>globalThis.__SWAP96_QA.reset());
    const r=await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-a","submit_shift_swap_request",{p_requester_schedule_id:"missing",p_target_schedule_id:"sch-b",p_reason:"QA"}));
    if(!r.error?.message.includes("REQUESTER_SCHEDULE_NOT_FOUND")&&!r.error?.message.includes("REQUESTER_SCHEDULE_NOT_OWNED"))throw new Error(JSON.stringify(r));
    return r.error.message;
  });

  await check("negative_manager_outside_store_scope_denied",async()=>{
    await page.evaluate(()=>globalThis.__SWAP96_QA.reset());
    await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-a","submit_shift_swap_request",{p_requester_schedule_id:"sch-a",p_target_schedule_id:"sch-b",p_reason:"QA"}));
    await page.evaluate(()=>globalThis.__SWAP96_QA.employeeRpcAs("u-b","respond_shift_swap_request",{p_swap_id:"swap-1",p_accept:true}));
    await page.evaluate(()=>globalThis.__SWAP96_QA.setManagerScope(false));
    const r=await page.evaluate(()=>globalThis.__SWAP96_QA.managerRpc("approve_shift_swap",{p_swap_id:"swap-1"}));
    if(!r.error?.message.includes("STORE_NOT_ALLOWED"))throw new Error(JSON.stringify(r));
    return "STORE_NOT_ALLOWED";
  });

  await check("browser_uses_rpc_contract_not_direct_shift_swap_table_mutation",async()=>{
    const calls=await page.evaluate(()=>({employee:globalThis.__SWAP96_QA.calls,manager:globalThis.__SWAP96_QA.managerCalls}));
    if(calls.employee.some(x=>x.name===".from")||calls.manager.some(x=>x.name===".from"))throw new Error(JSON.stringify(calls));
    return "RPC-only fixture";
  });

  add("page_errors",report.page_errors.length?"FAIL":"PASS",report.page_errors.length?JSON.stringify(report.page_errors):"0");
  add("console_errors",report.console_errors.length?"FAIL":"PASS",report.console_errors.length?JSON.stringify(report.console_errors):"0");
  add("request_failures",report.request_failures.length?"FAIL":"PASS",report.request_failures.length?JSON.stringify(report.request_failures):"0");
  add("http_5xx",report.http_errors.length?"FAIL":"PASS",report.http_errors.length?JSON.stringify(report.http_errors):"0");

  await page.screenshot({path:path.join(OUT,"shift-swap-lifecycle-v1.png"),fullPage:true});
}catch(e){
  add("browser_harness","FAIL",e?.stack||e);
}finally{
  await browser.close();
}

const failed=report.checks.filter(x=>x.status==="FAIL");
report.status=failed.length?"FAIL":"PASS";
fs.writeFileSync(path.join(OUT,"shift-swap-lifecycle-v1.json"),JSON.stringify(report,null,2));
console.log("SHIFT_SWAP_LIFECYCLE_BROWSER="+report.status);
for(const item of report.checks)console.log("["+item.status+"] "+item.name+(item.detail?" — "+item.detail:""));
if(failed.length)process.exit(1);
