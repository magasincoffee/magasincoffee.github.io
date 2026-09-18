import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Manager registration review uses scoped RPC boundary and week/store navigation", async () => {
  const source = await fs.readFile(
    new URL("../../05_MANAGER/runtime/compat/workforce/manager-workforce-review-v2.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /manager_update_employee_availability/);
  assert.doesNotMatch(source, /\.from\(['"]employee_availability['"]\)\.update/);
  assert.match(source, /p_store_id:storeFilterId\|\|null/);
  assert.match(source, /data-mwr2-week="prev"/);
  assert.match(source, /data-mwr2-week="today"/);
  assert.match(source, /data-mwr2-week="next"/);
  assert.match(source, /id="mwr2StoreFilter"/);
  assert.match(source, /let week=monday\(new Date\(\)\),storeFilterId=null/);
});
