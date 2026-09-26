import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
const SHOTS=path.join(OUT,"ui2-011");
fs.mkdirSync(SHOTS,{recursive:true});

const report={status:"PASS",checks:[],screenshots:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[]};
async function check(name,fn){try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.status="FAIL";report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)})}}
const ensure=(ok,msg)=>{if(!ok)throw new Error(msg)};

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});

await context.route("**/02_CORE/shared/shared-core-v1.js*",route=>route.fulfill({
  contentType:"application/javascript",
  body:"window.MAGASIN_CORE={supabase:{requireActive:async()=>({id:'mgr-qa',role:'STORE_MANAGER',status:'ACTIVE'})}};"
}));
await context.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",route=>route.fulfill({
  contentType:"application/javascript",
  body:"window.supabase={createClient(){return window.__UI2_011_API}};"
}));
await context.route("**/02_CORE/security/security-runtime.js*",route=>route.fulfill({
  contentType:"application/javascript",
  body:"window.__UI2_011_SECURITY_STUB=true;"
}));

await context.addInitScript(()=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const calls=[];
  const state=()=>({
    mode:localStorage.getItem("ui2_011_mode")||"ready",
    revision:localStorage.getItem("ui2_011_revision")||"1"
  });
  const maybeDelay=async()=>{if(state().mode==="delay")await sleep(350)};
  const store={id:"store-a",code:"CN-QA-A",name:"MAGASIN QA A",status:"ACTIVE"};
  const profile={full_name:"Quản lý QA",username:"manager.qa",role:"STORE_MANAGER",status:"ACTIVE"};
  const api={
    auth:{
      async getSession(){return {data:{session:{user:{id:"mgr-qa"}}},error:null}},
      async signOut(){calls.push({kind:"auth",name:"signOut"});return {error:null}}
    },
    from(name){
      calls.push({kind:"from",name});
      const chain={
        select(){return chain},eq(){return chain},
        async single(){return {data:name==="profiles"?profile:null,error:null}}
      };
      return chain;
    },
    async rpc(name,args={}){
      calls.push({kind:"rpc",name,args:structuredClone(args||{})});
      await maybeDelay();
      const s=state();
      if(name==="current_user_role")return {data:"STORE_MANAGER",error:null};
      if(name==="get_manager_accessible_stores")return {data:[store],error:null};
      if(name==="get_manager_weekly_availability"){
        if(s.mode==="empty")return {data:[],error:null};
        return {data:[
          {availability_id:"av-1",user_id:"u-1",employee_name:"An",work_date:"2026-09-28",start_time:"08:00",end_time:"12:00",preferred_store_id:"store-a",preferred_store_code:"CN-QA-A",availability_type:"AVAILABLE"},
          {availability_id:"av-2",user_id:"u-2",employee_name:"Bình",work_date:"2026-09-29",start_time:"12:00",end_time:"17:00",preferred_store_id:"store-a",preferred_store_code:"CN-QA-A",availability_type:"PREFERRED"}
        ],error:null};
      }
      if(name==="list_schedule_generations"){
        if(s.mode==="empty")return {data:[],error:null};
        const status=s.revision==="2"?"PUBLISHED":"REVIEWED";
        return {data:[{id:"gen-qa",status,store_id:"store-a",week_start:args.p_week_start||"2026-09-28",algorithm_version:"MANAGER_DIRECT_V1"}],error:null};
      }
      if(name==="get_schedule_generation_assignments")return {data:[],error:null};
      if(name==="get_manager_weekly_schedule")return {data:[],error:null};
      if(name==="list_shift_swap_requests_v1"){
        if(s.mode==="error")return {data:null,error:{message:"SWAP_READER_QA_ERROR"}};
        if(s.mode==="empty"||s.revision==="2")return {data:[],error:null};
        return {data:[{id:"swap-1",status:"PEER_ACCEPTED",requester_name:"An",target_user_name:"Bình",requester_date:"2026-09-28",requester_start:"08:00",requester_end:"12:00",target_start:"12:00",target_end:"17:00",store_code:"CN-QA-A"}],error:null};
      }
      if(name==="list_shift_give_requests_v1"){
        if(s.mode==="error")return {data:null,error:{message:"GIVE_READER_QA_ERROR"}};
        if(s.mode==="empty"||s.revision==="2")return {data:[],error:null};
        return {data:[{id:"give-1",status:"PENDING_MANAGER",giver_name:"An",recipient_name:"Chi",work_date:"2026-09-29",start_time:"08:00",end_time:"12:00",store_code:"CN-QA-A"}],error:null};
      }
      if(name==="list_manager_attendance_review_v1"){
        if(s.mode==="error")return {data:null,error:{message:"ATTENDANCE_READER_QA_ERROR"}};
        if(s.mode==="empty"||s.revision==="2")return {data:[],error:null};
        return {data:[{attendance_id:"att-1",schedule_id:"sch-1",employee_name:"An",work_date:"2026-09-28",store_code:"CN-QA-A",planned_start:"08:00",planned_end:"12:00",actual_start:"08:05",actual_end:"12:04",status:"NEEDS_REVIEW"}],error:null};
      }
      if(name==="list_employee_profile_projection_v1")return {data:[{employee_id:"u-1",username:"an",full_name:"An",phone:"0900000000",employee_role:"STAFF",profile_status:"ACTIVE",join_date:null,primary_store_id:"store-a",primary_store_code:"CN-QA-A",primary_store_name:"MAGASIN QA A",employee_level:null}],error:null};
      if(name==="list_scoped_payroll_self_check_v1")return {data:[],error:null};
      return {data:null,error:{message:"UI2_011_UNEXPECTED_RPC:"+name}};
    }
  };
  window.__UI2_011_CALLS=calls;
  window.__UI2_011_API=api;
});

const page=await context.newPage();
page.on("pageerror",e=>report.page_errors.push(String(e?.stack||e?.message||e)));
page.on("console",m=>{if(m.type()==="error")report.console_errors.push(m.text())});
page.on("requestfailed",r=>report.request_failures.push(r.method()+" "+r.url()+" "+(r.failure()?.errorText||"")));
page.on("response",r=>{if(r.status()>=500)report.http_errors.push(r.status()+" "+r.url())});

function shellFrame(){
  return page.frameLocator("#app").frameLocator("#app");
}
async function waitReady(){
  const f=shellFrame();
  await f.locator("#magasinUiV2Shell").waitFor({state:"attached",timeout:15000});
  await f.locator('body[data-manager-ui2-shell="operations"]').waitFor({state:"attached",timeout:15000});
  await f.locator('#view-dashboard[data-manager-today-state="ready"]').waitFor({timeout:15000});
  return f;
}
async function metrics(width){
  const f=shellFrame();
  const focus=f.locator('[data-manager-today-refresh]');
  await focus.focus();await focus.press("Tab");await f.locator(":focus").press("Shift+Tab");
  return f.locator("body").evaluate((body,expected)=>{
    const doc=body.ownerDocument,html=doc.documentElement,win=doc.defaultView;
    const sidebar=doc.querySelector(".m-shell-v2-sidebar"),menu=doc.querySelector("[data-shell-menu]");
    const nav=[...doc.querySelectorAll(".m-shell-v2-nav__item[data-shell-key]")];
    const today=doc.querySelector("#view-dashboard");
    const controls=[...today.querySelectorAll("button")].filter(x=>{const r=x.getBoundingClientRect(),s=getComputedStyle(x);return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0});
    const focused=doc.activeElement;
    const minTarget=controls.length?Math.min(...controls.map(x=>Math.min(x.getBoundingClientRect().width,x.getBoundingClientRect().height))):0;
    const state={
      viewport:win.innerWidth,expected,
      scrollWidth:html.scrollWidth,clientWidth:html.clientWidth,
      sidebarWidth:sidebar?.getBoundingClientRect().width||0,
      sidebarTransform:sidebar?getComputedStyle(sidebar).transform:"",
      menuDisplay:menu?getComputedStyle(menu).display:"",
      menuSize:menu?{w:menu.getBoundingClientRect().width,h:menu.getBoundingClientRect().height}:null,
      nav:nav.map(x=>x.dataset.shellKey),
      navMin:nav.length?Math.min(...nav.map(x=>x.getBoundingClientRect().height)):0,
      minTarget,
      focusOutline:focused?getComputedStyle(focused).outlineStyle:"none"
    };
    if(state.viewport!==expected||state.scrollWidth>state.clientWidth+1||state.nav.length!==7||state.minTarget<(expected<=600?43.5:39.5)||state.focusOutline==="none")throw new Error(JSON.stringify(state));
    return state;
  },width);
}

await page.setViewportSize({width:1280,height:900});
await page.goto(BASE+"/05_MANAGER/#dashboard",{waitUntil:"networkidle",timeout:30000});
let f=await waitReady();

await check("ui2_011_action_center_uses_canonical_reader_state_only",async()=>{
  const state=await f.locator("#view-dashboard").evaluate(root=>({
    state:root.dataset.managerTodayState,
    text:root.innerText,
    cards:[...root.querySelectorAll("[data-manager-action-source]")].map(x=>({source:x.dataset.managerActionSource,connected:x.dataset.connected,text:x.innerText}))
  }));
  ensure(state.state==="ready",JSON.stringify(state));
  ensure(state.text.includes("2 đổi ca")||state.text.includes("1 đổi ca · 1 cho ca"),state.text);
  ensure(state.text.includes("1 bản ghi raw attendance"),state.text);
  ensure(state.text.includes("Lịch đã review")||state.text.includes("sẵn sàng phát hành"),state.text);
  for(const fake of ["49,2tr","2.410","4,7 / 5","18 nhân sự","3 nhân viên chưa đăng ký"])ensure(!state.text.includes(fake),"fake metric "+fake);
  return JSON.stringify(state.cards);
});

for(const width of [1280,768,390]){
  await page.setViewportSize({width,height:900});
  f=shellFrame();
  await f.locator("#magasinUiV2Shell").waitFor({state:"attached"});
  const m=await metrics(width);
  await check("ui2_011_"+width+"_shell_today_accessibility",async()=>{
    if(width>=720)ensure(m.sidebarWidth>=220&&m.menuDisplay==="none"&&m.sidebarTransform==="none",JSON.stringify(m));
    if(width===390){
      ensure(m.menuSize.w>=43.5&&m.menuSize.h>=43.5&&m.navMin>=43.5,JSON.stringify(m));
      const menu=f.locator("[data-shell-menu]");await menu.click();
      await f.locator('body[data-shell-drawer-open="true"]').waitFor();
      const drawer=await f.locator(".m-shell-v2-sidebar").evaluate(el=>({w:el.getBoundingClientRect().width,viewport:el.ownerDocument.defaultView.innerWidth}));
      ensure(drawer.w<=drawer.viewport*.89,JSON.stringify(drawer));
      await f.locator("body").press("Escape");
    }
    return JSON.stringify(m);
  });
  const shot=path.join(SHOTS,`manager-today-${width}.png`);
  await page.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
}

await page.setViewportSize({width:390,height:900});
f=shellFrame();
await check("ui2_011_loading_error_empty_not_connected_states",async()=>{
  await f.locator("#view-dashboard.active").waitFor();
  await f.locator("body").evaluate(()=>localStorage.setItem("ui2_011_mode","delay"));
  await f.locator("body").evaluate(()=>{void window.MAGASIN_MANAGER_TODAY_V2.refresh()});
  await f.locator('#view-dashboard[data-manager-today-state="loading"]').waitFor({timeout:3000});
  await f.locator('#view-dashboard[data-manager-today-state="ready"]').waitFor({timeout:10000});

  await f.locator("body").evaluate(()=>localStorage.setItem("ui2_011_mode","error"));
  await f.locator("body").evaluate(()=>window.MAGASIN_MANAGER_TODAY_V2.refresh());
  await f.locator('#view-dashboard[data-manager-today-state="error"] [data-manager-today-status][data-state="error"]').waitFor({timeout:10000});
  const errorText=await f.locator("[data-manager-today-status]").innerText();

  await f.locator("body").evaluate(()=>localStorage.setItem("ui2_011_mode","empty"));
  await f.locator("body").evaluate(()=>window.MAGASIN_MANAGER_TODAY_V2.refresh());
  await f.locator('#view-dashboard[data-manager-today-state="ready"]').waitFor({timeout:10000});
  const emptyText=await f.locator("[data-manager-action-list]").innerText();
  ensure(emptyText.includes("Không có yêu cầu Swap/Give")&&emptyText.includes("Không có attendance"),emptyText);

  await f.locator("body").evaluate(()=>{
    delete window.MAGASIN_MANAGER_SHIFT_CHANGE;
    delete window.MAGASIN_MANAGER_ATTENDANCE_REVIEW;
    delete window.MAGASIN_MANAGER_SCHEDULE_DRAFT;
    return window.MAGASIN_MANAGER_TODAY_V2.refresh();
  });
  await f.locator('#view-dashboard[data-manager-today-state="not-connected"] [data-manager-today-status][data-state="not-connected"]').waitFor({timeout:10000});
  const nc=await f.locator("[data-manager-today-status]").innerText();
  ensure(nc.includes("NOT_CONNECTED"),nc);
  return JSON.stringify({error:errorText,empty:emptyText,notConnected:nc});
});

await check("ui2_011_today_actions_delegate_without_writer_calls",async()=>{
  await shellFrame().locator("body").evaluate(()=>{
    localStorage.setItem("ui2_011_mode","ready");
    localStorage.setItem("ui2_011_revision","1");
  });
  await page.reload({waitUntil:"networkidle",timeout:30000});
  f=await waitReady();
  const before=await f.locator("body").evaluate(()=>window.__UI2_011_CALLS.filter(x=>x.kind==="rpc").map(x=>x.name));
  await f.locator('[data-manager-action-source="swap"]').click();
  await f.locator("#view-swap.active").waitFor({timeout:10000});
  const after=await f.locator("body").evaluate(()=>window.__UI2_011_CALLS.filter(x=>x.kind==="rpc").map(x=>x.name));
  const writers=["approve_shift_swap","reject_shift_swap","approve_shift_give","reject_shift_give","review_attendance_v1","publish_schedule_generation","review_schedule_generation","replace_schedule_generation_assignments"];
  const newCalls=after.slice(before.length);
  ensure(!newCalls.some(x=>writers.includes(x)),JSON.stringify(newCalls));
  return "Action Center click opened existing Swap/Give module; writer RPC calls=0";
});

await check("ui2_011_route_back_forward_reload_reconciles_today_truth",async()=>{
  await page.setViewportSize({width:1280,height:900});
  f=shellFrame();
  await f.locator(".m-shell-v2-sidebar").waitFor({state:"visible",timeout:10000});
  await f.locator('.m-shell-v2-nav__item[data-shell-key="workforce"]').click();
  await page.waitForURL(/\/05_MANAGER\/Workforce\/$/,{timeout:10000});
  await f.locator("#view-workforce.active").waitFor();

  await f.locator('.m-shell-v2-nav__item[data-shell-key="attendance"]').click();
  await page.waitForURL(/\/05_MANAGER\/Cham-cong\/$/,{timeout:10000});
  await f.locator("#view-attendance.active").waitFor();

  await page.goBack({waitUntil:"domcontentloaded"});
  await page.waitForURL(/\/05_MANAGER\/Workforce\/$/,{timeout:10000});
  f=shellFrame();await f.locator("#view-workforce.active").waitFor({timeout:10000});

  await page.goForward({waitUntil:"domcontentloaded"});
  await page.waitForURL(/\/05_MANAGER\/Cham-cong\/$/,{timeout:10000});
  f=shellFrame();await f.locator("#view-attendance.active").waitFor({timeout:10000});

  await f.locator("body").evaluate(()=>localStorage.setItem("ui2_011_mode","ready"));
  await page.goto(BASE+"/05_MANAGER/#dashboard",{waitUntil:"networkidle",timeout:30000});
  f=await waitReady();
  const before=await f.locator("[data-manager-today-summary]").innerText();
  await f.locator("body").evaluate(()=>localStorage.setItem("ui2_011_revision","2"));
  await page.reload({waitUntil:"networkidle",timeout:30000});
  f=await waitReady();
  const after=await f.locator("[data-manager-today-summary]").innerText();
  const scheduleText=await f.locator('[data-manager-action-source="workforce"]').innerText();
  ensure(before!==after&&after.includes("Không có ngoại lệ")&&scheduleText.includes("ĐÃ PHÁT HÀNH"),JSON.stringify({before,after,scheduleText}));
  return JSON.stringify({before,after,scheduleText,url:page.url()});
});

await check("ui2_011_rpc_and_direct_table_diagnostics",async()=>{
  const evidence=await f.locator("body").evaluate(()=>({
    rpc:window.__UI2_011_CALLS.filter(x=>x.kind==="rpc").map(x=>({name:x.name,args:x.args})),
    from:window.__UI2_011_CALLS.filter(x=>x.kind==="from").map(x=>x.name)
  }));
  const allowed=new Set([
    "get_manager_accessible_stores","get_manager_weekly_availability","list_schedule_generations",
    "get_schedule_generation_assignments","get_manager_weekly_schedule",
    "list_shift_swap_requests_v1","list_shift_give_requests_v1",
    "list_manager_attendance_review_v1","list_employee_profile_projection_v1","list_scoped_payroll_self_check_v1",
    "current_user_role"
  ]);
  const unexpected=evidence.rpc.filter(x=>!allowed.has(x.name));
  ensure(!unexpected.length,JSON.stringify(unexpected));
  const protectedNew=evidence.from.filter(x=>x!=="profiles");
  ensure(!protectedNew.length,JSON.stringify(evidence.from));
  return "Today/browser observed existing reader RPCs only; no new direct-table path (legacy profiles read unchanged)";
});

await check("ui2_011_browser_diagnostics",async()=>{
  const relevantRequests=report.request_failures.filter(x=>!x.includes("net::ERR_ABORTED"));
  if(report.page_errors.length||report.console_errors.length||relevantRequests.length||report.http_errors.length)throw new Error(JSON.stringify({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:relevantRequests,http_errors:report.http_errors}));
  return "0 page/console/relevant-request/5xx errors";
});

await browser.close();
fs.writeFileSync(path.join(OUT,"ui2-011-manager-shell-today-report.json"),JSON.stringify(report,null,2));
console.log("UI2_011_MANAGER_SHELL_TODAY_BROWSER="+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=="PASS")process.exitCode=1;
