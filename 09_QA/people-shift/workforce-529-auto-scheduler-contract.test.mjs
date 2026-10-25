import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync('supabase/migrations/20261024212000_workforce_529_auto_schedule_safe_ft8.sql','utf8');
const ui=fs.readFileSync('05_MANAGER/Workforce/cross-store-auto-schedule-v1.js','utf8');
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

test('#529: safe rerun UI is disabled on legacy backend and never calls old replacement RPC',()=>{
 assert.match(sql,/get_workforce_auto_scheduler_capabilities_529\(\)/);
 assert.match(sql,/auto_generate_cross_store_schedule_529\(/);
 assert.match(ui,/state\.safeRerunAvailable&&workflow\.stage==='DRAFT'/);
 assert.match(ui,/if\(!\(await safeRerunCapability\(\)\)\)throw Error\('SAFE_RERUN_VERSION_REQUIRED'\)/);
 assert.match(ui,/replaceExisting\?'auto_generate_cross_store_schedule_529':'auto_generate_cross_store_schedule_v1'/);
 assert.match(ui,/Đề xuất lại \(giữ ca thủ công\)/);
});

test('#529: Manager shows only current-week FT8 diagnostics returned by scheduler',()=>{
 assert.match(sql,/'ft8_rejection_diagnostics',v_ft8_diagnostics/);
 assert.match(sql,/'employee_name',c\.employee_name/);
 assert.match(ui,/ft8DiagnosticsHtml\(\)/);
 assert.match(ui,/Array\.isArray\(result\.ft8_rejection_diagnostics\)/);
 assert.match(ui,/if\(weekChanged\)\{[^\n]*state\.ft8Diagnostics=\[\]/);
 assert.match(ui,/const who=String\(d\.employee_name\|\|''\)\.trim\(\)/);
 assert.match(ui,/esc\(who\)/);
 assert.match(ui,/gợi ý từ lần đề xuất vừa chạy/);
 assert.doesNotMatch(ui,/client\(\)\.rpc\('auto_generate_cross_store_schedule_529'[^\n]*ft8DiagnosticsHtml/);
});

test('#529: unclassified staff are reported to Manager but never auto-classified',()=>{
 assert.match(sql,/left join public\.employee_employment_types_v1 et on et\.employee_id=ea\.user_id/);
 assert.match(sql,/and et\.employee_id is null/);
 assert.match(sql,/'unclassified_staff',v_unclassified_staff/);
 assert.match(ui,/function unclassifiedStaffHtml\(\)/);
 assert.match(ui,/Array\.isArray\(result\.unclassified_staff\)/);
 assert.match(ui,/state\.unclassifiedStaff=\[\]/);
 assert.match(ui,/esc\(who\)/);
});
