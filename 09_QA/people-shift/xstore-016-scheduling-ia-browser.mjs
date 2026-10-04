import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8773";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});

const report={status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)});throw e}};
const attach=page=>{
 page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
 page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
 page.on("requestfailed",r=>report.request_failures.push(r.method()+" "+r.url()+" "+(r.failure()?.errorText||"")));
 page.on("response",r=>{if(r.status()>=500)report.http_errors.push(r.status()+" "+r.url())});
};
async function managerFrame(page){
 const handle=await page.locator("#ui2ManagerScheduling").elementHandle();
 const frame=await handle?.contentFrame();
 if(!frame)throw new Error("XSTORE_016_MANAGER_FRAME_MISSING");
 await frame.locator(".msd-ui2-012[data-ui2-schedule-board='1']").waitFor({timeout:10000});
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT?.getState?.().stores?.length>=1);
 return frame;
}

const browser=await chromium.launch({headless:true});

for(const width of [1440,390]){
 const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width,height:900}});
 const page=await context.newPage();attach(page);
 await page.goto(BASE+"/09_QA/people-shift/ui2-012-manager-scheduling-fixture.html",{waitUntil:"networkidle",timeout:20000});
 const frame=await managerFrame(page);

 await check("xstore_016_"+width+"_accordion_global_header_and_secondary_overview",async()=>{
  return frame.evaluate(expected=>{
   const root=document.querySelector(".msd-ui2-012");
   const branches=[...root.querySelectorAll("[data-msd-branch]")];
   const expanded=branches.filter(x=>x.getAttribute("aria-expanded")==="true");
   const panels=root.querySelectorAll(".msd-branch-panel");
   const overview=root.querySelector(".msd-global-overview");
   const auto=root.querySelector("#xstoreAutomationMount");
   const head=root.querySelector(".msd-head");
   const state=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();
   const metric={
    expected,
    expectedBranches:state.stores.length,
    branches:branches.length,
    expanded:expanded.length,
    panels:panels.length,
    hasGlobalSelector:!!root.querySelector("#msdStore"),
    overviewOpen:!!overview?.open,
    autoInsideOverview:!!(overview&&auto&&overview.contains(auto)),
    weekControls:head?.querySelectorAll("[data-msd-week]").length||0,
    branchActionsInHead:head?.querySelectorAll("#msdStart,#msdReload,#msdSave").length||0,
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth
   };
   if(metric.branches!==metric.expectedBranches||metric.branches<1||metric.expanded!==1||metric.panels!==1||metric.hasGlobalSelector||metric.overviewOpen||metric.autoInsideOverview||metric.weekControls!==3||metric.branchActionsInHead!==0)throw new Error(JSON.stringify(metric));
   if(metric.scrollWidth>metric.clientWidth+2)throw new Error("page overflow "+JSON.stringify(metric));
   return JSON.stringify(metric);
  },width);
 });

 const shot=path.join(OUT,"xstore-016-scheduling-ia-"+width+".png");
 await page.screenshot({path:shot,fullPage:true});
 await context.close();
}

{
 const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",viewport:{width:1280,height:960}});
 const page=await context.newPage();attach(page);
 await page.goto(BASE+"/09_QA/people-shift/ui2-012-manager-scheduling-fixture.html",{waitUntil:"networkidle",timeout:20000});
 const frame=await managerFrame(page);
 await frame.evaluate(async()=>{
  globalThis.__MW31_QA.setAccessibleStores(["store-a","store-c"]);
  await globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.refresh();
 });
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().stores.length===2);

 await frame.locator("#msdStart").click();
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().generationStatus==="DRAFT");
 await frame.locator(".msd-source-row").first().locator("[data-add-av]").click();
 await frame.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().dirty===true);

 await check("xstore_016_unsaved_branch_switch_can_be_cancelled",async()=>{
  let message="";
  page.once("dialog",async dialog=>{message=dialog.message();await dialog.dismiss()});
  await frame.locator('[data-msd-branch="store-c"]').click();
  await frame.waitForTimeout(100);
  const state=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
  if(state.storeId!=="store-a"||state.dirty!==true||!message.includes("thay đổi chưa lưu"))throw new Error(JSON.stringify({state,message}));
  const open=await frame.locator('[data-msd-branch="store-a"]').getAttribute("aria-expanded");
  if(open!=="true")throw new Error("store-a accordion closed after cancelled navigation");
  return message;
 });

 await check("xstore_016_unsaved_branch_switch_can_be_confirmed",async()=>{
  let message="";
  page.once("dialog",async dialog=>{message=dialog.message();await dialog.accept()});
  await frame.locator('[data-msd-branch="store-c"]').click();
  await frame.waitForFunction(()=>{const s=globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState();return s.storeId==="store-c"&&!s.busy&&s.dirty===false});
  const state=await frame.evaluate(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState());
  const expanded=await frame.locator('[data-msd-branch][aria-expanded="true"]').count();
  const panels=await frame.locator(".msd-branch-panel").count();
  if(expanded!==1||panels!==1||!message.includes("thay đổi chưa lưu"))throw new Error(JSON.stringify({state,expanded,panels,message}));
  return JSON.stringify({storeId:state.storeId,dirty:state.dirty,expanded,panels});
 });

 await context.close();
}

await browser.close();

for(const [name,list] of Object.entries({
 page_errors:report.page_errors,
 console_errors:report.console_errors,
 request_failures:report.request_failures,
 http_errors:report.http_errors
})){
 if(list.length){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:JSON.stringify(list)})}
}

fs.writeFileSync(path.join(OUT,"xstore-016-scheduling-ia-report.json"),JSON.stringify(report,null,2));
console.log("XSTORE_016_SCHEDULING_IA_BROWSER="+report.status);
for(const item of report.checks)console.log("["+item.status+"] "+item.name+(item.detail?" — "+item.detail:""));
if(report.status!=="PASS")process.exitCode=1;
