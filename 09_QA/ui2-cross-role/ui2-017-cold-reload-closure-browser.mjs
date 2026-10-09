import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8769";
const OUT=process.env.QA_OUT||"qa-artifacts/ui2-cross-role";
fs.mkdirSync(OUT,{recursive:true});

const report={
  base_sha:"f98cfb15a47bbb66ad39c71348bb2668cf174364",
  generated_at:new Date().toISOString(),
  status:"PASS",
  checks:[],
  diagnostics:{page_errors:[],console_errors:[],request_failures:[],http_errors:[]},
  ignored_navigation_aborts:[],
  cache_assets:[]
};
const add=(name,status,detail="")=>{report.checks.push({name,status,detail:String(detail??"")});if(status!=="PASS")report.status="FAIL"};
async function check(name,fn){try{add(name,"PASS",await fn())}catch(e){add(name,"FAIL",e?.stack||e)}}

const supabaseStub=`
(()=>{
  const role=()=>sessionStorage.getItem("__ui2_role")||"EMPLOYEE";
  const logged=()=>sessionStorage.getItem("__ui2_logged")==="1";
  const profile=()=>({id:"qa-user",full_name:"UI2 QA",username:"ui2qa",role:role(),status:"ACTIVE"});
  const query=(table)=>{
    let proxy;
    const target={
      single:async()=>({data:table==="profiles"?profile():null,error:null}),
      maybeSingle:async()=>({data:table==="profiles"?profile():null,error:null}),
      then:(resolve,reject)=>Promise.resolve({data:[],error:null}).then(resolve,reject)
    };
    proxy=new Proxy(target,{get(t,p){
      if(p in t)return t[p];
      return (..._args)=>proxy;
    }});
    return proxy;
  };
  window.supabase={createClient:()=>({
    auth:{
      getSession:async()=>({data:{session:logged()?{user:{id:"qa-user"}}:null},error:null}),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
      signInWithPassword:async()=>{sessionStorage.setItem("__ui2_logged","1");return {data:{user:{id:"qa-user"},session:{user:{id:"qa-user"}}},error:null}},
      signUp:async()=>({data:{session:null,user:{id:"qa-user"}},error:null}),
      resetPasswordForEmail:async()=>({data:{},error:null}),
      exchangeCodeForSession:async()=>({data:{session:{user:{id:"qa-user"}}},error:null}),
      verifyOtp:async()=>({data:{session:{user:{id:"qa-user"}}},error:null}),
      updateUser:async()=>({data:{user:{id:"qa-user"}},error:null}),
      signOut:async()=>({error:null})
    },
    from:(table)=>query(table),
    rpc:async(name)=>({data:name==="resolve_login_email"?"qa@example.com":[],error:null})
  })};
})();
`;

const browser=await chromium.launch({headless:true});

async function newContext(role,width=390){
  const context=await browser.newContext({viewport:{width,height:900},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
  await context.addInitScript(r=>{
    sessionStorage.setItem("__ui2_role",r);
  },role);
  await context.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",route=>route.fulfill({status:200,contentType:"application/javascript",body:supabaseStub}));
  for(const pattern of [
    "**/06_EMPLOYEE/runtime/employee-runtime-v1.html*",
    "**/05_MANAGER/runtime/manager-runtime-v1.html*",
    "**/04_OWNER/Workforce/runtime/owner-workforce-runtime.html*"
  ]) await context.route(pattern,route=>route.fulfill({status:200,contentType:"text/html",body:"<!doctype html><title>UI2-017 bounded runtime probe</title><main id=runtimeProbe>runtime</main>"}));
  await context.route("**/04_OWNER/ControlTower/control-tower-v1.js*",route=>route.fulfill({status:200,contentType:"application/javascript",body:"window.__UI2_017_OWNER_ROUTE_PROBE__=true;"}));
  return context;
}

function attachDiagnostics(page,label){
  page.on("pageerror",e=>report.diagnostics.page_errors.push(label+": "+String(e?.stack||e?.message||e)));
  page.on("console",m=>{if(m.type()==="error")report.diagnostics.console_errors.push(label+": "+m.text())});
  page.on("requestfailed",r=>{
    const errorText=r.failure()?.errorText||"";
    const url=r.url();
    const expectedNavigationAbort=errorText==="net::ERR_ABORTED" &&
      /\/(?:06_EMPLOYEE|05_MANAGER)\/runtime\/(?:employee|manager)-runtime-v1\.html/.test(url);
    if(expectedNavigationAbort){
      report.ignored_navigation_aborts.push(label+": "+r.method()+" "+url+" "+errorText);
      return;
    }
    report.diagnostics.request_failures.push(label+": "+r.method()+" "+url+" "+errorText);
  });
  page.on("response",r=>{if(r.status()>=500)report.diagnostics.http_errors.push(label+": "+r.status()+" "+r.url())});
}

async function iframeSrc(page,id="app"){
  await page.waitForFunction(id=>{const f=document.getElementById(id);return !!(f&&f.getAttribute("src"))},id,{timeout:10000});
  return page.locator("#"+id).getAttribute("src");
}

for(const spec of [
  {role:"EMPLOYEE",target:"/employee/",runtime:"/06_EMPLOYEE/runtime/employee-runtime-v1.html?v=20261007-xstore-019h-visual3"},
  {role:"STORE_MANAGER",label:"MANAGER",target:"/manager/",runtime:"/05_MANAGER/runtime/manager-runtime-v1.html?v=20261009-xstore-019j-slide1"},
  {role:"OWNER",target:"/owner/",runtime:null}
]){
  const context=await newContext(spec.role);
  const page=await context.newPage();
  attachDiagnostics(page,"auth-"+spec.role);
  await page.goto(BASE+"/03_PLATFORM/01_AUTH/",{waitUntil:"domcontentloaded"});
  await page.fill("#username","qa@example.com");
  await page.fill("#password","password123");
  await Promise.all([
    page.waitForURL(url=>url.pathname===spec.target,{timeout:10000}),
    page.click("#loginForm button[type=submit]")
  ]);
  await check("ui2_017_auth_routes_"+String(spec.label||spec.role).toLowerCase(),async()=>{
    const detail={url:page.url()};
    if(new URL(page.url()).pathname!==spec.target)throw new Error(JSON.stringify(detail));
    if(spec.runtime){
      detail.runtime=await iframeSrc(page);
      if(!detail.runtime.startsWith(spec.runtime))throw new Error(JSON.stringify(detail));
    }
    return JSON.stringify(detail);
  });
  await context.close();
}

for(const spec of [
  {role:"EMPLOYEE",entry:"/06_EMPLOYEE/",first:"schedule",second:"attendance",runtime:"/06_EMPLOYEE/runtime/employee-runtime-v1.html?v=20261007-xstore-019h-visual3"},
  {role:"STORE_MANAGER",label:"MANAGER",entry:"/05_MANAGER/",first:"workforce",second:"attendance",runtime:"/05_MANAGER/runtime/manager-runtime-v1.html?v=20261009-xstore-019j-slide1"}
]){
  const context=await newContext(spec.role,(spec.label||spec.role)==="MANAGER"?1024:390);
  await context.addInitScript(()=>sessionStorage.setItem("__ui2_logged","1"));
  const page=await context.newPage();
  attachDiagnostics(page,"cold-"+(spec.label||spec.role));
  // Query token forces a real document navigation between canonical deep links;
  // hash-only navigation would not re-bootstrap the outer entry when the bounded
  // runtime iframe is intentionally stubbed by this closure probe.
  const firstUrl=BASE+spec.entry+"?ui2closure=first#"+spec.first;
  const secondUrl=BASE+spec.entry+"?ui2closure=second#"+spec.second;
  await page.goto(firstUrl,{waitUntil:"domcontentloaded"});
  const cold=await iframeSrc(page);
  await page.reload({waitUntil:"domcontentloaded"});
  const hardReload=await iframeSrc(page);
  await page.goto(secondUrl,{waitUntil:"domcontentloaded"});
  const second=await iframeSrc(page);
  await page.goBack({waitUntil:"domcontentloaded"});
  const back=await iframeSrc(page);
  await page.reload({waitUntil:"domcontentloaded"});
  const backReload=await iframeSrc(page);
  await check("ui2_017_"+String(spec.label||spec.role).toLowerCase()+"_cold_reload_back_deeplink",async()=>{
    const expectedFirst=spec.runtime+"#"+spec.first,expectedSecond=spec.runtime+"#"+spec.second;
    const detail={cold,hardReload,second,back,backReload,url:page.url()};
    if(cold!==expectedFirst||hardReload!==expectedFirst||second!==expectedSecond||back!==expectedFirst||backReload!==expectedFirst)throw new Error(JSON.stringify(detail));
    return JSON.stringify(detail);
  });
  await context.close();
}

{
  const context=await newContext("OWNER",390);
  await context.addInitScript(()=>sessionStorage.setItem("__ui2_logged","1"));
  const page=await context.newPage();
  attachDiagnostics(page,"cold-owner-workforce");
  await page.goto(BASE+"/04_OWNER/Workforce/",{waitUntil:"domcontentloaded"});
  const cold=await iframeSrc(page);
  await page.reload({waitUntil:"domcontentloaded"});
  const hardReload=await iframeSrc(page);
  await check("ui2_017_owner_workforce_cold_hard_reload",async()=>{
    const expected="/04_OWNER/Workforce/runtime/owner-workforce-runtime.html?v=20261005-xstore-019";
    const detail={cold,hardReload,url:page.url()};
    if(cold!==expected||hardReload!==expected)throw new Error(JSON.stringify(detail));
    return JSON.stringify(detail);
  });
  await context.close();
}

const assetSpecs=[
  ["/02_CORE/ui/magasin-ui-v2-shell.css?v=20261001-ui-unified1","--m-control-touch-height"],
  ["/05_MANAGER/runtime/compat/ui/manager-ui-shell-v2.js?v=20260927-ui2-016","@media(max-width:1024px)"],
  ["/05_MANAGER/Workforce/ui-consolidation-v1.js?v=20261005-xstore-019","@media(max-width:1024px)"],
  ["/05_MANAGER/Workforce/manager-scheduling-ui2-v1.js?v=20261005-xstore-019","@media(max-width:1024px)"],
  ["/05_MANAGER/Workforce/manager-operations-ui2-v1.js?v=20260927-ui2-016","@media(max-width:1024px)"],
  ["/02_CORE/ui/workforce-scheduling-polish-v1.css?v=20261007-xstore-019j-workspace2",".x19g-shell .msd-calendar-primary .msd-board"],
  ["/05_MANAGER/Workforce/engine-v1.js?v=20261009-xstore-019j-slide1","manager-five-board-v4.js?v=20261009-xstore-019j-slide1"],
  ["/05_MANAGER/runtime/manager-shell-v1.html?v=20261001-ui-unified1","manager-ui-shell-v2.js?v=20260927-ui2-016"],
  ["/05_MANAGER/runtime/manager-runtime-v1.html?v=20261009-xstore-019j-slide1","manager-shell-v1.html?v=20261001-ui-unified1"],
  ["/04_OWNER/Workforce/runtime/owner-workforce-runtime.html?v=20261005-xstore-019","owner-scheduling-overview-v1.js?v=20261005-xstore-019"]
];
for(const [url,marker] of assetSpecs){
  await check("ui2_017_cache_asset_"+url.split("?")[0].replaceAll("/","_"),async()=>{
    const res=await fetch(BASE+url,{cache:"no-store"});
    const body=await res.text();
    const detail={url,status:res.status,bytes:body.length,marker};
    report.cache_assets.push(detail);
    if(!res.ok||!body.includes(marker))throw new Error(JSON.stringify(detail));
    return JSON.stringify(detail);
  });
}

await check("ui2_017_no_stale_ui2_016_cache_chain",async()=>{
  const files=[
    ["/05_MANAGER/Workforce/engine-v1.js",[
      "manager-scheduling-ui2-v1.js?v=20260927-ui2-012",
      "manager-scheduling-ui2-v1.js?v=20260927-ui2-016",
      "ui-consolidation-v1.js?v=20260927-ui2-011-correction1",
      "ui-consolidation-v1.js?v=20260927-ui2-016",
      "draft-publish-v1.js?v=20261005-xstore-019",
      "manager-five-board-v4.js?v=20261007-xstore-019j-weekfix1",
      "manager-five-board-v4.js?v=20261007-xstore-019j-workspace2",
      "manager-five-board-v4.js?v=20261007-xstore-019j-visual3"
    ]],
    ["/05_MANAGER/runtime/manager-runtime-v1.html",[
      "manager-shell-v1.html?v=20260927-ui2-011-correction1",
      "manager-shell-v1.html?v=20260927-ui2-016",
      "engine-v1.js?v=20260927-ui2-013",
      "engine-v1.js?v=20260929-mer005",
      "engine-v1.js?v=20261003-sched-ui-017",
      "engine-v1.js?v=20261007-xstore-019j-weekfix1",
      "engine-v1.js?v=20261007-xstore-019j-cluster1",
      "engine-v1.js?v=20261007-xstore-019j-visual3",
      "draft-publish-v1.js?v=20261005-xstore-018",
      "manager-scheduling-ui2-v1.js?v=20261005-xstore-018"
    ]],
    ["/04_OWNER/Workforce/runtime/owner-workforce-runtime.html",[
      "manager-shell-v1.html?v=20260927-ui2-011-correction1",
      "magasin-ui-v2-shell.css?v=20260925-ui2-004",
      "20261001-ui-unified1",
      "owner-workforce-runtime.html?v=20261003-sched-ui-008",
      "draft-publish-v1.js?v=20261003-sched-ui-008",
      "owner-scheduling-overview-v1.js?v=20261003-sched-ui-008"
    ]]
  ];
  const stale=[];
  for(const [url,forbidden] of files){
    const body=await (await fetch(BASE+url,{cache:"no-store"})).text();
    for(const token of forbidden)if(body.includes(token))stale.push({url,token});
  }
  if(stale.length)throw new Error(JSON.stringify(stale));
  return "Manager/Owner scheduling cache chain is frozen to XSTORE-019 and legacy scheduling cache tokens are absent";
});

await browser.close();

for(const [name,list] of Object.entries(report.diagnostics)){
  if(list.length)add("diagnostics_"+name,"FAIL",list.join("\n"));else add("diagnostics_"+name,"PASS","");
}
add("diagnostics_expected_navigation_aborts","PASS",JSON.stringify({count:report.ignored_navigation_aborts.length,items:report.ignored_navigation_aborts}));
fs.writeFileSync(path.join(OUT,"ui2-017-cold-reload-closure-report.json"),JSON.stringify(report,null,2));
console.log("UI2_017_COLD_RELOAD_CLOSURE="+report.status);
if(report.status!=="PASS")process.exitCode=1;
