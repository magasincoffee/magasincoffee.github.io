import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)})}};

const browserInstance=await chromium.launch({headless:true});
const context=await browserInstance.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:390,height:844}});
const page=await context.newPage();
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText||""}`));
page.on("response",r=>{if(r.status()>=500)report.request_failures.push(`HTTP ${r.status()} ${r.url()}`)});

await page.goto(BASE+"/09_QA/people-shift/sched-03-employee-schedule-ui-fixture.html",{waitUntil:"networkidle"});
const employee=page.frameLocator("#employeeApp");
await employee.locator(".employee-schedule-engine").waitFor();

await check("sched07_employee_shared_polish_and_role_marker",async()=>{
  const state=await employee.locator("html").evaluate(el=>({
    role:el.dataset.schedulingRole,
    engineCss:!!el.ownerDocument.getElementById("employee-schedule-engine-v1-css")
  }));
  if(state.role!=="employee"||!state.engineCss)throw new Error(JSON.stringify(state));
  return JSON.stringify(state);
});

await check("sched07_employee_mobile_touch_focus_and_no_overflow",async()=>{
  const nav=employee.locator('[data-schedule-week="today"]');
  await nav.focus();
  const metric=await nav.evaluate(el=>({
    h:el.getBoundingClientRect().height,
    outline:getComputedStyle(el).outlineStyle,
    scroll:el.ownerDocument.documentElement.scrollWidth,
    client:el.ownerDocument.documentElement.clientWidth
  }));
  if(metric.h<43.5||metric.outline==="none"||metric.scroll>metric.client+2)throw new Error(JSON.stringify(metric));
  return JSON.stringify(metric);
});

await check("ui2_005_schedule_secondary_actions_remain_reachable",async()=>{
  const state=await employee.locator("#view-schedule").evaluate(root=>({
    availability:root.querySelectorAll("[data-schedule-availability]").length,
    give:root.querySelectorAll('[data-schedule-action="give"]').length,
    swap:root.querySelectorAll('[data-schedule-action="swap"]').length
  }));
  if(state.availability<1||state.give<1||state.swap<1)throw new Error(JSON.stringify(state));
  return JSON.stringify(state);
});

const shellWidths=[360,390,430];
for(const width of shellWidths){
  const employeeShell=await context.newPage();
  const shellAssets=[];
  employeeShell.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
  employeeShell.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
  employeeShell.on("requestfailed",r=>report.request_failures.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText||""}`));
  employeeShell.on("response",r=>{
    if(r.url().includes("magasin-ui-v2-employee-shell"))shellAssets.push({url:r.url(),status:r.status()});
    if(r.status()>=500)report.request_failures.push(`HTTP ${r.status()} ${r.url()}`);
  });
  await employeeShell.setViewportSize({width,height:844});
  await employeeShell.goto(BASE+"/06_EMPLOYEE/app/employee-v40.html#schedule",{waitUntil:"networkidle"});
  try{
    await employeeShell.locator("#employeeV2PrimaryNav").waitFor({state:"attached",timeout:5000});
  }catch(e){
    const diag=await employeeShell.evaluate(()=>({
      readyState:document.readyState,
      bodyDataset:{...document.body.dataset},
      scripts:[...document.scripts].map(x=>x.src||"INLINE"),
      shellGlobal:!!window.MAGASIN_EMPLOYEE_UI_V2_SHELL,
      showViewType:typeof window.showView,
      navExists:!!document.getElementById("employeeV2PrimaryNav")
    }));
    throw new Error("UI2_005_SHELL_BOOT_DIAG "+JSON.stringify({width,diag,shellAssets,consoleErrors:report.console_errors.slice(-8),pageErrors:report.page_errors.slice(-8)}));
  }
  try{
    await employeeShell.locator('[data-employee-primary-view="schedule"][aria-current="page"]').waitFor({timeout:5000});
  }catch(e){
    const state=await employeeShell.evaluate(()=>({
      href:location.href,
      hash:location.hash,
      activeView:document.querySelector('.page-view.active[id^="view-"]')?.id||null,
      shellCurrent:window.MAGASIN_EMPLOYEE_UI_V2_SHELL?.getCurrentView?.()||null,
      nav:[...document.querySelectorAll("[data-employee-primary-view]")].map(x=>({
        view:x.dataset.employeePrimaryView,
        current:x.getAttribute("aria-current"),
        active:x.dataset.active,
        display:getComputedStyle(x).display,
        visibility:getComputedStyle(x).visibility,
        rect:{w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height}
      }))
    }));
    throw new Error("UI2_005_ACTIVE_STATE_DIAG "+JSON.stringify({width,state}));
  }

  await check("ui2_005_employee_"+width+"_bottom_nav_bounds_touch_and_no_overflow",async()=>{
    return employeeShell.evaluate(()=>{
      const html=document.documentElement;
      const nav=document.getElementById("employeeV2PrimaryNav");
      const rect=nav.getBoundingClientRect();
      const buttons=[...nav.querySelectorAll("[data-employee-primary-view]")].map(x=>{
        const r=x.getBoundingClientRect();
        return {view:x.dataset.employeePrimaryView,w:r.width,h:r.height,current:x.getAttribute("aria-current")};
      });
      const state={
        viewport:innerWidth,
        scrollWidth:html.scrollWidth,
        clientWidth:html.clientWidth,
        nav:{left:rect.left,right:rect.right,bottom:innerHeight-rect.bottom,width:rect.width,height:rect.height,position:getComputedStyle(nav).position,paddingBottom:getComputedStyle(nav).paddingBottom},
        buttons
      };
      if(state.scrollWidth>state.clientWidth+1)throw new Error(JSON.stringify(state));
      if(Math.abs(rect.left)>1||Math.abs(rect.right-innerWidth)>1||Math.abs(state.nav.bottom)>1)throw new Error(JSON.stringify(state));
      if(buttons.length!==5||buttons.some(x=>x.w<43.5||x.h<43.5))throw new Error(JSON.stringify(state));
      return JSON.stringify(state);
    });
  });

  if(width===390){
    await check("ui2_005_employee_hash_back_reload_and_secondary_drawer",async()=>{
      await employeeShell.locator('[data-employee-primary-view="attendance"]').click();
      if(!employeeShell.url().endsWith("#attendance"))throw new Error(employeeShell.url());
      await employeeShell.locator("#view-attendance.active").waitFor();

      await employeeShell.locator('[data-employee-primary-view="schedule"]').click();
      if(!employeeShell.url().endsWith("#schedule"))throw new Error(employeeShell.url());
      await employeeShell.goBack();
      await employeeShell.locator("#view-attendance.active").waitFor();
      if(!employeeShell.url().endsWith("#attendance"))throw new Error(employeeShell.url());

      await employeeShell.reload({waitUntil:"networkidle"});
      await employeeShell.locator("#employeeV2PrimaryNav").waitFor({state:"attached"});
      await employeeShell.locator("#view-attendance.active").waitFor();
      await employeeShell.goto(BASE+"/06_EMPLOYEE/app/employee-v40.html#swap",{waitUntil:"networkidle"});
      await employeeShell.locator("#view-swap.active").waitFor();
      const scheduleCurrent=await employeeShell.locator('[data-employee-primary-view="schedule"]').getAttribute("aria-current");
      if(scheduleCurrent!=="page")throw new Error("swap parent="+scheduleCurrent);

      const menu=employeeShell.locator(".header-menu");
      await menu.click();
      const drawer=employeeShell.locator("#drawer.open");
      await drawer.waitFor({state:"visible"});
      const secondary=await drawer.locator(".nav a:visible").evaluateAll(nodes=>nodes.map(x=>x.dataset.view));
      if(JSON.stringify(secondary)!==JSON.stringify(["inventory","swap","settings"]))throw new Error(JSON.stringify(secondary));
      const expanded=await menu.getAttribute("aria-expanded");
      if(expanded!=="true")throw new Error("aria-expanded="+expanded);
      await employeeShell.keyboard.press("Escape");
      if(await menu.getAttribute("aria-expanded")!=="false")throw new Error("drawer did not close");

      const notice=employeeShell.locator('.header-icon[aria-label="Thông báo"]');
      const noticeSize=await notice.evaluate(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height}});
      if(noticeSize.w<43.5||noticeSize.h<43.5)throw new Error(JSON.stringify(noticeSize));
      await notice.click();
      await employeeShell.locator("#view-notice.active").waitFor();

      return JSON.stringify({secondary,noticeSize,url:employeeShell.url()});
    });
    await employeeShell.screenshot({path:path.join(OUT,"ui2-005-employee-phone-390.png"),fullPage:true});
  }
  await employeeShell.close();
}

const employeeTablet=await context.newPage();
employeeTablet.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
employeeTablet.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
employeeTablet.on("requestfailed",r=>report.request_failures.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText||""}`));
employeeTablet.on("response",r=>{if(r.status()>=500)report.request_failures.push(`HTTP ${r.status()} ${r.url()}`)});
await employeeTablet.setViewportSize({width:900,height:900});
await employeeTablet.goto(BASE+"/06_EMPLOYEE/app/employee-v40.html#dashboard",{waitUntil:"networkidle"});
await employeeTablet.locator("#employeeV2PrimaryNav").waitFor({state:"attached"});
await check("ui2_005_employee_tablet_mobile_architecture_expansion",async()=>{
  return employeeTablet.evaluate(()=>{
    const html=document.documentElement,nav=document.getElementById("employeeV2PrimaryNav"),rect=nav.getBoundingClientRect();
    const state={viewport:innerWidth,scroll:html.scrollWidth,client:html.clientWidth,navWidth:rect.width,navBottom:innerHeight-rect.bottom,columns:getComputedStyle(nav).gridTemplateColumns.split(" ").filter(Boolean).length};
    if(state.scroll>state.client+1||state.columns!==5||Math.abs(state.navBottom)>1)throw new Error(JSON.stringify(state));
    return JSON.stringify(state);
  });
});
await employeeTablet.close();

const employeeDesktop=await context.newPage();
employeeDesktop.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
employeeDesktop.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
employeeDesktop.on("requestfailed",r=>report.request_failures.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText||""}`));
employeeDesktop.on("response",r=>{if(r.status()>=500)report.request_failures.push(`HTTP ${r.status()} ${r.url()}`)});
await employeeDesktop.setViewportSize({width:1440,height:1000});
await employeeDesktop.goto(BASE+"/06_EMPLOYEE/app/employee-v40.html#dashboard",{waitUntil:"networkidle"});
await employeeDesktop.locator("#employeeV2PrimaryNav").waitFor({state:"attached"});
await check("ui2_005_employee_desktop_rail_expansion",async()=>{
  return employeeDesktop.evaluate(()=>{
    const html=document.documentElement,nav=document.getElementById("employeeV2PrimaryNav"),main=document.querySelector(".main");
    const nr=nav.getBoundingClientRect(),mr=main.getBoundingClientRect();
    const state={viewport:innerWidth,scroll:html.scrollWidth,client:html.clientWidth,navWidth:nr.width,navLeft:nr.left,mainLeft:mr.left,position:getComputedStyle(nav).position};
    if(state.scroll>state.client+1||state.navWidth<200||state.navWidth>216||state.mainLeft<200||state.position!=="fixed")throw new Error(JSON.stringify(state));
    return JSON.stringify(state);
  });
});
await employeeDesktop.screenshot({path:path.join(OUT,"ui2-005-employee-desktop-1440.png"),fullPage:true});
await employeeDesktop.close();

const todayWidths=[360,390,430];
for(const width of todayWidths){
  const todayPage=await context.newPage();
  todayPage.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
  todayPage.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
  todayPage.on("requestfailed",r=>report.request_failures.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText||""}`));
  todayPage.on("response",r=>{if(r.status()>=500)report.request_failures.push(`HTTP ${r.status()} ${r.url()}`)});
  await todayPage.setViewportSize({width,height:844});
  await todayPage.goto(BASE+"/09_QA/people-shift/ui2-006-employee-today-fixture.html",{waitUntil:"networkidle"});
  const today=todayPage.frameLocator("#employeeApp");
  await today.locator("#view-dashboard.active").waitFor({state:"visible",timeout:10000});
  await today.locator('[data-employee-primary-view="dashboard"][aria-current="page"]').waitFor({timeout:10000});
  await today.locator('[data-today-shift-kind="current"]').waitFor({timeout:10000});

  await check("ui2_006_employee_today_"+width+"_responsive_touch_no_collision",async()=>{
    return today.locator("html").evaluate((html)=>{
      const doc=html.ownerDocument,win=doc.defaultView;
      const nav=doc.getElementById("employeeV2PrimaryNav");
      const main=doc.querySelector(".main");
      const dashboard=doc.querySelector("#view-dashboard");
      const current=doc.querySelector('[data-today-shift-kind="current"]');
      const week=doc.querySelectorAll("#employeeTodayWeekSummary .employee-today-day");
      const queue=doc.querySelectorAll("#taskList [data-today-queue-action]");
      const buttons=[...dashboard.querySelectorAll("button")].filter(b=>{
        const s=getComputedStyle(b),r=b.getBoundingClientRect();
        return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0;
      }).map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent.trim(),w:r.width,h:r.height}});
      const initial={
        viewport:win.innerWidth,
        scrollWidth:html.scrollWidth,
        clientWidth:html.clientWidth,
        navHeight:nav.getBoundingClientRect().height,
        navBottom:win.innerHeight-nav.getBoundingClientRect().bottom,
        mainPaddingBottom:parseFloat(getComputedStyle(main).paddingBottom),
        currentKind:current?.dataset.todayShiftKind||null,
        weekCells:week.length,
        queueCount:queue.length,
        minButtonHeight:buttons.length?Math.min(...buttons.map(x=>x.h)):0
      };
      win.scrollTo(0,html.scrollHeight);
      const last=doc.querySelector('.employee-today-shortcut[data-today-route="payroll"]');
      const collision=last.getBoundingClientRect().bottom>nav.getBoundingClientRect().top+1;
      if(initial.scrollWidth>initial.clientWidth+1||Math.abs(initial.navBottom)>1||initial.mainPaddingBottom<initial.navHeight||initial.minButtonHeight<43.5||initial.currentKind!=="current"||initial.weekCells!==7||initial.queueCount<1||collision){
        throw new Error(JSON.stringify({...initial,collision,buttons}));
      }
      return JSON.stringify({...initial,collision});
    });
  });

  if(width===390){
    await check("ui2_006_today_current_next_loading_empty_error_states",async()=>{
      const state={};
      state.current=await today.locator("#employeeTodayShiftHeading").innerText();
      if(state.current!=="Đang trong ca")throw new Error(JSON.stringify(state));

      await todayPage.evaluate(()=>__UI2_006_QA.setMode("next"));
      await today.locator('[data-today-shift-kind="next"]').waitFor();
      state.next=await today.locator("#employeeTodayShiftHeading").innerText();
      if(state.next!=="Ca tiếp theo")throw new Error(JSON.stringify(state));

      await todayPage.evaluate(()=>__UI2_006_QA.setMode("loading"));
      await today.locator("[data-today-loading='1']").waitFor();
      await today.locator("[data-today-week-loading='1']").waitFor();
      state.loading=await today.locator("#employeeTodayShiftHeading").innerText();

      await todayPage.evaluate(()=>__UI2_006_QA.setMode("empty"));
      await today.locator("#todayNoShift").waitFor({state:"visible"});
      state.empty=await today.locator("#employeeTodayShiftHeading").innerText();

      await todayPage.evaluate(()=>__UI2_006_QA.setMode("error"));
      await today.locator("[data-today-error='1']").waitFor();
      await today.locator("[data-today-week-error='1']").waitFor();
      state.error=await today.locator("#employeeTodayShiftHeading").innerText();

      await today.locator('[data-today-action="retry-schedule"]').first().click();
      await today.locator('[data-today-shift-kind="current"]').waitFor();
      state.recovered=await today.locator("#employeeTodayShiftHeading").innerText();
      if(state.loading!=="Đang tải lịch làm"||state.empty!=="Hôm nay không có ca"||state.error!=="Không tải được lịch"||state.recovered!=="Đang trong ca")throw new Error(JSON.stringify(state));
      return JSON.stringify(state);
    });

    await check("ui2_006_today_action_queue_uses_existing_canonical_actions",async()=>{
      await todayPage.evaluate(()=>__UI2_006_QA.setMode("current"));
      await today.locator('[data-today-shift-kind="current"]').waitFor();
      const queue=await today.locator("#taskList [data-today-queue-action]").evaluateAll(nodes=>nodes.map(n=>n.dataset.todayQueueAction));
      if(!queue.includes("attendance:sch-current")||!queue.includes("availability"))throw new Error(JSON.stringify(queue));

      await today.locator("#employeeDashboardAttendance").click();
      await today.locator("#view-attendance.active").waitFor();
      const actions=await todayPage.evaluate(()=>__UI2_006_QA.actions.slice());
      if(!actions.some(x=>x.type==="schedule-action"&&x.action==="attendance"&&x.id==="sch-current"))throw new Error(JSON.stringify(actions));

      await today.locator('[data-employee-primary-view="dashboard"]').click();
      await today.locator("#view-dashboard.active").waitFor();
      await today.locator('[data-today-action="availability"]').click();
      await today.locator("#weeklyRegistrationPanel.open").waitFor({state:"visible"});
      const after=await todayPage.evaluate(()=>__UI2_006_QA.actions.slice());
      if(!after.some(x=>x.type==="availability-open"))throw new Error(JSON.stringify(after));
      return JSON.stringify({queue,actions:after});
    });

    await check("ui2_006_today_direct_reload_back_keeps_dashboard_active",async()=>{
      const frameHandle=await todayPage.locator("#employeeApp").elementHandle();
      const frame=await frameHandle.contentFrame();
      await today.locator('[data-employee-primary-view="dashboard"]').click();
      await today.locator("#view-dashboard.active").waitFor();
      const direct=frame.url();
      if(!direct.endsWith("#dashboard"))throw new Error(direct);

      await today.locator('[data-employee-primary-view="schedule"]').click();
      await today.locator("#view-schedule.active").waitFor();
      if(!frame.url().endsWith("#schedule"))throw new Error(frame.url());

      await frame.evaluate(()=>history.back());
      await today.locator("#view-dashboard.active").waitFor();
      await today.locator('[data-employee-primary-view="dashboard"][aria-current="page"]').waitFor();
      if(!frame.url().endsWith("#dashboard"))throw new Error(frame.url());

      await frame.evaluate(()=>location.reload());
      await today.locator("#view-dashboard.active").waitFor();
      await today.locator('[data-employee-primary-view="dashboard"][aria-current="page"]').waitFor();
      if(!frame.url().endsWith("#dashboard"))throw new Error(frame.url());

      return direct+" -> schedule -> back/reload dashboard";
    });

    await todayPage.screenshot({path:path.join(OUT,"ui2-006-employee-today-phone-390.png"),fullPage:true});
  }
  await todayPage.close();
}

const todayDesktop=await context.newPage();
todayDesktop.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
todayDesktop.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
todayDesktop.on("requestfailed",r=>report.request_failures.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText||""}`));
todayDesktop.on("response",r=>{if(r.status()>=500)report.request_failures.push(`HTTP ${r.status()} ${r.url()}`)});
await todayDesktop.setViewportSize({width:1440,height:1000});
await todayDesktop.goto(BASE+"/09_QA/people-shift/ui2-006-employee-today-fixture.html",{waitUntil:"networkidle"});
const todayDesktopFrame=todayDesktop.frameLocator("#employeeApp");
await todayDesktopFrame.locator('[data-today-shift-kind="current"]').waitFor({timeout:10000});
await check("ui2_006_today_desktop_expansion_smoke",async()=>{
  return todayDesktopFrame.locator("html").evaluate(html=>{
    const doc=html.ownerDocument;
    const layout=doc.querySelector(".employee-today-layout");
    const nav=doc.getElementById("employeeV2PrimaryNav");
    const main=doc.querySelector(".main");
    const state={
      scroll:html.scrollWidth,
      client:html.clientWidth,
      columns:getComputedStyle(layout).gridTemplateColumns.split(" ").filter(Boolean).length,
      navWidth:nav.getBoundingClientRect().width,
      mainLeft:main.getBoundingClientRect().left
    };
    if(state.scroll>state.client+1||state.columns!==2||state.navWidth<200||state.navWidth>216||state.mainLeft<200)throw new Error(JSON.stringify(state));
    return JSON.stringify(state);
  });
});
await todayDesktop.screenshot({path:path.join(OUT,"ui2-006-employee-today-desktop-1440.png"),fullPage:true});
await todayDesktop.close();

const scheduleV2Widths=[360,390,430];
for(const width of scheduleV2Widths){
  const schedulePage=await context.newPage();
  schedulePage.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
  schedulePage.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
  schedulePage.on("requestfailed",r=>report.request_failures.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText||""}`));
  schedulePage.on("response",r=>{if(r.status()>=500)report.request_failures.push(`HTTP ${r.status()} ${r.url()}`)});
  await schedulePage.setViewportSize({width,height:844});
  await schedulePage.goto(BASE+"/09_QA/people-shift/ui2-007-employee-schedule-fixture.html",{waitUntil:"networkidle"});
  const scheduleV2=schedulePage.frameLocator("#employeeApp");
  await scheduleV2.locator("#view-schedule.active").waitFor({state:"visible",timeout:10000});
  await scheduleV2.locator('[data-employee-primary-view="schedule"][aria-current="page"]').waitFor({timeout:10000});
  await scheduleV2.locator('[data-schedule-id="sch-fri-am"]').waitFor({timeout:10000});

  await scheduleV2.locator('[data-schedule-week="today"]').focus();
  await check("ui2_007_employee_schedule_"+width+"_responsive_touch_no_collision",async()=>{
    return scheduleV2.locator("html").evaluate(html=>{
      const doc=html.ownerDocument,win=doc.defaultView;
      const root=doc.querySelector("#view-schedule");
      const nav=doc.getElementById("employeeV2PrimaryNav");
      const main=doc.querySelector(".main");
      const weekToday=root.querySelector('[data-schedule-week="today"]');
      const buttons=[...root.querySelectorAll("button")].filter(b=>{
        const s=getComputedStyle(b),r=b.getBoundingClientRect();
        return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0;
      }).map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent.trim(),w:r.width,h:r.height}});
      const current=root.querySelector('.day.today[data-schedule-date="2026-09-25"]');
      const state={
        viewport:win.innerWidth,
        scrollWidth:html.scrollWidth,
        clientWidth:html.clientWidth,
        cssAsset:!!doc.querySelector('link[href*="magasin-ui-v2-employee-schedule.css"]'),
        navHeight:nav.getBoundingClientRect().height,
        navBottom:win.innerHeight-nav.getBoundingClientRect().bottom,
        mainPaddingBottom:parseFloat(getComputedStyle(main).paddingBottom),
        dayCount:root.querySelectorAll(".days > .day").length,
        currentDay:current?.dataset.scheduleDate||null,
        currentTag:current?.querySelector(".today-tag")?.textContent.trim()||null,
        currentShiftCount:current?.querySelectorAll(".shift").length||0,
        minButtonHeight:buttons.length?Math.min(...buttons.map(x=>x.h)):0,
        focusOutline:getComputedStyle(weekToday).outlineStyle
      };
      win.scrollTo(0,html.scrollHeight);
      const last=root.querySelector("[data-schedule-availability]");
      const collision=last.getBoundingClientRect().bottom>nav.getBoundingClientRect().top+1;
      if(
        state.scrollWidth>state.clientWidth+1||
        !state.cssAsset||
        Math.abs(state.navBottom)>1||
        state.mainPaddingBottom<state.navHeight||
        state.dayCount!==7||
        state.currentDay!=="2026-09-25"||
        state.currentTag!=="HÔM NAY"||
        state.currentShiftCount!==2||
        state.minButtonHeight<43.5||
        state.focusOutline==="none"||
        collision
      )throw new Error(JSON.stringify({...state,collision,buttons}));
      return JSON.stringify({...state,collision});
    });
  });

  if(width===390){
    await check("ui2_007_schedule_week_navigation_and_states",async()=>{
      const state={};
      state.initial=await scheduleV2.locator(".schedule-statusline .pill").innerText();
      state.initialRows=await scheduleV2.locator(".shift").count();
      state.initialMultiple=await scheduleV2.locator('[data-schedule-date="2026-09-25"] .shift').count();
      if(state.initialRows!==4||state.initialMultiple!==2)throw new Error(JSON.stringify(state));

      await scheduleV2.locator('[data-schedule-week="next"]').click();
      await schedulePage.waitForFunction(()=>window.MAGASIN_EMPLOYEE?.schedule?.getWeek?.()==="2026-09-28");
      await scheduleV2.locator('[data-schedule-id="sch-next"]').waitFor();
      state.nextWeek=await schedulePage.evaluate(()=>window.MAGASIN_EMPLOYEE.schedule.getWeek());
      state.nextRows=await scheduleV2.locator(".shift").count();
      if(state.nextWeek!=="2026-09-28"||state.nextRows!==1)throw new Error(JSON.stringify(state));

      await scheduleV2.locator('[data-schedule-week="today"]').click();
      await schedulePage.waitForFunction(()=>window.MAGASIN_EMPLOYEE?.schedule?.getWeek?.()==="2026-09-21");
      await scheduleV2.locator('[data-schedule-id="sch-fri-am"]').waitFor();

      await schedulePage.evaluate(()=>window.__UI2_007_QA.startLoading());
      await scheduleV2.locator("[data-schedule-loading='1']").waitFor();
      state.loading=await scheduleV2.locator(".schedule-statusline .pill").innerText();
      await schedulePage.evaluate(()=>window.__UI2_007_QA.releaseLoading("populated"));
      await scheduleV2.locator('[data-schedule-id="sch-fri-am"]').waitFor();

      await schedulePage.evaluate(async()=>{await window.__UI2_007_QA.setMode("empty")});
      await scheduleV2.locator("[data-schedule-empty='1']").waitFor();
      state.empty=await scheduleV2.locator("[data-schedule-empty='1']").innerText();

      await schedulePage.evaluate(async()=>{await window.__UI2_007_QA.setMode("error")});
      await scheduleV2.locator("[data-schedule-error='1']").waitFor();
      state.error=await scheduleV2.locator("[data-schedule-error='1']").innerText();

      await schedulePage.evaluate(()=>window.__UI2_007_QA.setModeOnly("populated"));
      await scheduleV2.locator("[data-schedule-retry]").click();
      await scheduleV2.locator('[data-schedule-id="sch-fri-am"]').waitFor();
      state.recovered=await scheduleV2.locator(".shift").count();

      if(!state.loading.includes("Đang tải")||!state.empty.includes("chưa có ca")||!state.error.includes("Không tải được lịch làm")||state.recovered!==4){
        throw new Error(JSON.stringify(state));
      }
      return JSON.stringify(state);
    });

    await check("ui2_007_schedule_actions_delegate_to_existing_handlers",async()=>{
      await schedulePage.evaluate(async()=>{await window.__UI2_007_QA.setMode("populated")});
      await scheduleV2.locator('[data-schedule-id="sch-fri-am"]').waitFor();
      const card=scheduleV2.locator('[data-schedule-id="sch-fri-am"]');
      const actions=await card.locator("[data-schedule-action]").evaluateAll(nodes=>nodes.map(n=>n.dataset.scheduleAction));
      if(!actions.includes("attendance")||!actions.includes("give")||!actions.includes("swap"))throw new Error(JSON.stringify(actions));

      await card.locator('[data-schedule-action="attendance"]').click();
      await scheduleV2.locator("#view-attendance.active").waitFor();
      const downstream=await schedulePage.evaluate(()=>window.__UI2_007_QA.downstream.slice());
      if(!downstream.some(x=>x.type==="attendance"&&x.id==="sch-fri-am"&&x.week==="2026-09-21"))throw new Error(JSON.stringify(downstream));

      await scheduleV2.locator('[data-employee-primary-view="schedule"]').click();
      await scheduleV2.locator("#view-schedule.active").waitFor();
      await scheduleV2.locator('[data-schedule-id="sch-fri-am"]').waitFor();
      return JSON.stringify({actions,downstream});
    });

    await check("ui2_007_schedule_direct_reload_back_keeps_shell_route",async()=>{
      const frameHandle=await schedulePage.locator("#employeeApp").elementHandle();
      const frame=await frameHandle.contentFrame();
      await scheduleV2.locator('[data-employee-primary-view="schedule"]').click();
      await scheduleV2.locator("#view-schedule.active").waitFor();
      const direct=frame.url();
      if(!direct.endsWith("#schedule"))throw new Error(direct);

      await scheduleV2.locator('[data-employee-primary-view="dashboard"]').click();
      await scheduleV2.locator("#view-dashboard.active").waitFor();
      if(!frame.url().endsWith("#dashboard"))throw new Error(frame.url());

      await frame.evaluate(()=>history.back());
      await scheduleV2.locator("#view-schedule.active").waitFor();
      await scheduleV2.locator('[data-employee-primary-view="schedule"][aria-current="page"]').waitFor();
      if(!frame.url().endsWith("#schedule"))throw new Error(frame.url());

      await frame.evaluate(()=>location.reload());
      await scheduleV2.locator("#view-schedule.active").waitFor();
      await scheduleV2.locator('[data-employee-primary-view="schedule"][aria-current="page"]').waitFor();
      await scheduleV2.locator('[data-schedule-id="sch-fri-am"]').waitFor();
      if(!frame.url().endsWith("#schedule"))throw new Error(frame.url());

      return direct+" -> dashboard -> back/reload schedule";
    });
  }

  await schedulePage.screenshot({path:path.join(OUT,`ui2-007-employee-schedule-phone-${width}.png`),fullPage:true});
  await schedulePage.close();
}

await import("./ui2-008-employee-secondary-browser.mjs");

const scheduleV2Desktop=await context.newPage();
scheduleV2Desktop.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
scheduleV2Desktop.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
scheduleV2Desktop.on("requestfailed",r=>report.request_failures.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText||""}`));
scheduleV2Desktop.on("response",r=>{if(r.status()>=500)report.request_failures.push(`HTTP ${r.status()} ${r.url()}`)});
await scheduleV2Desktop.setViewportSize({width:1440,height:1000});
await scheduleV2Desktop.goto(BASE+"/09_QA/people-shift/ui2-007-employee-schedule-fixture.html",{waitUntil:"networkidle"});
const scheduleV2DesktopFrame=scheduleV2Desktop.frameLocator("#employeeApp");
await scheduleV2DesktopFrame.locator('[data-schedule-id="sch-fri-am"]').waitFor({timeout:10000});
await check("ui2_007_schedule_desktop_week_smoke",async()=>{
  return scheduleV2DesktopFrame.locator("html").evaluate(html=>{
    const doc=html.ownerDocument;
    const days=doc.querySelector("#view-schedule .days");
    const nav=doc.getElementById("employeeV2PrimaryNav");
    const main=doc.querySelector(".main");
    const state={
      scroll:html.scrollWidth,
      client:html.clientWidth,
      columns:getComputedStyle(days).gridTemplateColumns.split(" ").filter(Boolean).length,
      navWidth:nav.getBoundingClientRect().width,
      mainLeft:main.getBoundingClientRect().left
    };
    if(state.scroll>state.client+1||state.columns!==7||state.navWidth<200||state.navWidth>216||state.mainLeft<200)throw new Error(JSON.stringify(state));
    return JSON.stringify(state);
  });
});
await scheduleV2Desktop.screenshot({path:path.join(OUT,"ui2-007-employee-schedule-desktop-1440.png"),fullPage:true});
await scheduleV2Desktop.close();

await page.goto(BASE+"/09_QA/people-shift/manager-workforce-canonical-fixture.html",{waitUntil:"networkidle"});
await page.locator("#panel-publish .msd").waitFor();
await check("sched07_manager_mobile_stacks_board_without_page_overflow",async()=>{
  const state=await page.evaluate(()=>{
    const html=document.documentElement,board=document.querySelector(".msd-board"),btn=document.querySelector("#msdStart");
    return {
      role:html.dataset.schedulingRole,
      css:!!document.getElementById("workforce-scheduling-polish-v1-css"),
      cols:getComputedStyle(board).gridTemplateColumns.split(" ").filter(Boolean).length,
      minWidth:getComputedStyle(board).minWidth,
      buttonHeight:btn.getBoundingClientRect().height,
      scroll:html.scrollWidth,client:html.clientWidth
    };
  });
  if(state.role!=="manager"||!state.css||state.cols!==1||state.buttonHeight<43.5||state.scroll>state.client+2)throw new Error(JSON.stringify(state));
  return JSON.stringify(state);
});

await page.goto(BASE+"/09_QA/people-shift/sched-05-owner-scheduling-fixture.html",{waitUntil:"networkidle"});
await page.locator("#panel-publish .msd").waitFor();
await check("sched07_owner_uses_same_polish_with_owner_context",async()=>{
  const state=await page.evaluate(()=>{
    const html=document.documentElement,scope=document.querySelector(".owner-sched-scope"),store=document.querySelector("#msdStore");
    return {
      role:html.dataset.schedulingRole,
      css:!!document.getElementById("workforce-scheduling-polish-v1-css"),
      scopeRadius:getComputedStyle(scope).borderRadius,
      storeHeight:store.getBoundingClientRect().height,
      scroll:html.scrollWidth,client:html.clientWidth
    };
  });
  if(state.role!=="owner"||!state.css||state.storeHeight<43.5||state.scroll>state.client+2)throw new Error(JSON.stringify(state));
  return JSON.stringify(state);
});

const shellPage=await context.newPage();
shellPage.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
shellPage.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
shellPage.on("requestfailed",r=>report.request_failures.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText||""}`));
shellPage.on("response",r=>{if(r.status()>=500)report.request_failures.push(`HTTP ${r.status()} ${r.url()}`)});
await shellPage.setViewportSize({width:1440,height:1000});
await shellPage.goto(BASE+"/05_MANAGER/runtime/manager-shell-v1.html",{waitUntil:"networkidle"});
await shellPage.evaluate(()=>{
  document.body.dataset.magasinUiV2="";
  document.body.dataset.magasinShellV2="";
  document.body.dataset.magasinShellRole="manager";
  document.body.dataset.magasinShellMode="legacy-manager";
  globalThis.__MAGASIN_UI_V2_SHELL__={role:"MANAGER",mode:"legacy-manager"};
});
await shellPage.addStyleTag({url:BASE+"/02_CORE/ui/magasin-ui-v2-shell.css"});
await shellPage.addScriptTag({url:BASE+"/02_CORE/ui/magasin-ui-v2-shell.js"});
await shellPage.locator("#magasinUiV2Shell").waitFor({state:"attached"});
await shellPage.locator(".m-shell-v2-sidebar").waitFor({state:"visible"});
await shellPage.locator(".m-shell-v2-topbar").waitFor({state:"visible"});

await check("ui2_004_manager_desktop_shell_nav_contract",async()=>{
  const state=await shellPage.evaluate(()=>{
    const links=Array.from(document.querySelectorAll(".m-shell-v2-nav__item")).map(x=>({
      key:x.dataset.shellKey,label:x.textContent.trim(),current:x.getAttribute("aria-current")
    }));
    const sidebar=document.querySelector(".m-shell-v2-sidebar");
    const menu=document.querySelector("[data-shell-menu]");
    const hidden=Object.fromEntries(["kpi","academy"].map(key=>{
      const node=document.querySelector('.sidebar [data-view="'+key+'"]');
      return [key,{hidden:node?.hidden,aria:node?.getAttribute("aria-hidden"),tabIndex:node?.tabIndex}];
    }));
    return {
      links,
      sidebarWidth:sidebar?.getBoundingClientRect().width||0,
      menuDisplay:menu?getComputedStyle(menu).display:"",
      hidden
    };
  });
  const primary=["dashboard","workforce","swap","attendance","staff","payroll-self-check"];
  const secondary=["schedule","tasks","settings"];
  for(const key of [...primary,...secondary])if(!state.links.some(x=>x.key===key))throw new Error(JSON.stringify(state));
  if(state.links.some(x=>["kpi","academy"].includes(x.key)))throw new Error(JSON.stringify(state.links));
  if(!state.hidden.kpi.hidden||!state.hidden.academy.hidden)throw new Error(JSON.stringify(state.hidden));
  if(state.sidebarWidth<240||state.menuDisplay!=="none")throw new Error(JSON.stringify(state));
  return JSON.stringify(state);
});

await check("ui2_004_manager_active_nav_delegates_to_existing_view",async()=>{
  await shellPage.locator('.m-shell-v2-nav__item[data-shell-key="workforce"]').click();
  const state=await shellPage.evaluate(()=>({
    sourceActive:document.querySelector('.sidebar [data-view="workforce"]')?.classList.contains("active"),
    viewActive:document.querySelector("#view-workforce")?.classList.contains("active"),
    sharedActive:document.querySelector('.m-shell-v2-nav__item[data-shell-key="workforce"]')?.getAttribute("aria-current")
  }));
  if(!state.sourceActive||!state.viewActive||state.sharedActive!=="page")throw new Error(JSON.stringify(state));
  return JSON.stringify(state);
});

await shellPage.setViewportSize({width:900,height:900});
await check("ui2_004_manager_tablet_drawer_smoke",async()=>{
  const menu=shellPage.locator("[data-shell-menu]");
  await menu.waitFor({state:"visible"});
  await menu.click();
  const state=await shellPage.evaluate(()=>({
    open:document.body.dataset.shellDrawerOpen,
    expanded:document.querySelector("[data-shell-menu]")?.getAttribute("aria-expanded"),
    drawerWidth:document.querySelector(".m-shell-v2-sidebar")?.getBoundingClientRect().width||0,
    scroll:document.documentElement.scrollWidth,
    client:document.documentElement.clientWidth
  }));
  if(state.open!=="true"||state.expanded!=="true"||state.drawerWidth>321||state.scroll>state.client+1)throw new Error(JSON.stringify(state));
  await shellPage.keyboard.press("Escape");
  if(await shellPage.evaluate(()=>document.body.dataset.shellDrawerOpen)!=="false")throw new Error("drawer did not close");
  return JSON.stringify(state);
});

await shellPage.setViewportSize({width:390,height:844});
await check("ui2_004_manager_phone_drawer_is_bounded_and_touchable",async()=>{
  const menu=shellPage.locator("[data-shell-menu]");
  const size=await menu.evaluate(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height}});
  if(size.w<43.5||size.h<43.5)throw new Error(JSON.stringify(size));
  await menu.click();
  const state=await shellPage.evaluate(()=>({
    open:document.body.dataset.shellDrawerOpen,
    drawerWidth:document.querySelector(".m-shell-v2-sidebar")?.getBoundingClientRect().width||0,
    viewport:innerWidth,
    scroll:document.documentElement.scrollWidth
  }));
  if(state.open!=="true"||state.drawerWidth>state.viewport*.89||state.scroll>state.viewport+1)throw new Error(JSON.stringify(state));
  await shellPage.keyboard.press("Escape");
  return JSON.stringify({size,state});
});
await shellPage.screenshot({path:path.join(OUT,"sched-07-manager-shared-shell-phone.png"),fullPage:true});
await shellPage.close();

const desktop=await context.newPage();
await desktop.setViewportSize({width:1440,height:1000});
await desktop.goto(BASE+"/09_QA/people-shift/manager-workforce-canonical-fixture.html",{waitUntil:"networkidle"});
await desktop.locator("#panel-publish .msd").waitFor();
await check("sched07_manager_desktop_keeps_operational_week_board",async()=>{
  const state=await desktop.evaluate(()=>{
    const board=document.querySelector(".msd-board"),html=document.documentElement;
    return {cols:getComputedStyle(board).gridTemplateColumns.split(" ").filter(Boolean).length,scroll:html.scrollWidth,client:html.clientWidth};
  });
  if(state.cols<7||state.scroll>state.client+2)throw new Error(JSON.stringify(state));
  return JSON.stringify(state);
});

await check("sched07_browser_diagnostics_clean",async()=>{
  if(report.page_errors.length||report.console_errors.length||report.request_failures.length)throw new Error(JSON.stringify(report));
  return "0 page/console/request/5xx errors";
});

await page.screenshot({path:path.join(OUT,"sched-07-owner-mobile.png"),fullPage:true});
await desktop.screenshot({path:path.join(OUT,"sched-07-manager-desktop.png"),fullPage:true});
await browserInstance.close();
fs.writeFileSync(path.join(OUT,"sched-07-ui-responsive-report.json"),JSON.stringify(report,null,2));
console.log("SCHED_07_UI_RESPONSIVE="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=="PASS")process.exitCode=1;
