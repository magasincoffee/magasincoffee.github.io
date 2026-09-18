import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Employee availability V2 supports multi-window types, delete and week navigation", async () => {
  const source = await fs.readFile(
    new URL("../../06_EMPLOYEE/availability/engine-v1.js", import.meta.url),
    "utf8"
  );
  assert.match(source,/AVAILABLE:'Có thể làm'/);
  assert.match(source,/PREFERRED:'Ưu tiên'/);
  assert.match(source,/UNAVAILABLE:'Không thể làm \/ Off'/);
  assert.match(source,/delete_my_availability/);
  assert.match(source,/data-av-week="prev"/);
  assert.match(source,/data-av-week="next"/);
  assert.match(source,/p_availability_type:type/);
  assert.match(source,/type==='UNAVAILABLE'\?null/);
  assert.match(source,/Có thể đăng ký nhiều khoảng trong cùng ngày/);
  assert.match(source,/“Cả Ngày” chưa có giờ chuẩn đã duyệt/);
});
