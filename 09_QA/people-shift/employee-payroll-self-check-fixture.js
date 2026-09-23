(()=>{
 const calls=[];
 let employeeMode='ok',managerMode='ok';
 const employeeRows=[
  {payroll_entry_id:'pay-a-1',period_start:'2026-09-01',period_end:'2026-09-15',payroll_revision:'R1',state:'ESTIMATED',confirmed_work_item_count:2,confirmed_work_minutes:540,updated_at:'2026-09-23T10:00:00Z'},
  {payroll_entry_id:'pay-a-2',period_start:'2026-08-16',period_end:'2026-08-31',payroll_revision:'R2',state:'FINALIZED',confirmed_work_item_count:3,confirmed_work_minutes:900,updated_at:'2026-09-01T10:00:00Z'}
 ];
 const managerRows=[
  {payroll_entry_id:'pay-a-1',employee_id:'u-a',employee_name:'Nguyễn An',period_start:'2026-09-01',period_end:'2026-09-15',payroll_revision:'R1',state:'ESTIMATED',confirmed_work_item_count:2,confirmed_work_minutes:540,updated_at:'2026-09-23T10:00:00Z'},
  {payroll_entry_id:'pay-b-1',employee_id:'u-b',employee_name:'Lê Bình',period_start:'2026-09-01',period_end:'2026-09-15',payroll_revision:'R1',state:'REVIEWED',confirmed_work_item_count:4,confirmed_work_minutes:1200,updated_at:'2026-09-23T10:00:00Z'}
 ];
 const stores=[{id:'store-a',code:'CN-QA',name:'Cửa hàng QA',status:'ACTIVE'}];
 const error=message=>({data:null,error:{message,code:message}});
 window.__TASK104_QA={
  calls,employeeRows,managerRows,
  failEmployee(){employeeMode='error'},recoverEmployee(){employeeMode='ok'},
  failManager(){managerMode='error'},recoverManager(){managerMode='ok'},
  state(){return {employeeMode,managerMode,calls:structuredClone(calls)}}
 };
 window.MAGASIN_CORE={
  security:{escapeHtml:v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))},
  supabase:{
   async rpc(name,args={}){
    calls.push({actor:'EMPLOYEE',kind:'rpc',name,args:structuredClone(args||{})});
    if(name!=='get_my_payroll_self_check_v1')return error('UNEXPECTED_EMPLOYEE_RPC_'+name);
    if(employeeMode==='error')return error('PAYROLL_SELF_PROFILE_INACTIVE');
    return {data:structuredClone(employeeRows),error:null};
   },
   from(name){calls.push({actor:'EMPLOYEE',kind:'from',name});throw Error('DIRECT_TABLE_FORBIDDEN_'+name)}
  }
 };
 const managerApi={
  async rpc(name,args={}){
   calls.push({actor:'MANAGER',kind:'rpc',name,args:structuredClone(args||{})});
   if(name==='get_manager_accessible_stores')return {data:structuredClone(stores),error:null};
   if(name==='list_scoped_payroll_self_check_v1'){
    if(managerMode==='error'||args.p_store_id!=='store-a')return error('STORE_NOT_ALLOWED');
    return {data:structuredClone(managerRows),error:null};
   }
   return error('UNEXPECTED_MANAGER_RPC_'+name);
  },
  from(name){calls.push({actor:'MANAGER',kind:'from',name});throw Error('DIRECT_TABLE_FORBIDDEN_'+name)}
 };
 window.supabase={createClient(){return managerApi}};
 const frame=document.getElementById('employeeApp');
 frame.srcdoc='<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font:13px system-ui;margin:0;padding:12px}.nav{display:flex;gap:6px;flex-wrap:wrap}.nav a{padding:8px 10px;border:1px solid #dbe4ef;border-radius:8px}.nav a.active{background:#e7f0ff}.page-view{display:none}.page-view.active{display:block}.panel{border:1px solid #dbe4ef;border-radius:12px;padding:12px;margin-top:10px}.section-head{display:flex;justify-content:space-between;gap:8px}.btn{min-height:36px}.muted{color:#718199}.page-wrap{width:100%}</style></head><body><div id="headerPageTitle">Tổng quan</div><div id="pageSub">QA</div><nav class="nav"><a class="active" data-view="dashboard">Dashboard</a><a data-view="profile">Profile</a></nav><div class="page-wrap"><section class="page-view active" id="view-dashboard">Dashboard</section><section class="page-view" id="view-profile">Profile</section></div></body></html>';
})();