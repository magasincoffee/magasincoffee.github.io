(()=>{
'use strict';
const qs=new URL(globalThis.location.href).searchParams;
const role=(qs.get('qaRole')||'OWNER').toUpperCase();
const profile={id:'qa-'+role.toLowerCase(),username:'qa-'+role.toLowerCase(),full_name:role==='OWNER'?'Owner QA':role==='ACCOUNTANT'?'Accounting QA':'Staff QA',role,status:'ACTIVE'};
const profiles=[
 {id:'p-owner',full_name:'Owner QA',username:'owner',email:'owner@example.test',role:'OWNER',status:'ACTIVE'},
 {id:'p-accountant',full_name:'Accounting QA',username:'accounting',email:'accounting@example.test',role:'ACCOUNTANT',status:'ACTIVE'},
 {id:'p-staff',full_name:'Staff QA',username:'staff',email:'staff@example.test',role:'STAFF',status:'ACTIVE'}
];
function resultFor(name){return {data:name==='profiles'?profiles:[],error:null,count:name==='profiles'?profiles.length:0}}
function query(name){
 const q={
  select(){return q},
  order(){return Promise.resolve(resultFor(name))},
  eq(){return q},neq(){return q},gte(){return q},lte(){return q},not(){return q},in(){return q},limit(){return q},
  single(){return Promise.resolve({data:profiles[2],error:null})},
  update(){return q},
  insert(){return q},
  then(resolve,reject){return Promise.resolve(resultFor(name)).then(resolve,reject)}
 };
 return q;
}
const sb={
 from(name){return query(name)},
 auth:{async signOut(){return {error:null}}},
 async rpc(){return {data:[],error:null}}
};
globalThis.MAGASIN_CORE={
 supabase:{
  async requireActive(){return profile},
  get(){return sb},
  async rpc(){return {data:[],error:null}},
  async getSession(){return {user:{id:profile.id}}}
 },
 roles:{hasRole(value,roles){return value?.status==='ACTIVE'&&roles.includes(String(value?.role||'').toUpperCase())}},
 date:{dateKey(){return '2026-09-27'},monday(){return '2026-09-21'}},
 stores:{async accessible(){return []}},
 security:{escapeHtml(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}},
 ui:{toast(){}}
};
})();