(()=>{
'use strict';
const script=document.currentScript;
const key=String(script?.dataset?.routeKey||'').trim();
const routes=Object.freeze({
  'manager-root':{roles:['STORE_MANAGER'],target:'/05_MANAGER/'},
  'manager-scheduling':{roles:['STORE_MANAGER'],target:'/05_MANAGER/#workforce'},
  'manager-schedule':{roles:['STORE_MANAGER'],target:'/05_MANAGER/#schedule'},
  'employee-root':{roles:['STAFF','EMPLOYEE'],target:'/06_EMPLOYEE/'},
  'employee-schedule':{roles:['STAFF','EMPLOYEE'],target:'/06_EMPLOYEE/#schedule'},
  'employee-attendance':{roles:['STAFF','EMPLOYEE'],target:'/06_EMPLOYEE/#attendance'},
  'employee-payroll':{roles:['STAFF','EMPLOYEE'],target:'/06_EMPLOYEE/#payroll'},
  'owner-root':{roles:['OWNER'],target:'/04_OWNER/'},
  'owner-scheduling':{roles:['OWNER'],target:'/04_OWNER/Workforce/'}
});
const cfg=routes[key];
const auth='/03_PLATFORM/01_AUTH/';
const unavailable='/03_PLATFORM/01_AUTH/role-unavailable.html';
function move(target){window.location.replace(target)}
(async()=>{
  try{
    if(!cfg)throw new Error('CANONICAL_ROUTE_NOT_ALLOWLISTED');
    const C=window.MAGASIN_CORE;
    if(!C?.supabase?.requireActive)throw new Error('CANONICAL_ROUTE_CORE_NOT_READY');
    const profile=await C.supabase.requireActive();
    const role=String(profile?.role||'').toUpperCase();
    const active=String(profile?.status||'ACTIVE').toUpperCase()==='ACTIVE';
    if(!active||!cfg.roles.includes(role)){move(unavailable);return}
    move(cfg.target);
  }catch(error){
    console.error('Canonical role route failed',error);
    move(auth);
  }
})();
})();