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
  employeeShell.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
  employeeShell.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
  employeeShell.on("requestfailed",r=>report.request_failures.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText||""}`));
  employeeShell.on("response",r=>{if(r.status()>=500)report.request_failures.push(`HTTP ${r.status()} ${r.url()}`)});
  await employeeShell.setViewportSize({width,height:844});
  await employeeShell.goto(BASE+"/06_EMPLOYEE/app/employee-v40.html#schedule",{waitUntil:"networkidle"});
  await employeeShell.locator("#employeeV2PrimaryNav").waitFor({state:"attached"});
  await employeeShell.locator('[data-employee-primary-view="schedule"][aria-current="page"]').waitFor();

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
