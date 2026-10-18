import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261018213000_manager_post_publish_adjustment_v1.sql');
const ui=read('05_MANAGER/Workforce/post-publish-adjustment-v1.js');
const engine=read('05_MANAGER/Workforce/engine-v1.js');

test('Post-publication changes are locked to published weeks and authenticated managers',()=>{
 assert.match(migration,/PUBLISHED_WEEK_REQUIRED/);
 assert.match(migration,/auth\.uid\(\) IS NULL/);
 assert.match(migration,/OWNER','STORE_MANAGER/);
 assert.match(migration,/ACTOR_NOT_ACTIVE/);
 assert.match(migration,/can_access_store\(p_store_id\)/);
 assert.match(migration,/employee_store_priorities/);
 assert.match(migration,/EMPLOYEE_INACTIVE_OR_INVALID/);
 assert.match(migration,/SHIFT_ALREADY_STARTED/);
});

test('Both adjustment RPCs enforce cross-store overlap and max two shifts',()=>{
 assert.match(migration,/OFFICIAL_SCHEDULE_OVERLAP/);
 assert.match(migration,/MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY/);
 assert.match(migration,/workforce_cross_store:/);
 assert.match(migration,/pg_advisory_xact_lock/);
 assert.match(migration,/add_published_shift_v1/);
 assert.match(migration,/reassign_published_shift_v1/);
});

test('Adjustments are audited atomically and audit table is not directly exposed',()=>{
 assert.match(migration,/manager_post_publish_shift_audit_v1/);
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
 assert.match(migration,/REVOKE ALL ON public\.manager_post_publish_shift_audit_v1 FROM PUBLIC,anon,authenticated/);
 assert.match(migration,/INSERT INTO public\.manager_post_publish_shift_audit_v1/g);
 assert.match(migration,/reason text NOT NULL CHECK/);
 assert.match(migration,/list_manager_post_publish_audit_v1/);
 assert.doesNotMatch(migration,/(?:DROP TABLE|TRUNCATE|DELETE FROM public\.work_schedules)/i);
});

test('Official schedule mounts add/reassign/audit UI using real RPCs',()=>{
 assert.match(engine,/post-publish-adjustment-v1\.js\?v=20261018-post-publish-v1/);
 assert.match(ui,/list_employee_workforce_profiles_v1/);
 assert.match(ui,/add_published_shift_v1/);
 assert.match(ui,/reassign_published_shift_v1/);
 assert.match(ui,/list_manager_post_publish_audit_v1/);
 assert.match(ui,/Lý do điều động/);
 assert.match(ui,/Đang tải dữ liệu nhân viên/);
 assert.match(ui,/MutationObserver\(sync\)/);
 assert.doesNotMatch(ui,/localStorage\.setItem/);
});