import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('supabase/migrations/20261024212000_workforce_529_auto_schedule_safe_ft8.sql','utf8');
test('#529: reruns replace ONLY known auto-generated rows; protect manual/published',()=>{
 assert.match(sql,/delete from public\.schedule_generation_assignments\s+where generation_id=v_generation\s+and note in \('AUTO_XSTORE_INTERVAL_COMPOSED_V1','AUTO_XSTORE_FT8_529_V1'\)/i);
 assert.match(sql,/and gr\.status in \('REVIEWED','PUBLISHED'\)/);
 assert.match(sql,/OFFICIAL_WEEK_ALREADY_EXISTS/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.doesNotMatch(sql,/delete from public\.schedule_generation_assignments\s+where generation_id=v_generation\s*;/i);
});
test('#529: effective week overrides, fresh availability and store priorities',()=>{
 assert.match(sql,/list_workforce_effective_weekly_staffing_v1\(s\.id,p_week_start\)/);
 assert.match(sql,/from public\.employee_availability ea/);
 assert.match(sql,/join public\.employee_store_priorities esp/);
 assert.match(sql,/public\.can_access_store/);
 assert.match(sql,/and d\.target_headcount>0/);
});
test('#529: full FT 8h is attempted before generic PT fill only when ALL 30m slots are unmet',()=>{
 const ft=sql.indexOf('FT-first 8h pre-pass');
 const fallback=sql.indexOf('fill remaining gaps after the full-length FT pass');
 assert.ok(ft>0 && fallback>ft,'FT full-shift pass must precede generic filling');
 assert.match(sql,/et\.employment_type='FULL_TIME'/);
 assert.match(sql,/ea\.end_time >= ea\.start_time \+ interval '8 hours'/);
 assert.match(sql,/interval '7 hours 30 minutes'/);
 assert.match(sql,/if v_slot_demand<=v_slot_covered then\s+v_ft8_eligible:=false;/);
 assert.match(sql,/if c\.max_daily_hours>0 and v_daily_hours\+8>c\.max_daily_hours/);
 assert.match(sql,/if c\.max_weekly_hours>0 and v_weekly_hours\+8>c\.max_weekly_hours/);
 assert.match(sql,/when 'FULL_TIME' then 0 when 'PART_TIME' then 1/);
 assert.match(sql,/note\s*\)[\s\S]*'DRAFT','AUTO_XSTORE_FT8_529_V1'/);
});
test('#529: never bypass auth/availability/cross-store overlap or publish',()=>{
 assert.match(sql,/if auth\.uid\(\) is null/);
 assert.match(sql,/if v_role not in \('OWNER','STORE_MANAGER'\)/);
 assert.match(sql,/ea\.availability_type in \('AVAILABLE','PREFERRED'\)/);
 assert.match(sql,/and a\.start_time<v_candidate_end and v_candidate_start<a\.end_time/);
 assert.match(sql,/and ws\.start_time<v_candidate_end and v_candidate_start<ws\.end_time/);
 assert.match(sql,/'published',false/);
 assert.match(sql,/v_shortages := v_shortages \|\| jsonb_build_object/);
});
