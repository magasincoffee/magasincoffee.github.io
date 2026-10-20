import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8');

test('Manager and Scheduling V2 use exactly the same canonical ten menu destinations',async()=>{
 const [manager,scheduling]=await Promise.all([read('02_CORE/ui/magasin-ui-v2-shell.js'),read('05_MANAGER/SchedulingV2/manager-navigation-v2.js')]);
 const allowed=new Set(['dashboard','workforce','swap','attendance','staff','payroll-self-check','schedule','demand','tasks','settings']);
 const extract=s=>[...s.matchAll(/\['([^']+)',\s*'[^']+',\s*'([^']+)'/g)].map(x=>[x[1],x[2]]).filter(([key])=>allowed.has(key));
 const actual=extract(manager),other=extract(scheduling);
 assert.equal(actual.length,10);
 assert.deepEqual(actual,other);
 assert.equal(new Set(actual.map(([key])=>key)).size,10);
 assert.match(manager,/demand: \['Nhu cầu nhân sự'/);
});

test('Authenticated Manager container is the sole owner of navigation',async()=>{
 const [shell,legacy,runtime,entry]=await Promise.all([
   read('05_MANAGER/runtime/manager-shell-v1.html'),
   read('05_MANAGER/runtime/compat/ui/manager-ui-shell-v2.js'),
   read('05_MANAGER/runtime/manager-runtime-v1.html'),
   read('05_MANAGER/index.html')
 ]);
 assert.match(legacy,/MAGASIN_MANAGER_UI_V2_011_CANONICAL_SKIPPED/);
 assert.match(legacy,/window\.parent\.document\.querySelector\('iframe#app'\)/);
 assert.match(legacy,/window\.parent\.document\.title==='MAGASIN · Quản trị nội bộ'/);
 assert.match(shell,/data\.managerCanonicalBoot='1'/);
 assert.match(shell,/data-manager-shell-ready="1"/);
 assert.match(runtime,/manager-shell-v1\.html\?v=20261001-ui-unified1&host=manager&shell=20261020-single-manager-shell-v1/);
 assert.match(entry,/manager-runtime-v1\.html\?v=20261018-demand-week-matrix-v1&shell=20261020-single-manager-shell-v1/);
});

test('Legacy Manager source never displays mock staff, swap, attendance or KPI data',async()=>{
 const html=await read('05_MANAGER/runtime/manager-shell-v1.html');
 for(const key of ['dashboard','staff','swap','attendance']){
   const start=html.indexOf('id="view-'+key+'">');
   const end=html.indexOf('<section class="view',start+15);
   assert.ok(start>=0&&end>start,key);
   const section=html.slice(start,end);
   assert.match(section,/Đang tải/);
   assert.doesNotMatch(section,/Trắng|Mai Chi|Minh Anh|\b96\.000đ\b|92% tổng thể/);
 }
});

test('Scheduling and Demand entry points go through an authorized canonical host',async()=>{
 const [shell,gate,nav]=await Promise.all([
  read('02_CORE/ui/magasin-ui-v2-shell.js'),
  read('manager/scheduling/index.html'),
  read('05_MANAGER/SchedulingV2/manager-navigation-v2.js')
 ]);
 assert.match(shell,/workforce: '\/manager\/scheduling\/'/);
 assert.match(shell,/demand: '\/manager\/scheduling\/\?view=demand'/);
 assert.match(gate,/core\.supabase\.requireActive\(\)/);
 assert.match(gate,/role!=='STORE_MANAGER'/);
 assert.match(gate,/get\('view'\)==='demand'/);
 assert.match(gate,/SchedulingV2\/Demand\/index\.html\?mode=live&demand-preview/);
 assert.match(nav,/\['demand', '▦', 'Nhu cầu nhân sự'/);
});

console.log('MANAGER_SINGLE_SIDEBAR_CONTRACT=PASS');
