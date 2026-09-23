import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {authorizeWorkforceAccess} from "../../02_CORE/shared/workforce-operations-v1.mjs";

const migrationUrl=new URL("../../07_DATABASE/migrations/20260923105000_task_104_employee_payroll_self_check_v1.sql",import.meta.url);
const employeeEngineUrl=new URL("../../06_EMPLOYEE/payroll/engine-v1.js",import.meta.url);
const employeeRuntimeUrl=new URL("../../06_EMPLOYEE/runtime/employee-runtime-v1.html",import.meta.url);
const managerEngineUrl=new URL("../../05_MANAGER/Workforce/payroll-self-check-v1.js",import.meta.url);
const managerWorkforceEngineUrl=new URL("../../05_MANAGER/Workforce/engine-v1.js",import.meta.url);
const contractUrl=new URL("../../02_CORE/contracts/workforce-operations-v1.json",import.meta.url);

test("TASK-104 canonical access helper keeps Employee payroll self-only and adds Manager store-scoped PAYROLL_READ",()=>{
  assert.equal(authorizeWorkforceAccess({actor_role:"EMPLOYEE",actor_employee_id:"a",subject_employee_id:"a",capability:"PAYROLL_READ"}).ok,true);
  const cross=authorizeWorkforceAccess({actor_role:"EMPLOYEE",actor_employee_id:"a",subject_employee_id:"b",capability:"PAYROLL_READ"});
  assert.equal(cross.ok,false);
  assert.equal(cross.code,"CROSS_USER_DENY");

  const scoped=authorizeWorkforceAccess({actor_role:"MANAGER",subject_employee_id:"b",capability:"PAYROLL_READ",subject_store_id:"s1",allowed_store_ids:["s1"]});
  assert.equal(scoped.ok,true);
  assert.equal(scoped.detail.scope,"STORE");
  assert.equal(authorizeWorkforceAccess({actor_role:"MANAGER",subject_employee_id:"b",capability:"PAYROLL_READ",subject_store_id:"s2",allowed_store_ids:["s1"]}).code,"STORE_SCOPE_DENY");
  assert.equal(authorizeWorkforceAccess({actor_role:"OWNER",subject_employee_id:"b",capability:"PAYROLL_READ"}).detail.scope,"ENTERPRISE");
});

test("TASK-104 does not silently grant Manager PAYROLL_REVIEW or PAYROLL_AUTHORIZED transition authority",()=>{
  const denied=authorizeWorkforceAccess({actor_role:"MANAGER",subject_employee_id:"b",capability:"PAYROLL_REVIEW",subject_store_id:"s1",allowed_store_ids:["s1"]});
  assert.equal(denied.ok,false);
  assert.equal(denied.code,"EXPLICIT_PERMISSION_REQUIRED");
  const allowed=authorizeWorkforceAccess({actor_role:"MANAGER",subject_employee_id:"b",capability:"PAYROLL_REVIEW",subject_store_id:"s1",allowed_store_ids:["s1"],explicit_permissions:["PAYROLL_REVIEW"]});
  assert.equal(allowed.ok,true);
});

test("TASK-104 Employee reader is auth.uid self-only, ACTIVE employee-only, read-only and least privilege",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/create or replace function public\.get_my_payroll_self_check_v1\(\)/);
  assert.match(sql,/v_uid uuid := auth\.uid\(\)/);
  assert.match(sql,/v_profile\.status <> 'ACTIVE'/);
  assert.match(sql,/v_profile\.role not in \('STAFF','EMPLOYEE'\)/);
  assert.match(sql,/where pe\.employee_id = v_uid/);
  assert.match(sql,/revoke execute on function public\.get_my_payroll_self_check_v1\(\)[\s\S]*from public, anon, authenticated/);
  assert.match(sql,/grant execute on function public\.get_my_payroll_self_check_v1\(\)[\s\S]*to authenticated, postgres/);
  assert.doesNotMatch(sql,/p_employee_id uuid[\s\S]*get_my_payroll_self_check_v1/i);
});

test("TASK-104 scoped reader authorizes ACTIVE Manager/Owner and enforces store scope from canonical primitives",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.match(sql,/create or replace function public\.list_scoped_payroll_self_check_v1/);
  assert.match(sql,/v_actor\.status <> 'ACTIVE'/);
  assert.match(sql,/v_actor\.role not in \('STORE_MANAGER','OWNER'\)/);
  assert.match(sql,/v_actor\.role = 'STORE_MANAGER' and p_store_id is null/);
  assert.match(sql,/not public\.can_access_store\(p_store_id\)/);
  assert.match(sql,/scope_ec\.preferred_store_id = p_store_id/);
  assert.match(sql,/p_store_id = any\(coalesce\(scope_ec\.allowed_store_ids/);
  assert.match(sql,/v_actor\.role = 'OWNER'[\s\S]*p_store_id is null/);
});

test("TASK-104 projections expose state and confirmed-work summary but no monetary/pay-rule internals",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  const employee=sql.slice(sql.indexOf("create or replace function public.get_my_payroll_self_check_v1"),sql.indexOf("revoke execute on function public.get_my_payroll_self_check_v1"));
  const scoped=sql.slice(sql.indexOf("create or replace function public.list_scoped_payroll_self_check_v1"),sql.indexOf("revoke execute on function public.list_scoped_payroll_self_check_v1"));
  for(const projection of [employee,scoped]){
    assert.match(projection,/confirmed_work_item_count/);
    assert.match(projection,/confirmed_work_minutes/);
    assert.match(projection,/pe\.state/);
    assert.doesNotMatch(projection,/pe\.pay_rule_reference|pe\.pay_rule_validated|pe\.confirmed_work_source_revision/i);
    assert.doesNotMatch(projection,/\bamount\b|hourly_rate|gross_pay|net_pay/i);
  }
});

test("TASK-104 migration is read-only, fixed-search-path and creates no payroll transition mutation",async()=>{
  const sql=await fs.readFile(migrationUrl,"utf8");
  assert.equal((sql.match(/set search_path = public/g)||[]).length,2);
  const executable=sql.replace(/comment on[\s\S]*?;/gi,"").split("\n").filter(x=>!/^\s*--/.test(x)).join("\n");
  assert.doesNotMatch(executable,/\b(update|insert into|delete from)\s+public\.payroll_entries\b/i);
  assert.doesNotMatch(executable,/PAYROLL_AUTHORIZED/);
  assert.doesNotMatch(executable,/REVIEWED'\s*[,)]|FINALIZED'\s*[,)]|PAID'\s*[,)]/i);
});

test("TASK-104 Employee UI uses self RPC only, renders canonical states and wires runtime",async()=>{
  const [engine,runtime]=await Promise.all([fs.readFile(employeeEngineUrl,"utf8"),fs.readFile(employeeRuntimeUrl,"utf8")]);
  assert.match(engine,/get_my_payroll_self_check_v1/);
  assert.doesNotMatch(engine,/\.from\(['"]payroll_entries['"]\)/);
  assert.doesNotMatch(engine,/service_role/i);
  assert.match(engine,/ESTIMATED:'Ước tính'/);
  assert.match(engine,/FINALIZED:'Đã chốt'/);
  assert.match(engine,/ESTIMATED không bao giờ được trình bày như FINALIZED/);
  assert.match(engine,/Số tiền chưa hiển thị/);
  assert.match(runtime,/\/06_EMPLOYEE\/payroll\/engine-v1\.js\?v=20260923-task104/);
  assert.match(runtime,/E\.payrollSelfCheck\?\.refresh/);
});

test("TASK-104 Manager UI is RPC-only, read-only, store scoped and does not grant review/finalize controls",async()=>{
  const [engine,wiring]=await Promise.all([fs.readFile(managerEngineUrl,"utf8"),fs.readFile(managerWorkforceEngineUrl,"utf8")]);
  assert.match(engine,/get_manager_accessible_stores/);
  assert.match(engine,/list_scoped_payroll_self_check_v1/);
  assert.match(engine,/p_store_id:state\.storeId/);
  assert.doesNotMatch(engine,/\.from\(['"]payroll_entries['"]\)/);
  assert.doesNotMatch(engine,/review_payroll|finalize_payroll|mark_payroll_paid|PAYROLL_AUTHORIZED/i);
  assert.match(engine,/PAYROLL_REVIEW và mọi state transition vẫn yêu cầu explicit permission riêng/);
  assert.match(wiring,/payroll-self-check-v1\.js\?v=20260923-task104/);
});

test("TASK-104 canonical contract preserves exact-state display and unresolved monetary boundary",async()=>{
  const c=JSON.parse(await fs.readFile(contractUrl,"utf8"));
  const x=c.payroll_boundary.self_check_contract;
  assert.equal(x.task,"TASK-104");
  assert.equal(x.employee_authority,"AUTH_UID_ACTIVE_STAFF_OR_EMPLOYEE_SELF_ONLY");
  assert.equal(x.manager_authority,"ACTIVE_STORE_MANAGER_CAN_ACCESS_STORE_READ_ONLY");
  assert.equal(x.mutation_authority,"NONE_TASK_104_IS_READ_ONLY");
  assert.equal(x.manager_review_authority,"NOT_GRANTED_PAYROLL_REVIEW_REMAINS_EXPLICIT_PERMISSION_GATED");
  assert.equal(x.monetary_fields,"ABSENT_UNTIL_CANONICAL_MONETARY_EVALUATOR_EXISTS");
  assert.equal(x.state_display_rule,"RENDER_CANONICAL_STATE_EXACTLY_NEVER_COERCE_ESTIMATED_TO_FINALIZED");
  assert.equal(c.e2e_traceability.find(x=>x.id==="E2E-13").closing_tasks.includes("TASK-104"),true);
  assert.equal(c.e2e_traceability.find(x=>x.id==="E2E-14").closing_tasks.includes("TASK-104"),true);
});
