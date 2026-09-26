import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)})}};

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
const widths=[360,390,430];

for(const width of widths){
  const page=await context.newPage();
  page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
  page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
  page.on("requestfailed",r=>report.request_failures.push("FAILED "+r.method()+" "+r.url()+" "+(r.failure()?.errorText||"")));
  page.on("response",r=>{if(r.status()>=500)report.request_failures.push("HTTP "+r.status()+" "+r.url())});
  await page.setViewportSize({width,height:900});
  await page.goto(BASE+"/09_QA/people-shift/ui2-008-employee-secondary-fixture.html",{waitUntil:"networkidle"});
  const employee=page.frameLocator("#employeeApp");
  await employee.locator("#view-schedule.active").waitFor({timeout:10000});
  await employee.locator('[data-schedule-id="sch-fri-am"]').waitFor({timeout:10000});
  await employee.locator("#availabilityWeekLabel").waitFor({timeout:10000});

  await employee.locator("[data-schedule-availability]").click();
  await employee.locator("#weeklyRegistrationPanel.open").waitFor({state:"visible",timeout:10000});

  await check("ui2_008_availability_"+width+"_responsive_touch_focus_safe_area",async()=>{
    const save=employee.locator("#saveReg");
    await save.focus();
    return employee.locator("html").evaluate((html,expectedWidth)=>{
      const doc=html.ownerDocument,win=doc.defaultView;
      const nav=doc.getElementById("employeeV2PrimaryNav");
      const panel=doc.getElementById("weeklyRegistrationPanel");
      const controls=[...panel.querySelectorAll("button,select")].filter(el=>{
        const r=el.getBoundingClientRect(),st=getComputedStyle(el);
        return !el.hidden&&st.display!=="none"&&st.visibility!=="hidden"&&r.width>0&&r.height>0;
      }).map(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height}});
      const focused=doc.activeElement;
      const state={
        viewport:win.innerWidth,
        scroll:html.scrollWidth,
        client:html.clientWidth,
        minHeight:controls.length?Math.min(...controls.map(x=>x.h)):0,
        focusOutline:focused?getComputedStyle(focused).outlineStyle:"none",
        navHeight:nav?.getBoundingClientRect().height||0,
        panelState:panel.dataset.availabilityState,
        readonly:panel.dataset.availabilityReadonly,
        week:doc.getElementById("availabilityWeekLabel")?.textContent||"",
        rows:panel.querySelectorAll(".miniShift").length
      };
      win.scrollTo(0,html.scrollHeight);
      const last=panel.querySelector(".employee-availability-actions button")||panel.querySelector("button:last-of-type");
      const lastRect=last.getBoundingClientRect(),navRect=nav.getBoundingClientRect();
      state.collision=lastRect.bottom>navRect.top+1;
      if(state.viewport!==expectedWidth||state.scroll>state.client+1||state.minHeight<43.5||state.focusOutline==="none"||state.collision||state.rows<1||!state.week.includes("Tuần tới"))throw new Error(JSON.stringify(state));
      return JSON.stringify(state);
    },width);
  });

  await check("ui2_008_availability_"+width+"_existing_values_and_context",async()=>{
    const state=await employee.locator("#weeklyRegistrationPanel").evaluate(panel=>({
      state:panel.dataset.availabilityState,
      readonly:panel.dataset.availabilityReadonly,
      values:[...panel.querySelectorAll(".miniShift")].map(x=>x.textContent.trim()),
      dayOptions:[...panel.querySelectorAll("#quickRegDay option")].map(x=>x.value)
    }));
    if(state.state!=="ready"||state.readonly!=="false"||!state.values.some(x=>x.includes("09:00–13:00"))||state.dayOptions[0]!=="2026-09-28"||state.dayOptions.at(-1)!=="2026-10-04")throw new Error(JSON.stringify(state));
    return JSON.stringify(state);
  });

  await employee.locator('[data-schedule-id="sch-fri-am"] [data-schedule-action="swap"]').click();
  await employee.locator("#view-swap.active").waitFor({timeout:10000});
  await employee.locator('#view-swap[data-swap-mode="swap"][data-swap-eligibility="eligible"]').waitFor({timeout:10000});

  await check("ui2_008_swap_"+width+"_identity_eligibility_touch_focus_no_overflow",async()=>{
    const submit=employee.locator("#swapForm .swap-actions .btn.primary");
    await submit.focus();
    return employee.locator("html").evaluate((html,expectedWidth)=>{
      const doc=html.ownerDocument,win=doc.defaultView,view=doc.getElementById("view-swap"),nav=doc.getElementById("employeeV2PrimaryNav");
      const controls=[...view.querySelectorAll("button,input,select")].filter(el=>{
        const r=el.getBoundingClientRect(),st=getComputedStyle(el);
        return !el.hidden&&st.display!=="none"&&st.visibility!=="hidden"&&r.width>0&&r.height>0;
      }).map(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height}});
      const state={
        viewport:win.innerWidth,
        scroll:html.scrollWidth,
        client:html.clientWidth,
        minHeight:controls.length?Math.min(...controls.map(x=>x.h)):0,
        focusOutline:getComputedStyle(doc.activeElement).outlineStyle,
        identity:doc.getElementById("swapShiftSummary")?.textContent||"",
        eligibility:view.dataset.swapEligibility,
        mode:view.dataset.swapMode,
        history:doc.getElementById("historyList")?.textContent||""
      };
      win.scrollTo(0,html.scrollHeight);
      const last=view.querySelector(".history-list .history-item:last-child")||view.querySelector(".history-block");
      const lr=last.getBoundingClientRect(),nr=nav.getBoundingClientRect();
      state.collision=lr.bottom>nr.top+1;
      if(state.viewport!==expectedWidth||state.scroll>state.client+1||state.minHeight<43.5||state.focusOutline==="none"||state.collision||state.eligibility!=="eligible"||state.mode!=="swap"||!state.identity.includes("08:00–12:00")||!state.identity.includes("CN-QA-A")||!state.history.includes("Đổi ca gửi đến bạn")||!state.history.includes("Cho ca"))throw new Error(JSON.stringify(state));
      return JSON.stringify(state);
    },width);
  });

  if(width===390){
    await check("ui2_008_availability_state_matrix_submit_error_retry_readonly",async()=>{
      await employee.locator("[data-swap-return-schedule]").click();
      await employee.locator("#view-schedule.active").waitFor();
      await employee.locator("[data-schedule-availability]").click();

      await page.evaluate(async()=>{
        globalThis.__UI2_008_QA.state.today="2026-09-27";
        await globalThis.MAGASIN_EMPLOYEE.availability.refresh();
      });
      await employee.locator('#weeklyRegistrationPanel[data-availability-readonly="true"]').waitFor();
      if(!(await employee.locator("#saveReg").isDisabled()))throw new Error("Sunday save must be disabled");
      const readonlyText=await employee.locator("#quickRegMsg").innerText();
      if(!readonlyText.includes("đã đóng"))throw new Error(readonlyText);

      await page.evaluate(async()=>{
        globalThis.__UI2_008_QA.state.today="2026-09-25";
        globalThis.__UI2_008_QA.state.availabilityError=true;
        await globalThis.MAGASIN_EMPLOYEE.availability.refresh();
      });
      await employee.locator('#weeklyRegistrationPanel[data-availability-state="error"]').waitFor();
      if(await employee.locator("[data-availability-retry]").isHidden())throw new Error("Availability retry hidden");
      await page.evaluate(()=>{globalThis.__UI2_008_QA.state.availabilityError=false});
      await employee.locator("[data-availability-retry]").click();
      await employee.locator('#weeklyRegistrationPanel[data-availability-state="ready"]').waitFor();

      await employee.locator("#quickRegDay").selectOption("2026-09-28");
      await employee.locator("#quickRegStart").selectOption("06:00");
      await employee.locator("#quickRegEnd").selectOption("12:00");
      await employee.locator("#quickRegStore").selectOption("CN-QA-A");
      await page.evaluate(()=>{globalThis.__UI2_008_QA.state.holdAvailabilitySave=true});
      await employee.locator("#saveReg").click();
      await employee.locator('#weeklyRegistrationPanel[data-availability-state="submitting"]').waitFor();
      await page.evaluate(()=>globalThis.__UI2_008_QA.releaseAvailabilitySave());
      await employee.locator('#weeklyRegistrationPanel[data-availability-state="success"]').waitFor();

      const evidence=await page.evaluate(()=>({
        save:globalThis.__UI2_008_QA.calls.filter(x=>x.name==="save_my_availability").at(-1),
        ui:globalThis.MAGASIN_EMPLOYEE.availability.getUiState(),
        policy:globalThis.MAGASIN_EMPLOYEE.availability.getPolicy(),
        rows:globalThis.MAGASIN_EMPLOYEE.availability.getRows()
      }));
      if(evidence.save?.args?.p_work_date!=="2026-09-28"||evidence.save?.args?.p_start_time!=="06:00"||evidence.save?.args?.p_end_time!=="12:00"||evidence.save?.args?.p_preferred_store_id!=="store-a"||evidence.save?.args?.p_availability_type!=="AVAILABLE")throw new Error(JSON.stringify(evidence));
      return JSON.stringify(evidence);
    });

    await check("ui2_008_swap_give_state_matrix_delegation_error_retry_submit",async()=>{
      await employee.locator('[data-schedule-id="sch-fri-am"] [data-schedule-action="swap"]').click();
      await employee.locator('#view-swap[data-swap-mode="swap"][data-swap-eligibility="eligible"]').waitFor();
      await employee.locator("#employeeSwapReason").fill("Đổi ca UI2-008 QA");
      await page.evaluate(()=>{globalThis.__UI2_008_QA.state.holdSwapSubmit=true});
      await employee.locator("#swapForm .swap-actions .btn.primary").click();
      await employee.locator('#view-swap[data-swap-ui-state="submitting"]').waitFor();
      await page.evaluate(()=>globalThis.__UI2_008_QA.releaseSwapSubmit());
      await employee.locator('#view-swap[data-swap-ui-state="success"]').waitFor();

      await employee.locator("[data-swap-return-schedule]").click();
      await employee.locator("#view-schedule.active").waitFor();
      await page.evaluate(()=>{globalThis.__UI2_008_QA.state.candidateError=true});
      await employee.locator('[data-schedule-id="sch-fri-am"] [data-schedule-action="give"]').click();
      await employee.locator('#view-swap[data-swap-mode="give"][data-swap-ui-state="error"]').waitFor();
      if(await employee.locator("[data-swap-retry]").isHidden())throw new Error("Swap/Give retry hidden");
      await page.evaluate(()=>{globalThis.__UI2_008_QA.state.candidateError=false});
      await employee.locator("[data-swap-retry]").click();
      await employee.locator('#view-swap[data-swap-mode="give"][data-swap-eligibility="eligible"]').waitFor();

      const evidence=await page.evaluate(()=>({
        swapSubmit:globalThis.__UI2_008_QA.calls.filter(x=>x.name==="submit_shift_swap_request").at(-1),
        candidateCalls:globalThis.__UI2_008_QA.calls.filter(x=>["list_shift_swap_candidates_v1","list_shift_give_candidates_v1"].includes(x.name)).map(x=>x.name),
        direct:globalThis.__UI2_008_QA.calls.filter(x=>x.kind==="from"),
        ui:globalThis.MAGASIN_EMPLOYEE.swap.getUiState()
      }));
      if(evidence.swapSubmit?.args?.p_requester_schedule_id!=="sch-fri-am"||evidence.swapSubmit?.args?.p_target_schedule_id!=="sch-peer"||evidence.swapSubmit?.args?.p_reason!=="Đổi ca UI2-008 QA"||evidence.direct.length||!evidence.candidateCalls.includes("list_shift_give_candidates_v1"))throw new Error(JSON.stringify(evidence));
      return JSON.stringify(evidence);
    });

    await check("ui2_008_secondary_direct_reload_back_refreshes_canonical_truth",async()=>{
      const handle=await page.locator("#employeeApp").elementHandle();
      const frame=await handle.contentFrame();
      await employee.locator("[data-swap-return-schedule]").click();
      await employee.locator("#view-schedule.active").waitFor();
      await frame.evaluate(()=>history.back());
      await employee.locator("#view-swap.active").waitFor({timeout:10000});
      await frame.evaluate(()=>location.reload());
      await employee.locator("#view-swap.active").waitFor({timeout:10000});
      await employee.locator("#historyList").filter({hasText:"Đổi ca"}).waitFor({timeout:10000});
      const result=await page.evaluate(()=>({
        url:document.getElementById("employeeApp").contentWindow.location.href,
        scheduleReads:globalThis.__UI2_008_QA.calls.filter(x=>x.name==="list_my_approved_schedules_v2").length,
        historyReads:globalThis.__UI2_008_QA.calls.filter(x=>x.name==="list_my_shift_swaps_v2").length,
        direct:globalThis.__UI2_008_QA.calls.filter(x=>x.kind==="from").length
      }));
      if(!result.url.endsWith("#swap")||result.scheduleReads<2||result.historyReads<2||result.direct!==0)throw new Error(JSON.stringify(result));
      return JSON.stringify(result);
    });
  }

  await page.screenshot({path:path.join(OUT,"ui2-008-employee-secondary-phone-"+width+".png"),fullPage:true});
  await page.close();
}

await check("ui2_008_browser_diagnostics_clean",async()=>{
  if(report.page_errors.length||report.console_errors.length||report.request_failures.length)throw new Error(JSON.stringify(report));
  return "0 page/console/request/5xx errors";
});

await browser.close();
fs.writeFileSync(path.join(OUT,"ui2-008-employee-secondary-report.json"),JSON.stringify(report,null,2));
console.log("UI2_008_EMPLOYEE_SECONDARY_BROWSER="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=="PASS")process.exitCode=1;
