import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {authorizeWorkforceAccess} from "../../02_CORE/shared/workforce-operations-v1.mjs";

const migrationUrl=new URL("../../07_DATABASE/migrations/20260923060000_task_101_employee_profile_projection_v1.sql",import.meta.url);
const engineUrl=new URL("../../06_EMPLOYEE/profile/engine-v1.js",import.meta.url);
const runtimeUrl=new URL("../../06_EMPLOYEE/runtime/employee-runtime-v1.html",import.meta.url);
const appUrl=new URL("../../06_EMPLOYEE/app/employee-v40.html",import.meta.url);

test("TASK-101 canonical role contract denies Employee cross-user profile access",()=>{
  assert.equal(authorizeWorkforceAccess({actor_role:"EMPLOYEE",actor_employee_id:"a",subject_employee_id:"a",capability:"PROFILE_READ"}).ok,true);
  const cross=authorizeWorkforceAccess({actor_role:"EMPLOYEE",actor_employee_id:"a",subject_employee_id:"b",capability:"PROFILE_READ"});
  assert.equal(cross.ok,false);
  assert.equal(cross.code,"CROSS_USER_DENY");
  assert.equal(authorizeWorkforceAccess({actor_role:"MANAGER",subject_employee_id:"b",capability:"PROFILE_READ",subject_store_id:"s1",allowed_store_ids:["s1"]}).ok,true);
  assert.equal(authorizeWorkforceAccess({actor_role:"MANAGER",subject_employee_id:"b",capability:"PROFILE_READ",subject_store_id:"s2",allowed_store_ids:["s1"]}).code,"STORE_SCOPE_DENY");
  assert.equal(authorizeWorkforceAccess({actor_role:"OWNER",subject_employee_id:"b",capability:"PROFILE_READ"}).detail.scope,"ENTERPRISE");
});

test("TASK-101 self projection is authenticated self-only and ACTIVE Employee-only",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/create or replace function public\.get_my_employee_profile_v1\(\)/);
  assert.match(sql,/v_uid uuid := auth\.uid\(\)/);
  assert.match(sql,/where id = v_uid/);
  assert.match(sql,/v_profile\.status <> 'ACTIVE'/);
  assert.match(sql,/v_profile\.role not in \('STAFF','EMPLOYEE'\)/);
  assert.match(sql,/employee_profile_projection_row_v1\(v_uid\)/);
  assert.match(sql,/revoke execute on function public\.get_my_employee_profile_v1\(\)[\s\S]*from public, anon, authenticated/);
  assert.match(sql,/grant execute on function public\.get_my_employee_profile_v1\(\)[\s\S]*to authenticated, postgres/);
});

test("TASK-101 Manager projection is ACTIVE role + explicit canonical store scope; Owner may use enterprise scope",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/create or replace function public\.list_employee_profile_projection_v1/);
  assert.match(sql,/v_actor\.status <> 'ACTIVE'/);
  assert.match(sql,/v_actor\.role not in \('STORE_MANAGER','OWNER'\)/);
  assert.match(sql,/v_actor\.role = 'STORE_MANAGER' and p_store_id is null/);
  assert.match(sql,/not public\.can_access_store\(p_store_id\)/);
  assert.match(sql,/scope_ec\.preferred_store_id = p_store_id/);
  assert.match(sql,/p_store_id = any\(coalesce\(scope_ec\.allowed_store_ids/);
  assert.match(sql,/v_actor\.role = 'OWNER'[\s\S]*p_store_id is null/);
});

test("TASK-101 projection exposes only operational allowlist and refuses to invent missing canonical sources",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  const start=sql.indexOf("create or replace function public.employee_profile_projection_row_v1");
  const end=sql.indexOf("revoke execute on function public.employee_profile_projection_row_v1");
  const projection=sql.slice(start,end);
  assert.match(projection,/p\.username/);
  assert.match(projection,/p\.full_name/);
  assert.match(projection,/p\.phone/);
  assert.match(projection,/p\.role as employee_role/);
  assert.match(projection,/p\.status as profile_status/);
  assert.match(projection,/ec\.preferred_store_id/);
  assert.match(projection,/eg\.grade as employee_level/);
  assert.match(projection,/null::date as join_date/);
  assert.match(projection,/null::text as pay_rule_reference/);
  assert.doesNotMatch(projection,/p\.email/);
  assert.doesNotMatch(projection,/p\.access_scope/);
  assert.doesNotMatch(projection,/hourly_rate/);
  assert.doesNotMatch(projection,/created_at\s+as\s+join_date/i);
});

test("TASK-101 projection has fixed search_path, no anon authority and no profile mutation",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.equal((sql.match(/set search_path = public/g)||[]).length,3);
  assert.match(sql,/revoke execute on function public\.employee_profile_projection_row_v1\(uuid\)[\s\S]*from public, anon, authenticated/);
  assert.match(sql,/revoke execute on function public\.list_employee_profile_projection_v1\(uuid\)[\s\S]*from public, anon, authenticated/);
  assert.doesNotMatch(sql,/\b(update|insert into|delete from)\s+public\.profiles\b/i);
  assert.doesNotMatch(sql,/\b(update|insert into|delete from)\s+public\.employee_constraints\b/i);
  assert.doesNotMatch(sql,/\b(update|insert into|delete from)\s+public\.employee_grades\b/i);
});

test("TASK-101 Employee UI reads profile by RPC only and runtime wires projection engine",async()=>{
  const [engine,runtime,app]=await Promise.all([
    fs.readFile(engineUrl,"utf8"),
    fs.readFile(runtimeUrl,"utf8"),
    fs.readFile(appUrl,"utf8")
  ]);
  assert.match(engine,/get_my_employee_profile_v1/);
  assert.doesNotMatch(engine,/\.from\(['"]profiles['"]\)/);
  assert.doesNotMatch(engine,/service_role/i);
  assert.match(runtime,/\/06_EMPLOYEE\/profile\/engine-v1\.js\?v=20260923-task101/);
  assert.match(runtime,/E\.profileProjection\?\.refresh/);
  assert.match(app,/if\(view==='profile'\)globalThis\.MAGASIN_EMPLOYEE\?\.profileProjection\?\.refresh/);
  assert.match(app,/id="profilePhone"/);
  assert.match(app,/id="profilePrimaryStore"/);
  assert.match(app,/id="profileLevel"/);
  assert.match(app,/id="profileJoinDate"/);
});
