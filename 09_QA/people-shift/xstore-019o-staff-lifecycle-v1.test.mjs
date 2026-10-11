import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const sql=fs.readFileSync('07_DATABASE/migrations/20261011224000_xstore_019o_staff_lifecycle_v1.sql','utf8');
test('XSTORE-019O only reversible statuses, audited with record FK, no deletes',()=>{
 assert.match(sql,/public\.employee_lifecycle_audit_v1/);
 assert.match(sql,/references public\.profiles\(id\)/);
 assert.match(sql,/reason text not null/);
 assert.match(sql,/set status=p_new_status/);
 assert.doesNotMatch(sql,/delete\s+from\s+public\.profiles|delete\s+from\s+auth\.users|cascade\s+delete/i);
});
test('status RPC security definer and role, actor and all-store guard',()=>{
 assert.match(sql,/set_employee_lifecycle_status_v1\(/);
 assert.match(sql,/security definer set search_path=public/);
 assert.match(sql,/if auth\.uid\(\) is null then raise exception 'AUTH_REQUIRED'/);
 assert.match(sql,/v_role not in \('OWNER','STORE_MANAGER'\)/);
 assert.match(sql,/ACTOR_NOT_ACTIVE/);
 assert.match(sql,/EMPLOYEE_ALL_STORES_SCOPE_REQUIRED/);
 assert.match(sql,/LIFECYCLE_REASON_INVALID/);
 assert.match(sql,/LIFECYCLE_NO_CHANGE/);
 assert.match(sql,/pg_advisory_xact_lock/);
});
test('cross-store full scope checks priorities plus official and generated assignments',()=>{
 for(const entity of ['employee_store_priorities','work_schedules','schedule_generation_assignments'])assert.match(sql,new RegExp('public\\.'+entity));
 assert.match(sql,/not coalesce\(public\.can_access_store/);
 assert.match(sql,/EMPLOYEE_ALL_STORES_SCOPE_REQUIRED/);
});
test('read-only capability RPC is scoped, writes remain independently authorized',()=>{
 assert.match(sql,/list_employee_lifecycle_controls_v1\(\)/);
 assert.match(sql,/employee_lifecycle_full_scope_v1\(p\.id\)/);
 assert.match(sql,/revoke execute on function public\.employee_lifecycle_full_scope_v1\(uuid\) from public, anon, authenticated/);
 assert.match(sql,/grant execute on function public\.list_employee_lifecycle_controls_v1\(\) to authenticated/);
 assert.match(sql,/grant execute on function public\.set_employee_lifecycle_status_v1\(uuid,text,text\) to authenticated/);
 assert.match(sql,/revoke all on public\.employee_lifecycle_audit_v1 from public, anon, authenticated/);
});
test('never touches payroll/rosters and returns future published schedule review count',()=>{
 assert.match(sql,/existing_future_official_shifts_for_review/);
 assert.doesNotMatch(sql,/update\s+public\.work_schedules|update\s+public\.schedule_generation_assignments|update\s+public\.payroll/i);
});
