import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeControlTowerSnapshot, formatCount } from "../../04_OWNER/ControlTower/snapshot-v1.mjs";

const manager = fs.readFileSync(new URL("../../05_MANAGER/runtime/manager-shell-v1.html", import.meta.url), "utf8");
const employee = fs.readFileSync(new URL("../../06_EMPLOYEE/app/employee-v40.html", import.meta.url), "utf8");

test("Manager Task surface fails closed instead of presenting prototype task facts", () => {
  assert.match(manager, /id="view-tasks"/);
  assert.match(manager, /data-task-quality="NOT_CONNECTED">NOT CONNECTED</);
  assert.match(manager, /data-task-source-state="NOT_CONNECTED"/);
  assert.match(manager, /Chưa có nguồn công việc đã xác minh/);
  assert.doesNotMatch(manager, /data-modal="Giao việc"/);
  for (const prototype of [
    "Kiểm tra tồn hàng cuối ca",
    "Vệ sinh máy dập nắp",
    "Checklist mở ca",
    "Kiểm tra thiết bị đầu ca",
    "2 công việc cuối ca chưa hoàn tất"
  ]) {
    assert.equal(manager.includes(prototype), false, `prototype Task fact must be absent: ${prototype}`);
  }
});

test("Employee Task surface is explicit NOT_CONNECTED, not loading or false-empty", () => {
  assert.match(employee, /data-task-source-state="NOT_CONNECTED"/);
  assert.match(employee, /id="taskBadge" data-task-quality="NOT_CONNECTED">NOT CONNECTED</);
  assert.match(employee, /Nguồn Công việc chưa được kết nối/);
  assert.doesNotMatch(employee, /Đang tải công việc/);
  assert.doesNotMatch(employee, /id="taskBadge">Đang tải/);
  assert.doesNotMatch(employee, /<strong>Hôm nay không có công việc<\/strong>/);
});

test("Owner Control Tower redacts Task metrics while source is missing", () => {
  const snapshot = normalizeControlTowerSnapshot({});
  assert.equal(snapshot.tasks.quality, "NOT_CONNECTED");
  assert.equal(snapshot.tasks.overdueCount, null);
  assert.equal(snapshot.tasks.openCount, null);
  assert.equal(formatCount(snapshot.tasks.overdueCount), "—");
  assert.equal(formatCount(snapshot.tasks.openCount), "—");
});

console.log("PASS SOP/Task fail-closed UI integrity contract");
