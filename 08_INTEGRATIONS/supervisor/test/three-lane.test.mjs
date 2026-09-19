import test from "node:test";
import assert from "node:assert/strict";

import {
  THREE_LANE_MODE,
  LANE_IDS,
  normalizeChatGptConversationUrl,
  parseLaneDirective,
  defaultLaneConfig,
  normalizeLaneConfig,
  defaultLaneRegistry,
  normalizeLaneRegistry,
  buildLaneResultRelay
} from "../src/runtime/three-lane.mjs";

test("Three-Lane contract has exactly three fixed isolated lane IDs", () => {
  assert.equal(THREE_LANE_MODE, "THREE_LANE_V1");
  assert.deepEqual(LANE_IDS, ["lane-1", "lane-2", "lane-3"]);
  assert.equal(defaultLaneConfig().lanes.length, 3);
  assert.equal(Object.keys(defaultLaneRegistry().lanes).length, 3);
});

test("Brain and Work targets require explicit ChatGPT conversation URLs", () => {
  assert.equal(
    normalizeChatGptConversationUrl("https://chatgpt.com/c/abc?foo=bar"),
    "https://chatgpt.com/c/abc"
  );
  assert.equal(
    normalizeChatGptConversationUrl("https://chatgpt.com/project/xyz"),
    "https://chatgpt.com/project/xyz"
  );
  assert.throws(
    () => normalizeChatGptConversationUrl("https://chatgpt.com/"),
    /specific ChatGPT conversation/
  );
  assert.throws(
    () => normalizeChatGptConversationUrl("https://example.com/c/abc"),
    /specific ChatGPT conversation/
  );
});

test("lane directive accepts WORK and IDLE only", () => {
  const work = parseLaneDirective(
    'prefix\n<<<MAGASIN_LANE_DIRECTIVE_V1>>>\n{"action":"WORK","task_id":"TASK-1","instruction":"Do the bounded task"}\n<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>'
  );
  assert.equal(work.action, "WORK");
  assert.equal(work.task_id, "TASK-1");
  assert.equal(work.instruction, "Do the bounded task");
  assert.ok(work.instruction_digest);

  const idle = parseLaneDirective(
    '<<<MAGASIN_LANE_DIRECTIVE_V1>>>\n{"action":"IDLE"}\n<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>'
  );
  assert.equal(idle.action, "IDLE");

  assert.throws(
    () => parseLaneDirective(
      '<<<MAGASIN_LANE_DIRECTIVE_V1>>>\n{"action":"CREATE_BRAIN"}\n<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>'
    ),
    /unsupported lane directive/
  );
});

test("config normalization preserves exactly three lanes and Owner fields", () => {
  const config = normalizeLaneConfig({
    lanes: [
      { lane_id: "lane-2", project_name: "Media", brain_url: "https://chatgpt.com/c/media", enabled: true },
      { lane_id: "lane-9", project_name: "Ignored", brain_url: "x", enabled: true }
    ]
  });
  assert.equal(config.lanes.length, 3);
  assert.equal(config.lanes[1].project_name, "Media");
  assert.equal(config.lanes[1].enabled, true);
  assert.equal(config.lanes.some((lane) => lane.lane_id === "lane-9"), false);
});

test("registry normalization keeps Work state separate per lane", () => {
  const registry = normalizeLaneRegistry({
    lanes: {
      "lane-1": { work_url: "https://chatgpt.com/c/work1", awaiting_work: true, task_id: "A" },
      "lane-2": { work_url: "https://chatgpt.com/c/work2", awaiting_work: false, task_id: "B" }
    }
  });
  assert.equal(registry.lanes["lane-1"].work_url, "https://chatgpt.com/c/work1");
  assert.equal(registry.lanes["lane-2"].work_url, "https://chatgpt.com/c/work2");
  assert.equal(registry.lanes["lane-1"].awaiting_work, true);
  assert.equal(registry.lanes["lane-2"].awaiting_work, false);
});

test("result relay is deterministic and includes full Work text", () => {
  const a = buildLaneResultRelay({
    laneId: "lane-1",
    projectName: "Business OS",
    taskId: "TASK-123",
    generation: 2,
    responseText: "FULL RESULT BODY"
  });
  const b = buildLaneResultRelay({
    laneId: "lane-1",
    projectName: "Business OS",
    taskId: "TASK-123",
    generation: 2,
    responseText: "FULL RESULT BODY"
  });
  assert.equal(a.relay_id, b.relay_id);
  assert.match(a.text, /FULL RESULT BODY/);
  assert.match(a.text, /Ảnh đính kèm/);
});
