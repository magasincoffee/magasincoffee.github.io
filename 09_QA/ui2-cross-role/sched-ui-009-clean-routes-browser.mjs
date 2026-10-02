import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8769";
const specs=[
  {path:"/manager/",role:"STORE_MANAGER",target:"/05_MANAGER/",hash:""},
  {path:"/manager/scheduling/",role:"STORE_MANAGER",target:"/05_MANAGER/",hash:"#workforce"},
  {path:"/manager/schedule/",role:"STORE_MANAGER",target:"/05_MANAGER/",hash:"#schedule"},
  {path:"/employee/",role:"STAFF",target:"/06_EMPLOYEE/",hash:""},
  {path:"/employee/schedule/",role:"EMPLOYEE",target:"/06_EMPLOYEE/",hash:"#schedule"},
  {path:"/employee/attendance/",role:"STAFF",target:"/06_EMPLOYEE/",hash:"#attendance"},
  {path:"/employee/payroll/",role:"EMPLOYEE",target:"/06_EMPLOYEE/",hash:"#payroll"},
  {path:"/owner/",role:"OWNER",target:"/04_OWNER/",hash:""},
  {path:"/owner/scheduling/",role:"OWNER",target:"/04_OWNER/Workforce/",hash:""}
];

const browser=await chromium.launch({headless:true});
const results=[];
const sharedMock=`(()=>{
  const role=sessionStorage.getItem("__sched_ui_009_role");
  window.MAGASIN_CORE={supabase:{async requireActive(){
    if(!role)throw new Error("NO_ACTIVE_SESSION");
    return {id:"qa-user",role,status:"ACTIVE"};
  }}};
})();`;

async function contextFor(role){
  const context=await browser.newContext();
  await context.addInitScript(value=>{
    if(value)sessionStorage.setItem("__sched_ui_009_role",value);
    else sessionStorage.removeItem("__sched_ui_009_role");
  },role||"");
  await context.route("**/02_CORE/shared/shared-core-v1.js*",r=>r.fulfill({status:200,contentType:"application/javascript",body:sharedMock}));
  await context.route("https://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:""}));
  for(const pattern of [
    "**/05_MANAGER/","**/06_EMPLOYEE/","**/04_OWNER/","**/04_OWNER/Workforce/",
    "**/03_PLATFORM/01_AUTH/","**/03_PLATFORM/01_AUTH/role-unavailable.html"
  ]) await context.route(pattern,r=>r.fulfill({status:200,contentType:"text/html",body:"<!doctype html><title>route-target</title><main>target</main>"}));
  return context;
}

try{
  for(const spec of specs){
    for(let pass=1;pass<=2;pass++){
      const res=await fetch(BASE+spec.path,{cache:"no-store"});
      const html=await res.text();
      if(res.status!==200||!html.includes("canonical-role-route-v1.js?v=20261003-sched-ui-009"))throw new Error(JSON.stringify({spec,pass,status:res.status}));
    }
    const context=await contextFor(spec.role);
    const page=await context.newPage();
    await page.goto(BASE+spec.path,{waitUntil:"domcontentloaded"});
    await page.waitForURL(url=>url.pathname===spec.target&&url.hash===spec.hash,{timeout:10000});
    const first=page.url();
    await page.goto(BASE+spec.path+"?direct-reload=1",{waitUntil:"domcontentloaded"});
    await page.waitForURL(url=>url.pathname===spec.target&&url.hash===spec.hash,{timeout:10000});
    results.push({path:spec.path,target:spec.target+spec.hash,first,reload:page.url()});
    await context.close();
  }

  {
    const context=await contextFor("STAFF");
    const page=await context.newPage();
    await page.goto(BASE+"/manager/scheduling/",{waitUntil:"domcontentloaded"});
    await page.waitForURL(url=>url.pathname==="/03_PLATFORM/01_AUTH/role-unavailable.html",{timeout:10000});
    results.push({guard:"wrong-role",url:page.url()});
    await context.close();
  }
  {
    const context=await contextFor("");
    const page=await context.newPage();
    await page.goto(BASE+"/owner/scheduling/",{waitUntil:"domcontentloaded"});
    await page.waitForURL(url=>url.pathname==="/03_PLATFORM/01_AUTH/",{timeout:10000});
    results.push({guard:"logged-out",url:page.url()});
    await context.close();
  }

  console.log("SCHED_UI_009_CLEAN_ROUTES_BROWSER=PASS");
  console.log(JSON.stringify(results,null,2));
}finally{
  await browser.close();
}
