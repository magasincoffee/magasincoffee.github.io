import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Windows wrapper selects THREE_LANE_V1 from source of truth", async () => {
  const source = await fs.readFile(
    new URL("../windows/run-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /THREE_LANE_V1/);
  assert.match(source, /three-lane-cli\.mjs/);
  assert.match(source, /BRAIN_WORKER_V1/);
  assert.match(source, /brain-worker-cli\.mjs/);
  assert.match(source, /supervisor-loop-cli\.mjs/);
});

test("wrapper preserves Three-Lane mode across transient source-of-truth fetch failures", async () => {
  const source = await fs.readFile(
    new URL("../windows/run-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /lane-status\.json/);
  assert.match(source, /lanes\.json/);
  assert.match(source, /\$runtimeMode = 'THREE_LANE_V1'/);
  assert.match(source, /retrying without mode downgrade/);
});

test("installer kills old Three-Lane node runtime during upgrade", async () => {
  const source = await fs.readFile(
    new URL("../windows/install-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /three-lane-cli/);
  assert.match(source, /brain-worker-cli/);
  assert.match(source, /supervisor-loop-cli/);
});

test("auto-upgrade validates THREE_LANE_V1 source of truth", async () => {
  const source = await fs.readFile(
    new URL("../../../.github/workflows/supervisor-autostart-install.yml", import.meta.url),
    "utf8"
  );

  assert.match(source, /THREE_LANE_V1/);
  assert.match(source, /lane_count/);
  assert.match(source, /Brain autodiscovery must be disabled/);
  assert.match(source, /SOURCE_OF_TRUTH_LOCAL_CHECK=True/);
});

test("auto-upgrade requires v45 Three-Lane runtime and three local lanes", async () => {
  const source = await fs.readFile(
    new URL("../../../.github/workflows/supervisor-autostart-install.yml", import.meta.url),
    "utf8"
  );

  assert.match(source, /2026-09-19\.49/);
  assert.match(source, /three-lane-cli\.mjs/);
  assert.match(source, /lane-status\.json/);
  assert.match(source, /lanes\.json/);
  assert.match(source, /THREE_LANE_COUNT=3/);
  assert.match(source, /BRAIN_AUTODISCOVERY_ACTIVE=False/);
  assert.match(source, /WORK_URL_OWNER_REQUIRED=False/);
  assert.match(source, /WORK_URL_OWNER_EDITABLE=True/);
  assert.match(source, /BRAIN_URL_OWNER_EDITABLE=True/);
  assert.match(source, /BRAIN_URL_PERSISTED=True/);
  assert.match(source, /BRAIN_URL_HOT_SWAP=True/);
  assert.match(source, /Save-BrainTarget/);
  assert.match(source, /brain_url_revision/);
});

test("post-job survival verifies Three-Lane runtime and Robot Chrome", async () => {
  const source = await fs.readFile(
    new URL("../../../.github/workflows/supervisor-autostart-install.yml", import.meta.url),
    "utf8"
  );

  assert.match(source, /verify-survival:/);
  assert.match(source, /POST_JOB_SUPERVISOR_ALIVE=True/);
  assert.match(source, /POST_JOB_THREE_LANE_ALIVE=True/);
  assert.match(source, /POST_JOB_ROBOT_CHROME_ALIVE=True/);
  assert.match(source, /POST_JOB_LANE_COUNT=3/);
  assert.match(source, /for \(\$i = 0; \$i -lt 60; \$i\+\+\)/);
  assert.match(source, /Dedicated Robot Chrome did not recover/);
  assert.match(source, /LIVE_ACCEPTANCE=True/);
  assert.match(source, /CONTROL_PANEL_OPENED=True/);
  assert.match(source, /SAFE_LOG_TAIL_BEGIN/);
  assert.match(source, /LIVE_LANE1_OWNER_BRAIN_ACTION_REQUIRED/);
  assert.match(source, /ownerBrainActionState/);
});


test("Control Panel explicit AUTO Work reset always advances work revision", async () => {
  const source = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /\[bool\]\$ForceWorkRevision = \$false/);
  assert.match(source, /work_url -ne \$newWorkUrl -or \$ForceWorkRevision/);
  assert.match(source, /Save-Lane \$id \$ui\.Project\.Text \$ui\.Brain\.Text '' \$false \$true/);
});


test("production state maintenance resets Work state by revision without changing target URLs", async () => {
  const source = await fs.readFile(
    new URL("../../../.github/workflows/supervisor-state-maintenance.yml", import.meta.url),
    "utf8"
  );

  assert.match(source, /reset-work-state/);
  assert.match(source, /work_url_revision/);
  assert.match(source, /TARGET_URLS_UNCHANGED=True/);
  assert.match(source, /Brain URL changed during state reset/);
  assert.match(source, /Work URL changed during state reset/);
  assert.match(source, /applied_work_url_revision/);
  assert.match(source, /2026-09-19\.49/);
  assert.doesNotMatch(source, /brain_url\s*=/);
  assert.doesNotMatch(source, /work_url\s*=/);
});
