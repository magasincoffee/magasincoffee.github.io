import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const architecture=fs.readFileSync("01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_OPERATIONS_V1_ARCHITECTURE.md","utf8");
const plan=fs.readFileSync("01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_OPERATIONS_V1_EXECUTION_PLAN.md","utf8");
const evidence=fs.readFileSync("01_DOCS/MAGASIN/05_SYSTEM/MANAGER_EMPLOYEE_SYSTEM_RECONCILIATION_V1_ACCEPTANCE.md","utf8");
const merTemp="01_DOCS/MAGASIN/05_SYSTEM/MANAGER_EMPLOYEE_SYSTEM_RECONCILIATION_TEMP_SOURCE_OF_TRUTH.md";
const xstoreTemp="01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md";

test("MER-007 reconciles proven rules into permanent Workforce architecture",()=>{
  assert.match(architecture,/WORKFORCE V1 CLOSED — POST-CLOSURE RECONCILIATIONS RECORDED/);
  assert.match(architecture,/employee_workforce_profile_projection_v1/);
  assert.match(architecture,/list_employee_workforce_profiles_v1\(\)/);
  assert.match(architecture,/get_my_employee_workforce_profile_v1\(\)/);
  assert.match(architecture,/get_cross_store_weekly_availability_v1\(date\)/);
  assert.match(architecture,/set_employee_store_priority_profile_v1\(uuid, uuid\[\]\)/);
  assert.match(architecture,/manager-context-v1\.js/);
  assert.match(architecture,/Backend reader failure is an error state/);
});

test("MER-007 preserves closed Workforce history and separate XSTORE authority",()=>{
  assert.match(plan,/WORKFORCE_OPERATIONS_V1 = CLOSED/);
  assert.match(plan,/does not create a next Workforce task/);
  assert.match(plan,/WORKFORCE_CROSS_STORE_SCHEDULING_V1.*remains separately authoritative/);
  assert.equal(fs.existsSync(xstoreTemp),true,"XSTORE TEMP authority must remain until XSTORE-011 live acceptance");
});

test("MER-007 permanently records acceptance without private identity data",()=>{
  assert.match(evidence,/Status:\*\* CLOSED \/ ACCEPTED/);
  assert.match(evidence,/Production reconciliation used existing active role identities without recording private identity data here/);
  assert.match(evidence,/UI2 Cross Role Acceptance #320 — SUCCESS/);
  assert.match(evidence,/People Shift Day-10 Tests #1097 — SUCCESS/);
  assert.match(evidence,/d55e4a25bef8f5e51a6bdb8f6fa927e27829654b/);
});

test("MER-007 removes its temporary Source of Truth",()=>{
  assert.equal(fs.existsSync(merTemp),false,"MER temporary Source of Truth must be deleted after permanent reconciliation");
});
