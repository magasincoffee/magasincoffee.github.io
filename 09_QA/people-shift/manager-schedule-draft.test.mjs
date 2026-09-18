import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Manager draft editor uses robot/replace/validate RPCs and never auto-publishes", async () => {
  const source = await fs.readFile(
    new URL("../../05_MANAGER/runtime/compat/workforce/manager-schedule-draft-editor-v1.js", import.meta.url),
    "utf8"
  );
  for (const rpc of [
    "auto_generate_schedule_generation",
    "get_schedule_generation_assignments",
    "get_manager_weekly_availability",
    "replace_schedule_generation_assignments",
    "validate_schedule_generation_v1"
  ]) {
    assert.match(source, new RegExp(rpc), `missing ${rpc}`);
  }
  assert.match(source, /async function review\(\)/);
  assert.match(source, /review_schedule_generation/);
  assert.match(source, /async function publish\(\)/);
  assert.match(source, /publish_schedule_generation/);
  assert.match(source, /status:'DRAFT'/);
  assert.match(source, /Phải duyệt lịch thành REVIEWED trước khi Publish/);
  const robot = source.slice(source.indexOf("async function robot"), source.indexOf("document.addEventListener('magasin:schedule-robot-request'"));
  assert.doesNotMatch(robot, /review_schedule_generation/);
  assert.doesNotMatch(robot, /publish_schedule_generation/);
  assert.match(source, /MANUAL_FROM_AVAILABILITY/);
});

test("Manager runtime loads canonical draft editor", async () => {
  const source = await fs.readFile(
    new URL("../../05_MANAGER/runtime/manager-runtime-v1.html", import.meta.url),
    "utf8"
  );
  assert.match(source, /manager-schedule-draft-editor-v1\.js/);
});
