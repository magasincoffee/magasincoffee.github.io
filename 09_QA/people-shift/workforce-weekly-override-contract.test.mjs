import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261021163000_workforce_weekly_staffing_overrides_v1.sql');
const js=read('05_MANAGER/SchedulingV2/weekly-override-ui-v1.js');
const html=read('05_MANAGER/SchedulingV2/index.html');
test('weekly override is a distinct server-owned table, not a destructive template rewrite',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.workforce_weekly_staffing_overrides_v1/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE .* FROM PUBLIC, anon, authenticated/);
 assert.doesNotMatch(sql,/DELETE FROM public\.workforce_recurring_staffing_requirements|DELETE FROM public\.staffing_requirement_templates/);
 assert.match(sql,/LEFT JOIN public\.workforce_weekly_staffing_overrides_v1/);
 assert.match(sql,/coalesce\(o\.target_headcount,b\.target_headcount\)/);
 assert.match(sql,/p_week_start\+6/);
 assert.match(sql,/WEEK_OVERRIDE_STALE_RELOAD/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/target_headcount BETWEEN 0 AND 20/);
 assert.match(sql,/WEEK_START_MUST_BE_MONDAY/);
 assert.match(sql,/STORE_NOT_ALLOWED/);
 assert.match(sql,/extract\(minute from start_time\) IN \(0,30\)/);
 assert.match(sql,/extract\(minute from end_time\) IN \(0,30\)/);
});
test('Manager UI uses one scheduled weekly scope, server RPCs and explicit save',()=>{
 assert.doesNotThrow(()=>new Function(js));
 assert.match(html,/weekly-override-ui-v1\.js/);
 assert.match(html,/weekly-override-v1\.css/);
 for(const rpc of ['list_workforce_recurring_staffing_requirements_v1','list_workforce_effective_weekly_staffing_v1',
  'get_workforce_weekly_override_state_v1','replace_workforce_weekly_overrides_v1'])assert.ok(js.includes(rpc),rpc);
 assert.match(js,/p_expected_fingerprint/);
 assert.match(js,/window\.confirm\('Chỉ lưu định mức tuần/);
 assert.match(js,/0 đến 20/);
 assert.doesNotMatch(js,/\.from\(['"](?:staffing_requirements|workforce_recurring_staffing_requirements)/);
 assert.doesNotMatch(js,/publish_schedule_generation|review_schedule_generation/);
});
