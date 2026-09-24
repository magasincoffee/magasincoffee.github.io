import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

const fileMap = JSON.parse(read("01_DOCS/MAGASIN/08_AUTONOMY/SUPERVISOR_MIGRATION_V1_FILE_MAP.json"));
const projectState = JSON.parse(read("01_DOCS/MAGASIN/00_PROJECT_STATE.json"));
const architecture = read("01_DOCS/MAGASIN/00_SUPERVISOR_THREE_LANE_ARCHITECTURE.md");
const migrationPlan = read("01_DOCS/MAGASIN/08_AUTONOMY/SUPERVISOR_REPOSITORY_MIGRATION_V1.md");

test("MIG-007 removes exactly the frozen 137-file legacy executable surface", () => {
  assert.equal(fileMap.managed_file_count, 137);
  assert.equal(fileMap.files.length, 137);
  assert.equal(new Set(fileMap.files.map((entry) => entry.source_path)).size, 137);
  for (const entry of fileMap.files) {
    assert.equal(exists(entry.source_path), false, `legacy path still exists: ${entry.source_path}`);
  }
  assert.equal(fileMap.files.filter((entry) => entry.source_path.startsWith("08_INTEGRATIONS/supervisor/")).length, 123);
  assert.equal(fileMap.files.filter((entry) => /^\.github\/workflows\/supervisor-.*\.ya?ml$/i.test(entry.source_path)).length, 8);
  assert.equal(fileMap.files.filter((entry) => /^\.github\/scripts\/supervisor-/i.test(entry.source_path)).length, 6);
});

test("MIG-007 preserves the five Business OS-owned retained files", () => {
  assert.equal(fileMap.retained_business_os_files.length, 5);
  for (const retained of fileMap.retained_business_os_files) {
    assert.equal(exists(retained.source_path), true, `retained path missing: ${retained.source_path}`);
  }
});

test("active Three-Lane architecture points to the independent Supervisor repository", () => {
  assert.equal(architecture.includes("08_INTEGRATIONS/supervisor/docs/ROBOT_BROWSER_SCHEDULER_OBSERVABILITY_ARCHITECTURE.md"), false);
  assert.equal((architecture.match(/magasincoffee\/magasin-supervisor:docs\/ROBOT_BROWSER_SCHEDULER_OBSERVABILITY_ARCHITECTURE\.md/g) || []).length, 2);
});

test("current migration state has reconciled MIG-006 and is executing authorized MIG-007 cleanup", () => {
  const migration = projectState.supervisor_repository_migration;
  assert.equal(migration.id, "MAGASIN_SUPERVISOR_INDEPENDENT_REPOSITORY_V1");
  assert.equal(migration.mig_006.status, "COMPLETE_QUALIFIED");
  assert.equal(migration.rbt009.status, "COMPLETE_RELEASED");
  assert.equal(migration.rbt009.qualification.rbt009_tier_b_480m, "PASS");
  assert.equal(migration.current_task, "MIG-007");
  assert.equal(migration.state, "COMPLETE");
  assert.equal(migration.current_task_status, "COMPLETE");
  assert.equal(migration.last_completed_task, "MIG-007");
  assert.equal(migration.mig_007.status, "COMPLETE");
  assert.equal(migration.mig_007.execution_status, "COMPLETE");
  assert.equal(migration.mig_007.complete, true);
  assert.equal(migration.mig_007.deleted_file_count, 137);
  assert.equal(migration.mig_007.rollback_window, "CLOSED");
  assert.equal(migration.compatibility_window, "CLOSED_LEGACY_EMBEDDED_SUPERVISOR_REMOVED");
});

test("migration plan keeps historical phases while exposing current MIG-007 execution status", () => {
  assert.match(migrationPlan, /MIG-007 COMPLETE \/ INDEPENDENT REPOSITORY MIGRATION COMPLETE/);
  assert.match(migrationPlan, /Historical MIG-001 through MIG-006 sections below remain historical records/);
});
