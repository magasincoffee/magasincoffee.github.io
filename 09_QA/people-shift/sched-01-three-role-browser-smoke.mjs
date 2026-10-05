import { chromium } from 'playwright';

const base=process.env.QA_BASE_URL||'http://127.0.0.1:8767';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
const checks=[];

async function check(name,fn){
  try{const detail=await fn();checks.push({name,status:'PASS',detail});}
  catch(error){checks.push({name,status:'FAIL',detail:error?.stack||String(error)});throw error;}
}

try {
  const owner=await context.newPage();
  await check('owner_publish_loads_without_ambiguous_rpc_error',async()=>{
    await owner.goto(base+'/09_QA/people-shift/sched-05-owner-scheduling-fixture.html');
    await owner.locator('#ownerSchedulingOverview[data-owner-overview-state="ready"]').waitFor();
    const overview=await owner.locator('#ownerSchedulingOverview').innerText();
    for(const code of ['CN1','CN2','CN3','CN4'])if(!overview.includes(code))throw new Error('missing '+code+' in Owner overview');
    if(await owner.locator('#panel-publish').isVisible())throw new Error('Owner detail visible before store selection');
    await owner.locator('[data-owner-store-open="store-a"]').click();
    await owner.locator('.msd[data-scheduling-actor="OWNER"]').waitFor();
    const text=await owner.locator('#panel-publish').innerText();
    if(text.includes('Không tải được Workforce Publish')||text.includes('ambiguous'))throw new Error(text);
    const candidateUi=await owner.locator('#panel-publish').evaluate(r=>({
      drawer:r.querySelectorAll('[data-msd-candidate-overlay]').length,
      trigger:!!r.querySelector('#msdOpenCandidateDrawer'),
      triggerDisabled:r.querySelector('#msdOpenCandidateDrawer')?.disabled===true
    }));
    if(!text.includes('Giám sát xếp lịch')||!text.includes('CN1')||candidateUi.drawer!==0||!candidateUi.trigger||!candidateUi.triggerDisabled||text.includes('An CN1'))throw new Error('Owner shared scheduling detail missing: '+JSON.stringify(candidateUi));
    const calls=await owner.evaluate(()=>window.__SCHED05_OWNER_QA.calls.map(x=>x.name));
    for(const name of ['get_manager_accessible_stores','get_manager_weekly_availability','list_employee_workforce_profiles_v1','list_schedule_generations'])if(!calls.includes(name))throw new Error('missing '+name);
    return 'overview CN1–CN4 → shared store-a detail · '+calls.join(',');
  });

  await check('owner_store_switch_reloads_same_canonical_read_path_without_leak',async()=>{
    const before=await owner.evaluate(()=>window.__SCHED05_OWNER_QA.calls.length);
    await owner.locator('[data-msd-branch="store-b"]').click();
    await owner.waitForFunction(()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT?.getState?.().storeId==="store-b"&&!globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().busy);
    const text=await owner.locator('#panel-publish').innerText();
    if(!text.includes("CN2")||!text.includes("163 Nguyễn Văn Cừ"))throw new Error("store-b identity missing: "+text);
    if(text.includes('An CN1')||text.includes('Bình CN1'))throw new Error('cross-store stale content: '+text);
    const calls=await owner.evaluate(before=>window.__SCHED05_OWNER_QA.calls.slice(before),before);
    const storeScoped=calls.filter(x=>x?.args&&Object.prototype.hasOwnProperty.call(x.args,'p_store_id'));
    if(!storeScoped.some(x=>x.name==='get_manager_weekly_availability'))throw new Error('missing store-b availability reload: '+JSON.stringify(calls));
    if(storeScoped.some(x=>x.args.p_store_id!=='store-b'))throw new Error('cross-store RPC scope leak: '+JSON.stringify(calls));
    const allowedUnscoped=new Set(['list_employee_workforce_profiles_v1','list_workforce_recurring_staffing_requirements_v1','get_cross_store_weekly_plan_v1']);
    const unexpected=calls.filter(x=>!Object.prototype.hasOwnProperty.call(x?.args||{},'p_store_id')&&!allowedUnscoped.has(x.name));
    if(unexpected.length)throw new Error('unexpected unscoped reload RPC: '+JSON.stringify(unexpected));
    return 'store-b scoped reload · '+calls.map(x=>x.name).join(',');
  });

  const manager=await context.newPage();
  await check('manager_canonical_scheduling_surface_loads',async()=>{
    await manager.goto(base+'/09_QA/people-shift/manager-workforce-canonical-fixture.html');
    await manager.locator('.msd').waitFor();
    const text=await manager.locator('#panel-publish').innerText();
    if(!text.includes('Xếp lịch theo cửa hàng')||!text.includes('LỊCH NHÁP ĐANG CHỈNH')||!text.includes('Tạo bản nháp')||!text.includes('Một cửa hàng · một lịch tuần'))throw new Error(text);
    const calls=await manager.evaluate(()=>window.__MW31_QA.calls.map(x=>x.name).filter(Boolean));
    for(const name of ['get_manager_accessible_stores','get_manager_weekly_availability','list_employee_workforce_profiles_v1','list_schedule_generations'])if(!calls.includes(name))throw new Error('missing '+name);
    await manager.locator('#msdStart').click();
    await manager.waitForFunction(()=>window.__MW31_QA.calls.some(x=>x.name==='get_schedule_generation_assignments'));
    return 'manager direct availability→draft read path';
  });

  const employeeSchedule=await context.newPage();
  await check('employee_published_schedule_read_no_regression',async()=>{
    await employeeSchedule.goto(base+'/09_QA/people-shift/employee-published-weekly-schedule-fixture.html?published=1&now=2026-09-28T01:00:00.000Z');
    const frame=employeeSchedule.frameLocator('#employeeApp');
    await frame.locator('#view-schedule').filter({hasText:'CN-QA-A'}).waitFor();
    const calls=await employeeSchedule.evaluate(()=>window.__TASK095_QA.calls.filter(x=>x.kind==='rpc').map(x=>x.name));
    if(!calls.includes('list_my_approved_schedules_v2'))throw new Error(JSON.stringify(calls));
    return 'self-only published reader';
  });

  const employeeAvailability=await context.newPage();
  await check('employee_availability_read_no_regression',async()=>{
    await employeeAvailability.goto(base+'/09_QA/people-shift/employee-availability-canonical-fixture.html');
    await employeeAvailability.waitForFunction(()=>window.__EMPLOYEE_AVAILABILITY_QA.calls.some(x=>x.name==='get_my_availability'));
    const calls=await employeeAvailability.evaluate(()=>window.__EMPLOYEE_AVAILABILITY_QA.calls);
    if(calls.some(x=>x.kind==='from'))throw new Error('direct table access detected');
    return 'get_my_availability RPC';
  });

  console.log(JSON.stringify({marker:'SCHED_01_THREE_ROLE_BROWSER_SMOKE=PASS',checks},null,2));
} finally {
  await context.close();
  await browser.close();
}
