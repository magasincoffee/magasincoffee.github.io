import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8766";
const OUT=process.env.QA_OUT||"qa-artifacts/control-tower";
fs.mkdirSync(OUT,{recursive:true});

const report={status:"PASS",checks:[],screenshots:[],console_errors:[],expected_console_errors:[],page_errors:[],request_failures:[],http_errors:[]};
const pass=(name,detail="")=>report.checks.push({name,status:"PASS",detail:String(detail)});
const fail=(name,detail="")=>{report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(detail)})};
const check=async(name,fn)=>{try{pass(name,await fn())}catch(e){fail(name,e?.stack||e)}};

function diagnostics(page,label){
 page.on("console",m=>{
  if(m.type()!=="error")return;
  const t=m.text();
  if(label.includes("denied")&&t.includes("[CONTROL_TOWER_AUTH]")&&/Chỉ Owner/.test(t)){report.expected_console_errors.push({label,text:t});return}
  report.console_errors.push({label,text:t});
 });
 page.on("pageerror",e=>report.page_errors.push({label,error:String(e?.stack||e)}));
 page.on("requestfailed",r=>{if(!/favicon|google-analytics|googletagmanager/i.test(r.url()))report.request_failures.push({label,url:r.url(),error:r.failure()?.errorText||""})});
 page.on("response",r=>{if(r.status()>=500)report.http_errors.push({label,url:r.url(),status:r.status()})});
}

async function newContext(browser,width,height=960){
 const ctx=await browser.newContext({viewport:{width,height},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
 await ctx.route("https://cdn.jsdelivr.net/**",route=>route.fulfill({status:200,contentType:"application/javascript",body:"globalThis.supabase=globalThis.supabase||{};"}));
 await ctx.route("**/02_CORE/shared/shared-core-v1.js*",route=>route.fulfill({status:200,contentType:"application/javascript",path:"09_QA/owner-control-tower/ui2-014-shared-core-mock.js"}));
 return ctx;
}

async function openAllowed(browser,width,url="/04_OWNER/",height=960){
 const ctx=await newContext(browser,width,height);
 const page=await ctx.newPage();
 diagnostics(page,"allowed-"+width);
 await page.goto(BASE+url,{waitUntil:"domcontentloaded",timeout:20000});
 await page.locator("#app:not(.hidden)").waitFor({state:"visible",timeout:10000});
 await page.waitForFunction(()=>document.body.dataset.ownerOverviewLoading==="false");
 return {ctx,page};
}

async function shot(page,name){
 const p=path.join(OUT,name+".png");
 await page.screenshot({path:p,fullPage:true});
 report.screenshots.push(p);
}

async function focusEvidence(page,selector){
 const el=page.locator(selector).first();
 await el.waitFor({state:"visible"});
 await el.focus();
 return el.evaluate(node=>({outline:getComputedStyle(node).outlineStyle,height:node.getBoundingClientRect().height,width:node.getBoundingClientRect().width}));
}

const browser=await chromium.launch({headless:true});
try{
 await check("ui2_014_auth_loading_then_allowed",async()=>{
  const ctx=await newContext(browser,1280,900);
  const page=await ctx.newPage();
  diagnostics(page,"auth-loading");
  await page.goto(BASE+"/04_OWNER/?qaAuthDelay=180",{waitUntil:"domcontentloaded",timeout:20000});
  if(!(await page.locator("#loading:not(.hidden)").isVisible()))throw new Error("auth loading not visible");
  await page.locator("#app:not(.hidden)").waitFor({state:"visible",timeout:10000});
  await page.waitForFunction(()=>document.body.dataset.ownerOverviewLoading==="false");
  const calls=await page.evaluate(()=>globalThis.__CONTROL_TOWER_QA_CALLS||[]);
  if(calls[0]?.kind!=="auth")throw new Error(JSON.stringify(calls));
  await ctx.close();
  return "loading → requireOwnerAccess → allowed";
 });

 await check("ui2_014_auth_denied_blocks_data_reads",async()=>{
  const ctx=await newContext(browser,1280,900);
  const page=await ctx.newPage();
  diagnostics(page,"denied");
  await page.goto(BASE+"/04_OWNER/?qaRole=ACCOUNTANT",{waitUntil:"domcontentloaded",timeout:20000});
  await page.locator("#denied:not(.hidden)").waitFor({state:"visible",timeout:10000});
  const calls=await page.evaluate(()=>globalThis.__CONTROL_TOWER_QA_CALLS||[]);
  const data=calls.filter(x=>["from","rpc","stores"].includes(x.kind));
  if(data.length)throw new Error(JSON.stringify(data));
  if(!(await page.locator("#app.hidden").count()))throw new Error("app exposed on denied");
  await ctx.close();
  return "denied before data reads";
 });

 for(const width of [1280,768,390]){
  const opened=await openAllowed(browser,width,"/04_OWNER/");
  const page=opened.page;
  await check("ui2_014_"+width+"_oversight_first_responsive",async()=>{
   const m=await page.evaluate(()=>{
    const ids=["overview","attention","operatingSnapshot","ownerModules"];
    const nodes=ids.map(id=>document.getElementById(id));
    const controls=[...document.querySelectorAll("#app button,#app a")].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0});
    return {
     viewport:innerWidth,
     doc:document.documentElement.scrollWidth,
     order:nodes.map(n=>n?.offsetTop),
     scope:document.getElementById("branchScope")?.textContent,
     hasSelect:!!document.querySelector("#app select"),
     qualityRows:document.querySelectorAll("#qualityList .quality-row").length,
     attention:document.querySelectorAll("#attentionList .attention-item").length,
     minControl:controls.length?Math.min(...controls.map(x=>x.getBoundingClientRect().height)):0
    };
   });
   if(m.doc>m.viewport+1)throw new Error(JSON.stringify(m));
   if(!(m.order[0]<m.order[1]&&m.order[1]<m.order[2]&&m.order[2]<m.order[3]))throw new Error(JSON.stringify(m));
   if(m.scope!=="ALL"||m.hasSelect||m.qualityRows!==5||m.attention<2)throw new Error(JSON.stringify(m));
   if(width<=768&&m.minControl<43.5)throw new Error(JSON.stringify(m));
   return JSON.stringify(m);
  });
  await check("ui2_014_"+width+"_keyboard_focus",async()=>{
   const ev=await focusEvidence(page,"#refreshControlTower");
   if(ev.outline==="none")throw new Error(JSON.stringify(ev));
   if(width<=768&&ev.height<43.5)throw new Error(JSON.stringify(ev));
   return JSON.stringify(ev);
  });
  await shot(page,"ui2-014-owner-"+width);
  await opened.ctx.close();
 }

 const main=await openAllowed(browser,1280,"/04_OWNER/");
 const page=main.page;
 await check("ui2_014_home_shell_overview_nav_state",async()=>{
  await page.locator("#magasinUiV2Shell").waitFor({state:"attached",timeout:10000});
  const active=await page.locator('.m-shell-v2-nav__item[aria-current="page"]').getAttribute("data-shell-key");
  if(active!=="overview")throw new Error(String(active));
  return active;
 });

 await check("ui2_014_cross_store_quality_before_metrics",async()=>{
  const data=await page.evaluate(()=>({
   scope:document.getElementById("branchScope")?.textContent,
   qualityTop:document.getElementById("qualityList")?.getBoundingClientRect().top,
   metricTop:document.getElementById("operatingSnapshot")?.getBoundingClientRect().top,
   qualities:[...document.querySelectorAll("#qualityList .quality-chip")].map(x=>x.textContent),
   freshness:[...document.querySelectorAll("#qualityList .quality-freshness")].map(x=>x.textContent)
  }));
  if(data.scope!=="ALL"||!(data.qualityTop<data.metricTop))throw new Error(JSON.stringify(data));
  if(!data.qualities.includes("ACTUAL")||!data.qualities.includes("NOT CONNECTED"))throw new Error(JSON.stringify(data));
  if(data.freshness.some(x=>!x.startsWith("Freshness:")))throw new Error(JSON.stringify(data));
  return JSON.stringify(data);
 });

 await check("ui2_014_attention_present_is_factual_and_drills_down",async()=>{
  const items=await page.locator("#attentionList .attention-item").evaluateAll(rows=>rows.map(r=>({key:r.dataset.attentionKey,text:r.innerText,href:r.querySelector("a")?.getAttribute("href")||null})));
  const pay=items.find(x=>x.key==="payables-overdue");
  const work=items.find(x=>x.key==="workforce-attention");
  if(pay?.href!=="/nhap-hang/"||work?.href!=="/04_OWNER/Workforce/")throw new Error(JSON.stringify(items));
  if(items.some(x=>/severity|priority|deadline|chủ sở hữu/i.test(x.text)))throw new Error(JSON.stringify(items));
  return JSON.stringify(items);
 });

 await check("ui2_014_default_quality_semantics",async()=>{
  const q=await page.evaluate(()=>({
   revenue:document.getElementById("revenueQuality")?.dataset.quality,
   payables:document.getElementById("payableQuality")?.dataset.quality,
   workforce:document.getElementById("workforceQuality")?.dataset.quality,
   inventory:document.getElementById("inventoryQuality")?.dataset.quality,
   tasks:document.getElementById("taskQuality")?.dataset.quality,
   revenueValue:document.getElementById("revenueValue")?.textContent
  }));
  if(q.revenue!=="NOT_CONNECTED"||q.revenueValue.trim()!=="—"||q.payables!=="ACTUAL"||q.workforce!=="ACTUAL"||q.inventory!=="NOT_CONNECTED"||q.tasks!=="NOT_CONNECTED")throw new Error(JSON.stringify(q));
  return JSON.stringify(q);
 });

 await check("ui2_014_refresh_clears_stale_attention_then_no_attention",async()=>{
  const before=await page.locator("#attentionList .attention-item").count();
  if(before<2)throw new Error("initial attention missing");
  await page.evaluate(()=>{globalThis.__CONTROL_TOWER_QA_MODE="noattention";globalThis.__CONTROL_TOWER_QA_DELAY=120});
  await page.locator("#refreshControlTower").click();
  await page.waitForFunction(()=>document.body.dataset.ownerOverviewLoading==="true");
  const during=await page.evaluate(()=>({items:document.querySelectorAll("#attentionList .attention-item").length,loading:!document.getElementById("attentionLoading")?.classList.contains("hidden")}));
  if(during.items!==0||!during.loading)throw new Error(JSON.stringify(during));
  await page.waitForFunction(()=>document.body.dataset.ownerOverviewLoading==="false");
  await page.evaluate(()=>{globalThis.__CONTROL_TOWER_QA_DELAY=0});
  const after=await page.evaluate(()=>({items:document.querySelectorAll("#attentionList .attention-item").length,empty:!document.getElementById("noAttention")?.classList.contains("hidden"),work:document.getElementById("workforceUnresolved")?.textContent}));
  if(after.items!==0||!after.empty||after.work!=="0")throw new Error(JSON.stringify(after));
  return JSON.stringify({before,during,after});
 });

 await check("ui2_014_read_only_call_inventory",async()=>{
  const calls=await page.evaluate(()=>globalThis.__CONTROL_TOWER_QA_CALLS||[]);
  const rpc=[...new Set(calls.filter(x=>x.kind==="rpc").map(x=>x.name))].sort();
  const allowed=["get_manager_transfer_requests","get_schedule_generation_assignments","get_workforce_staffing_requirements","list_schedule_generations"].sort();
  if(JSON.stringify(rpc)!==JSON.stringify(allowed))throw new Error(JSON.stringify(rpc));
  const from=[...new Set(calls.filter(x=>x.kind==="from").map(x=>x.name))].sort();
  const expected=["v_procurement_order_summary","v_procurement_supplier_payables"].sort();
  if(JSON.stringify(from)!==JSON.stringify(expected))throw new Error(JSON.stringify(from));
  return JSON.stringify({rpc,from});
 });
 await main.ctx.close();

 await check("ui2_014_control_tower_route_has_attention_nav_state",async()=>{
  const opened=await openAllowed(browser,1280,"/04_OWNER/ControlTower/");
  await opened.page.locator("#magasinUiV2Shell").waitFor({state:"attached",timeout:10000});
  const active=await opened.page.locator('.m-shell-v2-nav__item[aria-current="page"]').getAttribute("data-shell-key");
  if(active!=="attention")throw new Error(String(active));
  await opened.ctx.close();
  return active;
 });

 await check("ui2_014_independent_payables_failure_preserves_workforce",async()=>{
  const opened=await openAllowed(browser,1280,"/04_OWNER/?qaFail=payables");
  const q=await opened.page.evaluate(()=>({
   payables:document.getElementById("payableQuality")?.dataset.quality,
   workforce:document.getElementById("workforceQuality")?.dataset.quality,
   payable:document.getElementById("payableValue")?.textContent,
   keys:[...document.querySelectorAll("#attentionList .attention-item")].map(x=>x.dataset.attentionKey)
  }));
  if(q.payables!=="GAP"||q.workforce!=="ACTUAL"||q.payable.trim()!=="—"||!q.keys.includes("payables-gap"))throw new Error(JSON.stringify(q));
  await opened.ctx.close();
  return JSON.stringify(q);
 });

 await check("ui2_014_estimate_state_is_explicit_not_coerced",async()=>{
  const opened=await openAllowed(browser,1280,"/04_OWNER/?qaMode=estimate");
  const q=await opened.page.evaluate(()=>({
   quality:document.getElementById("workforceQuality")?.dataset.quality,
   keys:[...document.querySelectorAll("#attentionList .attention-item")].map(x=>x.dataset.attentionKey)
  }));
  if(q.quality!=="ESTIMATE"||!q.keys.includes("workforce-estimate"))throw new Error(JSON.stringify(q));
  await opened.ctx.close();
  return JSON.stringify(q);
 });

}catch(e){fail("robot_exception",e?.stack||e)}
finally{await browser.close()}

if(report.console_errors.length)fail("console_errors",JSON.stringify(report.console_errors));else pass("console_errors",report.expected_console_errors.length?"ignored "+report.expected_console_errors.length+" expected denied-auth diagnostic":"");
if(report.page_errors.length)fail("page_errors",JSON.stringify(report.page_errors));else pass("page_errors");
if(report.request_failures.length)fail("request_failures",JSON.stringify(report.request_failures));else pass("request_failures");
if(report.http_errors.length)fail("http_5xx",JSON.stringify(report.http_errors));else pass("http_5xx");
report.status=report.checks.some(x=>x.status==="FAIL")?"FAIL":"PASS";
fs.writeFileSync(path.join(OUT,"ui2-014-owner-oversight-report.json"),JSON.stringify(report,null,2));
console.log("UI2_014_OWNER_OVERSIGHT_BROWSER="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+(c.detail?" — "+c.detail:""));
if(report.status!=="PASS")process.exitCode=1;
