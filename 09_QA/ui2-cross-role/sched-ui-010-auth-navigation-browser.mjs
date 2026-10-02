import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8769";
const browser=await chromium.launch({headless:true});
const sharedMock=`(()=>{
  const role=sessionStorage.getItem("__sched_ui_010_role");
  window.MAGASIN_CORE={
    roles:{hasRole:(p,list)=>list.includes(String(p?.role||"").toUpperCase())},
    supabase:{async requireActive(){if(!role)throw new Error("NO_ACTIVE_SESSION");return {id:"qa-user",role,status:"ACTIVE"}}}
  };
})();`;

async function contextFor(role){
  const context=await browser.newContext();
  await context.addInitScript(value=>{if(value)sessionStorage.setItem("__sched_ui_010_role",value);else sessionStorage.removeItem("__sched_ui_010_role")},role||"");
  await context.route("**/02_CORE/shared/shared-core-v1.js*",r=>r.fulfill({status:200,contentType:"application/javascript",body:sharedMock}));
  await context.route("https://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:""}));
  await context.route("**/05_MANAGER/runtime/manager-runtime-v1.html*",r=>r.fulfill({status:200,contentType:"text/html",body:"<!doctype html><main id=managerRuntime>manager</main>"}));
  await context.route("**/06_EMPLOYEE/runtime/employee-runtime-v1.html*",r=>r.fulfill({status:200,contentType:"text/html",body:"<!doctype html><main id=employeeRuntime>employee</main>"}));
  await context.route("**/04_OWNER/Workforce/runtime/owner-workforce-runtime.html*",r=>r.fulfill({status:200,contentType:"text/html",body:"<!doctype html><main id=ownerRuntime>owner</main>"}));
  await context.route("**/04_OWNER/ControlTower/control-tower-v1.js*",r=>r.fulfill({status:200,contentType:"application/javascript",body:"window.__OWNER_ROUTE_QA__=true"}));
  return context;
}

try{
  {
    const context=await contextFor("STORE_MANAGER");
    const page=await context.newPage();
    await page.goto(BASE+"/manager/scheduling/",{waitUntil:"domcontentloaded"});
    await page.locator("#app").waitFor({state:"attached",timeout:10000});
    await page.goto(BASE+"/manager/schedule/",{waitUntil:"domcontentloaded"});
    await page.locator("#app").waitFor({state:"attached",timeout:10000});
    if(new URL(page.url()).pathname!=="/manager/schedule/")throw new Error(page.url());
    await page.goBack({waitUntil:"domcontentloaded"});
    await page.locator("#app").waitFor({state:"attached",timeout:10000});
    if(new URL(page.url()).pathname!=="/manager/scheduling/")throw new Error(page.url());
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator("#app").waitFor({state:"attached",timeout:10000});
    if(new URL(page.url()).pathname!=="/manager/scheduling/")throw new Error(page.url());
    await page.goForward({waitUntil:"domcontentloaded"});
    await page.locator("#app").waitFor({state:"attached",timeout:10000});
    if(new URL(page.url()).pathname!=="/manager/schedule/")throw new Error(page.url());
    await context.close();
  }

  {
    const context=await contextFor("EMPLOYEE");
    const page=await context.newPage();
    for(const path of ["/employee/schedule/","/employee/attendance/","/employee/payroll/"]){
      await page.goto(BASE+path,{waitUntil:"domcontentloaded"});
      await page.locator("#app").waitFor({state:"attached",timeout:10000});
      if(new URL(page.url()).pathname!==path)throw new Error(page.url());
      await page.reload({waitUntil:"domcontentloaded"});
      await page.locator("#app").waitFor({state:"attached",timeout:10000});
      if(new URL(page.url()).pathname!==path)throw new Error(page.url());
    }
    await context.close();
  }

  {
    const context=await contextFor("OWNER");
    const page=await context.newPage();
    await page.goto(BASE+"/owner/scheduling/",{waitUntil:"domcontentloaded"});
    await page.locator("#app").waitFor({state:"attached",timeout:10000});
    if(new URL(page.url()).pathname!=="/owner/scheduling/")throw new Error(page.url());
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator("#app").waitFor({state:"attached",timeout:10000});
    if(new URL(page.url()).pathname!=="/owner/scheduling/")throw new Error(page.url());
    await context.close();
  }

  for(const legacy of [
    {path:"/05_MANAGER/#workforce",role:"STORE_MANAGER",want:"/05_MANAGER/"},
    {path:"/06_EMPLOYEE/#attendance",role:"EMPLOYEE",want:"/06_EMPLOYEE/"},
    {path:"/04_OWNER/Workforce/",role:"OWNER",want:"/04_OWNER/Workforce/"}
  ]){
    const context=await contextFor(legacy.role);
    const page=await context.newPage();
    await page.goto(BASE+legacy.path,{waitUntil:"domcontentloaded"});
    await page.locator("#app").waitFor({state:"attached",timeout:10000});
    if(new URL(page.url()).pathname!==legacy.want)throw new Error("legacy bookmark changed unexpectedly: "+page.url());
    await page.reload({waitUntil:"domcontentloaded"});
    await context.close();
  }

  {
    const context=await contextFor("STAFF");
    const page=await context.newPage();
    await page.goto(BASE+"/manager/",{waitUntil:"domcontentloaded"});
    await page.waitForURL(url=>url.pathname==="/03_PLATFORM/01_AUTH/role-unavailable.html",{timeout:10000});
    await context.close();
  }

  console.log("SCHED_UI_010_AUTH_NAVIGATION_BROWSER=PASS");
}finally{
  await browser.close();
}
