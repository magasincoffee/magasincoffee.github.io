import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const browser=await chromium.launch({headless:true});
const failures=[];
const check=(ok,message)=>{if(!ok)failures.push(message)};
try{
 for(const role of ["manager","owner"]){
  const page=await browser.newPage();
  const runtimeErrors=[];
  page.on("pageerror",e=>runtimeErrors.push(String(e?.message||e)));
  await page.goto(BASE+"/09_QA/people-shift/manager-official-scope-fixture.html?role="+role,
   {waitUntil:"networkidle",timeout:25000});
  await page.waitForFunction(()=>window.__MANAGER_OFFICIAL_SCOPE_QA?.calls?.length>0);
  const initial=await page.evaluate(()=>({
   calls:window.__MANAGER_OFFICIAL_SCOPE_QA.calls,
   store:window.MAGASIN_MANAGER_OFFICIAL_SCHEDULE?.getState?.().storeId,
   select:document.getElementById("mosStore")?.value,
   allDisabled:document.querySelector("#mosStore option[value='']")?.disabled,
   error:window.MAGASIN_MANAGER_OFFICIAL_SCHEDULE?.getState?.().lastError
  }));
  if(role==="manager"){
   check(initial.calls[0].args.p_store_id==="11111111-1111-4111-8111-111111111111",
    "Manager must load initial authorized store, got "+JSON.stringify(initial));
   check(initial.select===initial.calls[0].args.p_store_id && initial.allDisabled===true,
    "Manager must disable all-store selector: "+JSON.stringify(initial));
   check(initial.error==null,"Manager RPC load unexpectedly failed: "+JSON.stringify(initial));
   await page.locator("#mosStore").selectOption("22222222-2222-4222-8222-222222222222");
   await page.waitForFunction(()=>window.__MANAGER_OFFICIAL_SCOPE_QA.calls.length>1);
   const second=await page.evaluate(()=>window.__MANAGER_OFFICIAL_SCOPE_QA.calls.at(-1).args);
   check(second.p_store_id==="22222222-2222-4222-8222-222222222222",
    "Manager authorized store switch incorrect: "+JSON.stringify(second));
  }else{
   check(initial.calls[0].args.p_store_id===null && initial.allDisabled===false,
    "Owner should preserve global authorized view: "+JSON.stringify(initial));
   check(initial.error==null,"Owner default weekly schedule failed: "+JSON.stringify(initial));
  }
  check(runtimeErrors.length===0,"Runtime errors ("+role+"): "+runtimeErrors.join(","));
  await page.close();
 }
}finally{await browser.close()}
console.log("MANAGER_OFFICIAL_SCOPED_RPC_BROWSER="+(failures.length?"FAIL":"PASS"));
for(const err of failures)console.log("[FAIL] "+err);
if(failures.length)process.exitCode=1;
