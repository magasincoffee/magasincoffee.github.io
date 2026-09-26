import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8767";
const OUT=process.env.QA_OUT||"qa-artifacts/people-shift";
fs.mkdirSync(OUT,{recursive:true});
const report={generated_at:new Date().toISOString(),status:"PASS",checks:[],page_errors:[],console_errors:[],request_failures:[],http_errors:[],screenshots:[]};
async function check(name,fn){try{report.checks.push({name,status:"PASS",detail:String(await fn()??"")})}catch(e){report.checks.push({name,status:"FAIL",detail:String(e?.stack||e)});report.status="FAIL"}}
const browser=await chromium.launch({headless:true});
const widths=[360,390,430];

async function surfaceMetrics(f,viewSelector,focusSelector,width){
  const focus=f.locator(focusSelector);await focus.focus();
  return f.locator(viewSelector).evaluate((view,expectedWidth)=>{
    const doc=view.ownerDocument,html=doc.documentElement,win=doc.defaultView,nav=doc.getElementById('employeeV2PrimaryNav');
    const controls=[...view.querySelectorAll('button,input,select,textarea')].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0});
    const focused=doc.activeElement;
    win.scrollTo(0,html.scrollHeight);
    const visible=[...view.querySelectorAll('button,input,select,textarea,.employee-attendance-history,.employee-payroll-entry,.security-link-panel')].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0});
    const last=visible.at(-1)||view,lastRect=last.getBoundingClientRect(),navRect=nav?.getBoundingClientRect();
    return {
      viewport:win.innerWidth,expectedWidth,scrollWidth:html.scrollWidth,clientWidth:html.clientWidth,
      minTarget:controls.length?Math.min(...controls.map(el=>el.getBoundingClientRect().height)):0,
      focusOutline:focused?getComputedStyle(focused).outlineStyle:'none',
      collision:navRect?lastRect.bottom>navRect.top+1:false,
      navTop:navRect?.top??null,lastBottom:lastRect.bottom
    };
  },width);
}
function validateMetrics(m){if(m.viewport!==m.expectedWidth||m.scrollWidth>m.clientWidth+1||m.minTarget<43.5||m.focusOutline==='none'||m.collision)throw new Error(JSON.stringify(m));return JSON.stringify(m)}

for(const width of widths){
  const context=await browser.newContext({locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh'});
  const page=await context.newPage();await page.setViewportSize({width,height:900});
  page.on('pageerror',e=>report.page_errors.push(width+': '+String(e?.stack||e?.message||e)));
  page.on('console',m=>{if(m.type()==='error')report.console_errors.push(width+': '+m.text())});
  page.on('requestfailed',r=>report.request_failures.push(width+': '+r.method()+' '+r.url()+' '+(r.failure()?.errorText||'')));
  page.on('response',r=>{if(r.status()>=500)report.http_errors.push(width+': '+r.status()+' '+r.url())});
  await page.goto(BASE+'/09_QA/people-shift/ui2-009-employee-people-fixture.html#attendance',{waitUntil:'networkidle',timeout:20000});
  let f=page.frameLocator('#employeeApp');
  await f.locator('#view-attendance.active .employee-attendance-v1').waitFor({timeout:10000});
  await f.locator('#employeeAttendanceSchedule').waitFor({timeout:10000});

  await check("ui2_009_attendance_"+width+"_phone_contract",async()=>{
    const m=await surfaceMetrics(f,'#view-attendance','#employeeAttendanceSubmit',width);validateMetrics(m);
    const text=await f.locator('#view-attendance').innerText();
    const legacyVisible=await f.locator('.legacy-attendance-report').isVisible().catch(()=>false);
    if(legacyVisible||/Tổng tiền nhận|0đ\s*\/\s*giờ/.test(text)||!text.includes('không phải payroll truth')||!text.includes('Cần quản lý xem xét'))throw new Error(text);
    return JSON.stringify({...m,legacyVisible});
  });
  const attendanceShot=path.join(OUT,"ui2-009-attendance-"+width+".png");await f.locator('#view-attendance').screenshot({path:attendanceShot});report.screenshots.push(attendanceShot);

  await f.locator('[data-employee-primary-view="payroll"]').click();
  await f.locator('#view-payroll.active').waitFor({timeout:10000});
  await f.locator('#employeePayrollRoot').filter({hasText:'Đã chốt'}).waitFor({timeout:10000});
  await check("ui2_009_payroll_"+width+"_phone_contract",async()=>{
    const m=await surfaceMetrics(f,'#view-payroll','#employeePayrollRefresh',width);validateMetrics(m);
    const text=await f.locator('#view-payroll').innerText();
    if(!text.includes('Ước tính')||!text.includes('Đã chốt')||!text.includes('Số tiền chưa hiển thị')||/\d[\d.,]*\s*(?:đ|₫|VND)(?:\s|$)/i.test(text))throw new Error(text);
    return JSON.stringify(m);
  });
  const payrollShot=path.join(OUT,"ui2-009-payroll-"+width+".png");await f.locator('#view-payroll').screenshot({path:payrollShot});report.screenshots.push(payrollShot);

  await f.locator('[data-employee-primary-view="profile"]').click();
  await f.locator('#view-profile.active').waitFor({timeout:10000});
  await f.locator('#profileFullName').evaluate(el=>new Promise((resolve,reject)=>{const end=Date.now()+5000;(function poll(){if(el.value==='Nguyễn An')return resolve();if(Date.now()>end)return reject(new Error('profile not ready'));setTimeout(poll,25)})()}));
  await check("ui2_009_profile_"+width+"_phone_contract",async()=>{
    const m=await surfaceMetrics(f,'#view-profile','.security-link-panel button',width);validateMetrics(m);
    const text=await f.locator('#view-profile').innerText();
    if(/email|access_scope|hourly_rate|pay_rule_reference/i.test(text)||!text.includes('projection chỉ đọc')||!text.includes('Bảo mật tài khoản'))throw new Error(text);
    return JSON.stringify(m);
  });
  const profileShot=path.join(OUT,"ui2-009-profile-"+width+".png");await f.locator('#view-profile').screenshot({path:profileShot});report.screenshots.push(profileShot);

  if(width===390){
    await check('ui2_009_state_matrix_error_retry_stale_owner',async()=>{
      await f.locator('[data-employee-primary-view="payroll"]').click();await f.locator('#view-payroll.active').waitFor();
      await page.evaluate(()=>{globalThis.__UI2_009_QA.failPayroll(true);return globalThis.MAGASIN_EMPLOYEE.payrollSelfCheck.refresh()});
      await f.locator('#view-payroll[data-payroll-ui-state="error"] [data-payroll-retry]').waitFor({timeout:10000});
      await page.evaluate(()=>globalThis.__UI2_009_QA.failPayroll(false));await f.locator('[data-payroll-retry]').click();await f.locator('#view-payroll[data-payroll-ui-state="ready"]').waitFor();
      await f.locator('[data-employee-primary-view="profile"]').click();await f.locator('#view-profile.active').waitFor();
      await page.evaluate(()=>{globalThis.__UI2_009_QA.failProfile(true);return globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh()});
      await f.locator('#profileProjectionState').filter({hasText:'PROFILE_QA_ERROR'}).waitFor();
      if((await f.locator('#profileFullName').inputValue())!=='—')throw new Error('profile stale');
      await page.evaluate(()=>{globalThis.__UI2_009_QA.failProfile(false);return globalThis.MAGASIN_EMPLOYEE.profileProjection.refresh()});
      await f.locator('#profileFullName').evaluate(el=>new Promise((resolve,reject)=>{const end=Date.now()+5000;(function poll(){if(el.value==='Nguyễn An')return resolve();if(Date.now()>end)return reject(new Error('profile did not recover'));setTimeout(poll,25)})()}));
      await f.locator('[data-employee-primary-view="attendance"]').click();await f.locator('#view-attendance.active').waitFor();
      await page.evaluate(()=>{globalThis.__UI2_009_QA.restoreOwned();globalThis.__UI2_009_QA.resetAttendance();return globalThis.MAGASIN_EMPLOYEE.attendance.refresh()});
      await f.locator('#employeeAttendanceStart').waitFor();
      await f.locator('#employeeAttendanceStart').fill('08:05');await f.locator('#employeeAttendanceEnd').fill('12:05');await page.evaluate(()=>globalThis.__UI2_009_QA.transferAway());await f.locator('#employeeAttendanceSubmit').click();
      await f.locator('#employeeAttendanceMessage').filter({hasText:'Ca này đã được chuyển cho người khác'}).waitFor({timeout:10000});
      await f.locator('[data-attendance-empty="1"]').waitFor();
      return 'Payroll retry recovers; Profile fails closed and recovers; Attendance stale ownership reconciles to server truth';
    });

    await check('ui2_009_direct_route_back_reload_refreshes_canonical_truth',async()=>{
      await page.evaluate(()=>globalThis.__UI2_009_QA.restoreOwned());
      await f.locator('[data-employee-primary-view="payroll"]').click();await f.locator('#view-payroll.active').waitFor();
      await f.locator('[data-employee-primary-view="profile"]').click();await f.locator('#view-profile.active').waitFor();
      if(!page.url().endsWith('#profile'))throw new Error(page.url());
      await page.goBack();f=page.frameLocator('#employeeApp');await f.locator('#view-payroll.active').waitFor({timeout:10000});
      await page.evaluate(()=>globalThis.__UI2_009_QA.setProfileName('Nguyễn An · Canonical R2'));
      await f.locator('[data-employee-primary-view="profile"]').click();await f.locator('#view-profile.active').waitFor();
      await page.reload({waitUntil:'networkidle',timeout:20000});f=page.frameLocator('#employeeApp');
      await f.locator('#view-profile.active').waitFor({timeout:10000});
      await f.locator('#profileFullName').evaluate(el=>new Promise((resolve,reject)=>{const end=Date.now()+5000;(function poll(){if(el.value==='Nguyễn An · Canonical R2')return resolve();if(Date.now()>end)return reject(new Error('reload stayed stale: '+el.value));setTimeout(poll,25)})()}));
      return 'hash back returns Payroll; direct #profile reload re-reads canonical mock value R2';
    });
  }

  await check("ui2_009_"+width+"_rpc_only_diagnostics",async()=>{
    const s=await page.evaluate(()=>({calls:globalThis.__UI2_009_QA.calls,direct:globalThis.__UI2_009_QA.directTableCalls()}));
    if(s.direct.length)throw new Error(JSON.stringify(s.direct));
    const allowed=new Set(['list_my_approved_schedules_v2','get_my_attendance_v2','submit_manual_time_attendance_v1','get_my_payroll_self_check_v1','get_my_employee_profile_v1']);
    const unexpected=s.calls.filter(x=>x.kind==='rpc'&&!allowed.has(x.name));if(unexpected.length)throw new Error(JSON.stringify(unexpected));
    return '0 direct table calls; only preserved Attendance/Payroll/Profile RPC inventory observed';
  });
  await context.close();
}

await check('browser_diagnostics',async()=>{
  if(report.page_errors.length||report.console_errors.length||report.request_failures.length||report.http_errors.length)throw new Error(JSON.stringify({page_errors:report.page_errors,console_errors:report.console_errors,request_failures:report.request_failures,http_errors:report.http_errors}));
  return '0 page/console/request/5xx errors';
});
await browser.close();
fs.writeFileSync(path.join(OUT,'ui2-009-employee-people-report.json'),JSON.stringify(report,null,2));
console.log('UI2_009_EMPLOYEE_PEOPLE_BROWSER='+report.status);
for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);
if(report.status!=='PASS')process.exitCode=1;
