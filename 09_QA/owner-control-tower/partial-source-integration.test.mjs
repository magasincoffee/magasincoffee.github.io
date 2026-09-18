import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("authentication failure returns before any data source is loaded", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  const bootAt = source.indexOf("async function boot()");
  const authAt = source.indexOf("profile = await requireOwnerAccess", bootAt);
  const authErrorAt = source.indexOf("[CONTROL_TOWER_AUTH]", authAt);
  const authReturnAt = source.indexOf("return;", authErrorAt);
  const sourceLoadAt = source.indexOf("await Promise.all", authReturnAt);

  assert.ok(bootAt >= 0);
  assert.ok(authAt > bootAt);
  assert.ok(authErrorAt > authAt);
  assert.ok(authReturnAt > authErrorAt);
  assert.ok(sourceLoadAt > authReturnAt);
});

test("authenticated shell is visible before independent source loads start", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  const showAppAt = source.indexOf('app.classList.remove("hidden")');
  const sourceLoadAt = source.indexOf("await Promise.all");

  assert.ok(showAppAt >= 0);
  assert.ok(sourceLoadAt > showAppAt);
  assert.match(source, /loadControlTowerSection\(loader, fallback\)/);
});

test("Revenue, Payables and Workforce load through the section isolation boundary", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  for (const section of ["revenue", "payables", "workforce"]) {
    assert.match(
      source,
      new RegExp(`applySourceSection\\(\\s*["']${section}["']`, "s")
    );
  }

  assert.match(source, /Promise\.all\(\[/);
});
