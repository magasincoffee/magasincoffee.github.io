import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = path => readFile(new URL('../../' + path, import.meta.url), 'utf8');

test('Manager canonical route preserves all allowlisted hash destinations', async () => {
  const [entry, canonical, bridge] = await Promise.all([
    source('05_MANAGER/index.html'),
    source('02_CORE/navigation/canonical-role-route-v1.js'),
    source('05_MANAGER/runtime/compat/router/manager-route-bridge-v1.js')
  ]);
  assert.match(entry, /token==='manager-root'&&allowed\.has\(requested\)\?requested/);
  assert.match(entry, /'tasks','reports','settings'/);
  assert.match(entry, /if\(view==='workforce'\)\{location\.replace\('\/manager\/scheduling\/'\)/);
  assert.match(canonical, /managerHash=new Set\(\[[^\]]*'tasks','reports','settings'/);
  for (const view of ['staff', 'swap', 'attendance', 'payroll-self-check', 'tasks', 'reports', 'settings']) {
    assert.ok(entry.includes("'" + view + "'"), view);
    assert.ok(canonical.includes("'" + view + "'"), view);
    assert.ok(bridge.includes("'" + view + "'") || bridge.includes(view + ':'), view);
  }
  assert.match(bridge, /return '\/manager\/#'\+key/);
});

test('Scheduling and recurring demand screens load the same Manager nav component', async () => {
  const [schedule, demand, nav] = await Promise.all([
    source('05_MANAGER/SchedulingV2/index.html'),
    source('05_MANAGER/SchedulingV2/Demand/index.html'),
    source('05_MANAGER/SchedulingV2/manager-navigation-v2.js')
  ]);
  assert.match(schedule, /src="\.\/manager-navigation-v2\.js\?v=20261022-manager-506-p0a"/);
  assert.match(demand, /src="\.\.\/manager-navigation-v2\.js\?v=20261022-manager-506-p0a"/);
  assert.match(nav, /const demandPage = location\.pathname\.includes\('\/SchedulingV2\/Demand\/'\)/);
  assert.match(nav, /nav\.replaceChildren\(\)/);
  assert.match(nav, /key === current/);
  assert.match(nav, /aria-current/);
  for (const url of [
    '/manager/', '/manager/scheduling/', '/manager/schedule/',
    '/manager/#staff', '/manager/#swap', '/manager/#attendance',
    '/manager/#payroll-self-check', '/manager/scheduling/?section=demand'
  ]) assert.ok(nav.includes(url), url);
  assert.match(nav, /link\.target = '_top'/);
  assert.match(nav, /\['demand',/);
  assert.match(nav, /const current = demandPage \? 'demand' : 'workforce'/);
});

test('Scheduling fallback mirrors the approved #506 Manager groups without revealing placeholder links',async()=>{
  const [shell,nav]=await Promise.all([
    source('02_CORE/ui/magasin-ui-v2-shell.js'),
    source('05_MANAGER/SchedulingV2/manager-navigation-v2.js')
  ]);
  const visible = [
    ['dashboard','Tổng quan'],['staff','Nhân viên'],
    ['payroll-self-check','Công / Lương (xem)'],
    ['demand','Nhu cầu nhân sự'],['workforce','Xếp lịch'],
    ['schedule','Lịch đã công bố'],['attendance','Chấm công'],
    ['swap','Cho / Đổi ca']
  ];
  for(const [key,label] of visible){
    assert.ok(shell.includes("'"+key+"'") && shell.includes("'"+label+"'"),key+' in shell');
    assert.ok(nav.includes("'"+key+"'") && nav.includes("'"+label+"'"),key+' in fallback');
  }
  for(const hidden of ['tasks','reports','settings']){
    assert.ok(shell.includes("'"+hidden+"'"),'hidden compatibility contract: '+hidden);
    assert.ok(!nav.includes("['"+hidden+"',"),'fallback hides '+hidden);
  }
  assert.ok(nav.includes("section.collapsible ? 'details' : 'div'"));
  assert.doesNotMatch(nav,/\.rpc\(|\.from\(|\.insert\(|\.update\(|publish_schedule_generation/);
  assert.match(nav,/document\.createElement\('a'\)/);
  assert.match(nav,/label\.textContent = title/);
});

test('Responsive drawer exposes keyboard and backdrop dismissal without blocking main content', async () => {
  const [nav, css] = await Promise.all([
    source('05_MANAGER/SchedulingV2/manager-navigation-v2.js'),
    source('05_MANAGER/SchedulingV2/schedule-v2.css')
  ]);
  assert.match(nav, /aria-controls/);
  assert.match(nav, /aria-expanded/);
  assert.match(nav, /event\.key === 'Escape'/);
  assert.match(nav, /backdrop\.addEventListener\('click'/);
  assert.match(nav, /classList\.remove\('sv2-nav-open'\)/);
  assert.match(css, /@media\(max-width:1024px\)/);
  assert.match(css, /\.sv2-nav-open \.sv2-sidebar/);
  assert.match(css, /\.sv2-workspace\{width:100%;margin-left:0\}/);
  assert.match(css, /\.sv2-nav-backdrop\[hidden\]\{display:none!important\}/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

console.log('SCHEDULING_V2_MANAGER_NAV_CONTRACT=PASS');

test('Demand toolbar enters live editor and returns through authenticated canonical host',async()=>{
  const [schedule,demand,rollout]=await Promise.all([
    source('05_MANAGER/SchedulingV2/index.html'),
    source('05_MANAGER/SchedulingV2/Demand/index.html'),
    source('05_MANAGER/SchedulingV2/rollout-config-v1.js')
  ]);
  assert.match(schedule,/href="\/manager\/scheduling\/\?section=demand" target="_top"/);
  assert.match(demand,/href="\/manager\/scheduling\/" target="_top" class="sv2-demand-back"/);
  assert.match(rollout,/demand\.href=onDemand\?'\/manager\/scheduling\/'/);
  assert.match(rollout,/demand\.target='_top'/);
  assert.match(rollout,/\/manager\/scheduling\/\?section=demand/);
  assert.doesNotMatch(rollout, /\.\.\/index\.html\?mode=live/);
  assert.doesNotMatch(schedule,/V2 PREVIEW/);
  assert.match(schedule,/05:00–22:00 · 30 phút/);
});

test('Manager V2 shell uses canonical route before stale V1 sidebar and never retries hidden views',async()=>{
  const [shell,runtime]=await Promise.all([
    source('02_CORE/ui/magasin-ui-v2-shell.js'),
    source('05_MANAGER/runtime/manager-runtime-v1.html')
  ]);
  assert.ok(shell.indexOf("const topLocation = topWindow().location;") < shell.indexOf("const source = document.querySelector('.sidebar [data-view].active');"));
  assert.match(shell,/if \(path\.startsWith\('\/manager\/scheduling'\)\) return new URLSearchParams\(topLocation\.search\)\.get\('section'\) === 'demand' \? 'demand' : 'workforce'/);
  assert.match(shell,/if \(path\.startsWith\('\/manager\/schedule\/'\)\) return 'schedule'/);
  assert.match(shell,/if \(path === '\/manager\/' \|\| path === '\/manager'\) return 'dashboard'/);
  assert.match(shell,/view === 'workforce' \|\| view === 'demand' \|\| view === 'schedule'/);
  assert.match(shell,/topWindow\(\)\.location\.assign\(href\)/);
  assert.match(shell,/path === '\/05_manager\/'/);
  assert.doesNotMatch(shell,/path\.startsWith\('\/05_manager\/'\)/);
  assert.doesNotMatch(shell,/attempt \+ 1/);
  assert.match(runtime,/frame\.style\.visibility='hidden'/);
  assert.match(runtime,/getElementById\('magasinUiV2Shell'\)/);
  assert.match(runtime,/20261021-manager-nav-b3/);
});
