import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8769";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",cases:[]};
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,768,1280]){
  const context=await browser.newContext({viewport:{width,height:900},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
  try{
   const page=await context.newPage();
   await page.goto(BASE+"/09_QA/people-shift/ui2-006-employee-today-fixture.html",{waitUntil:"networkidle"});
   const frame=page.frameLocator("#employeeApp");
   await frame.locator("body[data-magasin-employee-shell-v2]").waitFor({timeout:10000});
   const buttons=frame.locator("#view-dashboard .employee-today-shortcuts button");
   if(await buttons.count()!==4)throw Error("Mockup D must expose four genuine employee shortcuts");
   const layout=await frame.locator("body").evaluate(body=>{
    const find=s=>body.querySelector(s);
    const view=find("#view-dashboard"),nav=find(".employee-today-shortcuts"),header=find(".app-header");
    const box=el=>{const r=el.getBoundingClientRect();return {top:r.top,left:r.left,width:r.width,height:r.height}};
    const controls=[...nav.querySelectorAll("button")].map(box);
    const order=[".employee-today-intro",".employee-today-card--shift",".employee-today-shortcuts",".employee-today-week",".employee-today-queue"].map(s=>box(find(s)).top);
    return {doc:body.scrollWidth,client:body.clientWidth,
     buttons:controls,columns:getComputedStyle(nav).gridTemplateColumns.trim().split(' ').filter(Boolean).length,
     header:getComputedStyle(header).backgroundImage,order,view:box(view),bodyWidth:box(body).width};
   });
   if(layout.doc>layout.client+1)throw Error("Horizontal overflow: "+JSON.stringify(layout));
   if(layout.buttons.some(x=>x.height<44||x.width<44))throw Error("Shortcut touch target too small: "+JSON.stringify(layout));
   if(width===390){
    if(layout.columns!==4)throw Error("Mockup D phone needs four shortcut columns: "+JSON.stringify(layout));
    if(!layout.header.includes("linear-gradient"))throw Error("Missing blue D header");
    if(layout.order.some((top,i)=>i>0&&top<layout.order[i-1]-1))throw Error("D phone cards are out of approved order: "+JSON.stringify(layout));
   }
   await page.screenshot({path:path.join(OUT,"mockup-d-employee-"+width+"px.png"),fullPage:true});
   await buttons.nth(0).click();
   await frame.locator("#weeklyRegistrationPanel.open").waitFor({timeout:5000});
   const calls=await page.evaluate(()=>globalThis.__UI2_006_QA?.actions||[]);
   if(!calls.some(x=>x.type==="availability-open"))throw Error("Availability shortcut did not invoke existing engine");
   await frame.locator("body").evaluate(body=>body.ownerDocument.defaultView.showView("dashboard"));
   await buttons.nth(1).click();
   await frame.locator("#view-schedule.active").waitFor();
   await frame.locator("body").evaluate(body=>body.ownerDocument.defaultView.showView("dashboard"));
   await buttons.nth(2).click();
   await frame.locator("#view-attendance.active").waitFor();
   await frame.locator("body").evaluate(body=>body.ownerDocument.defaultView.showView("dashboard"));
   await buttons.nth(3).click();
   await frame.locator("#view-notice.active").waitFor();
   report.cases.push({width,status:"PASS",layout});
  }finally{await context.close()}
 }
} catch(error){
 report.status="FAIL";report.error=String(error?.stack||error);
} finally{await browser.close()}
fs.writeFileSync(path.join(OUT,"mockup-d-employee-report.json"),JSON.stringify(report,null,2));
console.log("EMPLOYEE_MOCKUP_D_VISUAL="+report.status);
if(report.status!=="PASS"){console.error(report.error);process.exitCode=1}
