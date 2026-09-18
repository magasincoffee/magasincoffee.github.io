import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Windows wrapper selects Brain/Worker runtime only from source-of-truth mode", async () => {
  const source = await fs.readFile(
    new URL("../windows/run-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /supervisor_orchestration\.mode/);
  assert.match(source, /BRAIN_WORKER_V1/);
  assert.match(source, /brain-worker-cli\.mjs/);
  assert.match(source, /supervisor-loop-cli\.mjs/);
  assert.match(source, /Legacy Supervisor target is missing/);
});

test("auto-upgrade workflow installs runtime source changes and verifies a Brain target", async () => {
  const source = await fs.readFile(
    new URL("../../../.github/workflows/supervisor-autostart-install.yml", import.meta.url),
    "utf8"
  );

  assert.match(source, /08_INTEGRATIONS\/supervisor\/src\/\*\*/);
  assert.match(source, /00_PROJECT_STATE\.json/);
  assert.match(source, /BRAIN_WORKER_V1 source-of-truth/);
  assert.match(source, /brain-worker-cli\.mjs/);
  assert.match(source, /BRAIN_TARGET_REGISTERED=True/);
  assert.match(source, /2026-09-19\.17/);
});
