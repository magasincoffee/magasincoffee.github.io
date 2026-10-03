(()=>{
'use strict';
const script=document.currentScript;
const key=String(script?.dataset?.routeKey||'').trim();
const routes=Object.freeze({
  'manager-root':{roles:['STORE_MANAGER'],bridge:'/05_MANAGER/?canonical=manager-root',canonical:'/manager/'},
  'manager-scheduling':{roles:['STORE_MANAGER'],bridge:'/05_MANAGER/?canonical=manager-scheduling#workforce',canonical:'/manager/scheduling/'},
  'manager-schedule':{roles:['STORE_MANAGER'],bridge:'/05_MANAGER/?canonical=manager-schedule#schedule',canonical:'/manager/schedule/'},
  'employee-root':{roles:['STAFF','EMPLOYEE'],bridge:'/06_EMPLOYEE/?canonical=employee-root',canonical:'/employee/'},
  'employee-schedule':{roles:['STAFF','EMPLOYEE'],bridge:'/06_EMPLOYEE/?canonical=employee-schedule#schedule',canonical:'/employee/schedule/'},
  'employee-attendance':{roles:['STAFF','EMPLOYEE'],bridge:'/06_EMPLOYEE/?canonical=employee-attendance#attendance',canonical:'/employee/attendance/'},
  'employee-payroll':{roles:['STAFF','EMPLOYEE'],bridge:'/06_EMPLOYEE/?canonical=employee-payroll#payroll',canonical:'/employee/payroll/'},
  'owner-root':{roles:['OWNER'],bridge:'/04_OWNER/?canonical=owner-root',canonical:'/owner/'},
  'owner-scheduling':{roles:['OWNER'],bridge:'/04_OWNER/Workforce/?canonical=owner-scheduling',canonical:'/owner/scheduling/'}
});
const managerHash=new Set(['dashboard','staff','workforce','schedule','swap','attendance','payroll-self-check']);
const employeeHash=new Set(['dashboard','schedule','attendance','swap','payroll','profile']);
const auth='/03_PLATFORM/01_AUTH/';
const unavailable='/03_PLATFORM/01_AUTH/role-unavailable.html';
function selected(){
  let cfg=routes[key]||null;
  const hash=String(location.hash||'').replace(/^#/,'').trim().toLowerCase();
  if(key==='manager-root'&&managerHash.has(hash)){
    if(hash==='workforce')cfg=routes['manager-scheduling'];
    else if(hash==='schedule')cfg=routes['manager-schedule'];
    else if(hash&&hash!=='dashboard')cfg={...routes['manager-root'],bridge:routes['manager-root'].bridge+'#'+hash,canonical:'/manager/#'+hash};
  }
  if(key==='employee-root'&&employeeHash.has(hash)){
    if(hash==='schedule')cfg=routes['employee-schedule'];
    else if(hash==='attendance')cfg=routes['employee-attendance'];
    else if(hash==='payroll')cfg=routes['employee-payroll'];
    else if(hash&&hash!=='dashboard')cfg={...routes['employee-root'],bridge:routes['employee-root'].bridge+'#'+hash,canonical:'/employee/#'+hash};
  }
  return cfg;
}
function move(target){window.location.replace(target)}
(async()=>{
  try{
    const cfg=selected();
    if(!cfg)throw new Error('CANONICAL_ROUTE_NOT_ALLOWLISTED');
    const C=window.MAGASIN_CORE;
    if(!C?.supabase?.requireActive)throw new Error('CANONICAL_ROUTE_CORE_NOT_READY');
    const profile=await C.supabase.requireActive();
    const role=String(profile?.role||'').toUpperCase();
    const active=String(profile?.status||'ACTIVE').toUpperCase()==='ACTIVE';
    if(!active||!cfg.roles.includes(role)){move(unavailable);return}
    move(cfg.bridge);
  }catch(error){
    console.error('Canonical role route failed',error);
    move(auth);
  }
})();
})();