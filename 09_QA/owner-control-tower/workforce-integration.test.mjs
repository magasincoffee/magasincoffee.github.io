import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Control Tower wires Workforce adapter only after Owner auth", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  const authAt = source.indexOf("await requireOwnerAccess");
  const workforceAt = source.indexOf("await loadWorkforceAttention");
  assert.ok(authAt >= 0);
  assert.ok(workforceAt > authAt);
  assert.match(source, /rawState\.workforce = workforce/);
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
