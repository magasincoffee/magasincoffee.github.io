import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const sql=fs.readFileSync('07_DATABASE/migrations/20261010220000_xstore_019k_employment_type_priority_v1.sql','utf8');
const scheduler=fs.readFileSync('05_MANAGER/Workforce/draft-publish-v1.js','utf8');
const employee=fs.readFileSync('06_EMPLOYEE/profile/engine-v1.js','utf8');
const staff=fs.readFileSync('05_MANAGER/Workforce/staff-projection-v1.js','utf8');

test('canonical storage: no duplicate profile column; explicit FT/PT and no blanket migration backfill',()=>{
 assert.match(sql,/insert into public\.employee_constraints \(user_id, employment_type, status, updated_at\)/);
 assert.doesNotMatch(sql,/alter table public\.profiles add column|update public\.employee_constraints set employment_type|update public\.profiles set employment_type/i);
 assert.match(sql,/p_employment_type not in \('FULL_TIME','PART_TIME'\)/);
 assert.match(sql,/v_old is distinct from p_employment_type/);
 assert.match(sql,/employee_employment_type_audit_v1/);
});
test('server business authority: deny employee self-write, unauthorized managers, nonactive staff',()=>{
 assert.match(sql,/v_role not in \('OWNER','STORE_MANAGER'\)/);
 assert.match(sql,/a\.id=auth\.uid\(\) and a\.status='ACTIVE'/);
 assert.match(sql,/p\.id=p_employee_id\s+and p\.status='ACTIVE'/);
 assert.match(sql,/esp\.employee_id=p_employee_id and public\.can_access_store\(esp\.store_id\)/);
 assert.match(sql,/raise exception 'STORE_NOT_ALLOWED'/);
 assert.match(sql,/raise exception 'EMPLOYEE_CONSTRAINTS_INACTIVE'/);
 assert.match(sql,/revoke execute on function public\.set_employee_employment_type_v1\(uuid,text\)\s+from public, anon, authenticated/);
 assert.match(sql,/grant execute on function public\.set_employee_employment_type_v1\(uuid,text\) to authenticated/);
});
test('readers have independent authority, no backward incompatible MER return signature change',()=>{
 assert.match(sql,/create or replace function public\.list_employee_employment_types_v1\(\)/);
 assert.match(sql,/create or replace function public\.get_my_employee_employment_type_v1\(\)/);
 assert.doesNotMatch(sql,/create or replace function public\.list_employee_workforce_profiles_v1\(\)/);
 assert.match(sql,/ec\.employment_type in \('FULL_TIME','PART_TIME'\) then ec\.employment_type else null/);
 assert.match(sql,/revoke all on public\.employee_employment_type_audit_v1 from public, anon, authenticated/);
 assert.match(sql,/alter table public\.employee_employment_type_audit_v1 enable row level security/);
});
test('cross-store auto DRAFT: hard eligibility, global FT pass before PT-only residual pass',()=>{
 assert.match(sql,/ea\.availability_type in \('AVAILABLE','PREFERRED'\)/);
 assert.match(sql,/and p\.status='ACTIVE'/);
 assert.match(sql,/join public\.employee_store_priorities esp\s+on esp\.employee_id=p\.id and esp\.store_id=r\.store_id/);
 assert.match(sql,/not exists\([\s\S]+?public\.work_schedules ws/);
 assert.match(sql,/case when ec\.employment_type='FULL_TIME' then 0\s+when ec\.employment_type='PART_TIME' then 1 else 2 end,\s+greatest/);
 assert.match(sql,/esp\.priority asc/);
 const order=sql.indexOf("case when ec.employment_type='FULL_TIME' then 0");
 const hard=sql.indexOf("and p.status='ACTIVE'");
 assert.ok(hard<order,'hard eligibility evaluated in WHERE');
 assert.match(sql,/create or replace function public\.auto_generate_cross_store_schedule_v1/);
 assert.match(sql,/v_generation_ids jsonb/);
});
test('global two-pass execution: every FT window considered before PT, true gaps only, unknown excluded',()=>{
 assert.match(sql,/v_employment_pass integer;/);
 assert.match(sql,/for v_employment_pass in 0\.\.1 loop\s+for r in[\s\S]*?workforce_recurring_staffing_requirements req/);
 assert.match(sql,/and \(\(v_employment_pass=0 and ec\.employment_type='FULL_TIME'\)\s+or \(v_employment_pass=1 and ec\.employment_type='PART_TIME'\)\)/);
 assert.match(sql,/if v_employment_pass=1 then\s+for g in\s+select shortage_start,shortage_end,assigned_headcount,missing_headcount/);
 assert.match(sql,/end loop;\s+end if;\s+end loop;\s+end loop;\s+update public\.schedule_generation_runs gr/);
 assert.match(sql,/greatest\(g\.shortage_start,ea\.start_time\) as candidate_start/);
 assert.match(sql,/least\(g\.shortage_end,ea\.end_time\) as candidate_end/);
 assert.match(sql,/and not exists\(/); // overlap/official schedule guards must remain
 assert.doesNotMatch(sql,/coalesce\(ec\.employment_type\s*,\s*'PART_TIME'\)/i);
});
test('Manager candidate tie breakers: available before unavailable, FT before PT, Store Priority retained',()=>{
 const rank=scheduler.match(/function employmentTypeRank\(v\)\{[^\n]+\}/)?.[0];
 const compare=scheduler.match(/function compareEligibleType\(a,b\)\{[^\n]+\}/)?.[0];
 assert.ok(rank&&compare);
 const ctx={};vm.runInNewContext(rank+'\n'+compare+'\nthis.rank=employmentTypeRank;this.compare=compareEligibleType;',ctx);
 assert.equal(ctx.rank('FULL_TIME'),0);assert.equal(ctx.rank('PART_TIME'),1);assert.equal(ctx.rank(null),2);
 assert.ok(ctx.compare({employment_type:'FULL_TIME'},{employment_type:'PART_TIME'})<0);
 assert.ok(ctx.compare({employment_type:null},{employment_type:'PART_TIME'})>0);
 assert.match(scheduler,/Number\(y\.availability_match\)-Number\(x\.availability_match\)\|\|compareEligibleType\(x,y\)\|\|Number\(x\.priority\)-Number\(y\.priority\)/);
 assert.match(scheduler,/Number\(Boolean\(b\.targetAvailable\)\)-Number\(Boolean\(a\.targetAvailable\)\)\s+\|\|compareEligibleType\(a,b\)\s+\|\|Number\(a\.priority\)-Number\(b\.priority\)/);
});
test('Manager and Employee presentation: explicit write and read-only, no direct table writer',()=>{
 assert.match(staff,/client\(\)\.rpc\('set_employee_employment_type_v1'/);
 assert.match(staff,/client\(\)\.rpc\('list_employee_employment_types_v1'/);
 assert.match(staff,/data-msp-employment/);
 assert.match(staff,/data-msp-type-save/);
 assert.match(staff,/CHƯA LƯU: cần triển khai chức năng FT\/PT trên database/);
 assert.match(staff,/if\(state\.employmentTypeReady\)return/);
 assert.doesNotMatch(staff,/\+\(typeReady\?'':' disabled'\)\+'><option value="">Chưa phân loại/);
 assert.match(staff,/EMPLOYMENT_TYPE_PERSISTENCE_NOT_VERIFIED/);
 assert.match(staff,/if\(!\['FULL_TIME','PART_TIME'\]\.includes\(value\)\)/);
 assert.doesNotMatch(scheduler,/data-msd-set-employment|employmentAdminHtml|set_employee_employment_type_v1/);
 assert.match(scheduler,/list_employee_employment_types_v1/);
 assert.match(employee,/get_my_employee_employment_type_v1/);
 assert.match(employee,/setValue\('profileEmploymentType',employmentTypeText\(r\.employment_type\)\)/);
 assert.doesNotMatch(employee,/set_employee_employment_type_v1/);
 assert.doesNotMatch(scheduler,/\.from\(['"]employee_constraints['"]\)\.(insert|update|upsert)/);
 assert.doesNotMatch(staff,/\.from\(['"]employee_constraints['"]\)\.(insert|update|upsert)/);
});
