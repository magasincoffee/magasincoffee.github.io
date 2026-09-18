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


test("project card reads project_status instead of runtime recovery status", async () => {
  const source = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /\$runtimeStatus\.project_status/);
  assert.match(source, /\$script:lastRemoteState\.status/);
});


test("control panel integrates the local GitHub Actions runner lifecycle", async () => {
  const source = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /C:\\actions-runner/);
  assert.match(source, /Runner\.Listener\.exe/);
  assert.match(source, /MAGASIN-PC RUNNER - KEEP OPEN/);
  assert.match(source, /START RUNNER/);
  assert.match(source, /RUNNER ONLINE/);
  assert.match(source, /Ensure-GitHubRunner -Interactive/);
  assert.match(source, /START ROBOT sẽ khởi động Runner trước/);
});

test("START ROBOT fail-closes if the local runner cannot be started", async () => {
  const source = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );

  const ensureIndex = source.indexOf("if (-not (Ensure-GitHubRunner -Interactive))");
  const startIndex = source.indexOf("Start-Process powershell.exe -WindowStyle Hidden", ensureIndex);
  assert.ok(ensureIndex >= 0);
  assert.ok(startIndex > ensureIndex);
  assert.match(source.slice(ensureIndex, startIndex), /return/);
});


test("control panel uses the shared supervised ChatGPT launcher", async () => {
  const source = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /open-supervisor-chat\.ps1/);
  assert.match(source, /ChatGPT Robot/);
  assert.doesNotMatch(source, /\$chatButton\.Add_Click\(\{ Start-Process 'https:\/\/chatgpt\.com\/' \}\)/);
});

test("shared ChatGPT launcher uses the Supervisor browser profile and bounded CDP port range", async () => {
  const source = await fs.readFile(
    new URL("../windows/open-supervisor-chat.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /browser_profile/);
  assert.match(source, /--remote-debugging-address=127\.0\.0\.1/);
  assert.match(source, /9222\.\.9232/);
  assert.match(source, /target\.json/);
  assert.match(source, /--user-data-dir=/);
});


test("control panel exposes a fail-closed Owner resolved recheck control", async () => {
  const source = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /ĐÃ XỬ LÝ — KIỂM TRA LẠI/);
  assert.match(source, /OWNER_RESOLVED\.request\.json/);
  assert.match(source, /OWNER_RESOLVED_RECHECK/);
  assert.match(source, /\$remote\.status -ne 'WAIT_USER'/);
  assert.match(source, /\$remote\.blocked/);
  assert.match(source, /không dùng để vượt BLOCKED\/security boundary/);
});


test("control panel exposes the persistent diagnostics folder", async () => {
  const source = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /diagnosticsRoot/);
  assert.match(source, /MỞ LOG LỖI/);
  assert.match(source, /Start-Process explorer\.exe/);
});


test("control panel distinguishes Owner decision from technical activation wait", async () => {
  const source = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /WAIT_USER • CẦN QUYẾT ĐỊNH/);
  assert.match(source, /WAIT_USER • CẦN CẤU HÌNH/);
  assert.match(source, /activation_boundary/);
  assert.match(source, /owner_boundary/);
  assert.match(source, /Cần cấu hình kỹ thuật trước khi tiếp tục/);
});


test("control panel reads live runtime flattened boundary metadata", async () => {
  const source = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /activation_boundary_pending/);
  assert.match(source, /owner_boundary_pending/);
});
