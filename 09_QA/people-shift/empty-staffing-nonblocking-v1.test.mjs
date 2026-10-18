import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261018220000_empty_staffing_nonblocking_v1.sql');
const draft=read('05_MANAGER/Workforce/draft-publish-v1.js');
const engine=read('05_MANAGER/Workforce/engine-v1.js');
test('Configured empty week produces warning; unconfigured empty week still blocked',()=>{
 assert.match(sql,/workforce_recurring_staffing_requirements/);
 assert.match(sql,/req\.target_headcount>0/);
 assert.match(sql,/EMPTY_STAFFING_SHORTAGE_NON_BLOCKING/);
 assert.match(sql,/EMPTY_GENERATION/);
 assert.match(sql,/'warning_count',jsonb_array_length\(v_warnings\)/);
 assert.match(sql,/OFFICIAL_SCHEDULE_OVERLAP/);
 assert.match(sql,/MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY/);
});
test('Manager can validate, approve and publish a week with zero assigned shifts',()=>{
 assert.match(engine,/draft-publish-v1\.js\?v=20261018-empty-demand-v1/);
 assert.match(draft,/stage==='DRAFT'&&!state\.dirty/);
 assert.match(draft,/stage==='REVIEWED'&&!state\.dirty/);
 assert.doesNotMatch(draft,/if\(state\.assignments\.length===0\)\{state\.lastValidation='INVALID'/);
 assert.match(draft,/Đã phát hành tuần chưa có ca được phân công/);
 assert.match(draft,/EMPTY_STAFFING_SHORTAGE_NON_BLOCKING/);
});
test('No unrelated schedule mutations are introduced by empty-week validation',()=>{
 assert.doesNotMatch(sql,/\b(?:DELETE FROM|TRUNCATE|DROP TABLE)\b/i);
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.validate_schedule_generation_v1/);
});