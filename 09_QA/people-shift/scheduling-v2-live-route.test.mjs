import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const get=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');

test('Canonical Manager scheduling hosts V2 without a legacy redirect loop',async()=>{
  const [host,legacy,canonical,v2,rollout]=await Promise.all([
    get('manager/scheduling/index.html'),
    get('05_MANAGER/Lich-lam/index.html'),
    get('02_CORE/navigation/canonical-role-route-v1.js'),
    get('05_MANAGER/SchedulingV2/index.html'),
    get('05_MANAGER/SchedulingV2/rollout-config-v1.js')
  ]);
  assert.match(host,/SchedulingV2\/index\.html\?mode=live/);
  assert.match(host,/requireActive\(\)/);
  assert.match(host,/role!=='STORE_MANAGER'/);
  assert.doesNotMatch(host,/canonical-role-route-v1\.js|history\.replaceState/);
  assert.match(legacy,/location\.replace\('\/manager\/scheduling\/'\)/);
  assert.match(legacy,/location\.replace\('\/owner\/scheduling\/'\)/);
  assert.match(legacy,/requireActive\(\)/);
  assert.doesNotMatch(legacy,/<iframe\b|manager-runtime-v1\.html/);
  assert.match(canonical,/bridge:'\/manager\/scheduling\/'/);
  assert.ok(v2.indexOf('rollout-config-v1.js')<v2.indexOf('read-adapter-v1.js'));
  assert.match(rollout,/MAGA(SIN|S IN)_SCHEDULING_V2_/);
  assert.doesNotMatch(rollout,/Mở V1 dự phòng|\/05_MANAGER\/Workforce\//);
  assert.doesNotMatch(rollout,/service_role|secret_key|sk-proj/);
});

test('V2 live controls and separate demand editor remain active on canonical host',async()=>{
  const [host,rollout,demand]=await Promise.all([
    get('manager/scheduling/index.html'),
    get('05_MANAGER/SchedulingV2/rollout-config-v1.js'),
    get('05_MANAGER/SchedulingV2/Demand/index.html')
  ]);
  for(const flag of ['draft-editor','release-preview','auto-preview','post-publish-preview'])assert.ok(host.includes(flag),flag);
  assert.ok(rollout.includes('demand-preview'));
  assert.match(demand,/rollout-config-v1\.js/);
  assert.match(demand,/demand-settings-v1\.js/);
  assert.doesNotMatch(host,/replace_schedule_generation_assignments|publish_schedule_generation/);
});
