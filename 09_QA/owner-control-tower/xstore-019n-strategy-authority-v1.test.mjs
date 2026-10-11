import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectOwnerStrategicSnapshot} from '../../04_OWNER/owner-strategy-source-v1.mjs';

const good = () => ({
 context:{reportingDate:'2026-10-11',branchScope:'ALL',refreshedAt:'2026-10-11T01:00:00Z'},
 revenue:{quality:'ACTUAL',amount:12800000,source:'Reconciled SAPO daily revenue',asOf:'2026-10-11T00:00:00Z'},
 payables:{quality:'ACTUAL',totalDue:2000000,source:'Procurement liabilities',asOf:'2026-10-11T00:00:00Z'},
 workforce:{quality:'ACTUAL',staffingGapCount:2}
});

test('XSTORE-019N trusted revenue includes canonical lineage/date/scope but never invents P&L',()=>{
 const model=projectOwnerStrategicSnapshot(good());
 assert.equal(model.revenue,12800000);
 assert.match(model.revenueMeta,/Reconciled SAPO daily revenue/);
 assert.match(model.revenueMeta,/2026-10-11/);
 assert.match(model.revenueMeta,/phạm vi ALL/);
 assert.equal(model.sourceContracts.revenue.quality,'ACTUAL');
 for(const key of ['cost','profit','margin','cashflow','targetProgress'])assert.equal(model[key],null,key);
 for(const key of ['trend','stores','revenueMix','costMix','products','customers','forecast'])assert.deepEqual(model[key],[],key);
 assert.equal(model.sourceContracts.profit.quality,'UNAVAILABLE');
 assert.deepEqual(model.alerts.map(x=>x.metric),['PAYABLES']);
 assert.match(model.alerts[0].label,/không phải chi phí/);
});

test('XSTORE-019N denies estimated, incomplete and non-reconciled financial amounts',()=>{
 for(const mutation of [
  s=>{s.revenue.quality='ESTIMATE'},
  s=>{s.revenue.quality='GAP'},
  s=>{s.revenue.source=''},
  s=>{s.revenue.asOf=''},
  s=>{s.revenue.amount='12800000'},
  s=>{s.context.reportingDate=null}
 ]){const s=good();mutation(s);const model=projectOwnerStrategicSnapshot(s);assert.equal(model.revenue,null);assert.equal(model.sourceContracts.revenue.quality,'UNAVAILABLE');}
 const s=good();s.payables.quality='GAP';const p=projectOwnerStrategicSnapshot(s);assert.equal(p.alerts.length,0);
 assert.equal(projectOwnerStrategicSnapshot(null).revenue,null);
});

test('XSTORE-019N handoff requires authenticated Control Tower normalized snapshot; no new client writes',()=>{
 const source=fs.readFileSync('04_OWNER/strategy-presentation-v4.js','utf8');
 const adapter=fs.readFileSync('04_OWNER/ControlTower/control-tower-v1.js','utf8');
 assert.match(adapter,/new CustomEvent\('magasin:owner-strategy-snapshot'/);
 assert.match(adapter,/if \(!loading\)/);
 assert.match(source,/projectOwnerStrategicSnapshot\(canonicalSnapshot\)/);
 assert.match(source,/event.detail\?\.snapshot/);
 assert.match(source,/fixture&&fixture.fixture===true/);
 assert.doesNotMatch(source,/\.from\(|\.insert\(|\.upsert\(|\.update\(|\.delete\(/);
});
console.log('XSTORE_019N_OWNER_AUTHORITY_STATIC=PASS');
