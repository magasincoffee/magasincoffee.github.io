import assert from 'node:assert/strict';
const origin='https://magasincoffee.github.io';
const paths=[
 '/05_MANAGER/Workforce/engine-v1.js',
 '/05_MANAGER/Workforce/availability-summary-v1.js',
 '/05_MANAGER/runtime/manager-runtime-v1.html',
 '/05_MANAGER/runtime/compat/router/manager-route-bridge-v1.js',
 '/04_OWNER/Workforce/runtime/owner-workforce-runtime.html',
 '/04_OWNER/Workforce/owner-scheduling-overview-v1.js',
 '/05_MANAGER/SchedulingV2/index.html'
];
async function readRemote(path){
 const response=await fetch(origin+path+'?qa527_verify=907dae33',{
  redirect:'follow',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(16000)
 });
 assert.equal(response.status,200,'HTTP '+response.status+' at '+path);
 return response.text();
}
for(let attempt=1;attempt<=12;attempt++){
 try{
  const [engine,summary,runtime,bridge,owner,overview,schedule]=await Promise.all(paths.map(readRemote));
  assert.ok(engine.includes('/05_MANAGER/Workforce/availability-summary-v1.js?v=20261024-487-as1'),'Manager availability script not published');
  assert.ok(summary.includes('Tổng khoảng đăng ký'),'4th registration metric missing');
  assert.ok(summary.includes('get_manager_weekly_availability'),'Real availability reader missing');
  assert.ok(summary.includes('MAGASIN_WORKFORCE_AVAILABILITY_SUMMARY'),'Manager read-only component missing');
  assert.ok(runtime.includes("'availability'"),'Manager allowlist missing availability route');
  assert.ok(bridge.includes("availability:'Dang-ky-lich'"),'Manager canonical sidebar route missing');
  assert.ok(owner.includes('/05_MANAGER/Workforce/availability-summary-v1.js?v=20261024-487-as1'),'Owner loader missing registration summary');
  assert.ok(overview.includes('ownerRegistrationsSummary'),'Owner overview registration drilldown missing');
  assert.ok(schedule.includes('editor-ui-v1.js?v=20261024-526-clock1'),'P0 24h regression');
  console.log('H4_PAGES_527_MANAGER_OWNER_REGISTERED_WINDOWS_LIVE_ASSETS_PASS');
  console.log('H4_PAGES_526_527_READONLY_POSTDEPLOY_SMOKE_COMPLETE');
  process.exit(0);
 }catch(error){
  console.log('H4_PAGES_527_NOT_READY_ATTEMPT_'+attempt+': '+String(error.message).slice(0,160));
  if(attempt===12)throw error;
  await new Promise(resolve=>setTimeout(resolve,6000));
 }
}
