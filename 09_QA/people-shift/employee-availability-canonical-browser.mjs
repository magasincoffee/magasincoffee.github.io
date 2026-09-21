import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});

const report={status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.message||e)});report.status="FAIL"}};

const browserInstance=await chromium.launch({headless:true});
const page=await browserInstance.newPage({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1200,height:900}});
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText||""}`));
page.on("response",r=>{if(r.status()>=500)report.request_failures.push(`HTTP ${r.status()} ${r.url()}`)});

await page.goto(`${BASE}/09_QA/people-shift/employee-availability-canonical-fixture.html`,{waitUntil:"networkidle"});
const employee=page.frameLocator("#employeeApp");
await employee.locator("body[data-employee-availability-engine='1']").waitFor();

await check("single_canonical_engine_initialized_for_next_week",async()=>{
  const api=await page.evaluate(()=>({
    refresh:typeof globalThis.MAGASIN_EMPLOYEE?.availability?.refresh,
    remove:typeof globalThis.MAGASIN_EMPLOYEE?.availability?.remove,
    week:globalThis.MAGASIN_EMPLOYEE?.availability?.getWeek?.(),
    registration:globalThis.MAGASIN_EMPLOYEE?.availability?.getRegistrationState?.()
  }));
  if(api.refresh!=="function"||api.remove!=="function"||api.week!=="2026-09-28"||api.registration!=="REGISTRATION_OPEN")throw new Error(JSON.stringify(api));
  return JSON.stringify(api);
});

await check("next_week_dates_are_exact_monday_to_sunday",async()=>{
  const values=await employee.locator("#quickRegDay option").evaluateAll(opts=>opts.map(o=>o.value));
  const expected=["2026-09-28","2026-09-29","2026-09-30","2026-10-01","2026-10-02","2026-10-03","2026-10-04"];
  if(JSON.stringify(values)!==JSON.stringify(expected))throw new Error(JSON.stringify(values));
  return values.join(" → ");
});

await check("double_click_is_bounded_to_one_save_mutation",async()=>{
  await employee.locator("#quickRegDay").selectOption("2026-09-28");
  await employee.locator("#quickRegStart").selectOption("06:00");
  await employee.locator("#quickRegEnd").selectOption("12:00");
  await employee.locator("#quickRegStore").selectOption("CN1");
  const before=await page.evaluate(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="save_my_availability").length);
  await page.evaluate(()=>{
    const b=document.getElementById("employeeApp")?.contentDocument?.getElementById("saveReg");
    b?.click();b?.click();
  });
  await page.waitForFunction(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.rows.length===1);
  await employee.locator(".week-summary").filter({hasText:"06:00–12:00"}).waitFor();
  const result=await page.evaluate(()=>({
    rows:globalThis.__EMPLOYEE_AVAILABILITY_QA.rows.map(x=>({...x})),
    saves:globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="save_my_availability").length
  }));
  if(result.rows.length!==1||result.rows[0].availability_type!=="AVAILABLE"||result.rows[0].preferred_store_id!=="store-a")throw new Error(JSON.stringify(result));
  if(result.saves-before!==1)throw new Error("save delta="+(result.saves-before));
  return "1 logical click burst -> 1 RPC";
});

await check("multiple_valid_windows_same_day_are_preserved",async()=>{
  await employee.locator("#quickRegStart").selectOption("17:00");
  await employee.locator("#quickRegEnd").selectOption("22:00");
  await employee.locator("#saveReg").click();
  await employee.locator(".week-summary").filter({hasText:"17:00–22:00"}).waitFor();
  const count=await employee.locator(".miniShift").count();
  const rows=await page.evaluate(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.rows.length);
  if(count!==2||rows!==2)throw new Error(JSON.stringify({count,rows}));
  return "2 windows on 2026-09-28";
});

await check("frame_reload_preserves_same_week_rows_without_resubmit",async()=>{
  const before=await page.evaluate(()=>({
    saves:globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="save_my_availability").length,
    loads:globalThis.__EMPLOYEE_AVAILABILITY_QA.frameLoads
  }));
  await page.evaluate(()=>{
    const qa=globalThis.__EMPLOYEE_AVAILABILITY_QA;
    document.getElementById("employeeApp").srcdoc=qa.frameSrcdoc;
  });
  await employee.locator("body[data-employee-availability-engine='1']").waitFor();
  await employee.locator(".week-summary").filter({hasText:"06:00–12:00"}).waitFor();
  await employee.locator(".week-summary").filter({hasText:"17:00–22:00"}).waitFor();
  const after=await page.evaluate(()=>({
    week:globalThis.MAGASIN_EMPLOYEE.availability.getWeek(),
    registration:globalThis.MAGASIN_EMPLOYEE.availability.getRegistrationState(),
    saves:globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="save_my_availability").length,
    rows:globalThis.__EMPLOYEE_AVAILABILITY_QA.rows.length,
    bound:document.getElementById("employeeApp").contentDocument.body.dataset.employeeAvailabilityEngine,
    loads:globalThis.__EMPLOYEE_AVAILABILITY_QA.frameLoads
  }));
  if(after.week!=="2026-09-28"||after.registration!=="REGISTRATION_OPEN"||after.saves!==before.saves||after.rows!==2||after.bound!=="1"||after.loads<=before.loads)throw new Error(JSON.stringify({before,after}));
  return JSON.stringify(after);
});

await check("delete_refresh_and_reload_keep_deleted_interval_absent",async()=>{
  const before=await page.evaluate(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="delete_my_availability").length);
  page.once("dialog",d=>d.accept());
  await employee.locator("[data-av-delete]").first().click();
  await page.waitForFunction(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.rows.length===1);
  const deleted=await page.evaluate(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="delete_my_availability").length);
  if(deleted-before!==1)throw new Error("delete delta="+(deleted-before));
  await page.evaluate(()=>{
    const qa=globalThis.__EMPLOYEE_AVAILABILITY_QA;
    document.getElementById("employeeApp").srcdoc=qa.frameSrcdoc;
  });
  await employee.locator("body[data-employee-availability-engine='1']").waitFor();
  await employee.locator(".miniShift").filter({hasText:"17:00–22:00"}).waitFor();
  const count=await employee.locator(".miniShift").count();
  const text=await employee.locator(".week-summary").innerText();
  if(count!==1||text.includes("06:00–12:00"))throw new Error(JSON.stringify({count,text}));
  return "deleted interval absent after reload";
});

await check("sunday_is_readable_but_all_employee_writes_are_closed",async()=>{
  const before=await page.evaluate(()=>({
    save:globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="save_my_availability").length,
    del:globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="delete_my_availability").length
  }));
  await page.evaluate(async()=>{
    globalThis.__EMPLOYEE_AVAILABILITY_QA.today="2026-09-27";
    await globalThis.MAGASIN_EMPLOYEE.availability.refresh();
  });
  await employee.locator("#saveReg:disabled").waitFor();
  await employee.locator("[data-av-delete]:disabled").waitFor();
  const result=await page.evaluate(()=>({
    policy:globalThis.MAGASIN_EMPLOYEE.availability.getPolicy(),
    saveDisabled:document.getElementById("employeeApp").contentDocument.getElementById("saveReg").disabled,
    msg:document.getElementById("employeeApp").contentDocument.getElementById("quickRegMsg").textContent,
    shifts:document.getElementById("employeeApp").contentDocument.querySelectorAll(".miniShift").length
  }));
  await page.evaluate(()=>document.getElementById("employeeApp").contentDocument.getElementById("saveReg").click());
  const after=await page.evaluate(()=>({
    save:globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="save_my_availability").length,
    del:globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="delete_my_availability").length
  }));
  if(result.policy.registration!=="REGISTRATION_CLOSED"||result.policy.targetWeek!=="2026-09-28"||!result.saveDisabled||!result.msg.includes("đã đóng")||result.shifts!==1)throw new Error(JSON.stringify(result));
  if(after.save!==before.save||after.del!==before.del)throw new Error(JSON.stringify({before,after}));
  return JSON.stringify(result.policy);
});

await check("next_monday_rolls_target_week_without_cross_wiring_old_rows",async()=>{
  await page.evaluate(async()=>{
    globalThis.__EMPLOYEE_AVAILABILITY_QA.today="2026-09-28";
    await globalThis.MAGASIN_EMPLOYEE.availability.refresh();
  });
  await page.waitForFunction(()=>globalThis.MAGASIN_EMPLOYEE.availability.getWeek()==="2026-10-05");
  const result=await page.evaluate(()=>({
    policy:globalThis.MAGASIN_EMPLOYEE.availability.getPolicy(),
    latestGet:globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="get_my_availability").at(-1),
    visible:document.getElementById("employeeApp").contentDocument.querySelectorAll(".miniShift").length,
    firstDay:document.getElementById("employeeApp").contentDocument.querySelector("#quickRegDay option")?.value,
    saveDisabled:document.getElementById("employeeApp").contentDocument.getElementById("saveReg").disabled
  }));
  if(result.policy.targetWeek!=="2026-10-05"||result.policy.registration!=="REGISTRATION_OPEN"||result.latestGet?.args?.p_week_start!=="2026-10-05"||result.visible!==0||result.firstDay!=="2026-10-05"||result.saveDisabled)throw new Error(JSON.stringify(result));
  return "2026-09-28 -> target 2026-10-05";
});

await check("out_of_target_week_write_fails_closed_before_rpc",async()=>{
  const before=await page.evaluate(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="save_my_availability").length);
  await page.evaluate(()=>{
    const doc=document.getElementById("employeeApp").contentDocument;
    const day=doc.getElementById("quickRegDay");
    const option=doc.createElement("option");option.value="2026-09-28";option.textContent="malicious current-week option";day.append(option);day.value="2026-09-28";
    doc.getElementById("saveReg").click();
  });
  await employee.locator("#quickRegMsg").filter({hasText:"đúng tuần kế tiếp"}).waitFor();
  const after=await page.evaluate(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.filter(x=>x.name==="save_my_availability").length);
  if(after!==before)throw new Error(`save calls ${before}->${after}`);
  return "rejected before save_my_availability";
});

await check("only_canonical_rpc_boundary_is_used",async()=>{
  const calls=await page.evaluate(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.calls);
  const direct=calls.filter(x=>x.kind==="from");
  if(direct.length)throw new Error(JSON.stringify(direct));
  const names=calls.filter(x=>x.kind==="rpc").map(x=>x.name);
  for(const n of ["get_my_availability","save_my_availability","delete_my_availability"]){
    if(!names.includes(n))throw new Error("missing "+n+": "+JSON.stringify(names));
  }
  return [...new Set(names)].join(" → ");
});

await check("browser_diagnostics",async()=>{
  if(report.page_errors.length)throw new Error(report.page_errors.join("\n"));
  if(report.console_errors.length)throw new Error(report.console_errors.join("\n"));
  if(report.request_failures.length)throw new Error(report.request_failures.join("\n"));
  return "0 page/console/request/5xx errors";
});

await page.screenshot({path:path.join(OUT,"employee-availability-canonical.png"),fullPage:true});
await browserInstance.close();
fs.writeFileSync(path.join(OUT,"employee-availability-canonical-report.json"),JSON.stringify(report,null,2));
console.log("EMPLOYEE_AVAILABILITY_CANONICAL_BROWSER="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;
