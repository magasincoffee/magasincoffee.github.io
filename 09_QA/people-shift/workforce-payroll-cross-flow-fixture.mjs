import {buildPayrollEstimateBasisV1,validatePayrollTruthTransition} from "../../02_CORE/shared/workforce-operations-v1.mjs";

const calls=[];
const employeeId="u-a";
const manager={id:"mgr-a",role:"STORE_MANAGER",status:"ACTIVE",stores:new Set(["store-a"])};
const stores=[{id:"store-a",code:"CN-QA-A",name:"Cửa hàng QA A",status:"ACTIVE"}];
const schedules=[
 {schedule_id:"sch-1",user_id:employeeId,work_date:"2026-09-21",store_id:"store-a",store_code:"CN-QA-A",store_name:"Cửa hàng QA A",start_time:"06:00",end_time:"12:00",status:"APPROVED"},
 {schedule_id:"sch-2",user_id:employeeId,work_date:"2026-09-22",store_id:"store-a",store_code:"CN-QA-A",store_name:"Cửa hàng QA A",start_time:"12:00",end_time:"17:00",status:"APPROVED"},
 {schedule_id:"sch-3",user_id:employeeId,work_date:"2026-09-23",store_id:"store-a",store_code:"CN-QA-A",store_name:"Cửa hàng QA A",start_time:"06:00",end_time:"10:00",status:"APPROVED"},
 {schedule_id:"sch-4",user_id:employeeId,work_date:"2026-09-24",store_id:"store-a",store_code:"CN-QA-A",store_name:"Cửa hàng QA A",start_time:"10:00",end_time:"14:00",status:"APPROVED"}
];
const attendance=[];
const payrollEntries=[];
let reviewTransitions=0;
let payrollBuildCount=0;
let payrollStateTransitions=0;

const clone=v=>structuredClone(v);
const err=message=>({data:null,error:{message,code:message}});
const dateAdd=(s,n)=>{const d=new Date(s+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const minutes=v=>Number(String(v||"00:00").slice(0,2))*60+Number(String(v||"00:00").slice(3,5));
const schedule=id=>schedules.find(x=>x.schedule_id===id)||null;
const rowForSchedule=id=>attendance.find(x=>x.schedule_id===id)||null;
const managerAllowed=storeId=>manager.status==="ACTIVE"&&(manager.role==="OWNER"||(manager.role==="STORE_MANAGER"&&manager.stores.has(storeId)));

function listEmployeeAttendance(from,to){
 return attendance.filter(a=>(!from||a.work_date>=from)&&(!to||a.work_date<=to)).map(a=>({...a,attendance_id:a.id,store_code:"CN-QA-A",store_name:"Cửa hàng QA A"}));
}
function listManagerAttendance(args){
 if(!managerAllowed(args.p_store_id))return err("STORE_NOT_ALLOWED");
 return {data:attendance.filter(a=>a.store_id===args.p_store_id&&a.submission_status==="SUBMITTED"&&(!args.p_from_date||a.work_date>=args.p_from_date)&&(!args.p_to_date||a.work_date<=args.p_to_date)).map(a=>({...a,attendance_id:a.id,employee_id:a.user_id,employee_name:"Nhân viên QA A",store_code:"CN-QA-A",store_name:"Cửa hàng QA A"})),error:null};
}
function reviewAttendance(args){
 const a=attendance.find(x=>x.id===args.p_attendance_id);if(!a)return err("ATTENDANCE_REVIEW_NOT_FOUND");
 const s=schedule(a.schedule_id);if(!s)return err("ATTENDANCE_REVIEW_SCHEDULE_NOT_FOUND");
 if(!managerAllowed(a.store_id))return err("STORE_NOT_ALLOWED");
 if(s.status!=="APPROVED"||s.user_id!==a.user_id)return err("ATTENDANCE_NOT_CURRENT_OWNER");
 const d=String(args.p_decision||"").toUpperCase();
 if(["APPROVED","ADJUSTED","REJECTED"].includes(a.status)){
   const exact=(a.status==="APPROVED"&&d==="APPROVE"&&a.confirmed_start===a.actual_start&&a.confirmed_end===a.actual_end)||
     (a.status==="ADJUSTED"&&d==="ADJUST"&&a.confirmed_start===args.p_confirmed_start&&a.confirmed_end===args.p_confirmed_end)||
     (a.status==="REJECTED"&&d==="REJECT");
   if(!exact)return err("ATTENDANCE_ALREADY_REVIEWED");
   return {data:{attendance_id:a.id,status:a.status,review_decision:a.review_decision,confirmed_start:a.confirmed_start,confirmed_end:a.confirmed_end,confirmed_minutes:a.confirmed_minutes,already_reviewed:true},error:null};
 }
 if(!["NORMAL","NEEDS_REVIEW"].includes(a.status))return err("ATTENDANCE_REVIEW_STATE_NOT_ALLOWED");
 if(d==="REJECT"){
   Object.assign(a,{status:"REJECTED",reviewed_by:manager.id,reviewed_at:"2026-09-24T15:30:00Z",review_decision:"REJECT",confirmed_start:null,confirmed_end:null,confirmed_minutes:null});
 }else{
   const start=d==="APPROVE"?a.actual_start:args.p_confirmed_start;
   const end=d==="APPROVE"?a.actual_end:args.p_confirmed_end;
   if(d==="APPROVE"&&(args.p_confirmed_start||args.p_confirmed_end))return err("ATTENDANCE_APPROVE_USES_ACTUAL_TIME");
   if(d==="ADJUST"&&(!start||!end))return err("ATTENDANCE_ADJUST_CONFIRMED_TIME_REQUIRED");
   if(!["APPROVE","ADJUST"].includes(d))return err("ATTENDANCE_REVIEW_DECISION_INVALID");
   if(minutes(end)<=minutes(start))return err("ATTENDANCE_CONFIRMED_RANGE_INVALID");
   Object.assign(a,{status:d==="APPROVE"?"APPROVED":"ADJUSTED",reviewed_by:manager.id,reviewed_at:"2026-09-24T15:30:00Z",review_decision:d,confirmed_start:start,confirmed_end:end,confirmed_minutes:minutes(end)-minutes(start)});
 }
 reviewTransitions++;
 return {data:{attendance_id:a.id,status:a.status,review_decision:a.review_decision,confirmed_start:a.confirmed_start,confirmed_end:a.confirmed_end,confirmed_minutes:a.confirmed_minutes,already_reviewed:false},error:null};
}

async function employeeRpc(name,args={}){
 calls.push({actor:"EMPLOYEE",kind:"rpc",name,args:clone(args||{})});
 if(name==="list_my_approved_schedules_v2")return {data:schedules.filter(s=>s.user_id===employeeId&&s.status==="APPROVED"&&s.work_date>=args.p_week_start&&s.work_date<=dateAdd(args.p_week_start,6)).map(clone),error:null};
 if(name==="get_my_attendance_v2")return {data:listEmployeeAttendance(args.p_from_date,args.p_to_date),error:null};
 if(name==="submit_manual_time_attendance_v1"){
   const s=schedule(args.p_schedule_id);if(!s)return err("ATTENDANCE_SCHEDULE_NOT_FOUND");
   if(s.user_id!==employeeId)return err("ATTENDANCE_NOT_CURRENT_OWNER");
   const old=rowForSchedule(s.schedule_id);
   if(old){
     if(old.actual_start===args.p_actual_start&&old.actual_end===args.p_actual_end)return {data:{attendance_id:old.id,schedule_id:s.schedule_id,status:old.status,submission_status:"SUBMITTED",already_submitted:true},error:null};
     return err("ATTENDANCE_ACTIVE_SUBMISSION_EXISTS");
   }
   const a={id:"att-"+(attendance.length+1),schedule_id:s.schedule_id,user_id:employeeId,work_date:s.work_date,store_id:s.store_id,planned_start:s.start_time,planned_end:s.end_time,actual_start:args.p_actual_start,actual_end:args.p_actual_end,submitted_at:"2026-09-24T15:20:00Z",submission_status:"SUBMITTED",status:"NEEDS_REVIEW",note:args.p_note||null,reviewed_by:null,reviewed_at:null,review_decision:null,confirmed_start:null,confirmed_end:null,confirmed_minutes:null};
   attendance.push(a);
   return {data:{attendance_id:a.id,schedule_id:s.schedule_id,status:a.status,submission_status:a.submission_status,already_submitted:false},error:null};
 }
 if(name==="get_my_payroll_self_check_v1"){
   return {data:payrollEntries.filter(x=>x.employee_id===employeeId).map(x=>({payroll_entry_id:x.id,period_start:x.period_start,period_end:x.period_end,payroll_revision:x.payroll_revision,state:x.state,confirmed_work_item_count:x.confirmed_work_item_count,confirmed_work_minutes:x.confirmed_work_minutes,updated_at:x.updated_at})),error:null};
 }
 return err("UNEXPECTED_EMPLOYEE_RPC_"+name);
}
async function managerRpc(name,args={}){
 calls.push({actor:"MANAGER",kind:"rpc",name,args:clone(args||{})});
 if(name==="get_manager_accessible_stores")return {data:stores.map(clone),error:null};
 if(name==="list_manager_attendance_review_v1")return listManagerAttendance(args);
 if(name==="review_attendance_v1")return reviewAttendance(args);
 if(name==="list_scoped_payroll_self_check_v1"){
   if(!managerAllowed(args.p_store_id))return err("STORE_NOT_ALLOWED");
   return {data:payrollEntries.map(x=>({payroll_entry_id:x.id,employee_id:x.employee_id,employee_name:"Nhân viên QA A",period_start:x.period_start,period_end:x.period_end,payroll_revision:x.payroll_revision,state:x.state,confirmed_work_item_count:x.confirmed_work_item_count,confirmed_work_minutes:x.confirmed_work_minutes,updated_at:x.updated_at})),error:null};
 }
 return err("UNEXPECTED_MANAGER_RPC_"+name);
}

function canonicalConfirmedRows(){
 return attendance.filter(a=>
   a.user_id===employeeId&&
   a.work_date>="2026-09-21"&&a.work_date<="2026-09-27"&&
   a.schedule_id&&a.submission_status==="SUBMITTED"&&a.reviewed_by&&a.reviewed_at&&
   ((a.status==="APPROVED"&&a.review_decision==="APPROVE")||(a.status==="ADJUSTED"&&a.review_decision==="ADJUST"))&&
   a.confirmed_start&&a.confirmed_end&&Number.isInteger(a.confirmed_minutes)&&a.confirmed_minutes>=0
 ).map(a=>({
   employee_id:a.user_id,
   work_date:a.work_date,
   confirmed_work_time_state:a.status==="ADJUSTED"?"REVISED":"CONFIRMED",
   confirmed_minutes:a.confirmed_minutes,
   revision_identity:[a.id,a.work_date,a.status,a.review_decision,a.reviewed_at,a.confirmed_start,a.confirmed_end,a.confirmed_minutes].join("|")
 }));
}
function serverBuildPayroll({validated=true,revision="R1",rule="QA-OPAQUE-RULE"}={}){
 const rows=canonicalConfirmedRows();
 const basis=buildPayrollEstimateBasisV1({
   period_start:"2026-09-21",period_end:"2026-09-27",employee_id:employeeId,payroll_revision:revision,
   pay_rule_reference:rule,pay_rule_validated:validated,confirmed_work_time_rows:rows
 });
 if(!basis.ok)return {data:null,error:{message:basis.code,detail:basis.detail}};
 const d=basis.detail,sourceSignature=JSON.stringify(d.source_revisions);
 const existing=payrollEntries.find(x=>x.logical_identity===d.logical_identity);
 if(existing){
   if(existing.source_signature!==sourceSignature||existing.pay_rule_reference!==d.pay_rule_reference)return err("PAYROLL_REVISION_CONFLICT");
   return {data:{...clone(existing),already_existing:true},error:null};
 }
 const entry={id:"pay-1",employee_id:employeeId,period_start:d.payroll_period.period_start,period_end:d.payroll_period.period_end,payroll_revision:d.payroll_revision,state:"ESTIMATED",pay_rule_reference:d.pay_rule_reference,pay_rule_validated:true,source_type:d.source_type,confirmed_work_item_count:d.confirmed_work_item_count,confirmed_work_minutes:d.confirmed_work_minutes,source_signature:sourceSignature,monetary_amount:null,updated_at:"2026-09-24T16:00:00Z",logical_identity:d.logical_identity};
 payrollEntries.push(entry);payrollBuildCount++;
 return {data:{...clone(entry),already_existing:false},error:null};
}
function serverTransitionPayroll(nextState){
 const entry=payrollEntries[0];if(!entry)return err("PAYROLL_ENTRY_NOT_FOUND");
 const v=validatePayrollTruthTransition({from_state:entry.state,to_state:nextState,actor:"PAYROLL_AUTHORIZED"});
 if(!v.ok)return {data:null,error:{message:v.code,detail:v.detail}};
 entry.state=String(nextState).toUpperCase();entry.updated_at="2026-09-24T16:0"+(payrollStateTransitions+1)+":00Z";payrollStateTransitions++;
 return {data:clone(entry),error:null};
}

window.__MAGASIN_WORKFORCE_TODAY__="2026-09-24";
window.MAGASIN_EMPLOYEE=window.MAGASIN_EMPLOYEE||{};
window.MAGASIN_CORE={
 security:{escapeHtml:v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))},
 time:{time5:v=>String(v||"").slice(0,5),minutes},
 date:{formatDate:v=>String(v||"").slice(0,10),addDays:dateAdd,monday:()=> "2026-09-21"},
 supabase:{rpc:employeeRpc,from(name){calls.push({actor:"EMPLOYEE",kind:"from",name});throw Error("DIRECT_TABLE_FORBIDDEN_"+name)}}
};
const managerApi={rpc:managerRpc,from(name){calls.push({actor:"MANAGER",kind:"from",name});throw Error("DIRECT_TABLE_FORBIDDEN_"+name)}};
window.supabase={createClient(){return managerApi}};

const frame=document.getElementById("employeeApp");
await new Promise(resolve=>{
 frame.addEventListener("load",resolve,{once:true});
 frame.srcdoc=`<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font:13px system-ui;margin:0;padding:12px}.nav{display:flex;gap:6px;flex-wrap:wrap}.nav a{padding:8px 10px;border:1px solid #dbe4ef;border-radius:8px}.nav a.active{background:#e7f0ff}.page-view{display:none}.page-view.active{display:block}.panel{border:1px solid #dbe4ef;border-radius:12px;padding:12px;margin-top:10px}.section-head{display:flex;justify-content:space-between;gap:8px}.field{display:grid;gap:4px}.btn{min-height:36px}.muted{color:#718199}.page-wrap{width:100%}.attendance-entry-grid{display:block}.attendance-report-wrap{display:block}.empty{padding:10px}.section-title{font-weight:800}table{width:100%}</style></head><body><div id="headerPageTitle">Tổng quan</div><div id="pageSub">TASK-106 QA</div><nav class="nav"><a data-view="dashboard">🏠 Hôm nay</a><a class="active" data-view="attendance">⏱ Chấm công</a><a data-view="profile">👤 Cá nhân</a></nav><div class="page-wrap"><section class="page-view" id="view-dashboard">Dashboard</section><section class="page-view active" id="view-attendance"><div class="attendance-entry-grid"><div class="panel"></div></div><div class="attendance-report-wrap"><div class="panel">Legacy hidden</div></div><table id="attendanceHistoryTable"></table></section><section class="page-view" id="view-profile">Profile</section></div></body></html>`;
});

document.addEventListener("click",e=>{
 const b=e.target.closest?.('.nav [data-view="attendance"]');if(!b)return;
 document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));document.getElementById("view-attendance")?.classList.add("active");
 document.querySelectorAll(".nav button").forEach(x=>x.classList.toggle("active",x===b));
},true);

await import("/06_EMPLOYEE/attendance/engine-v1.js?v=20260923-task099");
await import("/06_EMPLOYEE/payroll/engine-v1.js?v=20260923-task104");
await import("/05_MANAGER/Workforce/attendance-review-v1.js?v=20260922-task100");
await import("/05_MANAGER/Workforce/payroll-self-check-v1.js?v=20260923-task104");

window.__TASK106_QA={
 calls,attendance,payrollEntries,schedules,
 employeeRpc,managerRpc,serverBuildPayroll,serverTransitionPayroll,canonicalConfirmedRows,
 get reviewTransitions(){return reviewTransitions},
 get payrollBuildCount(){return payrollBuildCount},
 get payrollStateTransitions(){return payrollStateTransitions},
 liveActorMapping:"UNRESOLVED_NOT_TESTED",
 state(){return clone({attendance,payrollEntries,reviewTransitions,payrollBuildCount,payrollStateTransitions,calls})}
};
window.__TASK106_READY__=true;
