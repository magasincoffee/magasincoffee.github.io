import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const BASE=process.env.QA_BASE_URL||'http://127.0.0.1:8973';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto(BASE+'/09_QA/people-shift/manager-workforce-canonical-fixture.html',{waitUntil:'networkidle'});
 await page.locator('[data-view="staff"]').click();
 await page.locator('[data-msp-filter="ACTIVE"]').waitFor();
 assert.equal(await page.locator('[data-msp-lifecycle-open]').count(),3);
 assert.equal(await page.locator('[data-msp-lifecycle-open="u-2"]').isDisabled(),true,'missing lifecycle RPC must fail closed');
 await page.evaluate(async()=>{
  const fixture=globalThis.__MW31_QA;
  const original=globalThis.MAGASIN_MANAGER_WORKFORCE_CONTEXT.client().rpc;
  const simulation={missing:false,role:'STORE_MANAGER',deniedId:'u-3',audit:[],calls:[],future:1};
  globalThis.__LIFECYCLE_QA=simulation;
  globalThis.MAGASIN_MANAGER_WORKFORCE_CONTEXT.client=()=>({rpc:async(name,args={})=>{
   if(name==='list_employee_lifecycle_controls_v1'){
    if(simulation.missing)return {data:null,error:{message:'PGRST202'}};
    return {data:Object.keys(fixture.peopleMeta).map(id=>({employee_id:id,profile_status:fixture.peopleMeta[id].status,can_manage:id!==simulation.deniedId})),error:null};
   }
   if(name==='set_employee_lifecycle_status_v1'){
    simulation.calls.push({...args});
    if(simulation.role!=='STORE_MANAGER'&&simulation.role!=='OWNER')return {data:null,error:{message:'ROLE_NOT_ALLOWED'}};
    if(args.p_employee_id===simulation.deniedId)return {data:null,error:{message:'EMPLOYEE_ALL_STORES_SCOPE_REQUIRED'}};
    const row=fixture.peopleMeta[args.p_employee_id];
    if(!row||row.status===args.p_new_status)return {data:null,error:{message:'LIFECYCLE_NO_CHANGE'}};
    if(!['ACTIVE','INACTIVE'].includes(args.p_new_status)||String(args.p_reason||'').trim().length<3)return {data:null,error:{message:'LIFECYCLE_REASON_INVALID'}};
    const old=row.status;row.status=args.p_new_status;
    simulation.audit.push({employee_id:args.p_employee_id,old,new_status:row.status});
    return {data:{changed:true,old_status:old,new_status:row.status,existing_future_official_shifts_for_review:simulation.future},error:null};
   }
   return original(name,args);
  }});
  await globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.refresh();
 });
 assert.equal(await page.locator('[data-msp-lifecycle-open="u-2"]').isEnabled(),true);
 assert.equal(await page.locator('[data-msp-lifecycle-open="u-3"]').isDisabled(),true,'foreign-scope employee cannot be offboarded');
 const before=await page.evaluate(()=>JSON.stringify(globalThis.__MW31_QA.state.official));
 await page.locator('[data-msp-lifecycle-open="u-2"]').click();
 assert.equal(await page.locator('[data-msp-lifecycle-editor="u-2"]').count(),1);
 assert.equal(await page.locator('[data-msp-lifecycle-confirm]').isDisabled(),true);
 await page.locator('[data-msp-lifecycle-reason]').fill('PT nghỉ việc');
 await page.locator('[data-msp-lifecycle-check]').check();
 await page.locator('[data-msp-lifecycle-confirm]').click();
 await page.locator('[data-state="SAVED"]').waitFor();
 assert.equal(await page.locator('[data-msp-edit="u-2"]').count(),0);
 assert.match(await page.locator('[data-state="SAVED"]').innerText(),/ca chính thức sắp tới cần rà soát/);
 assert.equal(await page.evaluate(()=>globalThis.__MW31_QA.peopleMeta['u-2'].status),'INACTIVE');
 await page.locator('[data-msp-filter="INACTIVE"]').click();
 await page.locator('[data-msp-lifecycle-open="u-2"]').click();
 await page.locator('[data-msp-lifecycle-reason]').fill('Nhân viên quay lại');
 await page.locator('[data-msp-lifecycle-check]').check();
 await page.locator('[data-msp-lifecycle-confirm]').click();
 await page.locator('[data-state="SAVED"]').waitFor();
 assert.equal(await page.evaluate(()=>globalThis.__MW31_QA.peopleMeta['u-2'].status),'ACTIVE');
 const audit=await page.evaluate(()=>globalThis.__LIFECYCLE_QA.audit);
 assert.deepEqual(audit.map(x=>x.new_status),['INACTIVE','ACTIVE']);
 assert.equal(await page.evaluate(()=>JSON.stringify(globalThis.__MW31_QA.state.official)),before,'published schedules must remain untouched');
 await page.evaluate(()=>{globalThis.__LIFECYCLE_QA.role='STAFF'});
 const staffAttempt=await page.evaluate(()=>globalThis.MAGASIN_MANAGER_WORKFORCE_CONTEXT.client().rpc('set_employee_lifecycle_status_v1',{p_employee_id:'u-2',p_new_status:'INACTIVE',p_reason:'Not authorized'}));
 assert.match(staffAttempt.error.message,/ROLE_NOT_ALLOWED/);
 await page.evaluate(async()=>{globalThis.__LIFECYCLE_QA.missing=true;await globalThis.MAGASIN_MANAGER_STAFF_PROJECTION.refresh()});
 assert.equal(await page.locator('[data-msp-lifecycle-open="u-1"]').isDisabled(),true);
 assert.equal(await page.locator('[data-msp-delete]').count(),0);
 assert.deepEqual(errors,[]);
 console.log('XSTORE_019O_STAFF_LIFECYCLE_BROWSER=PASS');
}finally{await browser.close()}
