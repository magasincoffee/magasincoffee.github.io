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

try{
  await page.goto(`${BASE}/09_QA/people-shift/manager-workforce-canonical-fixture.html`,{waitUntil:"networkidle"});
  await page.locator("#panel-publish .msd").waitFor();

  await check("manager_initial_context_is_store_scoped_and_availability_is_input",async()=>{
    const st=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
    const text=await page.locator("#panel-publish").innerText();
    if(st.storeId!=="store-a"||st.week!=="2026-09-28"||st.generationId!==null)throw new Error(JSON.stringify(st));
    if(!text.includes("Availability là dữ liệu đầu vào")||!text.includes("CN-QA-A"))throw new Error(text);
    return "store-a · 2026-09-28 · no draft on read";
  });

  await check("double_submit_create_is_bounded",async()=>{
    await page.evaluate(()=>{const b=document.querySelector("#msdStart");b?.click();b?.click()});
    await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationId==="gen-1");
    const s=await page.evaluate(()=>({count:globalThis.__MW31_QA.state.createCount,calls:globalThis.__MW31_QA.calls.filter(x=>x.name==="create_schedule_generation").length}));
    if(s.count!==1||s.calls!==1)throw new Error(JSON.stringify(s));
    return JSON.stringify(s);
  });

  await check("manager_builds_and_saves_draft_from_availability",async()=>{
    await page.locator(".msd-source-row").nth(0).locator("[data-add-av]").click();
    await page.locator(".msd-source-row").nth(1).locator("[data-add-av]").click();
    await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments.length===2);
    await page.locator("#msdSave").click();
    await page.waitForFunction(()=>globalThis.__MW31_QA.calls.some(x=>x.name==="replace_schedule_generation_assignments"));
    const s=await page.evaluate(()=>({stage:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus,official:globalThis.__MW31_QA.state.official.length}));
    if(s.stage!=="DRAFT"||s.official!==0)throw new Error(JSON.stringify(s));
    return "2 DRAFT assignments · 0 official";
  });

  await check("validate_review_publish_full_ui_path",async()=>{
    await page.locator("#msdValidate").click();
    await page.locator("#msdStatus").filter({hasText:"Lịch không có xung đột chặn phát hành"}).waitFor();
    await page.locator("#msdReview").click();
    await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="REVIEWED");
    page.once("dialog",d=>d.accept());
    await page.locator("#msdPublish").click();
    await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="PUBLISHED");
    const s=await page.evaluate(()=>({
      official:globalThis.__MW31_QA.state.official.length,
      inserts:globalThis.__MW31_QA.state.officialInsertCount,
      rows:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().officialRows.length
    }));
    if(s.official!==2||s.inserts!==2||s.rows!==2)throw new Error(JSON.stringify(s));
    return JSON.stringify(s);
  });

  await check("publish_reload_reads_canonical_official_truth",async()=>{
    await page.locator("#msdReload").click();
    await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().busy===false);
    const s=await page.evaluate(()=>({
      stage:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus,
      officialRows:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().officialRows.length,
      officialReads:globalThis.__MW31_QA.calls.filter(x=>x.name==="get_manager_weekly_schedule").length,
      inserts:globalThis.__MW31_QA.state.officialInsertCount
    }));
    if(s.stage!=="PUBLISHED"||s.officialRows!==2||s.officialReads<1||s.inserts!==2)throw new Error(JSON.stringify(s));
    return JSON.stringify(s);
  });

  await check("publish_retry_is_idempotent",async()=>{
    const before=await page.evaluate(()=>({inserts:globalThis.__MW31_QA.state.officialInsertCount,transitions:globalThis.__MW31_QA.state.publishTransitions}));
    await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.publish());
    const after=await page.evaluate(()=>({inserts:globalThis.__MW31_QA.state.officialInsertCount,transitions:globalThis.__MW31_QA.state.publishTransitions,official:globalThis.__MW31_QA.state.official.length}));
    if(after.inserts!==before.inserts||after.transitions!==before.transitions||after.official!==2)throw new Error(JSON.stringify({before,after}));
    return JSON.stringify(after);
  });

  await check("cross_store_request_tampering_fails_closed",async()=>{
    const r=await page.evaluate(()=>globalThis.__MW31_QA.rpc("create_schedule_generation",{p_store_id:"store-b",p_week_start:"2026-09-28",p_algorithm_version:"MANAGER_DIRECT_V1"}));
    if(!r.error?.message.includes("STORE_NOT_ALLOWED"))throw new Error(JSON.stringify(r));
    return "STORE_NOT_ALLOWED";
  });

  await check("manager_ui_hides_raw_ids_and_backend_codes",async()=>{
    const text=await page.locator("#panel-publish").innerText();
    for(const raw of ["gen-1","ASSIGNMENT_OVERLAP","STORE_NOT_ALLOWED","GENERATION_VERSION_CONFLICT"])if(text.includes(raw))throw new Error("raw token visible: "+raw);
    if(!text.includes("Lịch chính thức đã phát hành"))throw new Error(text);
    return "no generation UUID/raw RPC code in normal UI";
  });

  await check("mobile_390_has_no_page_horizontal_overflow",async()=>{
    await page.setViewportSize({width:390,height:844});
    const dims=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
    if(dims.scrollWidth>dims.clientWidth+1)throw new Error(JSON.stringify(dims));
    return JSON.stringify(dims);
  });

  await check("canonical_writer_never_uses_direct_table_access",async()=>{
    const direct=await page.evaluate(()=>globalThis.__MW31_QA.calls.filter(x=>x.kind==="from"));
    if(direct.length)throw new Error(JSON.stringify(direct));
    return "0 direct table calls";
  });

  await check("browser_diagnostics_are_clean",async()=>{
    if(report.page_errors.length||report.console_errors.length||report.request_failures.length)throw new Error(JSON.stringify({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures}));
    return "0 page/console/request/5xx errors";
  });

  await page.screenshot({path:path.join(OUT,"sched-04-manager-scheduling.png"),fullPage:true});
}finally{
  await browserInstance.close();
  fs.writeFileSync(path.join(OUT,"sched-04-manager-scheduling-report.json"),JSON.stringify(report,null,2));
}
console.log(JSON.stringify({marker:"SCHED_04_MANAGER_SCHEDULING_BROWSER="+report.status,checks:report.checks},null,2));
if(report.status!=="PASS")process.exitCode=1;
