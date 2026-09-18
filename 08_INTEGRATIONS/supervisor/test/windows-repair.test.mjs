import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("one-click repair updates main, installs fresh runtime and verifies the boot marker", async () => {
  const source = await fs.readFile(
    new URL("../windows/repair-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /git -C \$repoRoot pull --ff-only origin main/);
  assert.match(source, /Node\.js 20\+/);
  assert.match(source, /2026-09-19\.19/);
  assert.match(source, /Get-FreeCdpPort/);
  assert.match(source, /Test-DedicatedCdpEndpoint/);
  assert.match(source, /install-supervisor\.ps1/);
  assert.match(source, /Stop-DedicatedSupervisorChrome/);
  assert.match(source, /Stop-OrphanedSupervisorLoops/);
  assert.match(source, /MAGASIN_BUSINESS_OS_SUPERVISOR/);
  assert.match(source, /CommandLine -like "\*\$profile\*"/);
  assert.match(source, /RUNTIME_BOOT\.\*version=/);
  assert.match(source, /REPAIR_RESULT=PASS/);
  assert.match(source, /REPAIR_RESULT=FAIL/);
  assert.match(source, /Supervisor wrapper count:/);
  assert.match(source, /Supervisor Node loop count:/);
  assert.match(source, /Supervisor singleton verification failed/);
  assert.match(source, /brain-worker-cli\.mjs/);
});

test("one-click repair refuses dirty or non-main repositories", async () => {
  const source = await fs.readFile(
    new URL("../windows/repair-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /current branch is/);
  assert.match(source, /Repository has local changes/);
  assert.match(source, /--ff-only/);
});


test("repair script is ASCII-only for Windows PowerShell 5.1 parsing", async () => {
  const source = await fs.readFile(
    new URL("../windows/repair-supervisor.ps1", import.meta.url)
  );
  const nonAscii = [...source].filter((byte) => byte > 0x7f);
  assert.deepEqual(nonAscii, []);
});


test("repair script treats PAUSED autonomy as install-only success", async () => {
  const source = await fs.readFile(
    new URL("../windows/repair-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /\$projectStateUrl/);
  assert.match(source, /\$pausedInstallOnly/);
  assert.match(source, /autonomy -eq 'PAUSED'/);
  assert.match(source, /boot intentionally skipped/);
  assert.match(source, /PAUSED install verification failed/);
  assert.match(source, /Runtime status: PAUSED \(not launched by design\)/);
  assert.match(source, /boot was intentionally skipped because autonomy is PAUSED/);
  assert.match(source, /\$brainWorkerMode/);
  assert.match(source, /supervisor_orchestration/);
  assert.match(source, /Legacy ChatGPT target is missing/);
});
