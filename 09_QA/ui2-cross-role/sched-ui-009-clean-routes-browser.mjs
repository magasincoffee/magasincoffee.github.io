import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8769";
const specs=[
  {path:"/manager/",role:"STORE_MANAGER"},
  {path:"/manager/scheduling/",role:"STORE_MANAGER"},
  {path:"/manager/schedule/",role:"STORE_MANAGER"},
  {path:"/employee/",role:"STAFF"},
  {path:"/employee/schedule/",role:"EMPLOYEE"},
  {path:"/employee/attendance/",role:"STAFF"},
  {path:"/employee/payroll/",role:"EMPLOYEE"},
  {path:"/owner/",role:"OWNER"},
  {path:"/owner/scheduling/",role:"OWNER"}
];

const browser=await chromium.launch({headless:true});
const sharedMock=`(()=>{
  const role=sessionStorage.getItem("__sched_ui_route_role");
  window.MAGASIN_CORE={
    roles:{hasRole:(p,list)=>list.includes(String(p?.role||"").toUpperCase())},
    supabase:{async requireActive(){if(!role)throw new Error("NO_ACTIVE_SESSION");return {id:"qa-user",role,status:"ACTIVE"}}}
  };
})();`;

async function contextFor(role){
  const context=await browser.newContext();
  await context.addInitScript(value=>{if(value)sessionStorage.setItem("__sched_ui_route_role",value);else sessionStorage.removeItem("__sched_ui_route_role")},role||"");
  await context.route("**/02_CORE/shared/shared-core-v1.js*",r=>r.fulfill({status:200,contentType:"application/javascript",body:sharedMock}));
  await context.route("https://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:""}));
  await context.route("**/05_MANAGER/runtime/manager-runtime-v1.html*",r=>r.fulfill({status:200,contentType:"text/html",body:"<!doctype html><main>manager runtime</main>"}));
  await context.route("**/06_EMPLOYEE/runtime/employee-runtime-v1.html*",r=>r.fulfill({status:200,contentType:"text/html",body:"<!doctype html><main>employee runtime</main>"}));
  await context.route("**/04_OWNER/Workforce/runtime/owner-workforce-runtime.html*",r=>r.fulfill({status:200,contentType:"text/html",body:"<!doctype html><main>owner scheduling runtime</main>"}));
  await context.route("**/04_OWNER/ControlTower/control-tower-v1.js*",r=>r.fulfill({status:200,contentType:"application/javascript",body:"window.__OWNER_ROUTE_QA__=true"}));
  return context;
}

try{
  for(const spec of specs){
    const context=await contextFor(spec.role);
    const page=await context.newPage();
    await page.goto(BASE+spec.path,{waitUntil:"domcontentloaded"});
    await page.locator("#app").waitFor({state:"attached",timeout:10000});
    if(new URL(page.url()).pathname!==spec.path)throw new Error("clean URL not retained: "+page.url());
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator("#app").waitFor({state:"attached",timeout:10000});
    if(new URL(page.url()).pathname!==spec.path)throw new Error("clean reload not retained: "+page.url());
    await context.close();
  }

  {
    const context=await contextFor("STAFF");
    const page=await context.newPage();
    await page.goto(BASE+"/manager/scheduling/",{waitUntil:"domcontentloaded"});
    await page.waitForURL(url=>url.pathname==="/03_PLATFORM/01_AUTH/role-unavailable.html",{timeout:10000});
    await context.close();
  }
  {
    const context=await contextFor("");
    const page=await context.newPage();
    await page.goto(BASE+"/owner/scheduling/",{waitUntil:"domcontentloaded"});
    await page.waitForURL(url=>url.pathname==="/03_PLATFORM/01_AUTH/",{timeout:10000});
    await context.close();
  }

  console.log("SCHED_UI_009_CLEAN_ROUTES_BROWSER=PASS");
}finally{
  await browser.close();
}
