import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8766";
const OUT=process.env.QA_OUT||"qa-artifacts/control-tower";
fs.mkdirSync(OUT,{recursive:true});

const report={status:"PASS",checks:[],screenshots:[],console_errors:[],page_errors:[],request_failures:[],http_errors:[]};
const pass=(name,detail="")=>report.checks.push({name,status:"PASS",detail:String(detail)});
const fail=(name,detail="")=>{report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(detail)})};
const check=async(name,fn)=>{try{pass(name,await fn())}catch(e){fail(name,e?.stack||e)}};

function diagnostics(page,label){
 page.on("console",m=>{
  if(m.type()!=="error")return;
  const text=m.text();
  if((label==="workforce-denied"&&text.includes("[OWNER_WORKFORCE_AUTH]"))||(label==="access-denied"&&text.includes("[OWNER_ACCESS]")))return;
  report.console_errors.push({label,text});
 });
 page.on("pageerror",e=>report.page_errors.push({label,error:String(e?.stack||e)}));
 page.on("requestfailed",r=>{if(!/favicon|google-analytics|googletagmanager/i.test(r.url()))report.request_failures.push({label,url:r.url(),error:r.failure()?.errorText||""})});
 page.on("response",r=>{if(r.status()>=500)report.http_errors.push({label,url:r.url(),status:r.status()})});
}

async function newContext(browser,width,height=980){
 const ctx=await browser.newContext({viewport:{width,height},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
 await ctx.route("https://cdn.jsdelivr.net/**",route=>route.fulfill({status:200,contentType:"application/javascript",body:"globalThis.supabase=globalThis.supabase||{};"}));
 // This browser QA validates local role/navigation behavior, not third-party fonts.
 // Pin external font CSS to an empty fixture so teardown/navigation never races font downloads.
 await ctx.route("https://fonts.googleapis.com/**",route=>route.fulfill({status:200,contentType:"text/css",body:""}));
 await ctx.route("**/02_CORE/shared/shared-core-v1.js*",route=>route.fulfill({status:200,contentType:"application/javascript",path:"09_QA/owner-control-tower/ui2-015-shared-core-mock.js"}));
 await ctx.route("**/04_OWNER/Procurement/procurement-v2-core.js*",route=>route.fulfill({status:200,contentType:"application/javascript",body:""}));
 await ctx.route("**/04_OWNER/Procurement/procurement-v2-orders.js*",route=>route.fulfill({status:200,contentType:"application/javascript",body:""}));
 await ctx.route("**/04_OWNER/Procurement/procurement-v2-boot.js*",route=>route.fulfill({status:200,contentType:"application/javascript",path:"09_QA/owner-control-tower/ui2-015-procurement-boot-mock.js"}));
 await ctx.route("**/05_MANAGER/runtime/manager-shell-v1.html*",route=>route.fulfill({status:200,contentType:"text/html",path:"09_QA/owner-control-tower/ui2-015-manager-shell-fixture.html"}));
 await ctx.route("**/05_MANAGER/Workforce/manager-context-v1.js*",route=>route.fulfill({status:200,contentType:"application/javascript",path:"09_QA/owner-control-tower/ui2-015-manager-context-mock.js"}));
 await ctx.route("**/05_MANAGER/Workforce/draft-publish-v1.js*",route=>route.fulfill({status:200,contentType:"application/javascript",path:"09_QA/owner-control-tower/ui2-015-writer-mock.js"}));
 await ctx.route("**/02_CORE/security/security-runtime.js*",route=>route.fulfill({status:200,contentType:"application/javascript",body:""}));
 return ctx;
}

async function shot(page,name){
 const p=path.join(OUT,name+".png");
 await page.screenshot({path:p,fullPage:true});
 report.screenshots.push(p);
}

async function openPage(browser,width,url,label,height=980){
 const ctx=await newContext(browser,width,height);
 const page=await ctx.newPage();
 diagnostics(page,label);
 await page.goto(BASE+url,{waitUntil:"domcontentloaded",timeout:20000});
 return {ctx,page};
}

async function pageMetrics(page){
 return page.evaluate(()=>({
  viewport:innerWidth,
  doc:document.documentElement.scrollWidth,
  active:document.querySelector('.m-shell-v2-nav__item[aria-current="page"]')?.dataset.shellKey||null,
  finance:!!document.querySelector('[data-owner-finance-reserved]'),
  financeHref:document.querySelector('[data-owner-finance-reserved] a')?.getAttribute('href')||null
 }));
}

async function focusEvidence(locator){
 await locator.focus();
 return locator.evaluate(el=>({outline:getComputedStyle(el).outlineStyle,height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width}));
}

async function workforceAllowed(browser,width){
 const opened=await openPage(browser,width,"/04_OWNER/Workforce/?qaRole=OWNER","workforce-"+width);
 const page=opened.page;
 await page.locator("#app:not([hidden])").waitFor({state:"visible",timeout:10000});
 const runtime=page.frameLocator("#app");
 const frame=runtime.frameLocator("#app");
 await frame.locator("#magasinUiV2Shell").waitFor({state:"attached",timeout:10000});
 await frame.locator('#ownerSchedulingOverview[data-owner-overview-state="ready"]').waitFor({state:"visible",timeout:10000});
 const cards=await frame.locator("[data-owner-store-open]").count();
 if(cards!==4)throw new Error("Owner overview cards="+cards);
 const overviewText=await frame.locator("#ownerSchedulingOverview").innerText();
 for(const code of ["CN1","CN2","CN3","CN4"])if(!overviewText.includes(code))throw new Error("Missing "+code+" in Owner overview");
 await frame.locator('[data-owner-store-open="store-a"]').click();
 await frame.locator("#ownerSchedulingDetailHeader").waitFor({state:"visible",timeout:10000});
 await frame.locator(".msd[data-scheduling-actor='OWNER']").waitFor({state:"visible",timeout:10000});
 return {...opened,runtime,frame};
}

async function procurementAllowed(browser,width,route="/nhap-hang/?qaRole=OWNER"){
 const opened=await openPage(browser,width,route,"procurement-"+width);
 await opened.page.locator("#app:not(.hidden)").waitFor({state:"visible",timeout:10000});
 await opened.page.locator("#magasinUiV2Shell").waitFor({state:"attached",timeout:10000});
 await opened.page.locator("[data-owner-module-context='procurement']").waitFor({state:"visible",timeout:10000});
 return opened;
}

async function accessAllowed(browser,width){
 const opened=await openPage(browser,width,"/04_OWNER/Access/?qaRole=OWNER","access-"+width);
 await opened.page.locator("#app:not(.hidden)").waitFor({state:"visible",timeout:10000});
 await opened.page.locator("#magasinUiV2Shell").waitFor({state:"attached",timeout:10000});
 await opened.page.locator("[data-owner-module-context='access']").waitFor({state:"visible",timeout:10000});
 return opened;
}

const browser=await chromium.launch({headless:true});
try{
 await check("ui2_015_workforce_auth_denied",async()=>{
  const opened=await openPage(browser,1280,"/04_OWNER/Workforce/?qaRole=STAFF","workforce-denied");
  await opened.page.locator("#denied:not(.hidden)").waitFor({state:"visible",timeout:10000});
  const hidden=await opened.page.locator("#app[hidden]").count();
  if(!hidden)throw new Error("Workforce iframe exposed for denied user");
  await opened.ctx.close();
  return "STAFF denied before runtime iframe";
 });

 await check("ui2_015_access_auth_denied",async()=>{
  const opened=await openPage(browser,1280,"/04_OWNER/Access/?qaRole=STAFF","access-denied");
  await opened.page.locator("#denied:not(.hidden)").waitFor({state:"visible",timeout:10000});
  if(!(await opened.page.locator("#app.hidden").count()))throw new Error("Access app exposed");
  await opened.ctx.close();
  return "STAFF denied by existing Owner gate";
 });

 await check("ui2_015_procurement_denied_for_non_owner_non_accountant",async()=>{
  const opened=await openPage(browser,1280,"/nhap-hang/?qaRole=STAFF","procurement-denied");
  await opened.page.locator("#denied:not(.hidden)").waitFor({state:"visible",timeout:10000});
  if(!(await opened.page.locator("#app.hidden").count()))throw new Error("Procurement app exposed");
  await opened.ctx.close();
  return "STAFF denied; OWNER/ACCOUNTANT contract preserved";
 });

 for(const width of [1280,768,390]){
  const workforce=await workforceAllowed(browser,width);
  await check("ui2_015_workforce_"+width+"_shell_context_responsive",async()=>{
   const metrics=await workforce.frame.locator("html").evaluate(()=>({
    viewport:innerWidth,
    doc:document.documentElement.scrollWidth,
    active:document.querySelector('.m-shell-v2-nav__item[aria-current="page"]')?.dataset.shellKey,
    detail:!!document.querySelector('#ownerSchedulingDetailHeader:not([hidden])'),
    finance:!!document.querySelector('[data-owner-finance-reserved]'),
    financeLinks:document.querySelectorAll('[data-owner-finance-reserved] a').length,
    duplicateLegacy:document.querySelectorAll('.sidebar:not(.m-shell-v2-sidebar)').length,
    minControl:Math.min(...[...document.querySelectorAll('.m-shell-v2-menu,.m-shell-v2-nav__item,.oso-back,.tabs button')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0}).map(el=>el.getBoundingClientRect().height))
   }));
   if(metrics.doc>metrics.viewport+1||metrics.active!=="workforce"||!metrics.detail||!metrics.finance||metrics.financeLinks!==0||metrics.duplicateLegacy!==1)throw new Error(JSON.stringify(metrics));
   if(width<=768&&metrics.minControl<43.5)throw new Error(JSON.stringify(metrics));
   return JSON.stringify(metrics);
  });
  await check("ui2_015_workforce_"+width+"_focus",async()=>{
   const ev=await focusEvidence(workforce.frame.locator("[data-owner-overview-back]"));
   if(ev.outline==="none"||(width<=768&&ev.height<43.5))throw new Error(JSON.stringify(ev));
   return JSON.stringify(ev);
  });
  await shot(workforce.page,"ui2-015-workforce-"+width);
  await workforce.ctx.close();

  const procurement=await procurementAllowed(browser,width);
  await check("ui2_015_procurement_"+width+"_tabs_table_dialog_containment",async()=>{
   const page=procurement.page;
   const m=await pageMetrics(page);
   if(m.doc>m.viewport+1||m.active!=="procurement"||!m.finance||m.financeHref)throw new Error(JSON.stringify(m));
   const tabs=await page.locator("#nav [data-tab]").count();
   if(tabs!==5)throw new Error("tabs="+tabs);
   await page.locator('#nav [data-tab="reports"]').click();
   if(!(await page.locator("#sec-reports.active").count()))throw new Error("reports tab not active");
   await page.locator('#nav [data-tab="orders"]').click();
   await page.locator("#newOrderBtn").click();
   await page.locator("#orderDialog[open]").waitFor({state:"visible",timeout:5000});
   const box=await page.locator("#orderDialog").boundingBox();
   if(!box||box.x<0||box.x+box.width>width+1)throw new Error(JSON.stringify(box));
   const table=await page.locator("#sec-orders .table-wrap").evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,right:el.getBoundingClientRect().right}));
   if(table.right>width+1)throw new Error(JSON.stringify(table));
   await page.locator('[data-close="orderDialog"]').first().click();
   await page.locator("#nav [data-tab='orders']").click();
   await page.keyboard.press("Tab");
   const focus=await page.evaluate(()=>{
     const el=document.activeElement;
     const r=el?.getBoundingClientRect();
     return {inTabs:!!el?.closest?.("#nav"),outline:el?getComputedStyle(el).outlineStyle:"none",height:r?.height||0,text:el?.textContent?.trim()||""};
   });
   if(!focus.inTabs||focus.outline==="none"||(width<=768&&focus.height<43.5))throw new Error(JSON.stringify(focus));
   return JSON.stringify({m,tabs,box,table,focus});
  });
  await shot(procurement.page,"ui2-015-procurement-"+width);
  await procurement.ctx.close();

  const access=await accessAllowed(browser,width);
  await check("ui2_015_access_"+width+"_search_role_table_containment",async()=>{
   const page=access.page,m=await pageMetrics(page);
   if(m.doc>m.viewport+1||m.active!=="access"||!m.finance||m.financeHref)throw new Error(JSON.stringify(m));
   const wrap=await page.locator(".table-wrap").evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,right:el.getBoundingClientRect().right}));
   if(wrap.right>width+1)throw new Error(JSON.stringify(wrap));
   await page.locator("#searchInput").fill("Staff");
   const rows=await page.locator("#accountsBody tr").count();
   if(rows!==1)throw new Error("filtered rows="+rows);
   const select=page.locator("#accountsBody tr [data-role]");
   await select.selectOption("ACCOUNTANT");
   const save=page.locator("#accountsBody tr [data-save]");
   if(await save.isDisabled())throw new Error("role save remained disabled after change");
   const focus=await focusEvidence(page.locator("#refreshBtn"));
   if(focus.outline==="none"||(width<=768&&focus.height<43.5))throw new Error(JSON.stringify(focus));
   return JSON.stringify({m,wrap,rows,focus});
  });
  await shot(access.page,"ui2-015-access-"+width);
  await access.ctx.close();
 }

 await check("ui2_015_workforce_reload_deep_link_preserves_active_route",async()=>{
  const opened=await workforceAllowed(browser,1280);
  await opened.page.reload({waitUntil:"domcontentloaded"});
  await opened.page.locator("#app:not([hidden])").waitFor({state:"visible",timeout:10000});
  const runtime=opened.page.frameLocator("#app");
  const frame=runtime.frameLocator("#app");
  await frame.locator("#magasinUiV2Shell").waitFor({state:"attached",timeout:10000});
  const active=await frame.locator('.m-shell-v2-nav__item[aria-current="page"]').getAttribute("data-shell-key");
  if(active!=="workforce")throw new Error(String(active));
  await opened.ctx.close();
  return active;
 });

 await check("ui2_015_procurement_friendly_source_reload_back_compatibility",async()=>{
  const opened=await procurementAllowed(browser,1280,"/04_OWNER/Procurement/?qaRole=OWNER");
  if(!opened.page.url().includes("/04_OWNER/Procurement/"))throw new Error(opened.page.url());
  await opened.page.goto(BASE+"/nhap-hang/?qaRole=OWNER",{waitUntil:"domcontentloaded"});
  await opened.page.locator("#app:not(.hidden)").waitFor({state:"visible",timeout:10000});
  // The friendly entry rewrites its document and restores its path on the load event.
  // Wait for that canonical transition before reload; a visible app is not sufficient.
  await opened.page.waitForURL(url=>url.pathname==="/nhap-hang/",{timeout:10000});
  await opened.page.reload({waitUntil:"domcontentloaded"});
  await opened.page.locator("#app:not(.hidden)").waitFor({state:"visible",timeout:10000});
  await opened.page.waitForURL(url=>url.pathname==="/nhap-hang/",{timeout:10000});
  const friendlyPath=new URL(opened.page.url()).pathname;
  await opened.page.goBack({waitUntil:"domcontentloaded"});
  await opened.page.locator("#app:not(.hidden)").waitFor({state:"visible",timeout:10000});
  const backPath=new URL(opened.page.url()).pathname;
  if(friendlyPath!=="/nhap-hang/"||backPath!=="/04_OWNER/Procurement/")throw new Error(JSON.stringify({friendlyPath,backPath}));
  await opened.ctx.close();
  return JSON.stringify({friendlyPath,backPath});
 });

 await check("ui2_015_procurement_accountant_keeps_authority_without_owner_shell",async()=>{
  const opened=await openPage(browser,1280,"/nhap-hang/?qaRole=ACCOUNTANT","procurement-accountant");
  await opened.page.locator("#app:not(.hidden)").waitFor({state:"visible",timeout:10000});
  await opened.page.locator("#userName").filter({hasText:"Kế toán"}).waitFor({state:"visible",timeout:10000});
  await opened.page.waitForFunction(()=>!document.getElementById("magasinUiV2Shell"));
  const state=await opened.page.evaluate(()=>({shell:!!document.getElementById("magasinUiV2Shell"),context:!!document.querySelector('[data-owner-module-context="procurement"]'),path:location.pathname,overflow:document.documentElement.scrollWidth>innerWidth+1}));
  const acceptedPath=state.path==="/nhap-hang/"||state.path==="/04_OWNER/Procurement/";
  if(state.shell||!state.context||!acceptedPath||state.overflow)throw new Error(JSON.stringify(state));
  await opened.ctx.close();
  return JSON.stringify(state);
 });

 await check("ui2_015_access_overview_attention_round_trip",async()=>{
  const opened=await accessAllowed(browser,1280);
  const page=opened.page;
  await page.locator('[data-owner-module-context="access"] a[href="/04_OWNER/"]').click();
  await page.waitForURL("**/04_OWNER/",{timeout:10000});
  await page.locator("#app:not(.hidden)").waitFor({state:"visible",timeout:10000});
  await page.goBack({waitUntil:"domcontentloaded"});
  await page.locator("#app:not(.hidden)").waitFor({state:"visible",timeout:10000});
  await page.locator('[data-owner-module-context="access"] a[href="/04_OWNER/ControlTower/"]').click();
  await page.waitForURL("**/04_OWNER/ControlTower/",{timeout:10000});
  await page.locator("#app:not(.hidden)").waitFor({state:"visible",timeout:10000});
  await page.goBack({waitUntil:"domcontentloaded"});
  await page.locator("#app:not(.hidden)").waitFor({state:"visible",timeout:10000});
  const active=await page.locator('.m-shell-v2-nav__item[aria-current="page"]').getAttribute("data-shell-key");
  if(active!=="access")throw new Error(String(active));
  await opened.ctx.close();
  return "Access → Overview → Access → Attention → Access";
 });

 await check("ui2_015_finance_has_no_clickable_route_or_runtime",async()=>{
  const opened=await accessAllowed(browser,1280);
  const state=await opened.page.evaluate(()=>({
   reserved:document.querySelector('[data-owner-finance-reserved]')?.textContent||"",
   links:document.querySelectorAll('[data-owner-finance-reserved] a').length,
   fakeRoutes:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>/finance/i.test(h||""))
  }));
  if(!/NOT CONNECTED/.test(state.reserved)||state.links!==0||state.fakeRoutes.length)throw new Error(JSON.stringify(state));
  await opened.ctx.close();
  return JSON.stringify(state);
 });

}catch(e){fail("robot_exception",e?.stack||e)}
finally{await browser.close()}

if(report.console_errors.length)fail("console_errors",JSON.stringify(report.console_errors));else pass("console_errors");
if(report.page_errors.length)fail("page_errors",JSON.stringify(report.page_errors));else pass("page_errors");
if(report.request_failures.length)fail("request_failures",JSON.stringify(report.request_failures));else pass("request_failures");
if(report.http_errors.length)fail("http_5xx",JSON.stringify(report.http_errors));else pass("http_5xx");
report.status=report.checks.some(x=>x.status==="FAIL")?"FAIL":"PASS";
fs.writeFileSync(path.join(OUT,"ui2-015-owner-drilldown-report.json"),JSON.stringify(report,null,2));
console.log("UI2_015_OWNER_DRILLDOWN_BROWSER="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+(c.detail?" — "+c.detail:""));
if(report.status!=="PASS")process.exitCode=1;
