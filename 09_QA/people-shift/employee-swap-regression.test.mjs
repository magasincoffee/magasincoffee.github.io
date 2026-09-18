import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Employee swap engine uses Document APIs when creating/querying controls", async () => {
  const source = await fs.readFile(
    new URL("../../06_EMPLOYEE/swap/engine-v1.js", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /\bx\.getElementById\(/);
  assert.doesNotMatch(source, /\bx\.createElement\(/);
  assert.match(source, /x\.ownerDocument\.createElement\('div'\)/);
  assert.match(source, /x\.querySelector\('#employeeSwapTarget'\)/);
  assert.match(source, /x\.querySelector\('#employeeSwapReason'\)/);
});
