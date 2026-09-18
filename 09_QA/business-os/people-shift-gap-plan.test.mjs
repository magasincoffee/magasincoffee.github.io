import fs from "node:fs";
import assert from "node:assert/strict";

const spec = JSON.parse(
  fs.readFileSync(
    new URL("../../02_CORE/contracts/people-shift-gap-plan.v1.json", import.meta.url),
    "utf8"
  )
);

assert.equal(spec.task, "TASK-019");
assert.equal(spec.slice, "PEOPLE_SHIFT_DAY_8_10");
assert.equal(spec.existing_workflows_are_canonical, true);
assert.equal(spec.no_new_business_rules, true);

for (const gap of [
  "STAFFING_GAP_READ_ADAPTER",
  "PEOPLE_SHIFT_BROWSER_E2E",
  "LIVE_WORKFORCE_RPC_SURFACE_NOT_FULLY_REPRODUCIBLE"
]) {
  assert.ok(spec.verified_gaps.includes(gap), `missing verified gap: ${gap}`);
}

assert.equal(
  spec.staffing_gap_contract.shortage_rule,
  "assigned_headcount_below_minimum_headcount"
);
assert.equal(spec.staffing_gap_contract.read_only, true);
assert.equal(spec.staffing_gap_contract.missing_source_fails_closed, true);
assert.ok(
  spec.staffing_gap_contract.write_rpcs_forbidden.includes(
    "publish_schedule_generation"
  )
);
assert.equal(spec.production_guardrails.apply_schema_change, false);
assert.equal(spec.production_guardrails.production_migration_requires_owner, true);
assert.deepEqual(spec.next_tasks, ["TASK-020", "TASK-021", "TASK-022"]);

console.log("PASS People/Shift Day 8-10 gap review acceptance contract");
