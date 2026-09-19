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
  assert.match(source, /Legacy mode was explicitly selected but no legacy target exists/);
});

test("auto-upgrade workflow installs runtime source changes and verifies a Brain target", async () => {
  const source = await fs.readFile(
    new URL("../../../.github/workflows/supervisor-autostart-install.yml", import.meta.url),
    "utf8"
  );

  assert.match(source, /08_INTEGRATIONS\/supervisor\/src\/\*\*/);
  assert.match(source, /00_PROJECT_STATE\.json/);
  assert.match(source, /Verify checked-out Brain\/Worker source-of-truth/);
  assert.match(source, /SOURCE_OF_TRUTH_LOCAL_CHECK=True/);
  assert.doesNotMatch(source, /raw\.githubusercontent\.com\/magasincoffee\/magasincoffee\.github\.io\/main\/01_DOCS\/MAGASIN\/00_PROJECT_STATE\.json/);
  assert.match(source, /brain-worker-cli\.mjs/);
  assert.match(source, /BRAIN_TARGET_REGISTERED=True/);
  assert.match(source, /2026-09-19\.29/);
});


test("auto-upgrade exposes explicit Owner Brain rebind when live v27 still has target mismatch", async () => {
  const source = await fs.readFile(
    new URL("../../../.github/workflows/supervisor-autostart-install.yml", import.meta.url),
    "utf8"
  );

  assert.match(source, /runtime-status\.json/);
  assert.match(source, /supervisor_runtime_version/);
  assert.match(source, /target mismatch/);
  assert.match(source, /BRAIN_REBIND_REQUIRED=True/);
  assert.match(source, /BRAIN_REBIND\.request\.json/);
  assert.match(source, /BRAIN_TARGET_REBOUND_OWNER/);
});


test("auto-upgrade verifies the bounded Owner recovery path for an uncertain Worker send", async () => {
  const source = await fs.readFile(
    new URL("../../../.github/workflows/supervisor-autostart-install.yml", import.meta.url),
    "utf8"
  );

  assert.match(source, /WORKER_RETRY_REQUIRED=True/);
  assert.match(source, /WORKER_RETRY\.request\.json/);
  assert.match(source, /WORKER_OWNER_RETRY_ARMED/);
  assert.match(source, /uncertain prior create\/send outcome/);
});


test("auto-upgrade rejects a v26 runtime still stuck on progress-turn or closed-context technical recovery", async () => {
  const source = await fs.readFile(
    new URL("../../../.github/workflows/supervisor-autostart-install.yml", import.meta.url),
    "utf8"
  );

  assert.match(source, /TECHNICAL_RECOVERY_STUCK=False/);
  assert.match(source, /missing MAGASIN_BRAIN_DIRECTIVE_V1 block/);
  assert.match(source, /Target page, context or browser has been closed/);
  assert.match(source, /automatically recoverable Brain\/CDP condition/);
});


test("Windows wrapper never downgrades Brain/Worker mode to legacy because project-state fetch failed", async () => {
  const source = await fs.readFile(
    new URL("../windows/run-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /\$brainWorkerMode = \$null/);
  assert.match(source, /orchestration\.json/);
  assert.match(source, /runtime-status\.json/);
  assert.match(source, /Project state is temporarily unavailable; preserving Supervisor wrapper and retrying without mode downgrade/);
  assert.doesNotMatch(source, /Preserve the last safe legacy behavior only when its target exists/);
});

test("self-hosted deployment verifies Supervisor survives the previous job cleanup", async () => {
  const source = await fs.readFile(
    new URL("../../../.github/workflows/supervisor-autostart-install.yml", import.meta.url),
    "utf8"
  );

  assert.match(source, /verify-survival:/);
  assert.match(source, /needs: install/);
  assert.match(source, /POST_JOB_SUPERVISOR_ALIVE=True/);
  assert.match(source, /POST_JOB_BRAIN_WORKER_ALIVE=True/);
  assert.match(source, /POST_JOB_ROBOT_CHROME_ALIVE=True/);
  assert.match(source, /FETCH_FAILURE_ESCALATED_TO_OWNER=False/);
});
