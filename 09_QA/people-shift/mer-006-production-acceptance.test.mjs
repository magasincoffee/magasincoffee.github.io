import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");

const merMigration=read("07_DATABASE/migrations/20260929131500_mer_001_canonical_employee_workforce_profile.sql");
const autoDraftMigration=read("07_DATABASE/migrations/20260929063000_xstore_007_009_staffing_auto_draft_v1.sql");
const browserE2E=read("09_QA/people-shift/mer-cross-role-profile-browser.mjs");
const peopleShiftWorkflow=read(".github/workflows/people-shift-tests.yml");
const ui2Workflow=read(".github/workflows/ui2-cross-role-tests.yml");
const reconciliationSot=read("01_DOCS/MAGASIN/05_SYSTEM/MANAGER_EMPLOYEE_SYSTEM_RECONCILIATION_TEMP_SOURCE_OF_TRUTH.md");

test("MER-006 keeps Manager Employee Scheduler on one canonical profile truth",()=>{
  assert.match(merMigration,/employee_workforce_profile_projection_v1/);
  assert.match(
    merMigration,
    /join lateral public\.employee_workforce_profile_projection_v1\(ea\.user_id\) x on true/
  );
  assert.doesNotMatch(
    merMigration,
    /max\(esp\.store_id\)\s+filter\s*\(where\s+esp\.is_primary\)/i
  );
});

test("MER-006 Auto Schedule consumes canonical Store Priority and stays draft-only",()=>{
  assert.match(
    autoDraftMigration,
    /join public\.employee_store_priorities esp\s+on esp\.employee_id=p\.id and esp\.store_id=r\.store_id/
  );
  assert.match(autoDraftMigration,/order by\s+esp\.priority asc,/);
  assert.match(autoDraftMigration,/'requires_manager_review',true/);
  assert.match(autoDraftMigration,/'published',false/);
  assert.match(autoDraftMigration,/'DRAFT','AUTO_XSTORE_GLOBAL_V1'/);
});

test("MER-006 browser E2E proves Manager save -> Employee read -> Scheduler read",()=>{
  for(const checkName of [
    "mer_manager_save_reload_same_truth",
    "mer_employee_reads_same_priority",
    "mer_scheduler_reads_same_priority",
    "mer_single_profile_contract_inventory",
    "mer_browser_diagnostics"
  ]){
    assert.match(browserE2E,new RegExp(checkName));
  }
});

test("MER-006 browser E2E is required by both Workforce and cross-role CI",()=>{
  assert.match(peopleShiftWorkflow,/Run MER canonical profile E2E/);
  assert.match(
    peopleShiftWorkflow,
    /node 09_QA\/people-shift\/mer-cross-role-profile-browser\.mjs/
  );
  assert.match(ui2Workflow,/Run MER canonical profile cross-role E2E/);
  assert.match(
    ui2Workflow,
    /node 09_QA\/people-shift\/mer-cross-role-profile-browser\.mjs/
  );
});

test("MER-006 advances the authoritative cursor only after accepted gates",()=>{
  assert.match(reconciliationSot,/MER-001→006 DONE \/ MER-007 CURRENT/);
  assert.match(reconciliationSot,/UI2 Cross Role Acceptance #317 — SUCCESS/);
  assert.match(reconciliationSot,/People Shift Day-10 Tests #1094 — SUCCESS/);
  assert.match(
    reconciliationSot,
    /MER-006 \| Cross-role E2E \+ production smoke \| Manager save → Employee read → Scheduler read proves one truth \| DONE/
  );
  assert.match(
    reconciliationSot,
    /MER-007 \| Canonical reconciliation \+ TEMP cleanup \| Update permanent docs, close track, delete this file \| CURRENT/
  );
});
