import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  BRAIN_RESULT_VERDICTS,
  LANE_DIRECTIVE_START,
  LANE_DIRECTIVE_END,
  applyBrainResultVerdict,
  buildBrainStartRequest,
  buildLegacyBrainStartRequestV59,
  buildLegacyWorkDispatchInstructionV59,
  buildLaneResultRelay,
  buildWorkDispatchInstruction,
  defaultLaneRegistry,
  directiveDispatchDigest,
  knownBrainStartRequestDigests,
  parseLaneDirective,
  sha256
} from "../src/runtime/three-lane.mjs";
import {
  LANE_EVENT_TYPES,
  serializeLaneEvent
} from "../src/runtime/lane-events.mjs";

const RELAY = "a".repeat(32);
const OTHER_RELAY = "b".repeat(32);
const TASK = "TASK-RBT-008/UNIT-01";

function wrap(payload) {
  return [
    LANE_DIRECTIVE_START,
    JSON.stringify(payload),
    LANE_DIRECTIVE_END
  ].join("\n");
}

function laneWithRelayedResult() {
  const registry = defaultLaneRegistry();
  const lane = registry.lanes["lane-1"];
  lane.task_id = TASK;
  lane.last_result_relay_id = RELAY;
  lane.last_work_result_digest = "c".repeat(64);
  return lane;
}

test("old WORK v1 directive parses identically", () => {
  const json = '{"action":"WORK","task_id":"TASK-OLD","instruction":"Do one thing."}';
  const parsed = parseLaneDirective([
    LANE_DIRECTIVE_START,
    json,
    LANE_DIRECTIVE_END
  ].join("\n"));
  assert.deepEqual(parsed, {
    schema_version: "lane-directive.v1",
    action: "WORK",
    task_id: "TASK-OLD",
    instruction: "Do one thing.",
    instruction_digest: sha256("Do one thing."),
    digest: sha256(json)
  });
});

test("old IDLE v1 directive parses identically", () => {
  const json = '{"action":"IDLE"}';
  const parsed = parseLaneDirective([
    LANE_DIRECTIVE_START,
    json,
    LANE_DIRECTIVE_END
  ].join("\n"));
  assert.deepEqual(parsed, {
    schema_version: "lane-directive.v1",
    action: "IDLE",
    digest: sha256(json)
  });
});

test("optional ACCEPT metadata parses narrowly and unknown fields are inert", () => {
  const parsed = parseLaneDirective(wrap({
    action: "WORK",
    task_id: "TASK-NEXT",
    instruction: "Next bounded unit.",
    previous_result: {
      task_id: TASK,
      relay_id: RELAY,
      verdict: "ACCEPT",
      reason_code: "DOD_MET"
    },
    ignored_future_field: {
      url: "https://example.invalid/private"
    }
  }));
  assert.deepEqual(parsed.previous_result, {
    task_id: TASK,
    relay_id: RELAY,
    verdict: "ACCEPT",
    reason_code: "DOD_MET"
  });
  assert.equal("ignored_future_field" in parsed, false);
});

test("optional REJECT metadata requires explicit correlated correction for WORK", () => {
  const parsed = parseLaneDirective(wrap({
    action: "WORK",
    task_id: "TASK-CORRECTION",
    instruction: "Fix only the rejected evidence and stop.",
    previous_result: {
      task_id: TASK,
      relay_id: RELAY,
      verdict: "REJECT",
      reason_code: "CORRECTION_REQUIRED"
    },
    correction_of: {
      task_id: TASK,
      relay_id: RELAY
    }
  }));
  assert.equal(parsed.previous_result.verdict, "REJECT");
  assert.deepEqual(parsed.correction_of, {
    task_id: TASK,
    relay_id: RELAY
  });

  assert.throws(
    () => parseLaneDirective(wrap({
      action: "WORK",
      task_id: "TASK-UNRELATED",
      instruction: "Jump elsewhere.",
      previous_result: {
        task_id: TASK,
        relay_id: RELAY,
        verdict: "REJECT",
        reason_code: "CORRECTION_REQUIRED"
      }
    })),
    (error) => error?.code === "BRAIN_REJECT_CORRECTION_REQUIRED"
  );
});

test("malformed known verdict metadata fails closed", () => {
  for (const previous_result of [
    "ACCEPT",
    { task_id: TASK, relay_id: RELAY, verdict: "MAYBE" },
    { task_id: TASK, relay_id: "not-a-relay", verdict: "ACCEPT" },
    { task_id: TASK, relay_id: RELAY, verdict: "ACCEPT", reason_code: "FREE_FORM_REASON" }
  ]) {
    assert.throws(() => parseLaneDirective(wrap({
      action: "IDLE",
      previous_result
    })));
  }
});

test("verdict correlation, idempotency and conflict are durable and fail closed", () => {
  const lane = laneWithRelayedResult();
  const accepted = {
    task_id: TASK,
    relay_id: RELAY,
    verdict: BRAIN_RESULT_VERDICTS.ACCEPT,
    reason_code: "DOD_MET"
  };
  const first = applyBrainResultVerdict(lane, accepted, {
    at: "2026-09-21T04:00:00.000Z"
  });
  assert.equal(first.changed, true);
  assert.equal(lane.last_result_verdict.verdict, "ACCEPT");

  const replay = applyBrainResultVerdict(lane, accepted, {
    at: "2026-09-21T04:01:00.000Z"
  });
  assert.equal(replay.changed, false);
  assert.equal(replay.idempotent, true);
  assert.equal(lane.last_result_verdict.recorded_at, "2026-09-21T04:00:00.000Z");

  assert.throws(
    () => applyBrainResultVerdict(lane, {
      ...accepted,
      verdict: "REJECT",
      reason_code: "CORRECTION_REQUIRED"
    }),
    (error) => error?.code === "BRAIN_VERDICT_CONFLICT"
  );
});

test("mismatched task and relay verdicts fail closed", () => {
  const lane = laneWithRelayedResult();
  assert.throws(
    () => applyBrainResultVerdict(lane, {
      task_id: "TASK-OTHER",
      relay_id: RELAY,
      verdict: "ACCEPT",
      reason_code: "DOD_MET"
    }),
    (error) => error?.code === "BRAIN_VERDICT_TASK_MISMATCH"
  );
  assert.throws(
    () => applyBrainResultVerdict(lane, {
      task_id: TASK,
      relay_id: OTHER_RELAY,
      verdict: "ACCEPT",
      reason_code: "DOD_MET"
    }),
    (error) => error?.code === "BRAIN_VERDICT_RELAY_MISMATCH"
  );
});

test("ACCEPT supports next WORK or IDLE and REJECT IDLE is an Owner path", () => {
  const acceptWork = parseLaneDirective(wrap({
    action: "WORK",
    task_id: "TASK-NEXT",
    instruction: "Dependency-correct next task.",
    previous_result: {
      task_id: TASK,
      relay_id: RELAY,
      verdict: "ACCEPT",
      reason_code: "DOD_MET"
    }
  }));
  assert.equal(acceptWork.action, "WORK");

  const acceptIdle = parseLaneDirective(wrap({
    action: "IDLE",
    previous_result: {
      task_id: TASK,
      relay_id: RELAY,
      verdict: "ACCEPT",
      reason_code: "DOD_MET"
    }
  }));
  assert.equal(acceptIdle.action, "IDLE");

  const rejectIdle = parseLaneDirective(wrap({
    action: "IDLE",
    previous_result: {
      task_id: TASK,
      relay_id: RELAY,
      verdict: "REJECT",
      reason_code: "OWNER_INTERVENTION_REQUIRED"
    }
  }));
  assert.equal(rejectIdle.previous_result.verdict, "REJECT");
});

test("planning metadata cannot change logical dispatch identity", () => {
  const a = parseLaneDirective(wrap({
    action: "WORK",
    task_id: "TASK-NEXT",
    instruction: "Same logical task.",
    previous_result: {
      task_id: TASK,
      relay_id: RELAY,
      verdict: "ACCEPT",
      reason_code: "DOD_MET"
    }
  }));
  const b = parseLaneDirective(wrap({
    action: "WORK",
    task_id: "TASK-NEXT",
    instruction: "Same logical task.",
    previous_result: {
      task_id: TASK,
      relay_id: RELAY,
      verdict: "ACCEPT",
      reason_code: "EVIDENCE_VERIFIED"
    }
  }));
  assert.notEqual(a.digest, b.digest);
  assert.equal(directiveDispatchDigest(a), directiveDispatchDigest(b));
});

test("v59 and v60 Brain handshakes are both recognized during upgrade", () => {
  const input = { laneId: "lane-1", projectName: "Test" };
  const legacy = sha256(buildLegacyBrainStartRequestV59(input));
  const current = sha256(buildBrainStartRequest(input));
  const known = knownBrainStartRequestDigests(input);
  assert.notEqual(legacy, current);
  assert.equal(known.has(legacy), true);
  assert.equal(known.has(current), true);
});

test("Work wrapper adds stop guard while v59 envelope remains reconstructable", () => {
  const input = {
    taskId: TASK,
    dispatchId: "d".repeat(32),
    instruction: "Do exactly one implementation unit."
  };
  const legacy = buildLegacyWorkDispatchInstructionV59(input);
  const guarded = buildWorkDispatchInstruction(input);
  assert.match(guarded, /MAGASIN_WORK_DISPATCH_V1/);
  assert.match(guarded, /Không tự bắt đầu task tiếp theo/);
  assert.match(guarded, /Trả evidence\/result.*DỪNG/);
  assert.equal(guarded.startsWith(legacy), true);
  assert.notEqual(sha256(guarded), sha256(legacy));
});

test("Brain prompts encode planning size guidance without changing watchdog semantics", async () => {
  const prompt = buildBrainStartRequest({ laneId: "lane-1", projectName: "Test" });
  assert.match(prompt, /PLAN → DISPATCH → VERIFY → ACCEPT\/REJECT → NEXT PLAN/);
  assert.match(prompt, /<=20 phút/);
  assert.match(prompt, />30 phút/);
  assert.match(prompt, /không phải runtime timeout/);

  const watchdog = await fs.readFile(
    new URL("../src/runtime/work-watchdog.mjs", import.meta.url),
    "utf8"
  );
  assert.match(watchdog, /25 \* 60 \* 1000/);
  assert.match(watchdog, /30 \* 60 \* 1000/);
});

test("result relay requests VERIFY before machine verdict and never equates transport with ACCEPT", () => {
  const relay = buildLaneResultRelay({
    laneId: "lane-1",
    projectName: "Test",
    taskId: TASK,
    generation: 1,
    responseText: "Evidence result."
  });
  assert.match(relay.text, /VERIFY kết quả này/);
  assert.match(relay.text, /previous_result/);
  assert.match(relay.text, /correction_of/);
  assert.doesNotMatch(relay.text, /RESULT_RELAY_CONFIRMED.*ACCEPT/);
});

test("planning events serialize metadata only", () => {
  for (const [event_type, phase, reason_code] of [
    [LANE_EVENT_TYPES.BRAIN_RESULT_ACCEPTED, "ACCEPTED", "DOD_MET"],
    [LANE_EVENT_TYPES.BRAIN_RESULT_REJECTED, "REJECTED", "CORRECTION_REQUIRED"],
    [LANE_EVENT_TYPES.BRAIN_CORRECTION_DISPATCHED, "CORRECTION", "BRAIN_CORRECTION_DISPATCHED"]
  ]) {
    const event = serializeLaneEvent({
      timestamp: "2026-09-21T04:00:00.000Z",
      lane_id: "lane-1",
      actor: "BRAIN",
      event_type,
      task_id: TASK,
      phase,
      reason_code,
      work_generation: 2,
      relay_id: RELAY
    });
    const text = JSON.stringify(event);
    assert.doesNotMatch(text, /https?:\/\//);
    assert.doesNotMatch(text, /message_body|instruction|cookie|token|screenshot_path/);
  }
});

test("runtime contains persisted verdict gate, legacy handshake migration and v59 dispatch-envelope reuse", async () => {
  const runtime = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );
  assert.match(runtime, /SUPERVISOR_RUNTIME_VERSION = "2026-09-20\.60"/);
  assert.match(runtime, /applyDirectivePreviousResult/);
  assert.match(runtime, /LANE_BRAIN_LEGACY_HANDSHAKE_ADOPTED_NO_DUPLICATE/);
  assert.match(runtime, /legacyPersistedEnvelope/);
  assert.match(runtime, /buildLegacyWorkDispatchInstructionV59/);
  assert.match(runtime, /dispatch_contract_version: "BRAIN_PLANNING_V1_GUARDED"/);
  assert.match(runtime, /BRAIN_REJECT_CORRECTION_REQUIRED|VERDICT_BLOCKED/);
});

test("RBT-007 timeline maps verdict events without exposing correlation identifiers", async () => {
  const helper = await fs.readFile(
    new URL("../windows/control-panel-observability.ps1", import.meta.url),
    "utf8"
  );
  assert.match(helper, /BRAIN_RESULT_ACCEPTED = 'Brain đã chấp nhận kết quả'/);
  assert.match(helper, /BRAIN_RESULT_REJECTED = 'Brain yêu cầu sửa lại'/);
  const panel = await fs.readFile(
    new URL("../windows/control-panel.ps1", import.meta.url),
    "utf8"
  );
  const start = panel.indexOf("function Refresh-Timeline");
  const end = panel.indexOf("function Refresh-Ui", start);
  const render = panel.slice(start, end);
  assert.doesNotMatch(render, /relay_id|dispatch_id|target_digest/);
});
