import fs from "node:fs";
import assert from "node:assert/strict";

const spec = JSON.parse(
  fs.readFileSync(
    new URL("../../02_CORE/contracts/people-shift-v1.json", import.meta.url),
    "utf8"
  )
);

const managerWorkforce = fs.readFileSync(
  new URL("../../05_MANAGER/Workforce/index.html", import.meta.url),
  "utf8"
);

const colorConvention = fs.readFileSync(
  new URL("../../01_DOCS/WORKFORCE_COLOR_CONVENTION.md", import.meta.url),
  "utf8"
);

assert.equal(spec.task, "TASK-019");
assert.equal(spec.milestone, "DAY_8_10_PEOPLE_SHIFT");
assert.equal(spec.reuse.employee_availability, true);
assert.equal(spec.reuse.auto_schedule_generation, true);
assert.ok(spec.verified_gaps.includes("trusted_people_roster_read_surface"));
assert.ok(spec.verified_gaps.includes("stable_staffing_gap_read_model"));
assert.ok(spec.verified_gaps.includes("dedicated_people_shift_browser_e2e"));
assert.equal(spec.staffing_gap.threshold, "minimum_headcount");
assert.equal(spec.staffing_gap.target_headcount_is_not_shortage_threshold, true);
assert.equal(spec.staffing_gap.fail_closed_on_incomplete_source, true);
assert.equal(spec.required_behaviors.no_synthetic_people_metrics, true);
assert.equal(spec.required_behaviors.preserve_role_store_scope, true);
assert.equal(spec.required_behaviors.no_production_migration_in_acceptance_gate, true);
assert.deepEqual(spec.next_tasks, ["TASK-020", "TASK-021", "TASK-022"]);

assert.match(managerWorkforce, /\/02_CORE\/shared\/shared-core-v1\.js/);
assert.match(managerWorkforce, /\/05_MANAGER\/runtime\/manager-runtime-v1\.html/);
assert.match(managerWorkforce, /\/06_EMPLOYEE\//);
assert.doesNotMatch(managerWorkforce, /\/manager-v13-runtime\.html/);
assert.doesNotMatch(managerWorkforce, /location\.replace\(['"]\/employee\//);

assert.match(colorConvention, /05:00–11:59/);
assert.match(colorConvention, /12:00–16:59/);
assert.match(colorConvention, /17:00–23:59/);
assert.match(colorConvention, /thời điểm bắt đầu ca/i);

console.log("PASS People/Shift V1 current-system acceptance contract");
