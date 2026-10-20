import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');

test('legacy UI2 Manager chrome stops mounting in the nested canonical Manager runtime',async()=>{
 const source=await read('05_MANAGER/runtime/compat/ui/manager-ui-shell-v2.js');
 const window={
  parent:{location:{pathname:'/05_MANAGER/runtime/manager-runtime-v1.html'}},
  top:{location:{pathname:'/manager/'}},
  location:{pathname:'/05_MANAGER/runtime/manager-shell-v1.html',search:'?host=manager'}
 };
 vm.runInNewContext(source,{window,document:{},URLSearchParams},{timeout:1000});
 assert.equal(window.MAGASIN_MANAGER_UI_V2_011_HOSTED_SKIPPED,true);
 assert.equal(window.MAGASIN_MANAGER_UI_V2_011,undefined,'no duplicate decoration or business view rewriting');
 assert.match(source,/parentPath==='\/05_manager\/runtime\/manager-runtime-v1\.html'/);
 assert.match(source,/topPath==='\/manager\/'/);
 assert.match(source,/window\.MAGASIN_MANAGER_UI_V2_011_HOSTED_SKIPPED=true/);
});

test('Owner protection still skips the old Manager UI decorator',async()=>{
 const source=await read('05_MANAGER/runtime/compat/ui/manager-ui-shell-v2.js');
 const window={parent:null,top:null,location:{search:'?host=owner',pathname:'/04_OWNER/Workforce/runtime/owner-workforce-runtime.html'}};
 window.parent=window;window.top=window;
 vm.runInNewContext(source,{window,document:{},URLSearchParams},{timeout:1000});
 assert.equal(window.MAGASIN_MANAGER_UI_V2_011_OWNER_SKIPPED,true);
 assert.equal(window.MAGASIN_MANAGER_UI_V2_011,undefined);
});

test('every retired Manager directory is a one-hop redirect into role-guarded canonical Manager views',async()=>{
 for(const [alias,view] of [
  ['Nhan-su','staff'],['Doi-ca','swap'],['Cham-cong','attendance'],['Cong-viec','tasks']
 ]){
  const html=await read('05_MANAGER/'+alias+'/index.html');
  const target='/manager/#'+view;
  assert.ok(html.includes('location.replace(\''+target+'\')'),alias);
  assert.ok(html.includes('content="0;url='+target+'"'),alias);
  assert.ok(html.includes('href="'+target+'"'),alias);
  assert.doesNotMatch(html,/iframe|manager-runtime-v1|manager-v13|05_MANAGER\/#/i,alias);
 }
 const guarded=await read('05_MANAGER/index.html');
 assert.match(guarded,/requireActive\(\)/);
 assert.match(guarded,/role!=='STORE_MANAGER'/);
 const canonical=await read('manager/index.html');
 assert.match(canonical,/data-route-key="manager-root"/);
});

test('active scheduling engine and the cross-role compatibility bridge remain available',async()=>{
 const [engine,sched,demand,alias]=await Promise.all([
  read('05_MANAGER/Workforce/engine-v1.js'),
  read('manager/scheduling/index.html'),
  read('05_MANAGER/SchedulingV2/Demand/index.html'),
  read('05_MANAGER/Lich-lam/index.html')
 ]);
 assert.match(engine,/manager-scheduling-ui2-v1\.js/);
 assert.match(engine,/swap-approval-v1\.js/);
 assert.match(engine,/attendance-review-v1\.js/);
 assert.match(engine,/payroll-self-check-v1\.js/);
 assert.match(sched,/magasin-ui-v2-shell\.js/);
 assert.match(demand,/dataset\.sv2ManagerHost='shared'/);
 assert.match(alias,/role==='OWNER'/);
 assert.match(alias,/role==='STAFF'\|\|role==='EMPLOYEE'/);
});
