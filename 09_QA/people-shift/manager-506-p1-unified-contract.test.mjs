import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('#506 P1 uses one canonical Demand table for recurring and week-specific scope',()=>{
 const html=read('05_MANAGER/SchedulingV2/Demand/index.html');
 const base=read('05_MANAGER/SchedulingV2/Demand/demand-settings-v1.js');
 const weekly=read('05_MANAGER/SchedulingV2/Demand/unified-weekly-demand-v1.js');
 assert.doesNotThrow(()=>new Function(base));
 assert.doesNotThrow(()=>new Function(weekly));
 assert.match(html,/id="sv2DemandTable"/);
 assert.equal((html.match(/id="sv2DemandTable"/g)||[]).length,1);
 assert.doesNotMatch(html,/sv2WeekDemandTable/);
 assert.match(html,/unified-weekly-demand-v1\.js/);
 assert.match(html,/week-navigation-v1\.js/);
 assert.match(base,/viewMode!=='recurring'/);
 assert.match(base,/MAGASIN_SCHEDULING_V2_DEMAND_UI/);
 assert.match(weekly,/id="sv2ModeRecurring"/);
 assert.match(weekly,/id="sv2ModeWeekly"/);
 assert.match(weekly,/rows\.replaceChildren\(\)/);
 assert.match(weekly,/ui\.setMode\(next\)/);
 assert.match(weekly,/window\.MAGASIN_SCHEDULING_V2_UNIFIED_WEEKLY/);
});
test('#506 P1 preserves server-owned weekly override writes and fail-closed scope',()=>{
 const weekly=read('05_MANAGER/SchedulingV2/Demand/unified-weekly-demand-v1.js');
 for(const rpc of [
  'list_workforce_recurring_staffing_requirements_v1',
  'get_workforce_weekly_override_state_v1',
  'list_workforce_effective_weekly_staffing_v1',
  'replace_workforce_weekly_overrides_v1'
 ])assert.ok(weekly.includes(rpc),rpc);
 for(const guard of [
  'STORE_NOT_ALLOWED','WEEK_OVERRIDE_STATE_INVALID','WEEK_OVERRIDE_SCOPE_INVALID',
  'validOverrides(state.overrides,selected,monday)','seen.has(k)',
  'p_expected_fingerprint','current.store!==store.value','current.week!==weekStart()',
  'event.stopImmediatePropagation()'
 ])assert.ok(weekly.includes(guard),guard);
 assert.doesNotMatch(weekly,/client\(\)\.from\(|\.insert\(|\.update\(|publish_schedule_generation|delete from/i);
});
test('#506 P1 projects read-only 30 minute staffing directly inside existing roster table',()=>{
 const ui=read('05_MANAGER/SchedulingV2/coverage-ui-v1.js');
 const weekly=read('05_MANAGER/SchedulingV2/weekly-override-ui-v1.js');
 const html=read('05_MANAGER/SchedulingV2/index.html');
 assert.doesNotThrow(()=>new Function(ui));
 assert.match(ui,/inline=!!document\.getElementById\('sv2Table'\)/);
 assert.match(ui,/body\.prepend\(tr\)/);
 assert.match(ui,/data-sv2-coverage-row|sv2CoverageRow/);
 assert.match(ui,/for\(const slot of result\.rows\)/);
 assert.match(ui,/data\.status|cell\.status/);
 assert.match(ui,/list_workforce_effective_weekly_staffing_v1/);
 assert.match(ui,/reader\.week\(s\.storeId,s\.weekStart\)/);
 assert.match(weekly,/document\.getElementById\('sv2Table'\)/);
 assert.match(weekly,/mode:'unified-main-demand-table'/);
 assert.match(html,/coverage-ui-v1\.js/);
 assert.doesNotMatch(ui,/replace_workforce_weekly_overrides_v1|publish_schedule_generation|\.insert\(/);
});
