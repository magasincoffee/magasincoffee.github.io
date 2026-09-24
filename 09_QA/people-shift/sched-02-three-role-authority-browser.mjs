import { chromium } from 'playwright';

const base=process.env.QA_BASE_URL||'http://127.0.0.1:8767';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh'});
const checks=[];

async function check(name,fn){
  try{checks.push({name,status:'PASS',detail:String(await fn()??'')});}
  catch(error){checks.push({name,status:'FAIL',detail:error?.stack||String(error)});throw error;}
}

try{
  const manager=await context.newPage();
  await check('manager_uses_only_canonical_store_scoped_writer',async()=>{
    await manager.goto(base+'/09_QA/people-shift/manager-workforce-canonical-fixture.html');
    await manager.locator('.msd').waitFor();
    await manager.locator('#msdStart').click();
    await manager.waitForFunction(()=>globalThis.__MW31_QA.state.generation?.id==='gen-1');
    const cross=await manager.evaluate(()=>globalThis.__MW31_QA.rpc('create_schedule_generation',{
      p_store_id:'store-b',p_week_start:'2026-09-28',p_algorithm_version:'MANAGER_DIRECT_V1'
    }));
    if(!cross.error?.message.includes('STORE_NOT_ALLOWED'))throw new Error(JSON.stringify(cross));
    const calls=await manager.evaluate(()=>globalThis.__MW31_QA.calls);
    const names=calls.map(x=>x.name).filter(Boolean);
    if(names.includes('auto_generate_schedule_generation')||names.includes('get_workforce_staffing_requirements'))throw new Error(JSON.stringify(names));
    if(calls.some(x=>x.kind==='from'))throw new Error('direct table call');
    return 'store-a canonical create; store-b denied; 0 legacy writer/table calls';
  });

  await check('manager_stale_publish_is_server_revalidated',async()=>{
    await manager.locator('.msd-source-row').nth(0).locator('[data-add-av]').click();
    await manager.locator('#msdSave').click();
    await manager.waitForFunction(()=>globalThis.__MW31_QA.state.assignments.length===1);
    await manager.evaluate(async()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.review());
    await manager.waitForFunction(()=>globalThis.__MW31_QA.state.generation?.status==='REVIEWED');
    await manager.evaluate(()=>globalThis.__MW31_QA.setPersonStatus('u-1','INACTIVE'));
    manager.once('dialog',d=>d.accept());
    await manager.evaluate(async()=>globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.publish());
    await manager.waitForFunction(()=>globalThis.__MW31_QA.state.generation?.status==='DRAFT');
    const state=await manager.evaluate(()=>({
      status:globalThis.__MW31_QA.state.generation.status,
      official:globalThis.__MW31_QA.state.official.length,
      failures:globalThis.__MW31_QA.state.publishFailures
    }));
    if(state.status!=='DRAFT'||state.official!==0||state.failures!==1)throw new Error(JSON.stringify(state));
    return JSON.stringify(state);
  });

  const employee=await context.newPage();
  await check('employee_scheduling_surface_is_self_only_rpc_boundary',async()=>{
    await employee.goto(base+'/09_QA/people-shift/employee-availability-canonical-fixture.html');
    await employee.waitForFunction(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.calls.some(x=>x.name==='get_my_availability'));
    const q=await employee.evaluate(async()=>globalThis.MAGASIN_CORE.supabase.rpc('publish_schedule_generation',{p_generation_id:'malicious-generation'}));
    if(!q.error)throw new Error('employee publish unexpectedly accepted by fixture boundary');
    const calls=await employee.evaluate(()=>globalThis.__EMPLOYEE_AVAILABILITY_QA.calls);
    if(calls.some(x=>x.kind==='from'))throw new Error('direct table call');
    const allowed=new Set(['get_my_availability','save_my_availability','delete_my_availability']);
    const normal=calls.filter(x=>x.kind==='rpc'&&allowed.has(x.name)).map(x=>x.name);
    if(!normal.includes('get_my_availability'))throw new Error(JSON.stringify(normal));
    return 'own availability RPC; forged publish request rejected';
  });

  const schedule=await context.newPage();
  await check('employee_published_schedule_reader_returns_only_self_approved_projection',async()=>{
    await schedule.goto(base+'/09_QA/people-shift/employee-published-weekly-schedule-fixture.html?published=1&now=2026-09-28T01:00:00.000Z');
    const frame=schedule.frameLocator('#employeeApp');
    await frame.locator('#view-schedule').filter({hasText:'CN-QA-A'}).waitFor();
    const state=await schedule.evaluate(()=>({
      rows:globalThis.MAGASIN_EMPLOYEE.schedule.getRows(),
      calls:globalThis.__TASK095_QA.calls.filter(x=>x.kind==='rpc').map(x=>x.name)
    }));
    if(state.rows.some(x=>x.status!=='APPROVED'))throw new Error(JSON.stringify(state.rows));
    if(state.calls.some(x=>['get_my_schedule','list_my_approved_schedules_v1'].includes(x)))throw new Error(JSON.stringify(state.calls));
    if(!state.calls.includes('list_my_approved_schedules_v2'))throw new Error(JSON.stringify(state.calls));
    return state.rows.length+' own APPROVED rows through V2';
  });

  const owner=await context.newPage();
  await check('owner_store_switch_reads_same_canonical_truth_without_cross_store_stale_rows',async()=>{
    await owner.goto(base+'/09_QA/people-shift/sched-05-owner-scheduling-fixture.html');
    await owner.locator('.msd').waitFor();
    await owner.locator('#msdStore').selectOption('store-b');
    await owner.locator('#panel-publish').filter({hasText:'Chi CN2'}).waitFor();
    const text=await owner.locator('#panel-publish').innerText();
    if(text.includes('An CN1')||text.includes('Bình CN1'))throw new Error(text);
    const calls=await owner.evaluate(()=>globalThis.__SCHED01_OWNER_QA.calls);
    if(calls.some(x=>x.kind==='from'))throw new Error('direct table call');
    return 'Owner store-b canonical writer read; no stale store-a projection';
  });

  console.log(JSON.stringify({marker:'SCHED_02_THREE_ROLE_AUTHORITY_BROWSER=PASS',checks},null,2));
}finally{
  await context.close();
  await browser.close();
}
