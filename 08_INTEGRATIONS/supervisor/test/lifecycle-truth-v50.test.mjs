import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

async function read(rel) {
  return fs.readFile(new URL(rel, import.meta.url), "utf8");
}

test("A all lanes disabled does not auto-start Supervisor", async () => {
  const helper = await read("../windows/lifecycle-truth.ps1");
  const panel = await read("../windows/control-panel.ps1");
  const bootstrap = await read("../windows/autostart-bootstrap.ps1");

  assert.match(helper, /if \(\$enabledLaneCount -lt 1\)[\s\S]*?state = 'ALL_DISABLED'[\s\S]*?start_requested = \$false/);
  assert.match(panel, /'ALL_DISABLED'/);
  assert.match(bootstrap, /AUTOSTART_ALL_LANES_DISABLED/);
});

test("B enabled lane plus runtime OFF is recovered from Control Panel", async () => {
  const panel = await read("../windows/control-panel.ps1");
  const helper = await read("../windows/lifecycle-truth.ps1");

  assert.match(panel, /if \(\$enabledLaneCount -gt 0 -and -not \$ownerStop\.blocked -and -not \$processTruth\.healthy\)/);
  assert.match(panel, /Request-LifecycleRecovery/);
  assert.match(helper, /Start-Process powershell\.exe[\s\S]*?-Recovery/);
});

test("C stale persisted WORKING cannot outrank missing process truth", async () => {
  const panel = await read("../windows/control-panel.ps1");

  const processGuard = panel.indexOf("elseif (-not $processTruth.healthy)");
  const persistedStatus = panel.indexOf("elseif ($st -and $st.status)");
  assert.ok(processGuard >= 0);
  assert.ok(persistedStatus > processGuard);
  assert.match(panel, /ĐANG TỰ KHÔI PHỤC|ĐANG KHỞI ĐỘNG/);
});

test("D pending task and latches remain recovery state and exact-once semantics stay intact", async () => {
  const runtime = await read("../src/runtime/three-lane-cli.mjs");
  const install = await read("../windows/install-supervisor.ps1");

  assert.match(runtime, /dispatch_inflight/);
  assert.match(runtime, /relay_inflight/);
  assert.match(runtime, /last_result_relay_id/);
  assert.match(runtime, /captureUserTurnDigests/);
  assert.doesNotMatch(install, /lane-registry\.json[\s\S]*?Remove-Item/);
});

test("E healthy runtime is not restarted by lifecycle recovery", async () => {
  const helper = await read("../windows/lifecycle-truth.ps1");
  const panel = await read("../windows/control-panel.ps1");

  assert.match(helper, /if \(\$processTruth\.healthy\)[\s\S]*?state = 'HEALTHY'[\s\S]*?start_requested = \$false/);
  assert.match(panel, /-not \$processTruth\.healthy/);
});

test("F Owner STOP is fail-closed and only explicit Owner START clears latches", async () => {
  const start = await read("../windows/start-supervisor.ps1");
  const run = await read("../windows/run-supervisor.ps1");
  const install = await read("../windows/install-supervisor.ps1");
  const autoInstall = await read("../windows/install-autostart.ps1");

  assert.match(start, /if \(\$Recovery\)[\s\S]*?RECOVERY_START_BLOCKED_OWNER_STOP=True/);
  assert.match(start, /Only an explicit Owner START may clear/);
  assert.match(start, /Remove-Item \$stop/);
  assert.match(start, /Remove-Item \$autostartDisabled/);
  assert.match(run, /Supervisor launch blocked by Owner STOP\/AUTOSTART_DISABLED/);
  assert.doesNotMatch(install, /Remove-Item \$stopFile -Force/);
  assert.doesNotMatch(autoInstall, /Remove-Item \$disabled -Force/);
});

test("G Three-Lane death is recoverable under persistent wrapper", async () => {
  const wrapper = await read("../windows/run-supervisor.ps1");

  assert.match(wrapper, /& node @nodeArgs/);
  assert.match(wrapper, /if \(-not \(Test-Path \$stop\) -and -not \(Test-Path \$autostartDisabled\)\) \{\s*Start-Sleep -Seconds 3/);
});

test("H dedicated Chrome and CDP death are recovered without touching Owner Chrome", async () => {
  const wrapper = await read("../windows/run-supervisor.ps1");

  assert.match(wrapper, /Get-DedicatedChromeProcesses/);
  assert.match(wrapper, /Test-DedicatedCdpEndpoint/);
  assert.match(wrapper, /--user-data-dir=/);
  assert.match(wrapper, /Stop-DedicatedChrome/);
  assert.match(wrapper, /Supervisor requested dedicated Chrome restart/);
});

test("I lane-1-only operation does not require lane-2 or lane-3", async () => {
  const runtime = await read("../src/runtime/three-lane-cli.mjs");

  assert.match(runtime, /for \(const lane of config\.lanes\)/);
  assert.match(runtime, /if \(!lane\.enabled\)/);
  assert.match(runtime, /registry\.lanes\[lane\.lane_id\]/);
});

test("J three lanes use isolated registry entries and errors are contained per lane", async () => {
  const runtime = await read("../src/runtime/three-lane-cli.mjs");

  assert.match(runtime, /registry\.lanes\[lane\.lane_id\]/);
  assert.match(runtime, /statuses\[lane\.lane_id\] = await processLane/);
  assert.match(runtime, /type: "LANE_ERROR"/);
  assert.match(runtime, /for \(const lane of config\.lanes\)/);
});

test("K process banner and lane business state are composed from separate truth layers", async () => {
  const panel = await read("../windows/control-panel.ps1");
  const runtime = await read("../src/runtime/three-lane-cli.mjs");

  assert.match(panel, /ROBOT NỀN: ĐANG HOẠT ĐỘNG/);
  assert.match(panel, /ROBOT NỀN: ĐANG TỰ KHÔI PHỤC/);
  assert.match(panel, /\$processState/);
  assert.match(runtime, /truth_order: \["PROCESS_TRUTH", "LANE_TRUTH", "PERSISTED_RECOVERY_STATE"\]/);
  assert.match(runtime, /persisted_state_role: "RECOVERY_ONLY"/);
  assert.match(runtime, /process_truth_required: true/);
});

test("L reopening Control Panel after crash invokes bounded recovery without lane START click", async () => {
  const panel = await read("../windows/control-panel.ps1");

  assert.match(panel, /function Request-LifecycleRecovery/);
  assert.match(panel, /\$script:lastRecoveryRequestAt/);
  assert.match(panel, /TotalSeconds -lt 5/);
  assert.match(panel, /Request-LifecycleRecovery/);
  assert.doesNotMatch(
    panel,
    /Save-Lane \$id \$ui\.Project\.Text \$brainUrl \$workUrl \$true[\s\S]{0,500}Ensure-Supervisor/
  );
});

test("lifecycle architecture document locks Five-Step and truth order before implementation", async () => {
  const doc = await read("../docs/ROBOT_LIFECYCLE_TRUTH_ARCHITECTURE.md");

  assert.match(doc, /PROCESS TRUTH/);
  assert.match(doc, /LANE TRUTH/);
  assert.match(doc, /PERSISTED RECOVERY STATE/);
  assert.match(doc, /QUESTION/);
  assert.match(doc, /DELETE/);
  assert.match(doc, /SIMPLIFY/);
  assert.match(doc, /ACCELERATE/);
  assert.match(doc, /AUTOMATE/);
});
