import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Employee swap engine uses Element queries and ownerDocument creation", async () => {
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


test("Employee Give is fail-closed and Swap reason matches backend contract", async () => {
  const source = await fs.readFile(
    new URL("../../06_EMPLOYEE/swap/engine-v1.js", import.meta.url),
    "utf8"
  );
  assert.match(source,/giveShiftState='NOT_CONNECTED'/);
  assert.match(source,/Cho ca chưa có backend transfer đã xác minh/);
  assert.match(source,/Vui lòng nhập lý do đổi ca/);
  assert.match(source,/required placeholder="Bắt buộc nhập lý do"/);
  assert.doesNotMatch(source,/mode='give'/);
});
