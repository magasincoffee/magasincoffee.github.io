import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.message||e)});report.status="FAIL"}};

const browserInstance=await chromium.launch({headless:true});
const page=await browserInstance.newPage({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1440,height:1000}});
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText||""}`));
page.on("response",r=>{if(r.status()>=500)report.request_failures.push(`HTTP ${r.status()} ${r.url()}`)});

await page.goto(`${BASE}/09_QA/people-shift/manager-workforce-canonical-fixture.html`,{waitUntil:"networkidle"});
await page.locator("#panel-publish .msd").waitFor();

await check("sunday_defaults_to_exact_next_week_without_creating_draft",async()=>{
  const st=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
  const raw=await page.evaluate(()=>globalThis.__MW31_QA.state);
  if(st.week!=="2026-09-28"||st.storeId!=="store-a"||st.generationId!==null||st.generationStatus!=="NONE"||raw.createCount!==0)throw new Error(JSON.stringify({st,raw}));
  return `${st.week} · ${st.storeId} · no write on open`;
});

await check("canonical_direct_flow_does_not_call_staffing_demand_or_robot",async()=>{
  const calls=await page.evaluate(()=>globalThis.__MW31_QA.calls.map(x=>x.name).filter(Boolean));
  const forbidden=calls.filter(x=>["get_workforce_staffing_requirements","auto_generate_schedule_generation"].includes(x));
  if(forbidden.length)throw new Error(JSON.stringify(calls));
  return "0 demand/Robot prerequisite calls";
});

await check("manager_sees_next_week_availability_before_draft",async()=>{
  const rows=await page.locator("#panel-publish .msd-source-row").count();
  const text=await page.locator("#panel-publish .msd-source").innerText();
  if(rows!==3||!text.includes("Nhân viên QA 1")||!text.includes("2026-09-28")||!text.includes("CN-QA-A"))throw new Error(text);
  return "3 availability rows";
});

await check("double_click_create_is_bounded_and_uses_manager_direct_primitive",async()=>{
  await page.evaluate(()=>{
    const b=document.querySelector("#panel-publish #msdStart");
    b?.click();b?.click();
  });
  await page.waitForFunction(()=>globalThis.__MW31_QA.state.generation?.id==="gen-1");
  await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationId==="gen-1");
  const result=await page.evaluate(()=>({
    createCount:globalThis.__MW31_QA.state.createCount,
    generation:globalThis.__MW31_QA.state.generation,
    creates:globalThis.__MW31_QA.calls.filter(x=>x.name==="create_schedule_generation"),
    lists:globalThis.__MW31_QA.calls.filter(x=>x.name==="list_schedule_generations").length
  }));
  if(result.createCount!==1||result.creates.length!==1||result.generation.algorithm_version!=="MANAGER_DIRECT_V1"||result.lists<1)throw new Error(JSON.stringify(result));
  return JSON.stringify(result.generation);
});

await check("manager_adds_two_assignments_from_availability",async()=>{
  await page.locator(".msd-source-row").nth(0).locator("[data-add-av]").click();
  await page.locator(".msd-card").waitFor();
  await page.locator(".msd-source-row").nth(1).locator("[data-add-av]").click();
  await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments.length===2);
  const st=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
  if(st.assignments[0].user_id!=="u-1"||st.assignments[1].user_id!=="u-2")throw new Error(JSON.stringify(st.assignments));
  return "u-1 + u-2";
});

await check("manager_edits_time_then_remove_and_add_again",async()=>{
  const first=page.locator(".msd-card").nth(0);
  await first.locator('[data-f="start_time"]').selectOption("06:30");
  await first.locator('[data-f="end_time"]').selectOption("11:30");
  await page.locator(".msd-card").nth(1).locator("[data-remove]").click();
  await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments.length===1);
  await page.locator(".msd-source-row").nth(1).locator("[data-add-av]").click();
  await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments.length===2);
  const st=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
  if(st.assignments[0].start_time!=="06:30"||st.assignments[0].end_time!=="11:30"||st.assignments[1].user_id!=="u-2")throw new Error(JSON.stringify(st.assignments));
  return "edit + remove + add";
});

await check("save_persists_draft_only_no_auto_review_publish_or_official_schedule",async()=>{
  const before=await page.evaluate(()=>globalThis.__MW31_QA.calls.length);
  await page.locator("#msdSave").click();
  await page.waitForFunction(()=>globalThis.__MW31_QA.calls.some(x=>x.name==="replace_schedule_generation_assignments"));
  await page.waitForFunction(()=>globalThis.__MW31_QA.state.assignments.length===2);
  const result=await page.evaluate((before)=>({
    generation:globalThis.__MW31_QA.state.generation,
    official:globalThis.__MW31_QA.state.official.length,
    names:globalThis.__MW31_QA.calls.slice(before).map(x=>x.name).filter(Boolean),
    assignments:globalThis.__MW31_QA.state.assignments.map(x=>({user_id:x.user_id,start_time:x.start_time,end_time:x.end_time}))
  }),before);
  if(result.generation.status!=="DRAFT"||result.official!==0)throw new Error(JSON.stringify(result));
  if(result.names.includes("review_schedule_generation")||result.names.includes("publish_schedule_generation")||result.names.includes("auto_generate_schedule_generation")||result.names.includes("get_workforce_staffing_requirements"))throw new Error(JSON.stringify(result.names));
  if(result.assignments[0].start_time!=="06:30"||result.assignments[0].end_time!=="11:30")throw new Error(JSON.stringify(result.assignments));
  return JSON.stringify(result.assignments);
});

await check("reload_resumes_same_draft_without_duplicate_creation",async()=>{
  const before=await page.evaluate(()=>({createCount:globalThis.__MW31_QA.state.createCount,id:globalThis.__MW31_QA.state.generation.id}));
  await page.locator("#msdReload").click();
  await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments.length===2);
  const after=await page.evaluate(()=>({
    createCount:globalThis.__MW31_QA.state.createCount,
    id:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationId,
    status:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus,
    assignments:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().assignments.length
  }));
  if(after.createCount!==before.createCount||after.id!==before.id||after.status!=="DRAFT"||after.assignments!==2)throw new Error(JSON.stringify({before,after}));
  return JSON.stringify(after);
});

await check("availability_tab_handoff_opens_same_direct_board",async()=>{
  await page.locator('[data-tab="review"]').click();
  await page.locator("#panel-review .mwr3-card").waitFor();
  const availabilityText=await page.locator("#panel-review").innerText();
  if(!availabilityText.includes("Employee sở hữu availability")||!availabilityText.includes("Nhân viên QA 1"))throw new Error(availabilityText);
  const beforeLists=await page.evaluate(()=>globalThis.__MW31_QA.calls.filter(x=>x.name==="list_schedule_generations").length);
  await page.locator("#mwr3OpenSchedule").click();
  await page.waitForFunction(before=>globalThis.__MW31_QA.calls.filter(x=>x.name==="list_schedule_generations").length>before,beforeLists);
  await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().busy===false);
  await page.locator("#panel-publish .msd").waitFor();
  const st=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
  if(st.generationId!=="gen-1"||st.week!=="2026-09-28"||st.storeId!=="store-a")throw new Error(JSON.stringify(st));
  return "availability -> same gen-1";
});

await check("direct_path_still_has_zero_demand_robot_calls",async()=>{
  const names=await page.evaluate(()=>globalThis.__MW31_QA.calls.map(x=>x.name).filter(Boolean));
  if(names.includes("get_workforce_staffing_requirements")||names.includes("auto_generate_schedule_generation"))throw new Error(JSON.stringify(names));
  return [...new Set(names)].join(" → ");
});

await check("e2e03_valid_schedule_passes_without_staffing_demand",async()=>{
  const r=await page.evaluate(()=>globalThis.__MW31_QA.rpc("validate_schedule_generation_v1",{p_generation_id:"gen-1"}));
  const names=await page.evaluate(()=>globalThis.__MW31_QA.calls.map(x=>x.name).filter(Boolean));
  if(r.error||!r.data?.valid||names.includes("get_workforce_staffing_requirements"))throw new Error(JSON.stringify({r,names}));
  return JSON.stringify({valid:r.data.valid,violations:r.data.violation_count,staffingDemandCalls:0});
});

await check("e2e03_overlap_is_rejected_server_side_without_official_write",async()=>{
  const r=await page.evaluate(()=>globalThis.__MW31_QA.rpc("replace_schedule_generation_assignments",{p_generation_id:"gen-1",p_assignments:[
    {user_id:"u-1",store_id:"store-a",work_date:"2026-09-28",start_time:"06:00",end_time:"10:00",status:"DRAFT"},
    {user_id:"u-1",store_id:"store-a",work_date:"2026-09-28",start_time:"09:00",end_time:"12:00",status:"DRAFT"}
  ]}));
  const s=await page.evaluate(()=>({official:globalThis.__MW31_QA.state.official.length,assignments:globalThis.__MW31_QA.state.assignments.length}));
  if(!r.error?.message.includes("ASSIGNMENT_OVERLAP")||s.official!==0||s.assignments!==2)throw new Error(JSON.stringify({r,s}));
  return "ASSIGNMENT_OVERLAP · atomic rollback";
});

await check("e2e03_more_than_two_assignments_per_day_is_rejected",async()=>{
  const r=await page.evaluate(()=>globalThis.__MW31_QA.rpc("replace_schedule_generation_assignments",{p_generation_id:"gen-1",p_assignments:[
    {user_id:"u-1",store_id:"store-a",work_date:"2026-09-28",start_time:"06:00",end_time:"08:00",status:"DRAFT"},
    {user_id:"u-1",store_id:"store-a",work_date:"2026-09-28",start_time:"08:00",end_time:"10:00",status:"DRAFT"},
    {user_id:"u-1",store_id:"store-a",work_date:"2026-09-28",start_time:"10:00",end_time:"12:00",status:"DRAFT"}
  ]}));
  if(!r.error?.message.includes("MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY"))throw new Error(JSON.stringify(r));
  return "MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY";
});

await check("e2e03_inactive_and_non_staff_employee_are_rejected",async()=>{
  const inactive=await page.evaluate(async()=>{
    globalThis.__MW31_QA.setPersonStatus("u-3","INACTIVE");
    const r=await globalThis.__MW31_QA.rpc("replace_schedule_generation_assignments",{p_generation_id:"gen-1",p_assignments:[
      {user_id:"u-3",store_id:"store-a",work_date:"2026-09-29",start_time:"17:00",end_time:"22:00",status:"DRAFT"}
    ]});
    globalThis.__MW31_QA.setPersonStatus("u-3","ACTIVE");
    return r;
  });
  const nonStaff=await page.evaluate(async()=>{
    globalThis.__MW31_QA.setPersonRole("u-3","STORE_MANAGER");
    const r=await globalThis.__MW31_QA.rpc("replace_schedule_generation_assignments",{p_generation_id:"gen-1",p_assignments:[
      {user_id:"u-3",store_id:"store-a",work_date:"2026-09-29",start_time:"17:00",end_time:"22:00",status:"DRAFT"}
    ]});
    globalThis.__MW31_QA.setPersonRole("u-3","STAFF");
    return r;
  });
  if(!inactive.error?.message.includes("EMPLOYEE_INACTIVE")||!nonStaff.error?.message.includes("EMPLOYEE_NOT_STAFF"))throw new Error(JSON.stringify({inactive,nonStaff}));
  return "EMPLOYEE_INACTIVE + EMPLOYEE_NOT_STAFF";
});

await check("e2e03_out_of_week_wrong_store_and_availability_mismatch_fail_closed",async()=>{
  const results=await page.evaluate(async()=>({
    out:await globalThis.__MW31_QA.rpc("replace_schedule_generation_assignments",{p_generation_id:"gen-1",p_assignments:[
      {user_id:"u-1",store_id:"store-a",work_date:"2026-10-05",start_time:"06:00",end_time:"08:00",status:"DRAFT"}
    ]}),
    store:await globalThis.__MW31_QA.rpc("replace_schedule_generation_assignments",{p_generation_id:"gen-1",p_assignments:[
      {user_id:"u-1",store_id:"store-b",work_date:"2026-09-28",start_time:"06:00",end_time:"08:00",status:"DRAFT"}
    ]}),
    availability:await globalThis.__MW31_QA.rpc("replace_schedule_generation_assignments",{p_generation_id:"gen-1",p_assignments:[
      {user_id:"u-1",store_id:"store-a",work_date:"2026-09-28",start_time:"12:00",end_time:"13:00",status:"DRAFT"}
    ]}),
    scope:await globalThis.__MW31_QA.rpc("create_schedule_generation",{p_store_id:"store-b",p_week_start:"2026-09-28",p_algorithm_version:"MANAGER_DIRECT_V1"})
  }));
  if(!results.out.error?.message.includes("ASSIGNMENT_OUTSIDE_GENERATION_WEEK")||
     !results.store.error?.message.includes("ASSIGNMENT_STORE_MISMATCH")||
     !results.availability.error?.message.includes("AVAILABILITY_MISMATCH")||
     !results.scope.error?.message.includes("STORE_NOT_ALLOWED"))throw new Error(JSON.stringify(results));
  return "week/store/scope/availability fail closed";
});

await check("e2e03_malformed_payload_is_rejected_and_manager_gets_diagnostic",async()=>{
  const malformed=await page.evaluate(()=>globalThis.__MW31_QA.rpc("replace_schedule_generation_assignments",{p_generation_id:"gen-1",p_assignments:[
    {user_id:"",store_id:"store-a",work_date:"2026-09-28",start_time:"06:00",end_time:"08:00",status:"DRAFT"}
  ]}));
  if(!malformed.error?.message.includes("ASSIGNMENT_REQUIRED_FIELDS_MISSING"))throw new Error(JSON.stringify(malformed));
  await page.evaluate(()=>{
    globalThis.__MW31_QA.__saved=structuredClone(globalThis.__MW31_QA.state.assignments);
    globalThis.__MW31_QA.state.assignments=[
      {id:"bad-1",generation_id:"gen-1",user_id:"u-1",store_id:"store-a",work_date:"2026-09-28",start_time:"06:00",end_time:"10:00",status:"DRAFT"},
      {id:"bad-2",generation_id:"gen-1",user_id:"u-1",store_id:"store-a",work_date:"2026-09-28",start_time:"09:00",end_time:"12:00",status:"DRAFT"}
    ];
  });
  await page.evaluate(async()=>{await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.validate()});
  const text=await page.locator("#msdStatus").innerText();
  await page.evaluate(()=>{globalThis.__MW31_QA.state.assignments=globalThis.__MW31_QA.__saved;delete globalThis.__MW31_QA.__saved});
  if(!text.includes("ASSIGNMENT_OVERLAP"))throw new Error(text);
  const official=await page.evaluate(()=>globalThis.__MW31_QA.state.official.length);
  if(official!==0)throw new Error("official writes="+official);
  return "server malformed rejection + visible ASSIGNMENT_OVERLAP diagnostic";
});

await check("e2e05_create_retry_and_legacy_duplicate_draft_fail_closed",async()=>{
  const r=await page.evaluate(async()=>{
    const a=await globalThis.__MW31_QA.rpc("create_schedule_generation",{p_store_id:"store-a",p_week_start:"2026-09-28",p_algorithm_version:"MANAGER_DIRECT_V1"});
    const b=await globalThis.__MW31_QA.rpc("create_schedule_generation",{p_store_id:"store-a",p_week_start:"2026-09-28",p_algorithm_version:"MANAGER_DIRECT_V1"});
    globalThis.__MW31_QA.setCompeting([{id:"gen-legacy-duplicate",status:"DRAFT",store_id:"store-a",week_start:"2026-09-28",week_end:"2026-10-04",algorithm_version:"RULE_V1"}]);
    const conflict=await globalThis.__MW31_QA.rpc("create_schedule_generation",{p_store_id:"store-a",p_week_start:"2026-09-28",p_algorithm_version:"MANAGER_DIRECT_V1"});
    globalThis.__MW31_QA.setCompeting([]);
    return {a,b,conflict,createCount:globalThis.__MW31_QA.state.createCount};
  });
  if(r.a.data!=="gen-1"||r.b.data!=="gen-1"||r.createCount!==1||!r.conflict.error?.message.includes("GENERATION_VERSION_CONFLICT"))throw new Error(JSON.stringify(r));
  return "retry resumes gen-1; duplicate legacy group -> GENERATION_VERSION_CONFLICT";
});

await check("e2e05_review_publish_revalidation_and_idempotency",async()=>{
  const pre=await page.evaluate(()=>globalThis.__MW31_QA.calls.length);
  await page.evaluate(async()=>{await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.review()});
  await page.waitForFunction(()=>globalThis.__MW31_QA.state.generation?.status==="REVIEWED");
  await page.evaluate(async()=>{await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.review()});
  const reviewed=await page.evaluate(()=>({status:globalThis.__MW31_QA.state.generation.status,transitions:globalThis.__MW31_QA.state.reviewTransitions,official:globalThis.__MW31_QA.state.official.length}));
  if(reviewed.status!=="REVIEWED"||reviewed.transitions!==1||reviewed.official!==0)throw new Error(JSON.stringify(reviewed));

  await page.evaluate(()=>globalThis.__MW31_QA.setPersonStatus("u-1","INACTIVE"));
  page.once("dialog",d=>d.accept());
  await page.evaluate(async()=>{await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.publish()});
  await page.waitForFunction(()=>globalThis.__MW31_QA.state.generation?.status==="DRAFT");
  const failed=await page.evaluate(()=>({official:globalThis.__MW31_QA.state.official.length,publishFailures:globalThis.__MW31_QA.state.publishFailures,status:globalThis.__MW31_QA.state.generation.status}));
  if(failed.official!==0||failed.publishFailures!==1||failed.status!=="DRAFT")throw new Error(JSON.stringify(failed));

  await page.evaluate(()=>globalThis.__MW31_QA.setPersonStatus("u-1","ACTIVE"));
  await page.evaluate(async()=>{await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.review()});
  await page.waitForFunction(()=>globalThis.__MW31_QA.state.generation?.status==="REVIEWED");
  page.once("dialog",d=>d.accept());
  await page.evaluate(async()=>{await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.publish()});
  await page.waitForFunction(()=>globalThis.__MW31_QA.state.generation?.status==="PUBLISHED");
  const first=await page.evaluate(()=>({official:globalThis.__MW31_QA.state.official.length,inserts:globalThis.__MW31_QA.state.officialInsertCount,publishTransitions:globalThis.__MW31_QA.state.publishTransitions}));
  await page.evaluate(async()=>{await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.publish()});
  const retry=await page.evaluate(()=>({
    status:globalThis.__MW31_QA.state.generation.status,
    official:globalThis.__MW31_QA.state.official.length,
    inserts:globalThis.__MW31_QA.state.officialInsertCount,
    publishTransitions:globalThis.__MW31_QA.state.publishTransitions,
    lastPublish:globalThis.__MW31_QA.calls.filter(x=>x.name==="publish_schedule_generation").at(-1)
  }));
  const competing=await page.evaluate(()=>globalThis.__MW31_QA.rpc("create_schedule_generation",{p_store_id:"store-a",p_week_start:"2026-09-28",p_algorithm_version:"OTHER_V1"}));
  const afterReview=await page.evaluate((pre)=>globalThis.__MW31_QA.calls.slice(pre).map(x=>x.name).filter(Boolean),pre);
  if(first.official!==2||first.inserts!==2||first.publishTransitions!==1||
     retry.status!=="PUBLISHED"||retry.official!==2||retry.inserts!==2||retry.publishTransitions!==1||
     !competing.error?.message.includes("GENERATION_ALREADY_PUBLISHED"))throw new Error(JSON.stringify({first,retry,competing,afterReview}));
  return JSON.stringify({reviewRetryTransitions:1,failedPublish:failed,published:first,idempotentRetry:retry.official,competing:competing.error.message});
});

await check("official_workspace_reads_published_schedule",async()=>{
  await page.locator('[data-view="schedule"]').click();
  await page.locator("#view-schedule .mos-head").waitFor();
  let week=await page.evaluate(()=>globalThis.__MW31_QA.calls.filter(x=>x.name==="get_manager_weekly_schedule").at(-1)?.args?.p_week_start);
  if(week!=="2026-09-28"){
    await page.locator('[data-mos-week="next"]').click();
    await page.waitForFunction(()=>globalThis.__MW31_QA.calls.filter(x=>x.name==="get_manager_weekly_schedule").at(-1)?.args?.p_week_start==="2026-09-28");
    week="2026-09-28";
  }
  await page.locator("#view-schedule").filter({hasText:"Nhân viên QA 1"}).waitFor();
  const text=await page.locator("#view-schedule").innerText();
  if(!text.includes("06:30–11:30")||!text.includes("CN-QA-A"))throw new Error(text);
  return week;
});

await check("official_workspace_never_writes_work_schedules_directly",async()=>{
  const direct=await page.evaluate(()=>globalThis.__MW31_QA.calls.filter(x=>x.kind==="from"));
  if(direct.length)throw new Error(JSON.stringify(direct));
  return "0 direct table calls";
});

await check("manager_swap_approval_updates_official_schedule_through_rpc",async()=>{
  await page.locator('[data-view="swap"]').click();
  await page.locator("#view-swap .js-swap-approve").waitFor();
  await page.locator("#view-swap .js-swap-approve").click();
  await page.waitForFunction(()=>globalThis.__MW31_QA.calls.some(x=>x.name==="approve_shift_swap"));
  await page.locator("#view-swap").filter({hasText:"Không có yêu cầu đổi ca đang chờ"}).waitFor();
  const call=await page.evaluate(()=>globalThis.__MW31_QA.calls.filter(x=>x.name==="approve_shift_swap").at(-1));
  if(call.args.p_swap_id!=="swap-1")throw new Error(JSON.stringify(call));
  return "approve_shift_swap";
});

await check("manager_give_approval_transfers_schedule_after_recipient_acceptance",async()=>{
  await page.locator('[data-view="swap"]').click();
  await page.locator("#view-swap .js-give-approve").waitFor();
  const giveText=await page.locator("#view-swap").innerText();
  if(!giveText.includes("Người nhận đã đồng ý"))throw new Error(giveText);
  await page.locator("#view-swap .js-give-approve").click();
  await page.waitForFunction(()=>globalThis.__MW31_QA.calls.some(x=>x.name==="approve_shift_give"));
  const call=await page.evaluate(()=>globalThis.__MW31_QA.calls.filter(x=>x.name==="approve_shift_give").at(-1));
  if(call.args.p_give_id!=="give-1")throw new Error(JSON.stringify(call));
  return "approve_shift_give";
});

await check("browser_diagnostics",async()=>{
  if(report.page_errors.length)throw new Error(report.page_errors.join("\n"));
  if(report.console_errors.length)throw new Error(report.console_errors.join("\n"));
  if(report.request_failures.length)throw new Error(report.request_failures.join("\n"));
  return "0 page/console/request/5xx errors";
});

await page.screenshot({path:path.join(OUT,"manager-workforce-canonical.png"),fullPage:true});
await browserInstance.close();
fs.writeFileSync(path.join(OUT,"manager-workforce-canonical-report.json"),JSON.stringify(report,null,2));
console.log("MANAGER_WORKFORCE_CANONICAL_BROWSER="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;
