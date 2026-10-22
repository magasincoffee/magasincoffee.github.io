import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read = file=>readFile(new URL('../../'+file,import.meta.url),'utf8');

test('Manager P0.2 router parses and activates only on authorized canonical shell hosts',async()=>{
 const [router,shell,canonical]=await Promise.all([
  read('02_CORE/ui/manager-module-router-v1.js'),
  read('02_CORE/ui/magasin-ui-v2-shell.js'),
  read('manager/scheduling/index.html')
 ]);
 assert.doesNotThrow(()=>new Function(router));
 assert.match(router,/shell\?\.role !== 'MANAGER'/);
 assert.match(router,/MAGASIN_MANAGER_SPA_ROUTER/);
 assert.match(router,/legacyHost && !/);
 assert.match(canonical,/requireActive\(\)/);
 assert.match(canonical,/role!=='STORE_MANAGER'/);
 assert.match(shell,/MAGASIN_MANAGER_MODULE_ROUTER\?\.navigate\(view\)/);
});

test('Manager P0.2 preserves canonical deep links while not calling full-page location.assign in SPA path',async()=>{
 const [router,bridge]=await Promise.all([
  read('02_CORE/ui/manager-module-router-v1.js'),
  read('05_MANAGER/runtime/compat/router/manager-route-bridge-v1.js')
 ]);
 for(const route of ['/manager/', '/manager/scheduling/', '/manager/schedule/','/manager/#']){
  assert.ok(router.includes(route),route);
 }
 assert.match(router,/top\.history\.pushState/);
 assert.match(router,/addEventListener\('popstate'/);
 assert.match(bridge,/spa\?\.navigate/);
 assert.match(bridge,/section'\)==='demand'/);
 assert.doesNotMatch(router,/\.location\.assign\(|\.location\.replace\(/);
});

test('Manager P0.2 retains two live content frames and protects unsaved edits',async()=>{
 const [router,demand,weekly,editor,css]=await Promise.all([
  read('02_CORE/ui/manager-module-router-v1.js'),
  read('05_MANAGER/SchedulingV2/Demand/demand-settings-v1.js'),
  read('05_MANAGER/SchedulingV2/weekly-override-ui-v1.js'),
  read('05_MANAGER/SchedulingV2/editor-ui-v1.js'),
  read('02_CORE/ui/magasin-ui-v2-shell.css')
 ]);
 assert.match(router,/all = new Map\(\)/);
 assert.match(router,/all\.has\(view\)/);
 assert.match(router,/frame\.hidden = k !== key/);
 assert.match(router,/context\.storeId/);
 assert.match(router,/context\.weekStart/);
 assert.match(router,/new Event\('change'/);
 assert.match(router,/top\.confirm\(/);
 assert.match(router,/top\.addEventListener\('beforeunload'/);
 assert.match(router,/getElementById\('sv2ShiftLayer'\)/);
 assert.match(demand,/MAGASIN_MANAGER_EDIT_STATE=Object\.freeze/);
 assert.match(weekly,/isDirty:\(\)=>changed\(\)\|\|saving/);
 assert.match(editor,/sv2ShiftLayer/);
 assert.match(css,/m-manager-router-frame\[hidden\]/);
});

test('Manager P0.2 does not change Owner shell or SQL/RLS/attendance',async()=>{
 const router=await read('02_CORE/ui/manager-module-router-v1.js');
 for(const forbidden of ['.rpc(','.from(','.insert(','.update(','.delete(', 'service_role']) {
  assert.ok(!router.includes(forbidden),forbidden);
 }
});
