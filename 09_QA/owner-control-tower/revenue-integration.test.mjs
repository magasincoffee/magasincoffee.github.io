import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Control Tower revenue card uses reconciliation-gated provider contract", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /loadRevenueStatus/);
  assert.match(source, /MAGASIN_REVENUE_READ_PROVIDER/);
  assert.match(source, /reportingDate: rawState\.context\.reportingDate/);
  assert.doesNotMatch(source, /gross[_-]?sales|marketplace[_-]?gross/i);
});

test("Revenue adapter contract is read-only and contains no database write verbs", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/revenue-adapter-v1.mjs", import.meta.url),
    "utf8"
  );

  for (const forbidden of [
    ".insert(",
    ".update(",
    ".delete(",
    ".upsert(",
    "publish_",
    "record_payment"
  ]) {
    assert.equal(source.includes(forbidden), false);
  }
});
