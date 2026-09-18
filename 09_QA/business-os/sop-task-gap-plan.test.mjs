import fs from "node:fs";
import assert from "node:assert/strict";

const spec = JSON.parse(
  fs.readFileSync(
    new URL("../../02_CORE/contracts/sop-task-gap-plan.v1.json", import.meta.url),
    "utf8"
  )
);

assert.equal(spec.task, "TASK-023");
assert.equal(spec.slice, "SOP_TASK_DAY_11_13");
assert.deepEqual(spec.canonical_workflow, [
  "SOP_TEMPLATE",
  "EXECUTION",
  "RESPONSIBLE_PERSON",
  "EXCEPTION",
  "CORRECTIVE_TASK",
  "VERIFY",
  "CLOSE"
]);

assert.equal(spec.repository_evidence.sop_workspace, "INDEX_SKELETON_ONLY");
assert.equal(spec.repository_evidence.manager_task_surface, "STATIC_DEMO_PLACEHOLDER");
assert.equal(spec.repository_evidence.employee_task_surface, "UNCONNECTED_LOADING_PLACEHOLDER");
assert.equal(spec.repository_evidence.owner_control_tower_task_source, "NOT_CONNECTED");
assert.equal(spec.repository_evidence.manager_task_deep_link, "STALE_LEGACY_RUNTIME_TARGET");
assert.equal(spec.repository_evidence.verified_task_backend_in_repo, false);

assert.equal(spec.live_schema_inventory.mode, "READ_ONLY_STRUCTURAL_METADATA");
assert.equal(spec.live_schema_inventory.matching_named_public_table_view_routine, false);
assert.equal(spec.live_schema_inventory.production_write_performed, false);
assert.equal(spec.live_schema_inventory.row_data_exported, false);

for (const gap of [
  "NO_APPROVED_EXECUTABLE_SOP_TEMPLATE_VERSION",
  "TASK_UI_NOT_CONNECTED_TO_VERIFIED_SOURCE",
  "NO_VERIFIED_SOP_TASK_PERSISTENCE_API",
  "EXCEPTION_CORRECTIVE_OVERDUE_VERIFY_CLOSE_RULES_UNRESOLVED",
  "NO_SOP_TASK_BROWSER_E2E",
  "MANAGER_TASK_DEEP_LINK_STALE"
]) {
  assert.ok(spec.verified_gaps.includes(gap), `missing verified gap: ${gap}`);
}

assert.equal(spec.guardrails.no_fabricated_operational_tasks, true);
assert.equal(spec.guardrails.missing_source_fails_closed, true);
assert.equal(spec.guardrails.no_new_business_rules, true);
assert.equal(spec.guardrails.apply_production_schema_change, false);
assert.equal(spec.guardrails.task_write_workflow_forbidden_until_rules_approved, true);

for (const decision of [
  "EXCEPTION_TRIGGER",
  "CORRECTIVE_TASK_CREATION_RULE",
  "RESPONSIBLE_PERSON_RULE",
  "VERIFY_CLOSE_AUTHORITY",
  "OVERDUE_ESCALATION_POLICY",
  "COMPLETION_EVIDENCE_POLICY"
]) {
  assert.ok(
    spec.owner_decisions_required_before_write_workflow.includes(decision),
    `missing Owner decision boundary: ${decision}`
  );
}

assert.deepEqual(spec.next_tasks, ["TASK-024", "TASK-025", "TASK-026"]);

console.log("PASS SOP/Task Day 11-13 gap review acceptance contract");
