import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
async function check(name,fn){
  try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}
  catch(e){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)});throw e}
}
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1200,height:900},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push({url:r.url(),method:r.method(),error:r.failure()?.errorText||"unknown"}));
page.on("response",r=>{if(r.status()>=500)report.http_errors.push({url:r.url(),status:r.status()})});

async function frame(){const f=page.frameLocator("#employeeApp");await f.locator("#view-swap[data-employee-swap-engine='1']").waitFor({timeout:10000});return f}
async function reloadAs(id){
  await page.evaluate(id=>globalThis.__GIVE97_QA.switchUserPersist(id),id);
  await page.reload({waitUntil:"networkidle",timeout:20000});
  await page.waitForFunction(()=>!!globalThis.__GIVE97_QA&&!!globalThis.MAGASIN_MANAGER_SHIFT_CHANGE);
  return frame();
}
const managerRead=()=>page.evaluate(()=>globalThis.__GIVE97_QA.managerRpc("get_manager_weekly_schedule",{p_store_id:"store-a",p_week_start:"2026-09-28"}));
const ownerRead=()=>page.evaluate(()=>globalThis.__GIVE97_QA.ownerRpc("get_manager_weekly_schedule",{p_store_id:"store-a",p_week_start:"2026-09-28"}));

try{
  await page.goto(BASE+"/09_QA/people-shift/shift-give-lifecycle-fixture.html",{waitUntil:"networkidle",timeout:20000});
  await page.evaluate(()=>globalThis.__GIVE97_QA.reset());
  let employee=await frame();
  await page.waitForFunction(()=>!!globalThis.MAGASIN_MANAGER_SHIFT_CHANGE);

  let staleA=null;
  await check("sched06_initial_three_roles_resolve_same_official_identity",async()=>{
    const [a,m,o]=await Promise.all([
      page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","list_my_approved_schedules_v2",{p_week_start:"2026-09-28"})),
      managerRead(),
      ownerRead()
    ]);
    if(a.error||m.error||o.error)throw new Error(JSON.stringify({a,m,o}));
    if(a.data.length!==1||m.data.length!==1||o.data.length!==1)throw new Error(JSON.stringify({a,m,o}));
    const ids=[a.data[0].schedule_id,m.data[0].schedule_id,o.data[0].schedule_id];
    const owners=[a.data[0].user_id,m.data[0].user_id,o.data[0].user_id];
    if(ids.some(x=>x!=="sch-give")||owners.some(x=>x!=="u-a"))throw new Error(JSON.stringify({ids,owners}));
    staleA={...a.data[0]};
    return "Employee/Manager/Owner => sch-give owner u-a";
  });

  await check("sched06_give_a_to_b_uses_canonical_employee_and_manager_engines",async()=>{
    await employee.locator("#swapChoices button").filter({hasText:"Cho ca"}).click();
    await employee.locator("#employeeRequesterSchedule").waitFor();
    await employee.locator("#employeeSwapTarget").selectOption("u-b");
    await employee.locator("#employeeSwapReason").fill("SCHED-06 sync proof");
    await employee.locator("#swapForm .swap-actions .btn.primary").click();
    await page.waitForFunction(()=>globalThis.__GIVE97_QA.give?.status==="PENDING_RECIPIENT");

    employee=await reloadAs("u-b");
    await employee.locator(".js-give-accept").waitFor({timeout:10000});
    await employee.locator(".js-give-accept").click();
    await page.waitForFunction(()=>globalThis.__GIVE97_QA.give?.status==="PENDING_MANAGER");

    await page.evaluate(()=>globalThis.__GIVE97_QA.refreshManager());
    await page.locator("#view-swap .js-give-approve").waitFor({timeout:10000});
    await page.locator("#view-swap .js-give-approve").click();
    await page.waitForFunction(()=>globalThis.__GIVE97_QA.give?.status==="APPROVED"&&globalThis.__GIVE97_QA.schedule.user_id==="u-b");
    const s=await page.evaluate(()=>({schedule:globalThis.__GIVE97_QA.schedule,transferCount:globalThis.__GIVE97_QA.transferCount,give:globalThis.__GIVE97_QA.give}));
    if(s.schedule.id!=="sch-give"||s.schedule.user_id!=="u-b"||s.transferCount!==1||s.give.status!=="APPROVED")throw new Error(JSON.stringify(s));
    return "same sch-give transferred exactly once u-a -> u-b";
  });

  await check("sched06_after_transfer_all_roles_converge_and_old_owner_disappears",async()=>{
    const [a,b,m,o]=await Promise.all([
      page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","list_my_approved_schedules_v2",{p_week_start:"2026-09-28"})),
      page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-b","list_my_approved_schedules_v2",{p_week_start:"2026-09-28"})),
      managerRead(),
      ownerRead()
    ]);
    if(a.error||b.error||m.error||o.error)throw new Error(JSON.stringify({a,b,m,o}));
    if(a.data.length!==0||b.data.length!==1||m.data.length!==1||o.data.length!==1)throw new Error(JSON.stringify({a,b,m,o}));
    for(const row of [b.data[0],m.data[0],o.data[0]])if(row.schedule_id!=="sch-give"||row.user_id!=="u-b")throw new Error(JSON.stringify({b,m,o}));
    if(staleA?.schedule_id!=="sch-give"||staleA?.user_id!=="u-a")throw new Error(JSON.stringify(staleA));
    return "A=0; B/Manager/Owner => sch-give owner u-b";
  });

  await check("sched06_double_approve_retry_never_reverses_or_duplicates_transfer",async()=>{
    const [r1,r2]=await Promise.all([
      page.evaluate(()=>globalThis.__GIVE97_QA.managerRpc("approve_shift_give",{p_give_id:"give-1"})),
      page.evaluate(()=>globalThis.__GIVE97_QA.managerRpc("approve_shift_give",{p_give_id:"give-1"}))
    ]);
    const s=await page.evaluate(()=>({schedule:globalThis.__GIVE97_QA.schedule,transferCount:globalThis.__GIVE97_QA.transferCount}));
    if(r1.error||r2.error||r1.data?.already_applied!==true||r2.data?.already_applied!==true||s.transferCount!==1||s.schedule.user_id!=="u-b")throw new Error(JSON.stringify({r1,r2,s}));
    return "two retries => already_applied; transferCount=1";
  });

  await check("sched06_attendance_authority_follows_current_owner",async()=>{
    const oldOwner=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","submit_manual_time_attendance_v1",{p_schedule_id:"sch-give",p_actual_start:"06:10",p_actual_end:"12:05",p_note:"stale owner"}));
    if(!oldOwner.error?.message.includes("ATTENDANCE_NOT_CURRENT_OWNER"))throw new Error(JSON.stringify(oldOwner));
    const current=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-b","submit_manual_time_attendance_v1",{p_schedule_id:"sch-give",p_actual_start:"06:10",p_actual_end:"12:05",p_note:"current owner"}));
    const retry=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-b","submit_manual_time_attendance_v1",{p_schedule_id:"sch-give",p_actual_start:"06:10",p_actual_end:"12:05",p_note:"current owner"}));
    const a=await page.evaluate(()=>globalThis.__GIVE97_QA.attendance);
    if(current.error||retry.error||current.data?.already_submitted!==false||retry.data?.already_submitted!==true||a?.user_id!=="u-b"||a?.schedule_id!=="sch-give")throw new Error(JSON.stringify({current,retry,a}));
    return "A=DENY; B=ALLOW; retry same attendance identity";
  });

  await check("sched06_reload_preserves_b_owner_and_stale_a_cannot_resurrect",async()=>{
    employee=await reloadAs("u-a");
    const [a,m,o]=await Promise.all([
      page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","list_my_approved_schedules_v2",{p_week_start:"2026-09-28"})),
      managerRead(),
      ownerRead()
    ]);
    const denied=await page.evaluate(()=>globalThis.__GIVE97_QA.employeeRpcAs("u-a","submit_manual_time_attendance_v1",{p_schedule_id:"sch-give",p_actual_start:"06:10",p_actual_end:"12:05",p_note:"reload stale"}));
    const s=await page.evaluate(()=>({schedule:globalThis.__GIVE97_QA.schedule,transferCount:globalThis.__GIVE97_QA.transferCount,attendance:globalThis.__GIVE97_QA.attendance}));
    if(a.data.length!==0||m.data[0]?.user_id!=="u-b"||o.data[0]?.user_id!=="u-b"||!denied.error?.message.includes("ATTENDANCE_NOT_CURRENT_OWNER")||s.schedule.user_id!=="u-b"||s.transferCount!==1||s.attendance?.user_id!=="u-b")throw new Error(JSON.stringify({a,m,o,denied,s}));
    return "reload => owner u-b; stale A remains denied";
  });

  await check("sched06_cross_store_manager_and_owner_reads_fail_closed",async()=>{
    const [m,o]=await Promise.all([
      page.evaluate(()=>globalThis.__GIVE97_QA.managerRpc("get_manager_weekly_schedule",{p_store_id:"store-x",p_week_start:"2026-09-28"})),
      page.evaluate(()=>globalThis.__GIVE97_QA.ownerRpc("get_manager_weekly_schedule",{p_store_id:"store-x",p_week_start:"2026-09-28"}))
    ]);
    if(!m.error?.message.includes("STORE_NOT_ALLOWED")||!o.error?.message.includes("STORE_NOT_ALLOWED"))throw new Error(JSON.stringify({m,o}));
    return "Manager/Owner STORE_NOT_ALLOWED";
  });

  await check("sched06_no_parallel_browser_table_mutation_path",async()=>{
    const x=await page.evaluate(()=>({employee:globalThis.__GIVE97_QA.calls,manager:globalThis.__GIVE97_QA.managerCalls,owner:globalThis.__GIVE97_QA.ownerCalls}));
    const all=[...x.employee,...x.manager,...x.owner];
    if(all.some(c=>c.kind==="from"||String(c.name||"").startsWith(".from")))throw new Error(JSON.stringify(x));
    const state=await page.evaluate(()=>({schedule:globalThis.__GIVE97_QA.schedule,transferCount:globalThis.__GIVE97_QA.transferCount}));
    if(state.schedule.id!=="sch-give"||state.transferCount!==1)throw new Error(JSON.stringify(state));
    return "RPC-only projections/mutations; one logical schedule identity";
  });

  await check("sched06_browser_diagnostics_clean",async()=>{
    if(report.page_errors.length||report.console_errors.length||report.request_failures.length||report.http_errors.length)throw new Error(JSON.stringify(report));
    return "0 page/console/request/5xx errors";
  });

  await page.screenshot({path:path.join(OUT,"sched-06-three-role-synchronization.png"),fullPage:true});
}finally{
  await browser.close();
  fs.writeFileSync(path.join(OUT,"sched-06-three-role-synchronization-report.json"),JSON.stringify(report,null,2));
}
console.log("SCHED_06_THREE_ROLE_SYNCHRONIZATION_BROWSER="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;
