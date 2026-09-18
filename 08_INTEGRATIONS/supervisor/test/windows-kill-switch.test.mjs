import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Windows STOP uses cooperative sentinel then bounded forced process-tree kill", async () => {
  const source = await fs.readFile(
    new URL("../windows/stop-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /Set-Content -Path \$stop/);
  assert.match(source, /for \(\$i = 0; \$i -lt 5; \$i\+\+\)/);
  assert.match(source, /taskkill\.exe \/PID \$pidValue \/T \/F/);
  assert.match(source, /Remove-Item \$pidFile/);
});
