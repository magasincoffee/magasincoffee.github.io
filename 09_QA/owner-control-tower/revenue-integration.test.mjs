import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Control Tower initializes Revenue only after Owner authorization", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  const bootAt = source.indexOf("async function boot");
  const authAt = source.indexOf("await requireOwnerSession", bootAt);
  const guardAt = source.indexOf("if (!profile) return", authAt);
  const sourcesAt = source.indexOf("await loadControlTowerSources", bootAt);

  assert.ok(bootAt >= 0);
  assert.ok(authAt >= 0);
  assert.ok(guardAt > authAt);
  assert.ok(sourcesAt > guardAt);
  assert.match(source, /rawState\.revenue = sections\.revenue/);
});

test("current production orchestration does not invent an unverified revenue reader", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/source-integration-v1.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /import \{ loadReconciledRevenue \}/);
  assert.match(
    source,
    /loaders\.revenue\s*\|\|\s*\(\(args\)\s*=>\s*loadReconciledRevenue\(args\)\)/
  );
  assert.match(source, /revenueLoader\(\{ reportingDate \}\)/);
  assert.doesNotMatch(source, /SANITIZED_MARKETPLACE_GROSS/);
});

test("Revenue Control Tower path remains read-only", async () => {
  const sources = await Promise.all([
    fs.readFile(
      new URL("../../04_OWNER/ControlTower/revenue-adapter-v1.mjs", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../../04_OWNER/ControlTower/source-integration-v1.mjs", import.meta.url),
      "utf8"
    )
  ]);

  for (const source of sources) {
    for (const forbidden of [".insert(", ".update(", ".delete(", ".upsert(", ".rpc("]) {
      assert.equal(source.includes(forbidden), false);
    }
  }
});
