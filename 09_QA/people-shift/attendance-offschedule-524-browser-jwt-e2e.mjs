// Real Employee and Manager production UI modules against disposable signed JWT PostgREST.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {chromium} from 'playwright';
const web=process.env.QA_BASE_URL||'http://127.0.0.1:8767',api=process.env.QA_POSTGREST_URL||'http://127.0.0.1:3000';
const secret=process.env.QA_JWT_SECRET;
assert.ok(secret?.length>=32);
const user={employee:'90000000-0000-4000-8000-000000000007',manager:'90000000-0000-4000-8000-000000000008',owner:'90000000-0000-4000-8000-000000000010'};
const store='91000000-0000-4000-8000-000000000003';
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const jwt=sub=>{const now=Math.floor(Date.now()/1000),s=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub,role:'authenticated',iat:now,exp:now+900});return s+'.'+createHmac('sha256',secret).update(s).digest('base64url')};
async function rpc(actor,name,args={}){
 const allow=new Set(['list_my_approved_schedules_v2','get_my_attendance_v2','list_my_offschedule_stores_v1',
 'list_my_offschedule_attendance_requests_v1','submit_offschedule_attendance_request_v1',
 'list_manager_attendance_review_v1','list_manager_offschedule_attendance_requests_v1',
 'review_offschedule_attendance_request_v1','list_owner_offschedule_attendance_requests_v1']);
 if(!allow.has(name))throw Error('RPC_NOT_ALLOWLISTED '+name);
 const r=await fetch(api+'/rpc/'+name,{method:'POST',headers:{authorization:'Bearer '+jwt(actor),'content-type':'application/json'},body:JSON.stringify(args)});
 const data=await r.json();return r.ok?{data,error:null}:{data:null,error:{code:data.code,message:data.message}};
}
const past=new Date(Date.now()-3*86400000).toISOString().slice(0,10);
const monday=date=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10)};
const week=monday(past);
const browserInstance=await chromium.launch({headless:true});
const errors=[];
try {
 const employee=await browserInstance.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Ho_Chi_Minh'});
 employee.on('pageerror',e=>errors.push('Employee '+e.message));
 await employee.exposeFunction('offQaEmployeeRpc',(name,args)=>rpc(user.employee,name,args));
 await employee.goto(web+'/09_QA/people-shift/ui2-009-employee-people-fixture.html#attendance',{waitUntil:'networkidle'});
 await employee.evaluate(()=>{window.MAGASIN_CORE.supabase.rpc=(n,args)=>window.offQaEmployeeRpc(n,args)});
 await employee.evaluate(async week=>window.MAGASIN_EMPLOYEE.attendance.openSchedule(null,week),week);
 const frame=employee.frameLocator('#employeeApp');
 await frame.locator('#employeeOffSubmit').waitFor({timeout:15000});
 await frame.locator('#employeeOffDate').fill(past);
 await frame.locator('#employeeOffStart').fill('16:00');
 await frame.locator('#employeeOffEnd').fill('17:00');
 await frame.locator('#employeeOffReason').fill('Nhân viên làm việc ngoài lịch');
 await frame.locator('#employeeOffSubmit').click();
 await frame.locator('#employeeAttendanceMessage').filter({hasText:'Đã gửi yêu cầu'}).waitFor({timeout:20000});
 assert.match(await frame.locator('[data-offschedule]').innerText(),/Cần quản lý xem xét/);
 console.log('QA_524_BROWSER_EMPLOYEE_PHONE=PASS');

 const manager=await browserInstance.newPage({viewport:{width:1280,height:800},timezoneId:'Asia/Ho_Chi_Minh'});
 manager.on('pageerror',e=>errors.push('Manager '+e.message));
 await manager.exposeFunction('offQaManagerRpc',(name,args)=>rpc(user.manager,name,args));
 await manager.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body><section id="view-attendance"></section></body></html>');
 await manager.evaluate(({store,week})=>{
  window.__MAGASIN_WORKFORCE_TODAY__=week;
  window.MAGASIN_MANAGER_WORKFORCE_CONTEXT={
   stores:async()=>[{id:store,code:'CN3',name:'QA CN3'}],
   client:()=>({rpc:(name,args)=>window.offQaManagerRpc(name,args)})
  };
 },{store,week});
 await manager.addScriptTag({url:web+'/05_MANAGER/Workforce/attendance-review-v1.js'});
 await manager.locator('[data-off-request] [data-off-review="APPROVE"]').waitFor({timeout:15000});
 await manager.locator('[data-off-request] [data-off-review="APPROVE"]').click();
 await manager.locator('[data-mar-offschedule]').filter({hasText:'Đã xử lý'}).waitFor({timeout:15000});
 assert.match(await manager.locator('[data-mar-offschedule]').innerText(),/Đã xác nhận/);
 console.log('QA_524_BROWSER_MANAGER_REAL_REVIEW=PASS');
 await employee.evaluate(()=>window.MAGASIN_EMPLOYEE.attendance.refresh());
 await frame.locator('[data-offschedule]').filter({hasText:'Đã xác nhận'}).waitFor({timeout:15000});
 console.log('QA_524_BROWSER_EMPLOYEE_SEES_APPROVAL=PASS');

 const owner=await browserInstance.newPage({viewport:{width:1024,height:768},timezoneId:'Asia/Ho_Chi_Minh'});
 owner.on('pageerror',e=>errors.push('Owner '+e.message));
 await owner.exposeFunction('offQaOwnerRpc',(name,args)=>rpc(user.owner,name,args));
 await owner.setContent('<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body><section id="view-workforce"><div class="row"><h2>Lịch</h2></div><div class="tabs"></div><div id="panel-publish"></div></section></body></html>');
 await owner.evaluate(({store,week})=>{
  const add=(s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
  window.MAGASIN_CORE={security:{escapeHtml:v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]))},
   date:{monday:()=>week,addDays:add,formatDate:s=>s}};
  window.MAGASIN_MANAGER_SCHEDULE_DRAFT={openDirect:async()=>{}};
  window.MAGASIN_MANAGER_WORKFORCE_CONTEXT={
   stores:async()=>[{id:store,code:'CN3',name:'QA CN3'}],
   client:()=>({rpc:(name,args)=>{
    if(name==='get_manager_weekly_availability'||name==='list_schedule_generations')return Promise.resolve({data:[],error:null});
    return window.offQaOwnerRpc(name,args)
   }})
  };
 },{store,week});
 await owner.addScriptTag({url:web+'/04_OWNER/Workforce/owner-scheduling-overview-v1.js'});
 await owner.waitForFunction(()=>window.MAGASIN_OWNER_SCHEDULING_OVERVIEW?.getState().offSupported===true,{timeout:15000});
 await owner.locator('[data-owner-offschedule-audit] summary').click();
 assert.match(await owner.locator('[data-owner-offschedule-audit]').innerText(),/APPROVED/);
 assert.deepEqual(errors,[]);
 console.log('QA_524_BROWSER_OWNER_READ_ONLY=PASS');
}finally{await browserInstance.close()}
