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
