import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(p,'utf8');
const migration = read('07_DATABASE/migrations/20260923160755_sched_01_production_blocker_repair_v1.sql');
const ownerPublish = read('04_OWNER/Workforce/03-publish/engine-v1.js');
const ownerRuntime = read('04_OWNER/Workforce/runtime/owner-workforce-runtime.html');
const managerDraft = read('05_MANAGER/Workforce/draft-publish-v1.js');
const managerOfficial = read('05_MANAGER/Workforce/official-v1.js');
const employeeSchedule = read('06_EMPLOYEE/schedule/engine-v1.js');
const employeeAvailability = read('06_EMPLOYEE/availability/engine-v1.js');
const sot = read('01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1_SOURCE_OF_TRUTH.md');

function body(name,nextName='') {
  const start=migration.indexOf('create or replace function public.'+name);
  assert.notEqual(start,-1,'missing '+name);
  const end=nextName ? migration.indexOf('create or replace function public.'+nextName,start+1) : migration.indexOf('revoke execute',start+1);
  assert.ok(end>start,'cannot bound '+name);
  return migration.slice(start,end);
}

test('SCHED-01 repairs exact RETURNS TABLE ambiguity with explicit aliases',()=>{
  const gen=body('get_schedule_generation','get_schedule_generation_assignments');
  const assignments=body('get_schedule_generation_assignments');
  assert.match(gen,/select\s+sgr\.store_id\s+into\s+v_store/i);
  assert.match(gen,/sgr_check\.id\s*=\s*p_generation_id/i);
  assert.match(gen,/sgr_check\.store_id\s+is\s+null/i);
  assert.doesNotMatch(gen,/where\s+id\s*=\s*p_generation_id/i);
  assert.doesNotMatch(gen,/\bwhere\s+store_id\b/i);
  assert.match(assignments,/select\s+sgr\.store_id\s+into\s+v_store/i);
  assert.match(assignments,/sgr_created\.id\s*=\s*p_generation_id/i);
  assert.doesNotMatch(assignments,/select\s+store_id\s+into\s+v_store/i);
});

test('SCHED-01 keeps generation readers fail-closed and authenticated-only',()=>{
  assert.match(migration,/security definer[\s\S]*?set search_path=public/i);
  assert.match(migration,/revoke execute on function public\.get_schedule_generation\(uuid\) from public, anon/i);
  assert.match(migration,/revoke execute on function public\.get_schedule_generation_assignments\(uuid\) from public, anon/i);
  assert.match(migration,/grant execute on function public\.get_schedule_generation\(uuid\) to authenticated/i);
  assert.match(migration,/grant execute on function public\.get_schedule_generation_assignments\(uuid\) to authenticated/i);
  assert.match(migration,/v_role='STORE_MANAGER'[\s\S]*?can_access_store\(v_store\)/i);
});

test('SCHED-01 reconciliation preserves history and prevents active split-brain',()=>{
  assert.match(migration,/bool_and\(g\.status='DRAFT'\)/i);
  assert.match(migration,/schedule_generation_assignments a[\s\S]*?a\.generation_id=g\.id/i);
  assert.match(migration,/work_schedules ws[\s\S]*?ws\.source_generation_id=g\.id/i);
  assert.match(migration,/set status='CANCELLED'/i);
  assert.doesNotMatch(migration,/delete\s+from\s+public\.schedule_generation_runs/i);
  assert.match(migration,/create unique index if not exists uq_schedule_generation_active_store_week_v1/i);
  assert.match(migration,/where status in \('DRAFT','REVIEWED','PUBLISHED'\)/i);
});

test('ONE canonical scheduling path is wired across Owner Manager Employee',()=>{
  assert.match(sot,/work_schedules \/ canonical published assignment truth/);
  assert.match(ownerRuntime,/\/05_MANAGER\/runtime\/manager-shell-v1\.html/);
  assert.match(ownerRuntime,/\/05_MANAGER\/Workforce\/draft-publish-v1\.js\?v=20260924-sched05/);
  assert.match(ownerPublish,/\/05_MANAGER\/Workforce\/draft-publish-v1\.js\?v=20260924-sched05/);
  assert.doesNotMatch(ownerPublish,/auto_generate_schedule_generation|review_schedule_generation|publish_schedule_generation/);
  for(const rpc of ['get_manager_accessible_stores','get_manager_weekly_availability','list_schedule_generations','get_schedule_generation_assignments','create_schedule_generation','replace_schedule_generation_assignments','validate_schedule_generation_v1','review_schedule_generation','publish_schedule_generation']){
    assert.ok(managerDraft.includes("'"+rpc+"'")||managerDraft.includes('"'+rpc+'"'),'Manager missing '+rpc);
  }
  assert.match(managerOfficial,/get_manager_weekly_schedule/);
  assert.match(employeeSchedule,/list_my_approved_schedules_v2/);
  assert.match(employeeAvailability,/get_my_availability/);
  assert.match(employeeAvailability,/save_my_availability/);
  assert.match(employeeAvailability,/delete_my_availability/);
  assert.doesNotMatch(managerDraft,/\.from\(['"]work_schedules['"]\)/);
  assert.doesNotMatch(managerOfficial,/\.from\(['"]work_schedules['"]\)/);
  assert.doesNotMatch(employeeSchedule,/\.from\(['"]work_schedules['"]\)/);
});

test('legacy generation read repair does not introduce parallel write truth',()=>{
  const writes=[...managerDraft.matchAll(/\.rpc\(['"]([^'"]+)['"]/g)].map(x=>x[1]);
  assert.ok(writes.includes('replace_schedule_generation_assignments'));
  assert.ok(writes.includes('publish_schedule_generation'));
  assert.equal(writes.filter(x=>x==='publish_schedule_generation').length,1);
  assert.doesNotMatch(migration,/insert\s+into\s+public\.work_schedules/i);
});

console.log('SCHED_01_PRODUCTION_BLOCKER_REPAIR=PASS');
