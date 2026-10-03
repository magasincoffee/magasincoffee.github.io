(()=>{
'use strict';
const stores=[
 {id:'store-a',code:'CN1',name:'94 Đường 3/2',status:'ACTIVE'},
 {id:'store-b',code:'CN2',name:'163 Nguyễn Văn Cừ',status:'ACTIVE'},
 {id:'store-c',code:'CN3',name:'82A Nguyễn Văn Cừ',status:'ACTIVE'},
 {id:'store-d',code:'CN4',name:'60 Trần Hưng Đạo',status:'ACTIVE'}
];
const availability={
 'store-a':[{availability_id:'av-a',user_id:'a',employee_name:'An CN1',work_date:'2026-09-28',start_time:'06:00',end_time:'12:00'}],
 'store-b':[{availability_id:'av-b',user_id:'b',employee_name:'Bình CN2',work_date:'2026-09-29',start_time:'06:00',end_time:'12:00'}],
 'store-c':[{availability_id:'av-c',user_id:'c',employee_name:'Chi CN3',work_date:'2026-09-30',start_time:'12:00',end_time:'17:00'}],
 'store-d':[{availability_id:'av-d',user_id:'d',employee_name:'Dũng CN4',work_date:'2026-10-01',start_time:'17:00',end_time:'22:00'}]
};
const api={
 async rpc(name,args={}){
  if(name==='get_manager_weekly_availability')return {data:(availability[args.p_store_id]||[]).map(x=>({...x})),error:null};
  if(name==='list_schedule_generations')return {data:[],error:null};
  return {data:[],error:null};
 }
};
globalThis.MAGASIN_MANAGER_WORKFORCE_CONTEXT={
 version:'QA-SCHED-UI-008',
 client:()=>api,
 async stores(){return stores.map(x=>({...x}))},
 async actor(){return {id:'qa-owner',role:'OWNER',status:'ACTIVE',access_scope:'ALL'}},
 async refresh(){return {ready:true,actor:await this.actor(),stores:await this.stores()}},
 invalidate(){},
 getSnapshot(){return {ready:true,actor:{id:'qa-owner',role:'OWNER',status:'ACTIVE',access_scope:'ALL'},stores:stores.map(x=>({...x}))}}
};
})();