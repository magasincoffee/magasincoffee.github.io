(()=>{
'use strict';
const clone=v=>structuredClone(v);
const calls=[];
const modes={employeeProfile:'ok',employeePayroll:'ok',managerProfile:'ok',managerPayroll:'ok'};
const stores=[
 {id:'store-a',code:'CN1',name:'Cửa hàng QA 1',status:'ACTIVE'},
 {id:'store-b',code:'CN2',name:'Cửa hàng QA 2',status:'ACTIVE'}
];
const profiles=[
 {employee_id:'emp-a',username:'employee.a',full_name:'Nhân viên A',phone:'0900000001',employee_role:'STAFF',profile_status:'ACTIVE',join_date:null,primary_store_id:'store-a',primary_store_code:'CN1',primary_store_name:'Cửa hàng QA 1',employee_level:null,pay_rule_reference:null},
 {employee_id:'emp-b',username:'employee.b',full_name:'Nhân viên B',phone:'0900000002',employee_role:'STAFF',profile_status:'ACTIVE',join_date:'2026-01-02',primary_store_id:'store-b',primary_store_code:'CN2',primary_store_name:'Cửa hàng QA 2',employee_level:'L2',pay_rule_reference:null}
];
const payroll=[
 {payroll_entry_id:'pay-a-1',employee_id:'emp-a',employee_name:'Nhân viên A',period_start:'2026-09-01',period_end:'2026-09-15',payroll_revision:'R1',state:'ESTIMATED',confirmed_work_item_count:2,confirmed_work_minutes:540,updated_at:'2026-09-23T10:00:00Z'},
 {payroll_entry_id:'pay-b-1',employee_id:'emp-b',employee_name:'Nhân viên B',period_start:'2026-09-01',period_end:'2026-09-15',payroll_revision:'R1',state:'REVIEWED',confirmed_work_item_count:4,confirmed_work_minutes:1200,updated_at:'2026-09-23T10:00:00Z'}
];
const error=message=>({data:null,error:{message,code:message}});
const badArgs=args=>args&&Object.keys(args).length>0;

function scopedRows(rows,storeId){
 return rows.filter(r=>{
   const p=profiles.find(x=>x.employee_id===(r.employee_id||r.employee_id));
   return p?.primary_store_id===storeId;
 });
}
async function serverRpc(actor,name,args={}){
 calls.push({actor,kind:'rpc',name,args:clone(args||{})});
 if(actor==='EMPLOYEE'){
   if(name==='get_my_employee_profile_v1'){
     if(badArgs(args))return error('RPC_SIGNATURE_DENY');
     if(modes.employeeProfile==='error')return error('PROFILE_INACTIVE');
     if(modes.employeeProfile==='invalid')return {data:[{...clone(profiles[0]),profile_status:'BROKEN'}],error:null};
     return {data:[clone(profiles[0])],error:null};
   }
   if(name==='get_my_payroll_self_check_v1'){
     if(badArgs(args))return error('RPC_SIGNATURE_DENY');
     if(modes.employeePayroll==='error')return error('PAYROLL_SELF_PROFILE_INACTIVE');
     if(modes.employeePayroll==='invalid')return {data:[{...clone(payroll[0]),state:'BROKEN'}],error:null};
     const {employee_id,employee_name,...row}=payroll[0];
     return {data:[clone(row)],error:null};
   }
   return error('UNEXPECTED_EMPLOYEE_RPC_'+name);
 }
 if(name==='get_manager_accessible_stores'){
   return {data:actor==='OWNER'?clone(stores):[clone(stores[0])],error:null};
 }
 if(name==='list_employee_profile_projection_v1'){
   const sid=args?.p_store_id??null;
   if(actor==='MANAGER'&&(!sid||sid!=='store-a'))return error('STORE_NOT_ALLOWED');
   if(actor==='MANAGER'&&modes.managerProfile==='error')return error('PROFILE_VIEW_FAILED');
   let rows=actor==='OWNER'&&!sid?clone(profiles):clone(profiles.filter(x=>x.primary_store_id===sid));
   if(actor==='MANAGER'&&modes.managerProfile==='invalid')rows=[{...clone(profiles[0]),employee_id:null}];
   return {data:rows,error:null};
 }
 if(name==='list_scoped_payroll_self_check_v1'){
   const sid=args?.p_store_id??null;
   if(actor==='MANAGER'&&(!sid||sid!=='store-a'))return error('STORE_NOT_ALLOWED');
   if(actor==='MANAGER'&&modes.managerPayroll==='error')return error('PAYROLL_VIEW_FAILED');
   let rows=actor==='OWNER'&&!sid?clone(payroll):clone(scopedRows(payroll,sid));
   if(actor==='MANAGER'&&modes.managerPayroll==='invalid')rows=[{...clone(payroll[0]),state:'BROKEN'}];
   return {data:rows,error:null};
 }
 return error('UNEXPECTED_'+actor+'_RPC_'+name);
}
const employeeApi={
 rpc:(name,args={})=>serverRpc('EMPLOYEE',name,args),
 from(name){calls.push({actor:'EMPLOYEE',kind:'from',name});throw Error('DIRECT_TABLE_FORBIDDEN_'+name)}
};
const managerApi={
 rpc:(name,args={})=>serverRpc('MANAGER',name,args),
 from(name){calls.push({actor:'MANAGER',kind:'from',name});throw Error('DIRECT_TABLE_FORBIDDEN_'+name)}
};
window.MAGASIN_CORE={
 security:{escapeHtml:v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))},
 supabase:employeeApi
};
window.supabase={createClient(){return managerApi}};

const frame=document.getElementById('employeeApp');
frame.srcdoc='<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font:13px system-ui;margin:0;padding:12px}.nav{display:flex;gap:6px;flex-wrap:wrap}.nav a{padding:8px 10px;border:1px solid #dbe4ef;border-radius:8px}.nav a.active{background:#e7f0ff}.page-view{display:none}.page-view.active{display:block}.panel{border:1px solid #dbe4ef;border-radius:12px;padding:12px;margin-top:10px}.profile-grid{display:grid;grid-template-columns:120px 1fr;gap:12px}.profile-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}.field{display:grid;gap:4px}.field input{width:100%;height:34px}.section-head{display:flex;justify-content:space-between;gap:8px}.btn{min-height:36px}.muted{color:#718199}@media(max-width:600px){.profile-grid,.profile-fields{grid-template-columns:1fr}}</style></head><body><div class="header-user-text"><strong>Nhân viên</strong><span>Nhân viên</span></div><button class="header-avatar">N</button><div id="headerPageTitle">Tổng quan</div><div id="pageSub">TASK-107 QA</div><nav class="nav"><a class="active" data-view="dashboard">Dashboard</a><a data-view="profile">Cá nhân</a></nav><div class="page-wrap"><section class="page-view active" id="view-dashboard">Dashboard</section><section class="page-view" id="view-profile"><div class="profile-layout"><div class="panel profile-main"><div class="profile-grid"><div><button class="profile-avatar"><span id="profileAvatarFallback">N</span></button></div><div class="profile-fields"><div class="field"><label>Họ tên</label><input id="profileFullName" readonly></div><div class="field"><label>Tên đăng nhập</label><input id="profileUsername" readonly></div><div class="field"><label>Số điện thoại</label><input id="profilePhone" readonly></div><div class="field"><label>Vai trò</label><input id="profileRole" readonly></div><div class="field"><label>Trạng thái</label><input id="profileStatus" readonly></div><div class="field"><label>Chi nhánh chính</label><input id="profilePrimaryStore" readonly></div><div class="field"><label>Cấp độ</label><input id="profileLevel" readonly></div><div class="field"><label>Ngày vào làm</label><input id="profileJoinDate" readonly></div></div></div></div></div></section></div></body></html>';

window.__TASK107_QA={
 calls,modes,stores,profiles,payroll,serverRpc,
 setMode(key,value){modes[key]=value},
 recoverAll(){for(const k of Object.keys(modes))modes[k]='ok'},
 ownerProfile:()=>serverRpc('OWNER','list_employee_profile_projection_v1',{p_store_id:null}),
 ownerPayroll:()=>serverRpc('OWNER','list_scoped_payroll_self_check_v1',{p_store_id:null}),
 employeeCrossProfile:()=>serverRpc('EMPLOYEE','get_my_employee_profile_v1',{p_user_id:'emp-b'}),
 employeeCrossPayroll:()=>serverRpc('EMPLOYEE','get_my_payroll_self_check_v1',{p_employee_id:'emp-b'}),
 managerCrossProfile:()=>serverRpc('MANAGER','list_employee_profile_projection_v1',{p_store_id:'store-b'}),
 managerCrossPayroll:()=>serverRpc('MANAGER','list_scoped_payroll_self_check_v1',{p_store_id:'store-b'}),
 state(){return clone({calls,modes})}
};
})();