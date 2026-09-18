import fs from "node:fs";
import assert from "node:assert/strict";

const spec = JSON.parse(
  fs.readFileSync(new URL("../../02_CORE/contracts/sop-task-rule-decision-pack.v1.json", import.meta.url), "utf8")
);

assert.equal(spec.task, "TASK-026");
assert.equal(spec.status, "OWNER_DECISION_REQUIRED");
assert.equal(spec.approved_business_rules_found, 0);
assert.deepEqual(spec.canonical_workflow, [
  "SOP_TEMPLATE","EXECUTION","RESPONSIBLE_PERSON","EXCEPTION","CORRECTIVE_TASK","VERIFY","CLOSE"
]);

const expected = [
  ["DST-001","EXCEPTION_TRIGGER"],
  ["DST-002","CORRECTIVE_TASK_CREATION_RULE"],
  ["DST-003","RESPONSIBLE_PERSON_RULE"],
  ["DST-004","VERIFY_CLOSE_AUTHORITY"],
  ["DST-005","OVERDUE_ESCALATION_POLICY"],
  ["DST-006","COMPLETION_EVIDENCE_POLICY"]
];
assert.deepEqual(spec.owner_decisions.map(x=>[x.id,x.key]), expected);
for (const d of spec.owner_decisions) {
  assert.equal(d.status, "OWNER_INPUT_REQUIRED");
  assert.equal(d.selected_option, null, `${d.id} must not silently choose a policy`);
  assert.ok(Array.isArray(d.options) && d.options.length >= 2);
}

for (const entity of [
  "SOP_TEMPLATE","SOP_TEMPLATE_VERSION","SOP_STEP","SOP_EXECUTION",
  "SOP_STEP_EXECUTION","SOP_EXCEPTION","CORRECTIVE_TASK","SOP_TASK_AUDIT_EVENT"
]) {
  assert.ok(spec.decision_independent_entities.includes(entity), `missing entity: ${entity}`);
}

assert.equal(spec.decision_dependent_features.auto_exception_trigger, "DST-001");
assert.equal(spec.decision_dependent_features.auto_corrective_task, "DST-002");
assert.equal(spec.decision_dependent_features.auto_assignee_resolution, "DST-003");
assert.equal(spec.decision_dependent_features.transition_authorization, "DST-004");
assert.equal(spec.decision_dependent_features.due_overdue_escalation, "DST-005");
assert.equal(spec.decision_dependent_features.evidence_storage_enforcement, "DST-006");

assert.equal(spec.guardrails.production_apply, false);
assert.equal(spec.guardrails.production_apply_requires_owner, true);
assert.equal(spec.guardrails.task_writes_enabled, false);
assert.equal(spec.guardrails.auto_exception_enabled, false);
assert.equal(spec.guardrails.auto_corrective_task_enabled, false);
assert.equal(spec.guardrails.auto_escalation_enabled, false);
assert.equal(spec.guardrails.rls_required_for_exposed_tables, true);
assert.equal(spec.guardrails.mutate_approved_sop_version, false);
assert.equal(spec.required_project_state_after_gate, "WAIT_USER");

console.log("PASS SOP/Task TASK-026 Owner decision + migration boundary contract");
