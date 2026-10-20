import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = p => readFile(new URL('../../'+p,import.meta.url),'utf8');

test('canonical Scheduling Manager host owns precisely the same shared Manager shell as Home',async()=>{
 const [host,shell,css] = await Promise.all([
  source('manager/scheduling/index.html'),
  source('02_CORE/ui/magasin-ui-v2-shell.js'),
  source('02_CORE/ui/magasin-ui-v2-shell.css')
 ]);
 assert.match(host,/magasin-ui-v2-shell\.css\?v=20261020-one-shell1/);
 assert.match(host,/magasin-ui-v2-shell\.js\?v=20261020-one-shell1/);
 assert.match(host,/window\.__MAGASIN_UI_V2_SHELL__=\{role:'MANAGER',mode:'standalone'\}/);
 assert.match(host,/requireActive\(\)/);
 assert.match(host,/role!=='STORE_MANAGER'/);
 assert.match(host,/status\|\|''\)\.toUpperCase\(\)==='ACTIVE'/);
 assert.match(host,/document\.body\.append\(identity,scope\)/);
 assert.match(host,/MANAGER_SHELL_NOT_MOUNTED/);
 assert.match(host,/frame\.addEventListener\('load'/);
 assert.match(shell,/id = 'magasinUiV2Shell'/);
 assert.match(shell,/m-shell-v2-sidebar/);
 assert.match(shell,/m-shell-v2-topbar/);
 assert.match(shell,/m-shell-v2-sidebar__footer/);
 assert.match(css,/\[data-magasin-shell-mode="standalone"\]/);
});

test('Scheduling and Demand suppress child sidebar only within the authenticated canonical Manager host',async()=>{
 const [schedule,demand,nav,css] = await Promise.all([
  source('05_MANAGER/SchedulingV2/index.html'),
  source('05_MANAGER/SchedulingV2/Demand/index.html'),
  source('05_MANAGER/SchedulingV2/manager-navigation-v2.js'),
  source('05_MANAGER/SchedulingV2/schedule-v2.css')
 ]);
 for(const page of [schedule,demand]){
  assert.match(page,/window\.top!==window/);
  assert.match(page,/window\.top\.location\.pathname/);
  assert.match(page,/dataset\.sv2ManagerHost='shared'/);
  assert.match(page,/schedule-v2\.css\?v=20261020-one-shell1/);
  assert.match(page,/manager-navigation-v2\.js\?v=20261020-one-shell1/);
 }
 assert.match(nav,/dataset\.sv2ManagerHost === 'shared'\) return/);
 assert.match(css,/html\[data-sv2-manager-host="shared"\] \.sv2-sidebar/);
 assert.match(css,/html\[data-sv2-manager-host="shared"\] \.sv2-app-header/);
 assert.match(css,/html\[data-sv2-manager-host="shared"\] \.sv2-workspace/);
 assert.match(css,/display:none!important/);
});

test('Shared Manager nav on Scheduling host dispatches all nine modules via canonical URLs',async()=>{
 const [shell,host]=await Promise.all([
  source('02_CORE/ui/magasin-ui-v2-shell.js'),
  source('manager/scheduling/index.html')
 ]);
 assert.match(shell,/config\.mode==='standalone' && \(path==='\/manager\/scheduling\/'/);
 assert.match(shell,/view==='dashboard'\?'\/manager\/'/);
 assert.match(shell,/view==='workforce'\?'\/manager\/scheduling\/'/);
 assert.match(shell,/view==='schedule'\?'\/manager\/schedule\/'/);
 assert.match(shell,/'\/manager\/#'\+encodeURIComponent\(view\)/);
 assert.match(shell,/topWindow\(\)\.location\.assign\(target\)/);
 for(const key of ['dashboard','workforce','swap','attendance','staff','payroll-self-check','schedule','tasks','settings']){
  assert.ok(shell.includes("'"+key+"'"),key);
 }
 assert.doesNotMatch(host,/frame\.src='\/05_MANAGER\/runtime\/manager-runtime-v1/);
});
