import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Control Tower loads revenue contract only after Owner auth", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  const authAt = source.indexOf("await requireOwnerAccess");
  const revenueAt = source.indexOf("await loadRevenueStatus");
  assert.ok(authAt >= 0);
  assert.ok(revenueAt > authAt);
  assert.match(source, /rawState\.revenue = revenue/);
  assert.match(source, /reportingDate: rawState\.context\.reportingDate/);
});

test("Control Tower revenue integration introduces no direct write path", async () => {
  const adapter = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/revenue-adapter-v1.mjs", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(adapter, /\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/);
  assert.match(adapter, /getDailyReconciliation/);
  assert.match(adapter, /NOT_CONNECTED/);
});
