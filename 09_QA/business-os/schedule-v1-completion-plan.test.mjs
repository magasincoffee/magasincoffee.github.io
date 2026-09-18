import fs from "node:fs";
import assert from "node:assert/strict";

const spec = JSON.parse(
  fs.readFileSync(new URL("../../02_CORE/contracts/schedule-v1-completion-plan.v1.json", import.meta.url), "utf8")
);

assert.equal(spec.task, "TASK-027");
assert.equal(spec.decision, "DEC-003");
assert.equal(spec.status, "APPROVED");
assert.equal(spec.deferred_slice.task, "TASK-026");
assert.equal(spec.deferred_slice.state, "DEFERRED_BY_OWNER");
assert.deepEqual(spec.deferred_slice.owner_decisions_still_unresolved, [
  "DST-001","DST-002","DST-003","DST-004","DST-005","DST-006"
]);

for (const capability of [
  "WEEKLY_AVAILABILITY",
  "MULTI_WINDOW_PER_EMPLOYEE_WEEK",
  "MULTI_BRANCH_SCHEDULE",
  "CROSS_BRANCH_SUPPORT"
]) {
  assert.ok(spec.evidence.observed_capabilities.includes(capability), capability);
}
assert.equal(spec.evidence.private_rows_in_public_repo, false);

assert.deepEqual(spec.canonical_workflow, [
  "EMPLOYEE_AVAILABILITY",
  "MANAGER_REGISTRATION_REVIEW",
  "STAFFING_REQUIREMENTS",
  "ROBOT_DRAFT",
  "MANAGER_ASSIGNMENT_REVIEW_EDIT",
  "VALIDATE",
  "REVIEWED",
  "PUBLISH",
  "EMPLOYEE_OFFICIAL_SCHEDULE",
  "ATTENDANCE",
  "GIVE_OR_SWAP",
  "SCHEDULE_REFRESH",
  "NOTIFICATION"
]);

for (const rpc of [
  "manager_update_employee_availability",
  "auto_generate_schedule_generation",
  "replace_schedule_generation_assignments",
  "publish_schedule_generation",
  "submit_shift_swap_request",
  "clock_in_for_schedule",
  "clock_out_attendance"
]) {
  assert.ok(spec.existing_live_rpc_contracts.includes(rpc), `missing live RPC contract: ${rpc}`);
}

assert.equal(spec.guardrails.robot_auto_publish, false);
assert.equal(spec.guardrails.direct_browser_table_update_when_rpc_exists, false);
assert.equal(spec.guardrails.production_schema_apply, false);
assert.equal(spec.guardrails.production_schema_apply_requires_owner, true);
assert.equal(spec.guardrails.private_employee_schedule_in_public_repo, false);
assert.equal(spec.guardrails.exact_all_day_semantics_invented, false);
assert.equal(spec.guardrails.email_calendar_credentials_in_git, false);
assert.equal(spec.required_project_state_after_gate, "READY");
assert.deepEqual(spec.implementation_queue, [
  "TASK-028","TASK-029","TASK-030","TASK-031",
  "TASK-032","TASK-033","TASK-034","TASK-035"
]);

console.log("PASS Schedule V1 TASK-027 priority + completion contract");
