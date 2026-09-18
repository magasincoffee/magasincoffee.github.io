import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Manager official schedule uses scoped approved-schedule RPC and no direct work_schedules write", async () => {
  const source = await fs.readFile(
    new URL("../../05_MANAGER/runtime/compat/workforce/manager-official-schedule-v1.js", import.meta.url),
    "utf8"
  );
  assert.match(source,/get_manager_accessible_stores/);
  assert.match(source,/get_manager_weekly_schedule/);
  assert.match(source,/p_store_id:state\.storeId\|\|null/);
  assert.match(source,/p_week_start:state\.week/);
  assert.match(source,/data-mos-week="prev"/);
  assert.match(source,/data-mos-week="next"/);
  assert.match(source,/magasin:schedule-published/);
  assert.doesNotMatch(source,/\.from\(['"]work_schedules['"]\)\.update/);
  assert.match(source,/Lịch chính thức không được sửa trực tiếp từ browser/);
});

test("Manager Lich-lam deep-link uses canonical runtime", async () => {
  const source = await fs.readFile(
    new URL("../../05_MANAGER/Lich-lam/index.html", import.meta.url),
    "utf8"
  );
  assert.match(source,/shared-core-v1\.js/);
  assert.match(source,/manager-runtime-v1\.html/);
  assert.doesNotMatch(source,/manager-v13-runtime\.html/);
  assert.match(source,/MAGASIN Manager \/ Lịch làm/);
});

test("Manager runtime loads official schedule workspace", async () => {
  const source = await fs.readFile(
    new URL("../../05_MANAGER/runtime/manager-runtime-v1.html", import.meta.url),
    "utf8"
  );
  assert.match(source,/manager-official-schedule-v1\.js/);
});
