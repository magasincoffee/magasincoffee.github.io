import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scripts = [
  "../windows/run-supervisor.ps1",
  "../windows/start-supervisor.ps1",
  "../windows/stop-supervisor.ps1",
  "../windows/install-supervisor.ps1",
  "../windows/repair-supervisor.ps1",
  "../windows/control-panel.ps1"
];

for (const relative of scripts) {
  test(`Windows PowerShell 5.1 parses ${relative}`, { skip: process.platform !== "win32" }, () => {
    const file = fileURLToPath(new URL(relative, import.meta.url));
    const escaped = file.replaceAll("'", "''");
    const command = [
      "$errors = $null",
      `[System.Management.Automation.Language.Parser]::ParseFile('${escaped}', [ref]$null, [ref]$errors) | Out-Null`,
      "if ($errors.Count -gt 0) {",
      "  $errors | ForEach-Object { Write-Error ($_.Message + ' at line ' + $_.Extent.StartLineNumber) }",
      "  exit 1",
      "}",
      "exit 0"
    ].join("; ");

    const result = spawnSync("powershell.exe", [
      "-NoLogo",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      command
    ], { encoding: "utf8" });

    assert.equal(
      result.status,
      0,
      `PowerShell parse failed for ${relative}:\n${result.stdout}\n${result.stderr}`
    );
  });
}
