import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const BASE=process.env.QA_BASE_URL||'http://127.0.0.1:8772';
const OUT=process.env.QA_OUT||'qa-artifacts/xstore-019l';
fs.mkdirSync(OUT,{recursive:true});
const report={checks:[],errors:[],status:'PASS'};
const browser=await chromium.launch({headless:true});
async function test(name,fn){
 try{const detail=await fn();report.checks.push({name,status:'PASS',detail});console.log('[PASS] '+name+' — '+detail)}
 catch(e){report.status='FAIL';report.checks.push({name,status:'FAIL',error:String(e.message||e)});console.log('[FAIL] '+name+' — '+e.message)}
}
const e=await browser.newPage({viewport:{width:390,height:840},locale:'vi-VN'});
e.on('pageerror',x=>report.errors.push(String(x.message)));
await e.goto(BASE+'/09_QA/people-shift/employee-attendance-schedule-linked-fixture.html?reset=1');
const frame=e.frameLocator('#employeeApp');
await frame.locator('#employeeAttendanceSchedule').waitFor();
await test('published_shift_direct_server_clock_no_manager_review',async()=>{
 await e.evaluate(()=>{
  window.__MAGASIN_WORKFORCE_TODAY__='2026-09-18';
  const mock=window.__TASK099_QA;mock.restoreOwned();mock.resetAttendance();
  const rpc=window.MAGASIN_CORE.supabase.rpc.bind(window.MAGASIN_CORE.supabase);
  window.__LQA={outside:[],calls:[]};
  window.MAGASIN_CORE.supabase.rpc=async(name,args={})=>{
   window.__LQA.calls.push({name,args});
   if(name==='clock_in_for_schedule'){
    if(mock.state.attendance)return {error:{message:'SCHEDULE_ALREADY_ATTENDED'}};
    mock.state.attendance={id:'att-clock',schedule_id:args.p_schedule_id,user_id:mock.state.currentUser,status:'OPEN'};
    return {data:'att-clock',error:null};
   }
   if(name==='clock_out_attendance'){
    if(mock.state.attendance?.id!==args.p_attendance_id)return {error:{message:'ATTENDANCE_NOT_CURRENT_OWNER'}};
    mock.state.attendance.status='COMPLETED';return {data:{...mock.state.attendance},error:null};
   }
   if(name==='get_my_store_priority_profile_v1')return {data:[{priority_store_ids:['store-a'],priority_store_codes:['CN1']}],error:null};
   if(name==='list_my_outside_schedule_attendance_v1')return {data:window.__LQA.outside,error:null};
   if(name==='submit_outside_schedule_attendance_v1'){
    if(!['store-a'].includes(args.p_store_id))return {data:null,error:{message:'STORE_NOT_ELIGIBLE'}};
    const r={request_id:'request-1',store_id:'store-a',store_code:'CN1',work_date:args.p_work_date,actual_start:args.p_actual_start,actual_end:args.p_actual_end,status:'PENDING'};
    window.__LQA.outside.push(r);return {data:{request_id:'request-1',status:'PENDING',payroll_confirmed:false},error:null};
   }
   return rpc(name,args);
  };
  return window.MAGASIN_EMPLOYEE.attendance.refresh();
 });
 await frame.locator('#employeeClockAction[data-clock="IN"]').waitFor();
 await frame.locator('#employeeClockAction').click();
 await frame.locator('#employeeClockAction[data-clock="OUT"]').waitFor();
 await frame.locator('#employeeClockAction').click();
 await frame.locator('.employee-attendance-history-status').filter({hasText:'Đã chấm công ra'}).waitFor();
 const state=await e.evaluate(()=>({attendance:window.__TASK099_QA.state.attendance,calls:window.__LQA.calls.map(q=>q.name)}));
 if(state.attendance.status!=='COMPLETED'||state.calls.filter(x=>x==='clock_in_for_schedule').length!==1||state.calls.filter(x=>x==='clock_out_attendance').length!==1||state.calls.includes('submit_manual_time_attendance_v1'))throw Error(JSON.stringify(state));
 return 'OPEN→COMPLETED from server RPC; 0 manual approval RPC';
});
await test('outside_schedule_explicit_pending_request_no_payroll',async()=>{
 await e.evaluate(()=>{window.__TASK099_QA.transferAway();window.__TASK099_QA.resetAttendance();return window.MAGASIN_EMPLOYEE.attendance.refresh()});
 await frame.locator('[data-attendance-empty]').waitFor();
 await frame.locator('#employeeOutsideOpen').click();
 await frame.locator('#employeeOutsideStore').waitFor();
 await frame.locator('#employeeOutsideDate').fill('2026-09-18');
 await frame.locator('#employeeOutsideStart').fill('07:00');
 await frame.locator('#employeeOutsideEnd').fill('11:00');
 await frame.locator('#employeeOutsideSubmit').click();
 await frame.getByText('Chờ quản lý xác nhận').waitFor();
 const a=await e.evaluate(()=>({outside:window.__LQA.outside,calls:window.__LQA.calls.map(q=>q.name)}));
 if(a.outside.length!==1||a.outside[0].status!=='PENDING'||a.calls.some(x=>x==='review_outside_schedule_attendance_v1'))throw Error(JSON.stringify(a));
 return 'outside request PENDING; no automatic approval or payroll';
});
const m=await browser.newPage({viewport:{width:390,height:840},locale:'vi-VN'});
m.on('pageerror',x=>report.errors.push(String(x.message)));
await m.goto(BASE+'/09_QA/people-shift/manager-attendance-review-fixture.html');
await m.locator('#marOutsideOpen').waitFor();
await test('manager_outside_request_explicit_approval_only',async()=>{
 await m.evaluate(()=>{
  const api=window.MAGASIN_MANAGER_WORKFORCE_CONTEXT.client();const old=api.rpc.bind(api);
  const item={request_id:'request-manager',employee_id:'u-b',employee_name:'Nhân viên B',store_id:'store-a',work_date:'2026-09-22',actual_start:'06:00',actual_end:'10:00',note:'Ca bổ sung',status:'PENDING'};
  window.__LQA_MAN={item,calls:[]};
  api.rpc=async(name,args={})=>{
   window.__LQA_MAN.calls.push({name,args});
   if(name==='list_manager_outside_schedule_attendance_v1')return {data:[{...item}],error:null};
   if(name==='review_outside_schedule_attendance_v1'){
    if(item.status!=='PENDING')return {data:null,error:{message:'OUTSIDE_ALREADY_REVIEWED'}};
    item.status='APPROVED';return {data:{request_id:item.request_id,status:'APPROVED',payroll_confirmed:false},error:null};
   }
   return old(name,args);
  };
 });
 await m.locator('#marOutsideOpen').click();
 await m.locator('[data-outside-id="request-manager"]').waitFor();
 await m.locator('[data-outside-decision="APPROVE"]').click();
 await m.getByText('Đã xử lý · không tự tạo ca').waitFor();
 const a=await m.evaluate(()=>({item:window.__LQA_MAN.item,calls:window.__LQA_MAN.calls.filter(x=>x.name==='review_outside_schedule_attendance_v1')}));
 if(a.item.status!=='APPROVED'||a.calls.length!==1)throw Error(JSON.stringify(a));
 return 'one explicit manager APPROVE RPC; no schedule/payroll changes';
});
await test('browser_no_page_errors_and_no_table_writes',async()=>{
 const direct=await e.evaluate(()=>window.__TASK099_QA.calls.filter(c=>c.kind==='from').length);
 const mgr=await m.evaluate(()=>window.__ATT100_QA.calls.filter(c=>c.kind==='from').length);
 if(report.errors.length||direct||mgr)throw Error(JSON.stringify({errors:report.errors,direct,mgr}));
 return '0 JS errors, 0 direct table reads/writes';
});
await e.screenshot({path:path.join(OUT,'xstore-019l-employee-mobile.png'),fullPage:true}).catch(()=>{});
await m.screenshot({path:path.join(OUT,'xstore-019l-manager-mobile.png'),fullPage:true}).catch(()=>{});
await browser.close();
fs.writeFileSync(path.join(OUT,'xstore-019l-attendance-report.json'),JSON.stringify(report,null,2));
console.log('XSTORE_019L_ATTENDANCE_BROWSER='+report.status);
if(report.status!=='PASS')process.exitCode=1;
