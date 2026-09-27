import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Control Tower payables card exposes all required attention fields", async () => {
  const html = await fs.readFile(new URL("../../04_OWNER/ControlTower/index.html", import.meta.url),"utf8");
  for (const id of ["payableValue","payableOverdue","payableOpenOrders","payableOverdueOrders","payableMeta"])assert.match(html,new RegExp('id="'+id+'"'));
});

test("Control Tower boot reaches trusted procurement adapter only through post-auth refreshAll", async () => {
  const source = await fs.readFile(new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),"utf8");
  const authAt=source.indexOf("await requireOwnerAccess");
  const refreshCallAt=source.indexOf("await refreshAll(core)",authAt);
  const refreshFnAt=source.indexOf("async function refreshAll(core)");
  const adapterAt=source.indexOf("await loadProcurementPayables",refreshFnAt);
  assert.ok(authAt>=0);
  assert.ok(refreshCallAt>authAt);
  assert.ok(adapterAt>refreshFnAt);
  assert.match(source,/core\.supabase\.get\(\)/);
  assert.match(source,/payableOverdueOrders/);
});
