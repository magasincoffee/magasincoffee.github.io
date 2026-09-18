import fs from "node:fs";
import assert from "node:assert/strict";

const contract = JSON.parse(
  fs.readFileSync(
    new URL("../../02_CORE/contracts/store-product-foundation.v1.json", import.meta.url),
    "utf8"
  )
);

assert.equal(contract.status, "FOUNDATION_DRAFT");
assert.deepEqual(contract.location.kinds, ["STORE", "WAREHOUSE"]);

for (const required of ["SELLABLE","MATERIAL","TOPPING","PACKAGING","ASSET","OTHER"]) {
  assert.ok(contract.item.types.includes(required), `missing item type: ${required}`);
}

for (const forbidden of ["price","stock","supplier_id","channel_id"]) {
  assert.ok(
    !contract.item.required.includes(forbidden),
    `TASK-009 scope leak: ${forbidden}`
  );
}

assert.ok(contract.unit_conversion.constraints.includes("base_qty_per_unit > 0"));
assert.ok(contract.explicitly_deferred.includes("price_history"));
assert.ok(contract.explicitly_deferred.includes("stock_balances"));

console.log("PASS store/product foundation contract");
