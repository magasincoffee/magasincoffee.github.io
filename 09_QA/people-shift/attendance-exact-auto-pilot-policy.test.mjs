import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=async path=>fs.readFile(new URL('../../'+path,import.meta.url),'utf8');
test('P0 exact-shift per-store policy is default OFF and browser roles cannot toggle it',async()=>{
 const sql=await read('07_DATABASE/migrations/20261024015515_workforce_attendance_exact_auto_confirm_v1.sql');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.attendance_auto_confirm_policy_v1/);
 assert.match(sql,/enabled boolean NOT NULL DEFAULT false/);
 assert.match(sql,/ALTER TABLE public\.attendance_auto_confirm_policy_v1 ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE public\.attendance_auto_confirm_policy_v1 FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT SELECT,INSERT,UPDATE ON TABLE public\.attendance_auto_confirm_policy_v1 TO service_role,postgres/);
 assert.match(sql,/v_auto := p_actual_start = v_schedule\.start_time[\s\S]*v_note is null[\s\S]*policy\.store_id = v_schedule\.store_id and policy\.enabled is true/);
 assert.doesNotMatch(sql,/INSERT INTO public\.attendance_auto_confirm_policy_v1/,'Migration must not implicitly activate ANY store');
});
test('P0 dedicated isolated fixture opts in ONLY CN3, signed JWT covers unenabled CN1',async()=>{
 const seed=await read('09_QA/people-shift/attendance-exact-auto-pilot-fixture.sql');
 const jwt=await read('09_QA/people-shift/attendance-exact-auto-jwt-e2e.mjs');
 assert.match(seed,/91000000-0000-4000-8000-000000000003.*true/);
 assert.doesNotMatch(seed,/91000000-0000-4000-8000-000000000001.*true/);
 assert.match(jwt,/exact shift at unenabled CN1 remains pending/);
 assert.match(jwt,/assert\.equal\(x\.status,'NEEDS_REVIEW'\)/);
});
test('P0 UI is truthful about opt-in while rollback preserves prior auto-confirmed payroll',async()=>{
 const employee=await read('06_EMPLOYEE/attendance/engine-v1.js');
 const manager=await read('05_MANAGER/Workforce/attendance-review-v1.js');
 const rollback=await read('09_QA/people-shift/attendance-exact-auto-write-rollback.sql');
 const plan=await read('01_DOCS/MAGASIN/05_SYSTEM/ATTENDANCE_AUTO_CONFIRM_PILOT_RELEASE_GATE_2026_10_24.md');
 assert.match(employee,/Nếu chi nhánh đã bật tự xác nhận/);
 assert.match(manager,/Ca khớp lịch ở chi nhánh đã bật chính sách/);
 assert.match(manager,/done\.filter\(r=>r\.status==='AUTO_CONFIRMED'/);
 assert.match(rollback,/CREATE OR REPLACE FUNCTION public\.submit_manual_time_attendance_v1/);
 assert.doesNotMatch(rollback,/DROP TABLE|DELETE FROM|ALTER TABLE public\.attendance/i);
 assert.match(plan,/Pilot \*\*mặc định OFF/);
});
