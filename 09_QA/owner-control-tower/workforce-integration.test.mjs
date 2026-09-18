import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Control Tower wires Workforce adapter through source isolation after Owner auth", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  const bootAt = source.indexOf("async function boot");
  const authAt = source.indexOf("await requireOwnerAccess", bootAt);
  const sectionAt = source.indexOf('"workforce"', authAt);
  const adapterAt = source.indexOf("loadWorkforceAttention", sectionAt);

  assert.ok(bootAt >= 0);
  assert.ok(authAt > bootAt);
  assert.ok(sectionAt > authAt);
  assert.ok(adapterAt > sectionAt);
  assert.match(source, /applySourceSection\(\s*"workforce"/s);
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
