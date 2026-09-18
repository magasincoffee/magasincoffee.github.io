import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Workforce adapter remains behind post-auth source orchestration", async () => {
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
  const workforceAt = appSource.indexOf("await loadControlTowerSources", bootAt);

  assert.ok(authAt >= 0);
  assert.ok(workforceAt > authAt);
  assert.match(appSource, /rawState\.workforce = sections\.workforce/);
  assert.match(integrationSource, /import \{ loadWorkforceAttention \}/);
  assert.match(integrationSource, /loadWorkforceAttention\(runtimeCore\)/);
});

test("Workforce card remains a read-only drill-down to existing Workforce", async () => {
  const html = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/index.html", import.meta.url),
    "utf8"
  );

  assert.match(html, /id="workforceGap"/);
  assert.match(html, /id="workforceUnresolved"/);
  assert.match(html, /href="\/04_OWNER\/Workforce\/"/);
  assert.doesNotMatch(html, /Tạo lịch tự động|Phát hành lịch/);
});
