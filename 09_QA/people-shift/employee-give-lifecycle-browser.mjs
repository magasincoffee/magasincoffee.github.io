import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={status:"PASS",checks:[],page_errors:[],console_errors:[]};
const check=async(name,fn)=>{try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.message||e)});report.status="FAIL"}};
const browser=await chromium.launch({headless:true});

const giver=await browser.newPage({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
giver.on("pageerror",e=>report.page_errors.push("giver: "+String(e?.message||e)));
giver.on("console",m=>{if(m.type()==="error")report.console_errors.push("giver: "+m.text())});
await giver.goto(BASE+"/09_QA/people-shift/employee-give-giver-fixture.html",{waitUntil:"networkidle"});
const gf=giver.frameLocator("#employeeApp");
await check("giver_opens_real_give_flow",async()=>{
 await gf.locator("#swapChoices button").filter({hasText:"Cho ca"}).click();
 await gf.locator("#employeeRequesterSchedule").waitFor();
 await gf.locator("#employeeSwapTarget").waitFor();
 const target=await gf.locator("#employeeSwapTarget").inputValue();
 if(target!=="u-recipient")throw new Error(target);
 const calls=await giver.evaluate(()=>globalThis.__GIVE_GIVER_QA.calls.map(x=>x.name));
 if(!calls.includes("list_shift_give_candidates_v1"))throw new Error(JSON.stringify(calls));
 return "candidate user RPC";
});
await check("giver_submit_creates_pending_recipient_request",async()=>{
 await gf.locator("#employeeSwapReason").fill("Nhờ nhận ca");
 await gf.locator("#swapForm .btn.primary").click();
 await giver.waitForFunction(()=>globalThis.__GIVE_GIVER_QA.state.gives.length===1);
 const call=await giver.evaluate(()=>globalThis.__GIVE_GIVER_QA.calls.filter(x=>x.name==="submit_shift_give_request").at(-1));
 if(call.args.p_schedule_id!=="sch-give"||call.args.p_recipient_user_id!=="u-recipient"||call.args.p_reason!=="Nhờ nhận ca")throw new Error(JSON.stringify(call));
 const text=await gf.locator("#historyList").innerText();
 if(!text.includes("Chờ người nhận"))throw new Error(text);
 return "PENDING_RECIPIENT";
});

const recipient=await browser.newPage({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
recipient.on("pageerror",e=>report.page_errors.push("recipient: "+String(e?.message||e)));
recipient.on("console",m=>{if(m.type()==="error")report.console_errors.push("recipient: "+m.text())});
await recipient.goto(BASE+"/09_QA/people-shift/employee-give-recipient-fixture.html",{waitUntil:"networkidle"});
const rf=recipient.frameLocator("#employeeApp");
await check("recipient_sees_pending_give_and_accepts",async()=>{
 await rf.locator(".js-give-accept").waitFor();
 await rf.locator(".js-give-accept").click();
 await recipient.waitForFunction(()=>globalThis.__GIVE_RECIPIENT_QA.state.give.status==="PENDING_MANAGER");
 const call=await recipient.evaluate(()=>globalThis.__GIVE_RECIPIENT_QA.calls.filter(x=>x.name==="respond_shift_give_request").at(-1));
 if(call.args.p_give_id!=="give-1"||call.args.p_accept!==true)throw new Error(JSON.stringify(call));
 const text=await rf.locator("#historyList").innerText();
 if(!text.includes("Chờ quản lý"))throw new Error(text);
 return "PENDING_MANAGER";
});
await check("no_fake_swap_write_in_give_flow",async()=>{
 const calls=await giver.evaluate(()=>globalThis.__GIVE_GIVER_QA.calls.filter(x=>x.name==="submit_shift_swap_request"));
 if(calls.length)throw new Error(JSON.stringify(calls));
 return "0 swap writes";
});

if(report.page_errors.length){report.checks.push({name:"page_errors",status:"FAIL",detail:report.page_errors.join("\n")});report.status="FAIL"}
else report.checks.push({name:"page_errors",status:"PASS",detail:"0"});
if(report.console_errors.length){report.checks.push({name:"console_errors",status:"FAIL",detail:report.console_errors.join("\n")});report.status="FAIL"}
else report.checks.push({name:"console_errors",status:"PASS",detail:"0"});
await giver.screenshot({path:path.join(OUT,"employee-give-giver.png"),fullPage:true});
await recipient.screenshot({path:path.join(OUT,"employee-give-recipient.png"),fullPage:true});
await browser.close();
fs.writeFileSync(path.join(OUT,"employee-give-lifecycle-report.json"),JSON.stringify(report,null,2));
console.log("EMPLOYEE_GIVE_LIFECYCLE="+report.status);
for(const c of report.checks)console.log(`[${c.status}] ${c.name} — ${c.detail}`);
if(report.status!=="PASS")process.exitCode=1;