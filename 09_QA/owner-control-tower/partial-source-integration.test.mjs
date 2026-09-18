import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("source loading is isolated from the Owner auth denial boundary", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  const bootAt = source.indexOf("async function boot()");
  const authAt = source.indexOf("await requireOwnerAccess", bootAt);
  const authReturnAt = source.indexOf("return;", authAt);
  const revenueAt = source.indexOf("await loadReconciledRevenue", authAt);
  const payablesAt = source.indexOf("await loadProcurementPayables", authAt);
  const workforceAt = source.indexOf("await loadWorkforceAttention", authAt);

  assert.ok(bootAt >= 0);
  assert.ok(authAt > bootAt);
  assert.ok(authReturnAt > authAt);
  assert.ok(revenueAt > authReturnAt);
  assert.ok(payablesAt > authReturnAt);
  assert.ok(workforceAt > authReturnAt);
});

test("every connected source loader is wrapped by section-local failure isolation", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /loadSectionSafely/);
  assert.match(
    source,
    /const revenue = await loadSectionSafely\([\s\S]*?await loadReconciledRevenue/
  );
  assert.match(
    source,
    /const payables = await loadSectionSafely\([\s\S]*?await loadProcurementPayables/
  );
  assert.match(
    source,
    /const workforce = await loadSectionSafely\([\s\S]*?await loadWorkforceAttention/
  );
});

test("source failures cannot reuse the permission-denied error surface", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  const deniedAt = source.indexOf('denied.classList.remove("hidden")');
  const revenueAt = source.indexOf("const revenue = await loadSectionSafely");
  assert.ok(deniedAt >= 0);
  assert.ok(revenueAt > deniedAt);

  const postAuthSourceCode = source.slice(revenueAt);
  assert.doesNotMatch(postAuthSourceCode, /denied\.classList\.remove\("hidden"\)/);
  assert.doesNotMatch(postAuthSourceCode, /app\.classList\.add\("hidden"\)/);
});
