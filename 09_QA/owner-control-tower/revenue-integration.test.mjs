import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Control Tower initializes Revenue only after Owner authorization", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  const bootAt = source.indexOf("async function boot");
  const authAt = source.indexOf("await requireOwnerAccess", bootAt);
  const revenueAt = source.indexOf("await loadReconciledRevenue", bootAt);

  assert.ok(bootAt >= 0);
  assert.ok(authAt >= 0);
  assert.ok(revenueAt > authAt);
  assert.match(source, /rawState\.revenue = revenue/);
});

test("current production integration does not invent an unverified revenue reader", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  assert.match(
    source,
    /loadReconciledRevenue\(\{\s*reportingDate:\s*rawState\.context\.reportingDate\s*\}\)/s
  );
  assert.doesNotMatch(source, /SANITIZED_MARKETPLACE_GROSS/);
});

test("Revenue Control Tower path remains read-only", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/revenue-adapter-v1.mjs", import.meta.url),
    "utf8"
  );

  for (const forbidden of [".insert(", ".update(", ".delete(", ".upsert(", ".rpc("]) {
    assert.equal(source.includes(forbidden), false);
  }
});
