import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)});throw e}};

const browserInstance=await chromium.launch({headless:true});
const page=await browserInstance.newPage({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1440,height:1000}});
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText||""}`));
page.on("response",r=>{if(r.status()>=500)report.request_failures.push(`HTTP ${r.status()} ${r.url()}`)});

async function selectStore(id){
  await page.locator("#msdStore").selectOption(id);
  await page.waitForFunction(expected=>{
    const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
    return s.storeId===expected&&s.busy===false;
  },id);
}
try{
  await page.goto(`${BASE}/09_QA/people-shift/sched-05-owner-scheduling-fixture.html`,{waitUntil:"networkidle"});
  await page.locator("#panel-publish .msd").waitFor();

  await check("owner_surface_is_enterprise_oversight_on_shared_writer",async()=>{
    const s=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
    const text=await page.locator("#panel-publish").innerText();
    const options=await page.locator("#msdStore option").allTextContents();
    if(s.storeId!=="store-a"||s.stores.length!==4)throw new Error(JSON.stringify(s));
    if(options.length!==4||!text.includes("Owner Scheduling · Giám sát & can thiệp")||!text.includes("Owner không tạo lịch song song"))throw new Error(JSON.stringify({options,text}));
    const actor=await page.locator(".msd").getAttribute("data-scheduling-actor");
    if(actor!=="OWNER")throw new Error("actor="+actor);
    return "4 active stores · OWNER actor · shared canonical surface";
  });

  await check("owner_store_switch_isolates_availability_draft_and_official_state",async()=>{
    const expected=[
      ["store-b","Chi CN2",["An CN1","Dũng CN3","Em CN4"]],
      ["store-c","Dũng CN3",["An CN1","Chi CN2","Em CN4"]],
      ["store-d","Em CN4",["An CN1","Chi CN2","Dũng CN3"]],
      ["store-a","An CN1",["Chi CN2","Dũng CN3","Em CN4"]]
    ];
    for(const [id,want,forbidden] of expected){
      await selectStore(id);
      const text=await page.locator("#panel-publish").innerText();
      if(!text.includes(want))throw new Error(id+" missing "+want+"\n"+text);
      for(const x of forbidden)if(text.includes(x))throw new Error(id+" leaked "+x+"\n"+text);
      const s=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
      if(s.storeId!==id||s.officialRows.length!==0||s.assignments.length!==0)throw new Error(JSON.stringify(s));
    }
    return "store-a/b/c/d switch clears stale projections before reload";
  });

  await check("owner_double_submit_create_is_bounded",async()=>{
    await page.evaluate(()=>{const b=document.querySelector("#msdStart");b?.click();b?.click()});
    await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationId?.includes("store-a"));
    const s=await page.evaluate(()=>({count:globalThis.__SCHED05_OWNER_QA.state.createCount,calls:globalThis.__SCHED05_OWNER_QA.calls.filter(x=>x.name==="create_schedule_generation").length}));
    if(s.count!==1||s.calls!==1)throw new Error(JSON.stringify(s));
    return JSON.stringify(s);
  });

  await check("owner_full_canonical_draft_validate_review_publish_flow",async()=>{
    await page.locator(".msd-source-row").nth(0).locator("[data-add-av]").click();
    await page.locator(".msd-source-row").nth(1).locator("[data-add-av]").click();
    await page.locator("#msdSave").click();
    await page.waitForFunction(()=>globalThis.__SCHED05_OWNER_QA.calls.some(x=>x.name==="replace_schedule_generation_assignments")&&globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().busy===false);
    await page.locator("#msdValidate").click();
    await page.locator("#msdStatus").filter({hasText:"Lịch không có xung đột chặn phát hành"}).waitFor();
    await page.locator("#msdReview").click();
    await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="REVIEWED");
    page.once("dialog",d=>d.accept());
    await page.locator("#msdPublish").click();
    await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="PUBLISHED");
    const s=await page.evaluate(()=>({
      officialRows:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().officialRows.length,
      inserts:globalThis.__SCHED05_OWNER_QA.state.officialInsertCount,
      transitions:globalThis.__SCHED05_OWNER_QA.state.publishTransitions
    }));
    const text=await page.locator("#panel-publish").innerText();
    if(s.officialRows!==2||s.inserts!==2||s.transitions!==1)throw new Error(JSON.stringify(s));
    if(!text.includes("An CN1")||!text.includes("Bình CN1")||!text.includes("Lịch chính thức đã phát hành"))throw new Error(text);
    return JSON.stringify(s);
  });

  await check("owner_publish_retry_and_reload_are_idempotent",async()=>{
    const before=await page.evaluate(()=>({inserts:globalThis.__SCHED05_OWNER_QA.state.officialInsertCount,transitions:globalThis.__SCHED05_OWNER_QA.state.publishTransitions}));
    await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.publish());
    await page.locator("#msdReload").click();
    await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().busy===false);
    const after=await page.evaluate(()=>({
      inserts:globalThis.__SCHED05_OWNER_QA.state.officialInsertCount,
      transitions:globalThis.__SCHED05_OWNER_QA.state.publishTransitions,
      stage:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus,
      rows:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().officialRows.length
    }));
    if(after.inserts!==before.inserts||after.transitions!==before.transitions||after.stage!=="PUBLISHED"||after.rows!==2)throw new Error(JSON.stringify({before,after}));
    return JSON.stringify(after);
  });

  await check("published_store_a_never_leaks_into_selected_store_b",async()=>{
    await selectStore("store-b");
    const text=await page.locator("#panel-publish").innerText();
    if(text.includes("An CN1")||text.includes("Bình CN1"))throw new Error(text);
    const s=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
    if(s.storeId!=="store-b"||s.officialRows.length!==0)throw new Error(JSON.stringify(s));
    return "store-b selected · 0 store-a official rows";
  });

  await check("owner_stale_publish_is_server_revalidated_and_returns_to_draft",async()=>{
    await page.locator("#msdStart").click();
    await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="DRAFT");
    await page.locator(".msd-source-row").nth(0).locator("[data-add-av]").click();
    const beforeReplace=await page.evaluate(()=>globalThis.__SCHED05_OWNER_QA.calls.filter(x=>x.name==="replace_schedule_generation_assignments").length);
    await page.locator("#msdSave").click();
    await page.waitForFunction(before=>globalThis.__SCHED05_OWNER_QA.calls.filter(x=>x.name==="replace_schedule_generation_assignments").length>before&&globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().busy===false,beforeReplace);
    await page.locator("#msdReview").click();
    await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="REVIEWED");
    await page.evaluate(()=>globalThis.__SCHED05_OWNER_QA.setPersonStatus("b-1","INACTIVE"));
    page.once("dialog",d=>d.accept());
    await page.locator("#msdPublish").click();
    await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="DRAFT");
    const s=await page.evaluate(()=>({
      failures:globalThis.__SCHED05_OWNER_QA.state.publishFailures,
      official:(globalThis.__SCHED05_OWNER_QA.state.official.get("store-b|2026-09-28")||[]).length,
      stage:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus
    }));
    if(s.failures!==1||s.official!==0||s.stage!=="DRAFT")throw new Error(JSON.stringify(s));
    return JSON.stringify(s);
  });

  await check("outside_enterprise_store_request_fails_closed",async()=>{
    const r=await page.evaluate(()=>globalThis.__SCHED05_OWNER_QA.rpc("create_schedule_generation",{p_store_id:"store-x",p_week_start:"2026-09-28",p_algorithm_version:"MANAGER_DIRECT_V1"}));
    if(!r.error?.message.includes("STORE_NOT_ALLOWED"))throw new Error(JSON.stringify(r));
    return "STORE_NOT_ALLOWED";
  });

  await check("owner_uses_no_legacy_writer_or_direct_table_path",async()=>{
    const calls=await page.evaluate(()=>globalThis.__SCHED05_OWNER_QA.calls);
    const names=calls.map(x=>x.name).filter(Boolean);
    for(const legacy of ["auto_generate_schedule_generation","manager_update_employee_availability","create_store_transfer_request","review_store_transfer_request","upsert_workforce_staffing_requirement","delete_workforce_staffing_requirement"])if(names.includes(legacy))throw new Error("legacy call "+legacy);
    if(calls.some(x=>x.kind==="from"))throw new Error("direct table DML/read detected");
    for(const required of ["create_schedule_generation","replace_schedule_generation_assignments","validate_schedule_generation_v1","review_schedule_generation","publish_schedule_generation","get_manager_weekly_schedule"])if(!names.includes(required))throw new Error("missing canonical "+required);
    return "canonical RPC set only";
  });

  await check("owner_ui_hides_uuid_raw_enum_and_backend_errors",async()=>{
    const text=await page.locator("#panel-publish").innerText();
    for(const raw of ["gen-store","asg-gen","STORE_NOT_ALLOWED","EMPLOYEE_INACTIVE","MANAGER_DIRECT_V1"])if(text.includes(raw))throw new Error("raw token visible: "+raw);
    return "no technical identifiers/raw backend codes in normal UI";
  });

  await check("owner_mobile_390_has_no_page_horizontal_overflow",async()=>{
    await page.setViewportSize({width:390,height:844});
    const dims=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
    if(dims.scrollWidth>dims.clientWidth+1)throw new Error(JSON.stringify(dims));
    return JSON.stringify(dims);
  });

  await check("owner_browser_diagnostics_are_clean",async()=>{
    if(report.page_errors.length||report.console_errors.length||report.request_failures.length)throw new Error(JSON.stringify({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures}));
    return "0 page/console/request/5xx errors";
  });

  await page.screenshot({path:path.join(OUT,"sched-05-owner-scheduling.png"),fullPage:true});
}finally{
  await browserInstance.close();
  fs.writeFileSync(path.join(OUT,"sched-05-owner-scheduling-report.json"),JSON.stringify(report,null,2));
}
console.log(JSON.stringify({marker:"SCHED_05_OWNER_SCHEDULING_BROWSER="+report.status,checks:report.checks},null,2));
if(report.status!=="PASS")process.exitCode=1;
