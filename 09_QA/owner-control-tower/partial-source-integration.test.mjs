import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("source loading remains isolated behind Owner auth via refreshAll", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );
  const bootAt=source.indexOf("async function boot()");
  const authAt=source.indexOf("await requireOwnerAccess",bootAt);
  const deniedAt=source.indexOf('denied.classList.remove("hidden")',authAt);
  const refreshCallAt=source.indexOf("await refreshAll(core)",authAt);
  const refreshFnAt=source.indexOf("async function refreshAll(core)");
  const revenueAt=source.indexOf("await loadReconciledRevenue",refreshFnAt);
  const payablesAt=source.indexOf("await loadProcurementPayables",refreshFnAt);
  const workforceAt=source.indexOf("await loadWorkforceAttention",refreshFnAt);

  assert.ok(bootAt>=0);
  assert.ok(authAt>bootAt);
  assert.ok(deniedAt>authAt);
  assert.ok(refreshCallAt>deniedAt);
  assert.ok(refreshFnAt>=0);
  assert.ok(revenueAt>refreshFnAt);
  assert.ok(payablesAt>refreshFnAt);
  assert.ok(workforceAt>refreshFnAt);
});

test("every connected source loader is wrapped by section-local failure isolation", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );
  const refresh=source.slice(source.indexOf("async function refreshAll(core)"),source.indexOf("async function boot()"));
  assert.match(refresh,/loadSectionSafely/);
  assert.match(refresh,/loadSectionSafely\([\s\S]*?await loadReconciledRevenue/);
  assert.match(refresh,/loadSectionSafely\([\s\S]*?await loadProcurementPayables/);
  assert.match(refresh,/loadSectionSafely\([\s\S]*?await loadWorkforceAttention/);
});

test("source failures cannot reuse the permission-denied error surface", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );
  const refreshAt=source.indexOf("async function refreshAll(core)");
  const bootAt=source.indexOf("async function boot()");
  assert.ok(refreshAt>=0&&bootAt>refreshAt);
  const refreshCode=source.slice(refreshAt,bootAt);
  assert.doesNotMatch(refreshCode,/denied\.classList\.remove\("hidden"\)/);
  assert.doesNotMatch(refreshCode,/app\.classList\.add\("hidden"\)/);
});
