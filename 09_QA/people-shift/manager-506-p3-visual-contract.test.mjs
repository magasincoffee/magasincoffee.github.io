import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync('05_MANAGER/SchedulingV2/schedule-v2.css','utf8');
const scheduling=readFileSync('05_MANAGER/SchedulingV2/index.html','utf8');
const demand=readFileSync('05_MANAGER/SchedulingV2/Demand/index.html','utf8');

test('#506 P3: shared Manager host hides only redundant Scheduling disclaimer',()=>{
  assert.match(css,/html\[data-sv2-manager-host="shared"\]\s+\.sv2\s*>\s*footer\s*\{\s*display:\s*none!important\s*\}/);
  assert.match(scheduling,/<footer>MAGASIN/);
  assert.match(demand,/id="sv2DemandSave"/);
  assert.doesNotMatch(css,/html\[data-sv2-manager-host="shared"\]\s+\.sv2-demand-footer\s*\{\s*display:\s*none/);
});

test('#506 P3: refresh stylesheet cache and retain keyboard/finger targets',()=>{
  assert.match(scheduling,/schedule-v2\.css\?v=20261023-manager-506-p3a/);
  assert.match(css,/\.sv2-primary-action,\.sv2-advanced>summary,\.sv2-bar #sv2Refresh\s*\{min-height:44px!important\}/);
  assert.match(css,/\.sv2-primary-action:focus-visible,\.sv2-advanced>summary:focus-visible\s*\{outline:3px solid/);
});
