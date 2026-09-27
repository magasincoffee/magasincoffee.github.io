(()=>{
'use strict';
const qs=new URL(globalThis.location.href).searchParams;
const role=qs.get('qaRole')==='ACCOUNTANT'?'ACCOUNTANT':'OWNER';
const authDelay=Math.max(0,Number(qs.get('qaAuthDelay'))||0);
globalThis.__CONTROL_TOWER_QA_MODE=qs.get('qaMode')||'attention';
globalThis.__CONTROL_TOWER_QA_FAIL=qs.get('qaFail')||'';
const calls=[];
globalThis.__CONTROL_TOWER_QA_CALLS=calls;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mode=()=>String(globalThis.__CONTROL_TOWER_QA_MODE||'attention');
const failure=()=>String(globalThis.__CONTROL_TOWER_QA_FAIL||'');
const profile={id:'qa-owner',username:'qa-owner',full_name:role==='OWNER'?'Owner QA':'Accounting QA',role,status:'ACTIVE'};

const client={
 from(name){
  calls.push({kind:'from',name,mode:mode()});
  return {
   async select(){
    if(failure()==='payables')return {data:null,error:{message:'qa payables failure'}};
    if(name==='v_procurement_supplier_payables'){
     return {data:mode()==='noattention'?[{balance_due:0,overdue_balance:0}]:[{balance_due:500000,overdue_balance:120000},{balance_due:350000,overdue_balance:0}],error:null};
    }
    if(name==='v_procurement_order_summary'){
     if(mode()==='noattention')return {data:[{balance_due:0,status:'OPEN',is_overdue:false}],error:null};
     return {data:[
      {balance_due:200000,status:'OPEN',is_overdue:true},
      {balance_due:100000,status:'OPEN',is_overdue:false},
      {balance_due:300000,status:'PARTIAL',is_overdue:false},
      {balance_due:250000,status:'OPEN',is_overdue:false},
      {balance_due:999999,status:'CANCELLED',is_overdue:true}
     ],error:null};
    }
    return {data:[],error:null};
   }
  };
 }
};

globalThis.MAGASIN_CORE={
 supabase:{
  async requireActive(){calls.push({kind:'auth',role});if(authDelay)await sleep(authDelay);return profile},
  get(){return client},
  async rpc(name,args){
   calls.push({kind:'rpc',name,args,mode:mode()});
   if(failure()==='workforce')return {data:null,error:{message:'qa workforce failure'}};
   if(mode()==='estimate'&&name==='get_manager_transfer_requests')return {data:null,error:{message:'qa partial transfer failure'}};
   if(name==='get_manager_transfer_requests')return {data:mode()==='noattention'?[{status:'APPROVED'}]:[{status:'PENDING'},{status:'APPROVED'}],error:null};
   if(name==='list_schedule_generations')return {data:mode()==='noattention'?[{id:'generation-published',status:'PUBLISHED'}]:[{id:'generation-qa',status:'DRAFT'},{id:'generation-published',status:'PUBLISHED'}],error:null};
   if(name==='get_workforce_staffing_requirements')return {data:[{id:'requirement-qa',status:'ACTIVE',work_date:'2026-09-14',start_time:'06:00',end_time:'12:00',minimum_headcount:mode()==='noattention'?1:2,skill_code:null,min_skill_level:0}],error:null};
   if(name==='get_schedule_generation_assignments')return {data:[{work_date:'2026-09-14',start_time:'06:00',end_time:'12:00',skill_code:null,skill_level:0}],error:null};
   return {data:[],error:null};
  }
 },
 roles:{hasRole(value,roles){return value?.status==='ACTIVE'&&roles.includes(String(value?.role||'').toUpperCase())}},
 date:{dateKey(){return '2026-09-18'},monday(){return '2026-09-14'}},
 stores:{async accessible(){calls.push({kind:'stores',mode:mode()});return [{id:'store-1',name:'QA Store'}]}},
 security:{escapeHtml(value){return String(value??'')}},
 ui:{toast(){}}
};
})();