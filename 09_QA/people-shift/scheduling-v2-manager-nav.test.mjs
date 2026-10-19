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
  assert.match(entry, /'tasks','settings'/);
  assert.match(entry, /if\(view==='workforce'\)\{location\.replace\('\/manager\/scheduling\/'\)/);
  assert.match(canonical, /managerHash=new Set\(\[[^\]]*'tasks','settings'/);
  for (const view of ['staff', 'swap', 'attendance', 'payroll-self-check', 'tasks', 'settings']) {
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
  assert.match(schedule, /src="\.\/manager-navigation-v2\.js\?v=20261019-nav-v2"/);
  assert.match(demand, /src="\.\.\/manager-navigation-v2\.js\?v=20261019-nav-v2"/);
  assert.match(nav, /const demandPage = location\.pathname\.includes\('\/SchedulingV2\/Demand\/'\)/);
  assert.match(nav, /nav\.replaceChildren\(\)/);
  assert.match(nav, /key === current/);
  assert.match(nav, /aria-current/);
  for (const url of [
    '/manager/', '/manager/scheduling/', '/manager/schedule/',
    '/manager/#staff', '/manager/#swap', '/manager/#attendance',
    '/manager/#payroll-self-check', '/manager/#tasks', '/manager/#settings'
  ]) assert.ok(nav.includes(url), url);
  assert.match(nav, /link\.target = key === 'demand' \? '_self' : '_top'/);
  assert.match(nav, /\.\/Demand\/index\.html\?mode=live&demand-preview/);
});

test('Shared nav matches the existing Manager shell primary and secondary navigation', async () => {
  const [shell, nav] = await Promise.all([
    source('02_CORE/ui/magasin-ui-v2-shell.js'),
    source('05_MANAGER/SchedulingV2/manager-navigation-v2.js')
  ]);
  for (const item of [
    ['dashboard', 'Hôm nay'], ['workforce', 'Xếp lịch'],
    ['swap', 'Đổi / Cho ca'], ['attendance', 'Chấm công'],
    ['staff', 'Nhân viên'], ['payroll-self-check', 'Công / Lương'],
    ['schedule', 'Lịch đã phát hành'], ['tasks', 'Công việc'],
    ['settings', 'Cài đặt']
  ]) {
    const [key, label] = item;
    assert.ok(shell.includes("'" + key + "'") && shell.includes("'" + label + "'"), key + ' in Manager shell');
    assert.ok(nav.includes("'" + key + "'") && nav.includes("'" + label + "'"), key + ' in Scheduling shell');
  }
  assert.doesNotMatch(nav, /\.rpc\(|\.from\(|\.insert\(|\.update\(|publish_schedule_generation/);
  assert.match(nav, /document\.createElement\('a'\)/);
  assert.match(nav, /label\.textContent = title/);
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
