import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("installer stops existing dedicated Supervisor before replacing runtime", async () => {
  const source = await fs.readFile(
    new URL("../windows/install-supervisor.ps1", import.meta.url),
    "utf8"
  );

  assert.match(source, /supervisor\.pid/);
  assert.match(source, /taskkill\.exe \/PID \$pidValue \/T \/F/);
  assert.match(source, /for \(\$i = 0; \$i -lt 8; \$i\+\+\)/);
  assert.match(source, /Remove-Item \$runtime -Recurse -Force/);
});
