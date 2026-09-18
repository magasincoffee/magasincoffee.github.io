import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Windows wrapper force-restarts only dedicated Chrome after CDP restart exit code", async () => {
  const source = await fs.readFile(
    new URL("../windows/run-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /function Stop-DedicatedChrome/);
  assert.match(source, /CommandLine -like "\*\$profile\*"/);
  assert.match(source, /\$nodeExitCode = \$LASTEXITCODE/);
  assert.match(source, /\$nodeExitCode -eq 75/);
  assert.match(source, /Stop-DedicatedChrome[\s\S]*continue/);
});
