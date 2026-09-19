import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("start script fail-closes before launching Supervisor when autonomy is PAUSED", async () => {
  const source = await fs.readFile(
    new URL("../windows/start-supervisor.ps1", import.meta.url),
    "utf8"
  );

  const pauseIndex = source.indexOf("$projectState.autonomy -eq 'PAUSED'");
  const processIndex = source.indexOf("Start-Process powershell.exe", pauseIndex);

  assert.ok(pauseIndex >= 0);
  assert.ok(processIndex > pauseIndex);
  assert.match(source.slice(pauseIndex, processIndex), /exit 0/);
  assert.match(source, /Pause boundary:/);
});

test("runtime publishes PAUSED and exits before connecting to ChatGPT", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/supervisor-loop-cli.mjs", import.meta.url),
    "utf8"
  );

  const pauseIndex = source.indexOf('projectState.autonomy === "PAUSED"');
  const connectIndex = source.indexOf("const adapter = await session.connect();");

  assert.ok(pauseIndex >= 0);
  assert.ok(connectIndex > pauseIndex);
  assert.match(source.slice(pauseIndex, connectIndex), /status: "PAUSED"/);
  assert.match(source.slice(pauseIndex, connectIndex), /process\.exitCode = 76/);
  assert.match(source.slice(pauseIndex, connectIndex), /AUTONOMY_PAUSED/);
});

test("Windows wrapper closes dedicated Chrome and stops on pause exit code 76", async () => {
  const source = await fs.readFile(
    new URL("../windows/run-supervisor.ps1", import.meta.url),
    "utf8"
  );

  const pauseIndex = source.indexOf("$nodeExitCode -eq 76");
  assert.ok(pauseIndex >= 0);
  assert.match(source.slice(pauseIndex, pauseIndex + 700), /Stop-DedicatedChrome/);
  assert.match(source.slice(pauseIndex, pauseIndex + 700), /break/);
});


test("deployment workflow enforces Owner architecture pause without live Lane execution", async () => {
  const source = await fs.readFile(
    new URL("../../../.github/workflows/supervisor-autostart-install.yml", import.meta.url),
    "utf8"
  );

  assert.match(source, /OWNER_ARCHITECTURE_GATE=PAUSED/);
  assert.match(source, /ROBOT_MAY_EXECUTE=False/);
  assert.match(source, /stop-supervisor\.ps1/);
  assert.match(source, /OWNER_ARCHITECTURE_GATE_ENFORCED=True/);
  assert.match(source, /LIVE_ACCEPTANCE_SKIPPED_OWNER_PAUSED=True/);
  assert.match(source, /CONTROL_PANEL_OPENED=False/);
});
