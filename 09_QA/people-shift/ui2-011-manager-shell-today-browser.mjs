import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],screenshots:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)})}};

const browser=await chromium.launch({headless:true});
for(const width of [1280,768,390]){
 const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width,height:900}});
 const page=await context.newPage();
 page.on("pageerror",e=>report.page_errors.push(width+": "+String(e?.stack||e?.message||e)));
 page.on("console",m=>{if(m.type()==="error")report.console_errors.push(width+": "+m.text())});
 page.on("requestfailed",r=>report.request_failures.push(width+": "+r.method()+" "+r.url()+" "+(r.failure()?.errorText||"")));
 page.on("response",r=>{if(r.status()>=500)report.http_errors.push(width+": "+r.status()+" "+r.url())});
 await page.goto(BASE+"/09_QA/people-shift/ui2-011-manager-shell-today-fixture.html#dashboard",{waitUntil:"networkidle",timeout:20000});
 await page.locator("#view-dashboard.active .manager-action-grid").waitFor({timeout:10000});

 await check("ui2_011_"+width+"_shell_today_layout_focus_nav",async()=>{
   const focus=width>900?page.locator('.manager-v2-sidebar-source [data-view="dashboard"]'):page.locator(".manager-v2-menu");
   await focus.focus();await focus.press("Tab");await page.locator(":focus").press("Shift+Tab");
   return page.evaluate(expected=>{
     const html=document.documentElement,source=document.querySelector(".manager-v2-sidebar-source"),menu=document.querySelector(".manager-v2-menu"),drawer=document.getElementById("managerV2Drawer"),today=document.getElementById("view-dashboard"),focused=document.activeElement;
     const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return !el.hidden&&s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0};
     const controls=[...document.querySelectorAll("button")].filter(visible);
     const primary=[...document.querySelectorAll(".manager-v2-sidebar-source [data-view]")].filter(visible).map(x=>x.dataset.view);
     const cardControls=[...today.querySelectorAll("button")].filter(visible);
     const metric={
       viewport:innerWidth,expected,scroll:html.scrollWidth,client:html.clientWidth,
       minTarget:controls.length?Math.min(...controls.map(x=>Math.min(x.getBoundingClientRect().width,x.getBoundingClientRect().height))):0,
       minTodayTarget:cardControls.length?Math.min(...cardControls.map(x=>Math.min(x.getBoundingClientRect().width,x.getBoundingClientRect().height))):0,
       focus:getComputedStyle(focused).outlineStyle,
       sourceVisible:visible(source),menuVisible:visible(menu),drawerWidth:drawer?.getBoundingClientRect().width||0,
       primary,
       hiddenDemo:["tasks","kpi","academy","settings"].every(k=>!primary.includes(k)),
       actionState:today.dataset.actionCenterState
     };
     if(metric.scroll>metric.client+1||metric.focus==="none"||!metric.hiddenDemo||metric.actionState!=="attention")throw new Error(JSON.stringify(metric));
     if(expected>=1000){
       if(!metric.sourceVisible||metric.menuVisible||metric.minTarget<39.5||JSON.stringify(metric.primary)!==JSON.stringify(["dashboard","staff","workforce","schedule","swap","attendance","payroll-self-check"]))throw new Error(JSON.stringify(metric));
     }else{
       if(metric.sourceVisible||!metric.menuVisible||metric.minTarget<43.5||metric.minTodayTarget<43.5||metric.drawerWidth>310)throw new Error(JSON.stringify(metric));
     }
     return JSON.stringify(metric);
   },width);
 });

 await check("ui2_011_"+width+"_action_center_canonical_counts_and_not_connected",async()=>{
   const rows=await page.locator(".manager-action-card").evaluateAll(nodes=>nodes.map(x=>({key:x.dataset.actionSource,state:x.dataset.actionState,text:x.innerText})));
   const by=Object.fromEntries(rows.map(x=>[x.key,x]));
   if(by.shift.state!=="ACTION_REQUIRED"||!by.shift.text.includes("2")||by.attendance.state!=="ACTION_REQUIRED"||!by.attendance.text.includes("2")||by.availability.state!=="READY"||!by.availability.text.includes("3")||by.schedule.state!=="READY"||!by.schedule.text.includes("4")||by.tasks.state!=="NOT_CONNECTED")throw new Error(JSON.stringify(rows));
   const whole=await page.locator("#view-dashboard").innerText();
   if(/Doanh thu|Đơn hàng|Đánh giá khách|49,2tr|18 nhân sự/.test(whole))throw new Error(whole);
   return JSON.stringify(rows);
 });

 if(width<=768){
   await check("ui2_011_"+width+"_drawer_mobile_safe_keyboard",async()=>{
     const menu=page.locator(".manager-v2-menu");await menu.click();
     await page.locator("#managerV2Drawer.open").waitFor({state:"visible"});
     const state=await page.evaluate(()=>{
       const d=document.getElementById("managerV2Drawer"),r=d.getBoundingClientRect();
       const visible=[...d.querySelectorAll("button:not([hidden])")].filter(x=>getComputedStyle(x).display!=="none").map(x=>({k:x.dataset.view||"",h:x.getBoundingClientRect().height}));
       return {expanded:document.querySelector(".manager-v2-menu")?.getAttribute("aria-expanded"),width:r.width,viewport:innerWidth,visible};
     });
     if(state.expanded!=="true"||state.width>Math.min(310,state.viewport*.9)||state.visible.some(x=>x.h<43.5)||state.visible.some(x=>["tasks","kpi","academy","settings"].includes(x.k)))throw new Error(JSON.stringify(state));
     await page.keyboard.press("Escape");if(await menu.getAttribute("aria-expanded")!=="false")throw new Error("drawer did not close");
     const logoutBefore=await page.evaluate(()=>globalThis.__UI2_011_QA.getLogoutCalls());
     await menu.click();const logout=page.locator('#managerV2Drawer [data-manager-v2-logout="1"]');await logout.waitFor({state:"visible"});await logout.click();
     const logoutAfter=await page.evaluate(()=>globalThis.__UI2_011_QA.getLogoutCalls());
     if(logoutAfter!==logoutBefore+1||await menu.getAttribute("aria-expanded")!=="false")throw new Error(JSON.stringify({logoutBefore,logoutAfter,expanded:await menu.getAttribute("aria-expanded")}));
     return JSON.stringify({...state,logoutDelegated:logoutAfter});
   });
 }

 const shot=path.join(OUT,`ui2-011-manager-today-${width}.png`);await page.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
 await context.close();
}

const ownerContext=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1280,height:900}});
const ownerPage=await ownerContext.newPage();
await ownerPage.goto(BASE+"/09_QA/people-shift/ui2-011-manager-shell-today-fixture.html?host=owner#dashboard",{waitUntil:"networkidle"});
await check("ui2_011_owner_host_skips_duplicate_manager_shell",async()=>ownerPage.evaluate(()=>{
 const result={skipped:globalThis.MAGASIN_MANAGER_UI_V2_011_OWNER_SKIPPED===true,drawer:!!document.getElementById('managerV2Drawer'),backdrop:!!document.getElementById('managerV2Backdrop'),sourceMutated:!!document.querySelector('.manager-v2-sidebar-source'),shellFlag:document.body.dataset.managerUi2Shell||''};
 if(!result.skipped||result.drawer||result.backdrop||result.sourceMutated||result.shellFlag)throw new Error(JSON.stringify(result));
 return JSON.stringify(result);
}));
await ownerContext.close();

const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1280,height:900}});
const page=await context.newPage();
await page.goto(BASE+"/09_QA/people-shift/ui2-011-manager-shell-today-fixture.html#dashboard",{waitUntil:"networkidle"});
await page.locator("#view-dashboard.active .manager-action-grid").waitFor();

await check("ui2_011_refresh_stays_loading_and_dedupes_inflight",async()=>{
 const before=await page.evaluate(()=>globalThis.__UI2_011_QA.getRefreshCalls());
 const same=await page.evaluate(()=>{globalThis.__UI2_011_QA.setRefreshHold(true);const a=globalThis.MAGASIN_MANAGER_TODAY_V2.refresh(),b=globalThis.MAGASIN_MANAGER_TODAY_V2.refresh();globalThis.__UI2_011_QA.pendingRefresh=a;return a===b});
 await page.locator('#view-dashboard[data-action-center-state="loading"]').waitFor();
 const during=await page.evaluate(()=>({calls:globalThis.__UI2_011_QA.getRefreshCalls(),disabled:document.querySelector('[data-manager-today-refresh]')?.disabled,busy:document.querySelector('[data-manager-today-refresh]')?.getAttribute('aria-busy'),loadingCards:document.querySelectorAll('.manager-action-card[data-action-state="LOADING"]').length,refreshing:globalThis.MAGASIN_MANAGER_TODAY_V2.getState().refreshing}));
 for(const key of ['shift','attendance','availability','schedule'])if(during.calls[key]!==before[key]+1)throw new Error(JSON.stringify({before,during,same}));
 if(!same||!during.disabled||during.busy!=='true'||during.loadingCards<4||!during.refreshing)throw new Error(JSON.stringify({before,during,same}));
 await page.evaluate(async()=>{globalThis.__UI2_011_QA.setRefreshHold(false);await globalThis.__UI2_011_QA.pendingRefresh});
 await page.waitForFunction(()=>document.querySelector('#view-dashboard')?.dataset.actionCenterState!=='loading');
 return JSON.stringify({before,during,same});
});

await check("ui2_011_action_center_loading_error_empty_not_connected",async()=>{
 await page.evaluate(()=>{globalThis.__UI2_011_QA.setMode("loading");return globalThis.MAGASIN_MANAGER_TODAY_V2.refresh()});
 await page.locator('#view-dashboard[data-action-center-state="loading"]').waitFor();
 const loading=await page.locator('.manager-action-card[data-action-state="LOADING"]').count();
 await page.evaluate(()=>{globalThis.__UI2_011_QA.setMode("error");return globalThis.MAGASIN_MANAGER_TODAY_V2.refresh()});
 await page.locator('#view-dashboard[data-action-center-state="error"]').waitFor();
 const error=await page.locator('.manager-action-card[data-action-state="ERROR"]').count();
 const availabilityError=await page.locator('.manager-action-card[data-action-source="availability"]').evaluate(x=>({state:x.dataset.actionState,text:x.innerText}));
 if(availabilityError.state!=="ERROR"||availabilityError.text.includes("3 đăng ký availability"))throw new Error(JSON.stringify(availabilityError));
 await page.evaluate(()=>{globalThis.__UI2_011_QA.setMode("empty");return globalThis.MAGASIN_MANAGER_TODAY_V2.refresh()});
 const empty=await page.locator('.manager-action-card[data-action-state="EMPTY"]').count();
 await page.evaluate(()=>{globalThis.__UI2_011_QA.disconnectShift();return globalThis.MAGASIN_MANAGER_TODAY_V2.refresh()});
 await page.locator('.manager-action-card[data-action-source="shift"][data-action-state="NOT_CONNECTED"]').waitFor();
 const notConnected=await page.locator('.manager-action-card[data-action-state="NOT_CONNECTED"]').count();
 if(loading<2||error<2||empty<2||notConnected<2)throw new Error(JSON.stringify({loading,error,empty,notConnected}));
 return JSON.stringify({loading,error,availabilityError,empty,notConnected});
});

await page.reload({waitUntil:"networkidle"});
await page.locator("#view-dashboard.active .manager-action-grid").waitFor();
await check("ui2_011_today_actions_delegate_route_back_forward_reload",async()=>{
 const swapCard=page.locator('.manager-action-card[data-action-source="shift"] button');
 const writesBefore=await page.evaluate(()=>globalThis.__UI2_011_QA.getRouteWrites());
 await swapCard.click();await page.locator("#view-swap.active").waitFor();if(!page.url().endsWith("#swap"))throw new Error(page.url());
 const writesAfter=await page.evaluate(()=>globalThis.__UI2_011_QA.getRouteWrites());if(writesAfter!==writesBefore+1)throw new Error(JSON.stringify({writesBefore,writesAfter}));
 await page.goBack();await page.locator("#view-dashboard.active").waitFor();if(!page.url().endsWith("#dashboard"))throw new Error(page.url());
 await page.goForward();await page.locator("#view-swap.active").waitFor();if(!page.url().endsWith("#swap"))throw new Error(page.url());
 await page.reload({waitUntil:"networkidle"});await page.locator("#view-swap.active").waitFor();
 await page.locator('.sidebar [data-view="dashboard"]').click();await page.locator("#view-dashboard.active .manager-action-grid").waitFor();
 const state=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_TODAY_V2.getState());
 if(state.cards.find(x=>x.key==="shift")?.value!=="2")throw new Error(JSON.stringify(state));
 return "dashboard → swap → back dashboard → forward swap → reload swap → dashboard re-reads canonical mock state";
});

await check("ui2_011_today_has_no_writer_controls",async()=>{
 const text=await page.locator("#view-dashboard").innerText();
 const buttons=await page.locator("#view-dashboard button").allInnerTexts();
 if(buttons.some(x=>/Duyệt|Từ chối|Publish|Phát hành|Approve|Reject|Chốt|Thanh toán/i.test(x)))throw new Error(JSON.stringify(buttons));
 if(!text.includes("Mọi approve/review/publish vẫn diễn ra trong module canonical"))throw new Error(text);
 return JSON.stringify(buttons);
});
await context.close();
await browser.close();

await check("ui2_011_browser_diagnostics",async()=>{
 const relevant=report.request_failures.filter(x=>!x.includes("net::ERR_ABORTED"));
 if(report.page_errors.length||report.console_errors.length||relevant.length||report.http_errors.length)throw new Error(JSON.stringify({...report,request_failures:relevant}));
 return "0 page/console/relevant-request/5xx errors";
});
fs.writeFileSync(path.join(OUT,"ui2-011-manager-shell-today-report.json"),JSON.stringify(report,null,2));
console.log("UI2_011_MANAGER_SHELL_TODAY_BROWSER="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=="PASS")process.exitCode=1;
