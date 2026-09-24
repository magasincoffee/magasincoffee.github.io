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
    await owner.locator('.msd').waitFor();
    const text=await owner.locator('#panel-publish').innerText();
    if(text.includes('Không tải được Workforce Publish')||text.includes('ambiguous'))throw new Error(text);
    if(!text.includes('An CN1')||!text.includes('Owner Scheduling · Giám sát & can thiệp'))throw new Error('Owner canonical scheduling surface missing');
    const calls=await owner.evaluate(()=>window.__SCHED05_OWNER_QA.calls.map(x=>x.name));
    for(const name of ['get_manager_accessible_stores','get_manager_weekly_availability','list_schedule_generations'])if(!calls.includes(name))throw new Error('missing '+name);
    return calls.join(',');
  });

  await check('owner_store_switch_reloads_same_canonical_read_path_without_leak',async()=>{
    const before=await owner.evaluate(()=>window.__SCHED05_OWNER_QA.calls.length);
    await owner.locator('#msdStore').selectOption('store-b');
    await owner.locator('#panel-publish').filter({hasText:'Chi CN2'}).waitFor();
    const text=await owner.locator('#panel-publish').innerText();
    if(text.includes('An CN1')||text.includes('Bình CN1'))throw new Error('cross-store stale content: '+text);
    const calls=await owner.evaluate(before=>window.__SCHED05_OWNER_QA.calls.slice(before),before);
    const scoped=calls.filter(x=>['get_manager_weekly_availability','list_schedule_generations'].includes(x.name));
    if(scoped.length<2||scoped.some(x=>x.args.p_store_id!=='store-b'))throw new Error(JSON.stringify(calls));
    return 'store-b scoped reload';
  });

  const manager=await context.newPage();
  await check('manager_canonical_scheduling_surface_loads',async()=>{
    await manager.goto(base+'/09_QA/people-shift/manager-workforce-canonical-fixture.html');
    await manager.locator('.msd').waitFor();
    const text=await manager.locator('#panel-publish').innerText();
    if(!text.includes('Availability là dữ liệu đầu vào')||!text.includes('Bản nháp'))throw new Error(text);
    const calls=await manager.evaluate(()=>window.__MW31_QA.calls.map(x=>x.name).filter(Boolean));
    for(const name of ['get_manager_accessible_stores','get_manager_weekly_availability','list_schedule_generations'])if(!calls.includes(name))throw new Error('missing '+name);
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
