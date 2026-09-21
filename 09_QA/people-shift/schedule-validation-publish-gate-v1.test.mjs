import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");
const migrationPath="07_DATABASE/migrations/20260921171458_task_094_schedule_validation_publish_gate_v1.sql";

function fn(sql,name,nextName){
  const start=sql.indexOf(`create or replace function public.${name}`);
  assert.ok(start>=0,`missing ${name}`);
  const end=nextName?sql.indexOf(`create or replace function public.${nextName}`,start+1):sql.indexOf("revoke execute on function",start+1);
  assert.ok(end>start,`missing end for ${name}`);
  return sql.slice(start,end);
}

test("TASK-094 migration is additive and preserves published lineage/audit",async()=>{
  const sql=await read(migrationPath);
  assert.match(sql,/add column if not exists reviewed_by uuid references public\.profiles\(id\)/);
  assert.match(sql,/add column if not exists reviewed_at timestamptz/);
  assert.match(sql,/add column if not exists published_by uuid references public\.profiles\(id\)/);
  assert.match(sql,/add column if not exists source_generation_id uuid references public\.schedule_generation_runs\(id\)/);
  assert.match(sql,/add column if not exists source_generation_assignment_id uuid references public\.schedule_generation_assignments\(id\)/);
  assert.match(sql,/create unique index if not exists uq_work_schedules_source_generation_assignment/);
  assert.doesNotMatch(sql,/delete\s+from\s+public\.schedule_generation_runs/i);
  assert.doesNotMatch(sql,/update\s+public\.work_schedules\s+set\s+source_generation/i);
});

test("create_schedule_generation is server-serialized create-or-resume and fails closed on legacy duplicate versions",async()=>{
  const sql=await read(migrationPath);
  const create=fn(sql,"create_schedule_generation","validate_schedule_generation_v1");
  assert.match(create,/pg_advisory_xact_lock/);
  assert.match(create,/status in \('DRAFT','REVIEWED','PUBLISHED'\)/);
  assert.match(create,/v_active_count>1[\s\S]*GENERATION_VERSION_CONFLICT/);
  assert.match(create,/v_status='DRAFT'[\s\S]*return v_id/);
  assert.match(create,/GENERATION_ALREADY_REVIEWED/);
  assert.match(create,/GENERATION_ALREADY_PUBLISHED/);
  assert.match(create,/ACTOR_NOT_ACTIVE/);
  assert.match(create,/STORE_NOT_ACTIVE/);
  assert.match(create,/can_access_store/);
  assert.doesNotMatch(create,/staffing_requirements|auto_generate_schedule_generation/);
});

test("canonical validator contains only Workforce V1 blocking invariants, not staffing-demand coverage",async()=>{
  const sql=await read(migrationPath);
  const validate=fn(sql,"validate_schedule_generation_v1","replace_schedule_generation_assignments");
  for(const code of [
    "GENERATION_STATUS_NOT_VALIDATABLE",
    "GENERATION_STORE_INVALID",
    "INVALID_GENERATION_WEEK",
    "COMPETING_GENERATION_EXISTS",
    "OFFICIAL_STORE_WEEK_ALREADY_EXISTS",
    "EMPLOYEE_NOT_FOUND",
    "EMPLOYEE_INACTIVE",
    "EMPLOYEE_NOT_STAFF",
    "ASSIGNMENT_STORE_MISMATCH",
    "ASSIGNMENT_OUTSIDE_GENERATION_WEEK",
    "INVALID_ASSIGNMENT_INTERVAL",
    "ASSIGNMENT_STATUS_INVALID",
    "AVAILABILITY_MISMATCH",
    "ASSIGNMENT_OVERLAP",
    "OFFICIAL_SCHEDULE_OVERLAP",
    "MAX_TWO_ASSIGNMENTS_PER_EMPLOYEE_DAY"
  ]) assert.match(validate,new RegExp(code),code);
  assert.match(validate,/availability_type in \('AVAILABLE','PREFERRED'\)/);
  assert.match(validate,/count\(\*\)::integer[\s\S]*public\.work_schedules[\s\S]*total_count/);
  assert.match(validate,/jsonb_build_object\([\s\S]*'valid'[\s\S]*'violations'[\s\S]*'warnings'/);
  for(const legacy of [
    "staffing_requirements",
    "minimum_headcount",
    "target_headcount",
    "maximum_headcount",
    "MINIMUM_COVERAGE_SHORTAGE",
    "MAXIMUM_COVERAGE_EXCEEDED",
    "TARGET_NOT_MET",
    "employee_constraints",
    "employee_skills",
    "MIN_REST_NOT_MET",
    "MENTOR_REQUIRED"
  ]) assert.equal(validate.includes(legacy),false,`legacy blocker: ${legacy}`);
  assert.doesNotMatch(validate,/preferred_store_id\s*=\s*a\.store_id/);
});

test("replace assignments is DRAFT-only, payload-hardened and reuses canonical validator atomically",async()=>{
  const sql=await read(migrationPath);
  const replace=fn(sql,"replace_schedule_generation_assignments","review_schedule_generation");
  assert.match(replace,/for update/);
  assert.match(replace,/GENERATION_NOT_DRAFT/);
  assert.match(replace,/ASSIGNMENT_PAYLOAD_MALFORMED/);
  assert.match(replace,/ASSIGNMENT_REQUIRED_FIELDS_MISSING/);
  assert.match(replace,/INVALID_ASSIGNMENT_INTERVAL/);
  assert.match(replace,/ASSIGNMENT_OUTSIDE_GENERATION_WEEK/);
  assert.match(replace,/ASSIGNMENT_STORE_MISMATCH/);
  assert.match(replace,/ASSIGNMENT_STATUS_MUST_BE_DRAFT/);
  assert.match(replace,/ASSIGNMENT_EMPLOYEE_NOT_FOUND/);
  assert.match(replace,/public\.validate_schedule_generation_v1\(p_generation_id\)/);
  assert.match(replace,/ASSIGNMENT_VALIDATION_FAILED/);
  assert.match(replace,/insert into public\.schedule_generation_assignments/);
  assert.doesNotMatch(replace,/insert into public\.work_schedules/);
});

test("review is explicit, revalidates, and retry is idempotent without official writes",async()=>{
  const sql=await read(migrationPath);
  const review=fn(sql,"review_schedule_generation","publish_schedule_generation");
  assert.match(review,/p_decision text/);
  assert.match(review,/pg_advisory_xact_lock/);
  assert.match(review,/v_run\.status='REVIEWED'[\s\S]*already_reviewed/);
  assert.match(review,/public\.validate_schedule_generation_v1\(p_generation_id\)/);
  assert.match(review,/GENERATION_VALIDATION_FAILED/);
  assert.match(review,/status='REVIEWED',reviewed_by=auth\.uid\(\),reviewed_at=now\(\)/);
  assert.doesNotMatch(review,/insert into public\.work_schedules/);
});

test("publish revalidates, records lineage, and same-generation retry is idempotent",async()=>{
  const sql=await read(migrationPath);
  const publish=fn(sql,"publish_schedule_generation",null);
  assert.match(publish,/pg_advisory_xact_lock/);
  assert.match(publish,/v_run\.status='PUBLISHED'/);
  assert.match(publish,/'already_published',true/);
  assert.match(publish,/'inserted_schedule_count',0/);
  assert.match(publish,/GENERATION_MUST_BE_REVIEWED/);
  assert.match(publish,/public\.validate_schedule_generation_v1\(p_generation_id\)/);
  assert.match(publish,/source_generation_id,source_generation_assignment_id/);
  assert.match(publish,/p_generation_id,a\.id/);
  assert.match(publish,/published_by=auth\.uid\(\)/);
  assert.match(publish,/status='PUBLISHED'/);
  assert.equal((publish.match(/insert into public\.work_schedules/g)||[]).length,1);
});

test("schedule mutation RPCs revoke anonymous/public execution and retain authenticated boundary",async()=>{
  const sql=await read(migrationPath);
  for(const signature of [
    "create_schedule_generation\\(uuid,date,text\\)",
    "replace_schedule_generation_assignments\\(uuid,jsonb\\)",
    "validate_schedule_generation_v1\\(uuid\\)",
    "review_schedule_generation\\(uuid,text\\)",
    "publish_schedule_generation\\(uuid\\)"
  ]){
    assert.match(sql,new RegExp(`revoke execute on function public\\.${signature} from public,anon`));
    assert.match(sql,new RegExp(`grant execute on function public\\.${signature} to authenticated`));
  }
});
