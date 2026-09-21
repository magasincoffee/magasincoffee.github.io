import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  LANE_DIRECTIVE_START,
  LANE_DIRECTIVE_END,
  applyBrainResultVerdict,
  buildBrainStartRequest,
  buildLegacyBrainStartRequestV59,
  buildLegacyWorkDispatchInstructionV59,
  buildWorkDispatchInstruction,
  defaultLaneRegistry,
  directiveDispatchDigest,
  knownBrainStartRequestDigests,
  parseLaneDirective,
  sha256
} from "./three-lane.mjs";
import {
  LANE_EVENT_TYPES,
  serializeLaneEvent
} from "./lane-events.mjs";

const TASK = "TASK-RBT-008/FIXTURE-01";
const RELAY = "1".repeat(32);

function wrap(payload) {
  return [
    LANE_DIRECTIVE_START,
    JSON.stringify(payload),
    LANE_DIRECTIVE_END
  ].join("\n");
}

const legacyWorkJson = '{"action":"WORK","task_id":"TASK-LEGACY","instruction":"Do one thing."}';
const legacyWork = parseLaneDirective([
  LANE_DIRECTIVE_START,
  legacyWorkJson,
  LANE_DIRECTIVE_END
].join("\n"));
assert.deepEqual(legacyWork, {
  schema_version: "lane-directive.v1",
  action: "WORK",
  task_id: "TASK-LEGACY",
  instruction: "Do one thing.",
  instruction_digest: sha256("Do one thing."),
  digest: sha256(legacyWorkJson)
});

const lane = defaultLaneRegistry().lanes["lane-1"];
lane.task_id = TASK;
lane.last_result_relay_id = RELAY;

const accept = parseLaneDirective(wrap({
  action: "WORK",
  task_id: "TASK-NEXT",
  instruction: "Do the dependency-correct next bounded unit.",
  previous_result: {
    task_id: TASK,
    relay_id: RELAY,
    verdict: "ACCEPT",
    reason_code: "DOD_MET"
  }
}));
const acceptOutcome = applyBrainResultVerdict(lane, accept.previous_result, {
  at: "2026-09-21T04:00:00.000Z"
});
assert.equal(acceptOutcome.changed, true);
assert.equal(lane.last_result_verdict.verdict, "ACCEPT");

const acceptReplay = applyBrainResultVerdict(lane, accept.previous_result, {
  at: "2026-09-21T04:01:00.000Z"
});
assert.equal(acceptReplay.idempotent, true);
assert.equal(lane.last_result_verdict.recorded_at, "2026-09-21T04:00:00.000Z");

const rejectLane = defaultLaneRegistry().lanes["lane-1"];
rejectLane.task_id = TASK;
rejectLane.last_result_relay_id = RELAY;
const reject = parseLaneDirective(wrap({
  action: "WORK",
  task_id: "TASK-CORRECTION",
  instruction: "Repair only the rejected evidence and stop.",
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
const rejectOutcome = applyBrainResultVerdict(
  rejectLane,
  reject.previous_result,
  { at: "2026-09-21T04:02:00.000Z" }
);
assert.equal(rejectOutcome.record.verdict, "REJECT");

assert.throws(() => parseLaneDirective(wrap({
  action: "WORK",
  task_id: "TASK-UNRELATED",
  instruction: "Jump to unrelated roadmap work.",
  previous_result: {
    task_id: TASK,
    relay_id: RELAY,
    verdict: "REJECT",
    reason_code: "CORRECTION_REQUIRED"
  }
})), (error) => error?.code === "BRAIN_REJECT_CORRECTION_REQUIRED");

const p1 = parseLaneDirective(wrap({
  action: "WORK",
  task_id: "TASK-STABLE",
  instruction: "Same logical work.",
  previous_result: {
    task_id: TASK,
    relay_id: RELAY,
    verdict: "ACCEPT",
    reason_code: "DOD_MET"
  }
}));
const p2 = parseLaneDirective(wrap({
  action: "WORK",
  task_id: "TASK-STABLE",
  instruction: "Same logical work.",
  previous_result: {
    task_id: TASK,
    relay_id: RELAY,
    verdict: "ACCEPT",
    reason_code: "EVIDENCE_VERIFIED"
  }
}));
assert.equal(directiveDispatchDigest(p1), directiveDispatchDigest(p2));

const handshakeInput = { laneId: "lane-1", projectName: "Fixture" };
const knownHandshakes = knownBrainStartRequestDigests(handshakeInput);
assert.equal(
  knownHandshakes.has(sha256(buildLegacyBrainStartRequestV59(handshakeInput))),
  true
);
assert.equal(
  knownHandshakes.has(sha256(buildBrainStartRequest(handshakeInput))),
  true
);

const dispatchInput = {
  taskId: TASK,
  dispatchId: "2".repeat(32),
  instruction: "Do one bounded implementation task."
};
const legacyEnvelope = buildLegacyWorkDispatchInstructionV59(dispatchInput);
const guardedEnvelope = buildWorkDispatchInstruction(dispatchInput);
assert.equal(guardedEnvelope.startsWith(legacyEnvelope), true);
assert.match(guardedEnvelope, /Không tự bắt đầu task tiếp theo/);

const planningEvent = serializeLaneEvent({
  timestamp: "2026-09-21T04:03:00.000Z",
  lane_id: "lane-1",
  actor: "BRAIN",
  event_type: LANE_EVENT_TYPES.BRAIN_RESULT_ACCEPTED,
  task_id: TASK,
  phase: "ACCEPTED",
  reason_code: "DOD_MET",
  work_generation: 1,
  relay_id: RELAY
});
const eventText = JSON.stringify(planningEvent);
assert.doesNotMatch(eventText, /https?:\/\//);
assert.doesNotMatch(eventText, /message_body|instruction|cookie|token|screenshot_path/);

const runtimeSource = await fs.readFile(
  new URL("./three-lane-cli.mjs", import.meta.url),
  "utf8"
);
assert.match(runtimeSource, /legacyPersistedEnvelope/);
assert.match(runtimeSource, /LANE_WORK_V59_DISPATCH_RETRY_PRESERVED/);
assert.match(runtimeSource, /buildLegacyWorkDispatchInstructionV59/);
assert.match(runtimeSource, /LANE_BRAIN_LEGACY_HANDSHAKE_ADOPTED_NO_DUPLICATE/);
assert.match(runtimeSource, /dispatch_contract_version: "BRAIN_PLANNING_V1_GUARDED"/);

for (const marker of [
  "BRAIN_PLANNING_V1_BACKWARD_COMPATIBLE=True",
  "BRAIN_PLANNING_ACCEPT_CORRELATED=True",
  "BRAIN_PLANNING_REJECT_CORRELATED=True",
  "BRAIN_PLANNING_REJECT_UNRELATED_BLOCKED=True",
  "BRAIN_PLANNING_VERDICT_IDEMPOTENT=True",
  "BRAIN_PLANNING_LEGACY_HANDSHAKE_NO_DUPLICATE=True",
  "BRAIN_PLANNING_ACTIVE_DISPATCH_NO_RESEND=True",
  "BRAIN_PLANNING_WORK_STOP_GUARD=True",
  "BRAIN_PLANNING_EVENTS_PRIVACY_SAFE=True"
]) {
  console.log(marker);
}
