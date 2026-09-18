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


test("installer normalizes the panel for Windows PowerShell 5.1 and parses it before creating the shortcut", async () => {
  const source = await fs.readFile(
    new URL("../windows/install-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /UTF8Encoding\(\$true\)/);
  assert.match(source, /Language\.Parser\]::ParseFile/);
  assert.match(source, /Control panel PowerShell syntax check failed/);
  assert.match(source, /imageres\.dll,72/);
});


test("offline control panel prefers repository state over stale runtime task", async () => {
  const source = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /\$projectState = if \(\$process -and \$runtimeStatus -and \$runtimeStatus\.current_task\)/);
  assert.match(source, /elseif \(\$script:lastRemoteState\)/);
  assert.match(source, /Repository source-of-truth/);
});

test("control panel surfaces the bounded CDP cause tag in the safe log", async () => {
  const source = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /cause=\$\(\$e\.errorCause\)/);
});


test("control panel shows only current runtime boot log events", async () => {
  const source = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /\$bootIndex = -1/);
  assert.match(source, /"type":"RUNTIME_BOOT"/);
  assert.match(source, /Select-Object -Skip \$bootIndex/);
  assert.match(source, /Select-Object -Last 28/);
});
