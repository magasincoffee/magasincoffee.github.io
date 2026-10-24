// #487 browser→signed JWT PostgREST→real PostgreSQL, isolated Actions runner.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {chromium} from 'playwright';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:8767';
const host=process.env.QA_POSTGREST_URL||'http://127.0.0.1:3000';
const secret=process.env.QA_JWT_SECRET;
assert.ok(secret?.length>=32,'disposable QA signing secret required');
const U={staff:'90000000-0000-4000-8000-000000000007',manager:'90000000-0000-4000-8000-000000000001',owner:'90000000-0000-4000-8000-000000000005',other:'90000000-0000-4000-8000-000000000006'};
const sid=n=>'93000000-0000-4000-8000-'+String(n).padStart(12,'0');
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function jwt(user){const now=Math.floor(Date.now()/1000);const s=enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:user,role:'authenticated',iat:now,exp:now+900});return s+'.'+createHmac('sha256',secret).update(s).digest('base64url')}
async function rpc(user,name,args={}){
 const allowed=new Set(['list_my_approved_schedules_v2','get_my_attendance_v2','submit_manual_time_attendance_v1','list_manager_attendance_review_v1']);
 if(!allowed.has(name))throw Error('QA_RPC_NOT_ALLOWLISTED:'+name);
 const response=await fetch(host+'/rpc/'+name,{method:'POST',headers:{authorization:'Bearer '+jwt(user),'content-type':'application/json',accept:'application/json'},body:JSON.stringify(args)});
 const t=await response.text();let data;try{data=JSON.parse(t)}catch{data=t}
 return response.ok?{data,error:null}:{data:null,error:{message:typeof data==='object'?data.message:String(data),code:data.code,status:response.status}};
}
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.exposeFunction('qaSignedAttendanceRpc',async(name,args)=>rpc(U.staff,name,args));
 await page.goto(base+'/09_QA/people-shift/ui2-009-employee-people-fixture.html#attendance',{waitUntil:'networkidle',timeout:30000});
 await page.evaluate(()=>{
  const core=window.MAGASIN_CORE;if(!core?.supabase)throw Error('EMPLOYEE_CORE_NOT_READY');
  core.supabase.rpc=(name,args)=>window.qaSignedAttendanceRpc(name,args);
 });
 const localDate=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Ho_Chi_Minh'}));
 localDate.setDate(localDate.getDate()-2);const wd=localDate.getDay()||7;localDate.setDate(localDate.getDate()-(wd-1));
 const monday=localDate.getFullYear()+'-'+String(localDate.getMonth()+1).padStart(2,'0')+'-'+String(localDate.getDate()).padStart(2,'0');
 // Ensure no synthetic fixture data is being displayed, only real isolated RPC projection.
 assert.equal(await page.evaluate(async ({id,week})=>window.MAGASIN_EMPLOYEE.attendance.openSchedule(id,week),{id:sid(1),week:monday}),true,'signed Employee approved schedule must be rendered');
 const f=page.frameLocator('#employeeApp');
 await f.locator('#employeeAttendanceStart').fill('06:00');
 await f.locator('#employeeAttendanceEnd').fill('10:00');
 await f.locator('#employeeAttendanceSubmit').click();
 await f.locator('.attendance-status').filter({hasText:'Đã xác nhận tự động'}).waitFor({timeout:12000});
 const auto=await f.locator('.attendance-status').innerText();
 assert.match(auto,/Đã xác nhận tự động/);
 console.log('QA_BROWSER_EMPLOYEE_EXACT_AUTO=PASS '+auto.replace(/\s+/g,' '));

 assert.equal(await page.evaluate(async ({id,week})=>window.MAGASIN_EMPLOYEE.attendance.openSchedule(id,week),{id:sid(2),week:monday}),true);
 await f.locator('#employeeAttendanceStart').fill('06:30');
 await f.locator('#employeeAttendanceEnd').fill('10:00');
 await f.locator('#employeeAttendanceSubmit').click();
 await f.locator('.attendance-status').filter({hasText:'Cần quản lý xem xét'}).waitFor({timeout:12000});
 console.log('QA_BROWSER_EMPLOYEE_MISMATCH_PENDING=PASS');

 const store='91000000-0000-4000-8000-000000000003';
 const args={p_store_id:store,p_from_date:null,p_to_date:null};
 const manager=await rpc(U.manager,'list_manager_attendance_review_v1',args);
 const owner=await rpc(U.owner,'list_manager_attendance_review_v1',args);
 assert.ifError(manager.error);assert.ifError(owner.error);
 assert.equal(manager.data.length,2);assert.equal(owner.data.length,2);
 assert.equal(manager.data.filter(x=>x.status==='AUTO_CONFIRMED').length,1);
 assert.equal(manager.data.filter(x=>x.status==='NEEDS_REVIEW').length,1);
 const invalid=await rpc(U.other,'list_manager_attendance_review_v1',args);
 assert.match(invalid.error?.message||'',/STORE_NOT_ALLOWED/);
 console.log('QA_BROWSER_MANAGER_OWNER_SIGNED_CROSS_ROLE=PASS');
 const doc=await f.locator('#view-attendance').evaluate(x=>({bodyWidth:x.ownerDocument.documentElement.clientWidth,scrollWidth:x.ownerDocument.documentElement.scrollWidth}));
 assert.ok(doc.scrollWidth<=doc.bodyWidth+1,JSON.stringify(doc));
 assert.deepEqual(errors,[],'browser JS errors');
 console.log('WORKFORCE_487_BROWSER_SIGNED_ATTENDANCE=PASS');
}finally{await browser.close();}
