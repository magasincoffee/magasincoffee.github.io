import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8769";
const OUT=process.env.QA_OUT||"qa-artifacts/ui2-cross-role";
fs.mkdirSync(OUT,{recursive:true});

const report={
  generated_at:new Date().toISOString(),
  status:"PASS",
  checks:[],
  screenshots:[],
  diagnostics:{page_errors:[],console_errors:[],request_failures:[],http_errors:[]}
};
const add=(name,status,detail="")=>{report.checks.push({name,status,detail:String(detail??"")});if(status!=="PASS")report.status="FAIL"};
async function check(name,fn){try{add(name,"PASS",await fn())}catch(e){add(name,"FAIL",e?.stack||e)}}
const visible=async loc=>loc.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return !el.hidden&&s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0});

const browser=await chromium.launch({headless:true});
for(const width of [390,768,1280]){
  const context=await browser.newContext({viewport:{width,height:900},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh",javaScriptEnabled:false});
  await context.route("https://cdn.jsdelivr.net/**",route=>route.fulfill({status:200,contentType:"application/javascript",body:""}));
  const page=await context.newPage();
  page.on("pageerror",e=>report.diagnostics.page_errors.push(width+": "+String(e?.stack||e?.message||e)));
  page.on("console",m=>{if(m.type()==="error")report.diagnostics.console_errors.push(width+": "+m.text())});
  page.on("requestfailed",r=>report.diagnostics.request_failures.push(width+": "+r.method()+" "+r.url()+" "+(r.failure()?.errorText||"")));
  page.on("response",r=>{if(r.status()>=500)report.diagnostics.http_errors.push(width+": "+r.status()+" "+r.url())});

  await page.goto(BASE+"/03_PLATFORM/01_AUTH/",{waitUntil:"networkidle",timeout:20000});

  for(const view of ["login","register","forgot","resetChecking","resetInvalid","reset"]){
    await page.evaluate(id=>{
      document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));
      window.scrollTo(0,0);
    },view);
    const root=page.locator("#"+view);
    await root.waitFor({state:"visible"});
    const focusable=root.locator("input,button,a[href],select,textarea").first();
    let focus="n/a";
    if(await focusable.count() && await visible(focusable)){
      await focusable.focus();
      focus=await focusable.evaluate(el=>({outline:getComputedStyle(el).outlineStyle,shadow:getComputedStyle(el).boxShadow,height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width}));
    }
    await check(`ui2_016_auth_${view}_${width}_responsive_focus`,async()=>{
      const metric=await root.evaluate((el,expected)=>{
        const html=document.documentElement,r=el.getBoundingClientRect();
        const controls=[...el.querySelectorAll("input,button,a[href],select,textarea")].filter(x=>{const b=x.getBoundingClientRect(),s=getComputedStyle(x);return !x.hidden&&s.display!=="none"&&s.visibility!=="hidden"&&b.width>0&&b.height>0});
        return {
          viewport:innerWidth,expected,doc:html.scrollWidth,client:html.clientWidth,
          rootRight:r.right,rootLeft:r.left,
          minControl:controls.length?Math.min(...controls.map(x=>x.getBoundingClientRect().height)):null,
          text:getComputedStyle(el).fontFamily,
          controls:controls.length
        };
      },width);
      if(metric.viewport!==width||metric.doc>metric.client+1||metric.rootRight>width+1||metric.rootLeft<-1)throw new Error(JSON.stringify({metric,focus}));
      if(metric.controls&&width===390&&metric.minControl<43.5)throw new Error(JSON.stringify({metric,focus}));
      if(focus!=="n/a"&&focus.outline==="none"&&focus.shadow==="none")throw new Error(JSON.stringify({metric,focus}));
      if(!/Inter|system-ui|Segoe UI/.test(metric.text))throw new Error("non-canonical font "+JSON.stringify(metric));
      return JSON.stringify({metric,focus});
    });
  }

  if(width===390){
    await page.evaluate(()=>document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="login")));
    const shot=path.join(OUT,"ui2-016-auth-login-390.png");
    await page.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
    await page.evaluate(()=>document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="resetInvalid")));
    const err=path.join(OUT,"ui2-016-auth-error-390.png");
    await page.screenshot({path:err,fullPage:true});report.screenshots.push(err);
  }

  await page.goto(BASE+"/03_PLATFORM/01_AUTH/pending-access.html",{waitUntil:"networkidle",timeout:20000});
  const pending=page.locator(".pending-card");
  await pending.waitFor({state:"visible"});
  const link=page.locator(".pending-actions .m-button");
  await link.focus();
  await check(`ui2_016_auth_pending_${width}_responsive_focus`,async()=>{
    const metric=await page.evaluate(expected=>{
      const html=document.documentElement,card=document.querySelector(".pending-card"),button=document.querySelector(".pending-actions .m-button"),r=card.getBoundingClientRect(),b=button.getBoundingClientRect(),s=getComputedStyle(button);
      return {viewport:innerWidth,expected,doc:html.scrollWidth,client:html.clientWidth,right:r.right,left:r.left,target:b.height,outline:s.outlineStyle,shadow:s.boxShadow};
    },width);
    if(metric.doc>metric.client+1||metric.right>width+1||metric.left<-1||(width===390&&metric.target<43.5)||(metric.outline==="none"&&metric.shadow==="none"))throw new Error(JSON.stringify(metric));
    return JSON.stringify(metric);
  });
  if(width===390){
    const shot=path.join(OUT,"ui2-016-auth-pending-390.png");
    await page.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
  }
  await context.close();
}
await browser.close();

for(const [name,list] of Object.entries(report.diagnostics)){
  if(list.length)add(name,"FAIL",list.join("\n"));else add(name,"PASS","");
}
fs.writeFileSync(path.join(OUT,"ui2-016-auth-responsive-report.json"),JSON.stringify(report,null,2));
console.log("UI2_016_AUTH_RESPONSIVE="+report.status);
if(report.status!=="PASS")process.exitCode=1;
