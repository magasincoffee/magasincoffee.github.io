import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(new URL("../../"+p,import.meta.url),"utf8");

test("TASK-106 fixture reuses canonical payroll truth/state helpers",()=>{
 const src=read("09_QA/people-shift/workforce-payroll-cross-flow-fixture.mjs");
 assert.match(src,/buildPayrollEstimateBasisV1/);
 assert.match(src,/validatePayrollTruthTransition/);
 assert.match(src,/liveActorMapping:"UNRESOLVED_NOT_TESTED"/);
 assert.doesNotMatch(src,/hourly_rate|gross_pay|net_pay|overtime|allowance|deduction/i);
});

test("TASK-106 server-side QA source selector mirrors TASK-103 confirmed-only contract",()=>{
 const src=read("09_QA/people-shift/workforce-payroll-cross-flow-fixture.mjs");
 for(const token of [
  'a.submission_status==="SUBMITTED"',
  'a.status==="APPROVED"&&a.review_decision==="APPROVE"',
  'a.status==="ADJUSTED"&&a.review_decision==="ADJUST"',
  'a.confirmed_start&&a.confirmed_end',
  'Number.isInteger(a.confirmed_minutes)'
 ]) assert.ok(src.includes(token),token);
 assert.match(src,/serverBuildPayroll/);
 assert.match(src,/PAYROLL_REVISION_CONFLICT/);
});

test("TASK-103 production builder remains server-only and browser payroll table DML remains revoked",()=>{
 const sql=read("07_DATABASE/migrations/20260923100426_task_103_payroll_calculation_integration_v1.sql");
 assert.match(sql,/revoke all on table public\.payroll_entries from public, anon, authenticated/i);
 assert.match(sql,/revoke execute on function public\.build_payroll_estimate_v1[\s\S]*from public, anon, authenticated/i);
 assert.match(sql,/grant execute on function public\.build_payroll_estimate_v1[\s\S]*to service_role, postgres/i);
});

test("TASK-106 E2E-13 uses contract-only abstract actor without inventing live PAYROLL_AUTHORIZED mapping",()=>{
 const contract=JSON.parse(read("02_CORE/contracts/workforce-operations-v1.json"));
 assert.equal(contract.payroll_boundary.authorization_contract.live_actor_mapping,"UNRESOLVED_DO_NOT_INVENT_IN_TASK_102");
 const fixture=read("09_QA/people-shift/workforce-payroll-cross-flow-fixture.mjs");
 assert.match(fixture,/actor:"PAYROLL_AUTHORIZED"/);
 assert.match(fixture,/liveActorMapping:"UNRESOLVED_NOT_TESTED"/);
 assert.doesNotMatch(fixture,/PAYROLL_AUTHORIZED.*STORE_MANAGER|STORE_MANAGER.*PAYROLL_AUTHORIZED|OWNER.*PAYROLL_AUTHORIZED/);
});

test("TASK-106 browser pack is wired into People Shift CI",()=>{
 const workflow=read(".github/workflows/people-shift-tests.yml");
 assert.match(workflow,/Run TASK-106 Workforce payroll cross-flow browser E2E/);
 assert.match(workflow,/workforce-payroll-cross-flow-browser\.mjs/);
});
