import fs from "node:fs";
import assert from "node:assert/strict";

const spec = JSON.parse(
  fs.readFileSync(
    new URL("../../02_CORE/contracts/owner-control-tower.v1.json", import.meta.url),
    "utf8"
  )
);

assert.equal(spec.mode, "READ_ONLY_ATTENTION_LAYER");
assert.deepEqual(spec.access, ["OWNER"]);
assert.ok(spec.sections.includes("revenue"));
assert.ok(spec.sections.includes("data_quality"));
assert.ok(spec.quality_states.includes("GAP"));
assert.ok(spec.quality_states.includes("NOT_CONNECTED"));
assert.equal(spec.required_behaviors.no_synthetic_numbers, true);
assert.equal(spec.required_behaviors.partial_source_tolerant, true);
assert.equal(spec.required_behaviors.no_new_write_actions, true);
assert.ok(spec.acceptance.includes("revenue_requires_reconciled_or_non_actual_label"));
assert.deepEqual(
  spec.next_tasks,
  ["TASK-012","TASK-013","TASK-014","TASK-015","TASK-016","TASK-017","TASK-018"]
);

console.log("PASS Owner Control Tower V1 acceptance contract");
