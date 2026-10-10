import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const BASE=process.env.QA_BASE_URL||'http://127.0.0.1:8768';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:980}});
const failures=[];
page.on('pageerror',err=>failures.push(String(err)));
try{
 await page.goto(BASE+'/09_QA/people-shift/manager-workforce-canonical-fixture.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT?.getState?.().eligibleEmployees?.length>0,{timeout:12000});
 const before=await page.evaluate(()=>({
  type:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().eligibleEmployees.find(x=>x.employee_id==='u-2')?.employment_type,
  audit:globalThis.__MW31_QA.employmentTypeAudit.length
 }));
 assert.equal(before.type,'PART_TIME');
 await page.locator('#msdStart').click();
 await page.waitForFunction(()=>Boolean(globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT?.getState?.().generationId));
 await page.locator('#msdOpenCandidateDrawer').click();
 const selector=page.locator('[data-msd-employment-value="u-2"]');
 await selector.waitFor({state:'visible',timeout:10000});
 await selector.selectOption('FULL_TIME');
 await page.locator('[data-msd-set-employment="u-2"]').click();
 await page.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().eligibleEmployees.find(x=>x.employee_id==='u-2')?.employment_type==='FULL_TIME');
 const after=await page.evaluate(()=>({
  type:globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().eligibleEmployees.find(x=>x.employee_id==='u-2')?.employment_type,
  audit:globalThis.__MW31_QA.employmentTypeAudit.length,
  calls:globalThis.__MW31_QA.calls.filter(x=>x.name==='set_employee_employment_type_v1')
 }));
 assert.equal(after.type,'FULL_TIME');
 assert.equal(after.audit,before.audit+1);
 assert.equal(after.calls.length,1);
 assert.equal(after.calls[0].args.p_employment_type,'FULL_TIME');
 console.log('[PASS] Manager UI saves FULL_TIME via scoped RPC and records audit');
 const denied=await page.evaluate(async()=>{
  globalThis.__MAGASIN_SCHEDULING_ACTOR__='STAFF';
  const q=await globalThis.__MW31_QA.rpc('set_employee_employment_type_v1',{p_employee_id:'u-2',p_employment_type:'PART_TIME'});
  globalThis.__MAGASIN_SCHEDULING_ACTOR__='STORE_MANAGER';
  return {code:q.error?.message,audit:globalThis.__MW31_QA.employmentTypeAudit.length,type:globalThis.__MW31_QA.employmentTypes['u-2']};
 });
 assert.equal(denied.code,'ROLE_NOT_ALLOWED');
 assert.equal(denied.audit,after.audit);
 assert.equal(denied.type,'FULL_TIME');
 console.log('[PASS] Employee role cannot change employment type; audit remains stable');
 const invalid=await page.evaluate(async()=>{
  const q=await globalThis.__MW31_QA.rpc('set_employee_employment_type_v1',{p_employee_id:'u-2',p_employment_type:'OTHER'});
  return {error:q.error?.message,type:globalThis.__MW31_QA.employmentTypes['u-2']};
 });
 assert.equal(invalid.error,'EMPLOYMENT_TYPE_INVALID');
 assert.equal(invalid.type,'FULL_TIME');
 console.log('[PASS] Unsupported type fails closed');
 assert.deepEqual(failures,[]);
 console.log('XSTORE_019K_EMPLOYMENT_MANAGER_BROWSER=PASS');
}finally{await browser.close();}
