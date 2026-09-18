import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Control Tower payables card exposes all required attention fields", async () => {
  const html = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/index.html", import.meta.url),
    "utf8"
  );

  for (const id of [
    "payableValue",
    "payableOverdue",
    "payableOpenOrders",
    "payableOverdueOrders",
    "payableMeta"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test("Control Tower wires trusted procurement adapter through source isolation after Owner auth", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  const bootAt = source.indexOf("async function boot");
  const authAt = source.indexOf("await requireOwnerAccess", bootAt);
  const sectionAt = source.indexOf('"payables"', authAt);
  const adapterAt = source.indexOf("loadProcurementPayables", sectionAt);

  assert.ok(bootAt >= 0);
  assert.ok(authAt > bootAt);
  assert.ok(sectionAt > authAt);
  assert.ok(adapterAt > sectionAt);
  assert.match(source, /applySourceSection\(\s*"payables"/s);
  assert.match(source, /core\.supabase\.get\(\)/);
  assert.match(source, /payableOverdueOrders/);
});
