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

test("trusted procurement adapter remains behind post-auth source orchestration", async () => {
  const [appSource, integrationSource] = await Promise.all([
    fs.readFile(
      new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../../04_OWNER/ControlTower/source-integration-v1.mjs", import.meta.url),
      "utf8"
    )
  ]);

  const bootAt = appSource.indexOf("async function boot");
  const authAt = appSource.indexOf("await requireOwnerSession", bootAt);
  const sourcesAt = appSource.indexOf("await loadControlTowerSources", bootAt);

  assert.ok(authAt >= 0);
  assert.ok(sourcesAt > authAt);
  assert.match(appSource, /rawState\.payables = sections\.payables/);
  assert.match(integrationSource, /import \{ loadProcurementPayables \}/);
  assert.match(integrationSource, /loadProcurementPayables\(client\)/);
  assert.match(integrationSource, /core\?\.supabase\?\.get\?\.\(\)/);
});
