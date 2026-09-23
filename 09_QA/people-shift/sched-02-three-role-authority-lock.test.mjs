import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const migration=read('07_DATABASE/migrations/20260923163337_sched_02_three_role_scheduling_authority_lock_v1.sql');
const manager=read('05_MANAGER/Workforce/draft-publish-v1.js');
const employeeAvailability=read('06_EMPLOYEE/availability/engine-v1.js');
const employeeSchedule=read('06_EMPLOYEE/schedule/engine-v1.js');
const ownerReview=read('04_OWNER/Workforce/02-review/engine-v1.js');
const ownerPublish=read('04_OWNER/Workforce/03-publish/engine-v1.js');

function fnBody(name,next){
  const start=migration.indexOf('create or replace function public.'+name);
  assert.notEqual(start,-1,'missing '+name);
  const end=next?migration.indexOf('create or replace function public.'+next,start+1):migration.indexOf('alter table',start+1);
  assert.ok(end>start,'cannot bound '+name);
  return migration.slice(start,end);
}

test('SCHED-02 store scope is active-actor and exact-token, never substring authority',()=>{
  const body=fnBody('can_access_store','manager_has_store_access');
  assert.match(body,/v_status<>'ACTIVE'/i);
  assert.match(body,/v_role='OWNER'/i);
  assert.match(body,/v_role<>'STORE_MANAGER'/i);
  assert.match(body,/regexp_split_to_table\(upper\(v_scope\),'\[,; \]\+'\)/i);
  assert.match(body,/token in \('ALL','\*',v_code\)/i);
  assert.doesNotMatch(body,/position\s*\(/i);
});

test('SCHED-02 Manager reads require explicit scoped store',()=>{
  for(const name of ['get_manager_weekly_availability','get_manager_weekly_schedule','list_schedule_generations']){
    const body=fnBody(name, name==='get_manager_weekly_availability'?'get_manager_weekly_schedule':name==='get_manager_weekly_schedule'?'list_schedule_generations':'get_schedule_generation');
    assert.match(body,/v_role='STORE_MANAGER' and p_store_id is null then raise exception 'STORE_REQUIRED_FOR_MANAGER'/i,name);
    assert.match(body,/not public\.can_access_store\(p_store_id\)/i,name);
  }
});

test('SCHED-02 generation private readers are Owner or Manager only',()=>{
  const a=fnBody('get_schedule_generation','get_schedule_generation_assignments');
  const b=fnBody('get_schedule_generation_assignments','get_my_availability');
  for(const body of [a,b]){
    assert.match(body,/v_role not in \('OWNER','STORE_MANAGER'\).*ROLE_NOT_ALLOWED/is);
    assert.match(body,/p\.status='ACTIVE'/i);
    assert.doesNotMatch(body,/created_by\s*=\s*auth\.uid\(\)/i);
    assert.match(body,/can_access_store\(v_store\)/i);
  }
});

test('SCHED-02 Employee availability and published schedule are active-self only',()=>{
  const get=fnBody('get_my_availability','save_my_availability');
  const save=fnBody('save_my_availability','delete_my_availability');
  const del=fnBody('delete_my_availability','list_my_approved_schedules_v2');
  const schedule=fnBody('list_my_approved_schedules_v2');
  for(const body of [get,save,del,schedule]){
    assert.match(body,/p\.status='ACTIVE'/i);
    assert.match(body,/upper\(coalesce\(p\.role,''\)\) in \('STAFF','EMPLOYEE'\)/i);
  }
  assert.match(save,/where id=p_availability_id and user_id=v_user/i);
  assert.doesNotMatch(save,/v_role\s*=\s*'OWNER'/i);
  assert.match(del,/ea\.id=p_availability_id and ea\.user_id=auth\.uid\(\)/i);
  assert.match(schedule,/ws\.user_id=auth\.uid\(\)/i);
});

test('SCHED-02 protected browser direct DML is revoked',()=>{
  for(const table of ['employee_availability','schedule_generation_runs','schedule_generation_assignments','work_schedules','staffing_requirement_templates']){
    assert.match(migration,new RegExp('revoke all on table public\\.'+table+' from anon,authenticated','i'));
  }
  assert.match(migration,/drop policy if exists schedules_insert on public\.work_schedules/i);
  assert.match(migration,/drop policy if exists schedules_update on public\.work_schedules/i);
  assert.match(migration,/employee_availability_write_self/i);
});

test('SCHED-02 duplicate legacy authority is server-deactivated',()=>{
  const names=[
    'manager_update_employee_availability\\(uuid,time,time,uuid,text\\)',
    'create_store_transfer_request\\(uuid,uuid,time,time,text\\)',
    'review_store_transfer_request\\(uuid,boolean,text\\)',
    'get_manager_transfer_requests\\(date\\)',
    'auto_generate_schedule_generation\\(uuid,date,text\\)',
    'cancel_schedule_generation\\(uuid\\)',
    'upsert_workforce_staffing_requirement\\(uuid,uuid,date,time,time,text,integer,integer,integer,integer,text,text\\)',
    'delete_workforce_staffing_requirement\\(uuid\\)',
    'get_my_schedule\\(\\)',
    'list_my_approved_schedules_v1\\(\\)'
  ];
  for(const n of names)assert.match(migration,new RegExp('revoke execute on function public\\.'+n+' from public,anon,authenticated','i'),n);
});

test('SCHED-02 canonical Manager writer remains one direct path',()=>{
  for(const rpc of ['create_schedule_generation','replace_schedule_generation_assignments','validate_schedule_generation_v1','review_schedule_generation','publish_schedule_generation']){
    assert.ok(manager.includes("'"+rpc+"'")||manager.includes('"'+rpc+'"'),'missing '+rpc);
  }
  assert.doesNotMatch(manager,/auto_generate_schedule_generation/);
  assert.doesNotMatch(manager,/get_workforce_staffing_requirements/);
  assert.doesNotMatch(manager,/\.from\(['"](?:work_schedules|employee_availability|schedule_generation_runs|schedule_generation_assignments)['"]\)/);
});

test('SCHED-02 Employee browser surfaces use only self RPCs for scheduling truth',()=>{
  for(const rpc of ['save_my_availability','delete_my_availability'])assert.ok(employeeAvailability.includes("'"+rpc+"'")||employeeAvailability.includes('"'+rpc+'"'));
  assert.match(employeeSchedule,/list_my_approved_schedules_v2/);
  const combined=employeeAvailability+'\n'+employeeSchedule;
  for(const forbidden of ['create_schedule_generation','replace_schedule_generation_assignments','review_schedule_generation','publish_schedule_generation','manager_update_employee_availability','auto_generate_schedule_generation'])assert.ok(!combined.includes(forbidden),forbidden);
  assert.doesNotMatch(combined,/\.from\(['"](?:work_schedules|employee_availability|schedule_generation_runs|schedule_generation_assignments)['"]\)/);
});

test('SCHED-02 Owner legacy UI is compatibility-only because server authority is revoked',()=>{
  assert.match(ownerReview,/manager_update_employee_availability/);
  assert.match(ownerPublish,/auto_generate_schedule_generation/);
  assert.match(migration,/manager_update_employee_availability[\s\S]*DEPRECATED/i);
  assert.match(migration,/auto_generate_schedule_generation[\s\S]*DEPRECATED AS ACTIVE WRITER/i);
  assert.match(ownerPublish,/review_schedule_generation/);
  assert.match(ownerPublish,/publish_schedule_generation/);
});

console.log('SCHED_02_THREE_ROLE_SCHEDULING_AUTHORITY_LOCK=PASS');
