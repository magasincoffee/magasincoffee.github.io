import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("control panel is branded for MAGASIN Business OS and controls the real Supervisor", async () => {
  const source = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /MAGASIN BUSINESS OS/);
  assert.match(source, /START ROBOT/);
  assert.match(source, /start-supervisor\.ps1/);
  assert.match(source, /stop-supervisor\.ps1/);
  assert.match(source, /runtime-status\.json/);
  assert.match(source, /00_PROJECT_STATE\.json/);
  assert.doesNotMatch(source, /SAYDI CONTROL/i);
});

test("installer creates one Business OS control shortcut and removes legacy desktop launchers", async () => {
  const source = await fs.readFile(
    new URL("../windows/install-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /MAGASIN BUSINESS OS CONTROL\.lnk/);
  assert.match(source, /control-panel\.ps1/);
  assert.match(source, /START_MAGASIN_SUPERVISOR\.cmd/);
  assert.match(source, /STOP_MAGASIN_SUPERVISOR\.cmd/);
  assert.match(source, /SAYDI CONTROL\.lnk/);
});

test("start script supports hidden background mode for the unified control panel", async () => {
  const source = await fs.readFile(
    new URL("../windows/start-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /\[switch\]\$Hidden/);
  assert.match(source, /WindowStyle Hidden/);
});
