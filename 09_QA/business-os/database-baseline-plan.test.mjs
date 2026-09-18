import fs from "node:fs";
import assert from "node:assert/strict";

const plan = JSON.parse(
  fs.readFileSync(
    new URL("../../02_CORE/contracts/database-baseline-plan.v1.json", import.meta.url),
    "utf8"
  )
);

assert.equal(plan.strategy, "EXPAND_MAP_MIGRATE_CONTRACT");
assert.equal(plan.production_apply_requires_owner, true);
assert.equal(plan.live_schema_inventory_required_before_production, true);
assert.equal(plan.legacy_product_mapping.GOODS, "UNRESOLVED");

for (const op of [
  "DROP_EXISTING_STORE_TABLE",
  "DROP_PROCUREMENT_PRODUCTS",
  "AUTO_CLASSIFY_LEGACY_GOODS"
]) {
  assert.ok(plan.initial_forbidden_operations.includes(op), `missing guard: ${op}`);
}

const phaseIds = plan.phases.map(x => x.id);
assert.deepEqual(phaseIds, ["M0","M1","M2","M3","M4","M5","M6"]);
assert.equal(plan.phases.find(x=>x.id==="M0").side_effect, "READ_ONLY");
assert.equal(plan.phases.find(x=>x.id==="M6").side_effect, "DESTRUCTIVE_LATER");

console.log("PASS database baseline migration plan contract");
