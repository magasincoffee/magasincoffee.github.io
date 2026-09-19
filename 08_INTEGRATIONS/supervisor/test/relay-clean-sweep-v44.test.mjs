import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  RELAY_RECONCILE_OUTCOMES,
  classifyRelayMarkerState,
  activeRelayScreenshotPaths
} from "../src/runtime/relay-reconciliation.mjs";
import {
  normalizeLaneConfig,
  normalizeLaneRegistry,
  buildWorkDispatchInstruction,
  workDispatchMarker
} from "../src/runtime/three-lane.mjs";

test("v44 marker-present relay is exact-once confirmed even when legacy latch was blocked", () => {
  assert.equal(
    classifyRelayMarkerState({ markerPresent: true, brainStable: false }),
    RELAY_RECONCILE_OUTCOMES.CONFIRMED
  );
});

test("v44 marker-absent stable Brain is safe NOT_CONFIRMED retry", () => {
  assert.equal(
    classifyRelayMarkerState({ markerPresent: false, brainStable: true }),
    RELAY_RECONCILE_OUTCOMES.NOT_CONFIRMED
  );
});

test("v44 busy Brain keeps relay PENDING without forcing a retry", () => {
  assert.equal(
    classifyRelayMarkerState({ markerPresent: false, brainStable: false }),
    RELAY_RECONCILE_OUTCOMES.PENDING
  );
});

test("active relay screenshot inventory is cross-lane isolated", () => {
  const registry = normalizeLaneRegistry({
    lanes: {
      "lane-1": {
        relay_inflight: { screenshot_path: "C:/evidence/lane-1-a.png" }
      },
      "lane-2": {
        relay_inflight: { screenshot_path: "C:/evidence/lane-2-b.png" }
      },
      "lane-3": {
        relay_inflight: null
      }
    }
  });
  assert.deepEqual(
    [...activeRelayScreenshotPaths(registry)].sort(),
    ["C:/evidence/lane-1-a.png", "C:/evidence/lane-2-b.png"]
  );
});

test("lane-1-only config does not enable or mutate other lane identities", () => {
  const config = normalizeLaneConfig({
    lanes: [
      { lane_id: "lane-1", enabled: true },
      { lane_id: "lane-2", enabled: false },
      { lane_id: "lane-3", enabled: false }
    ]
  });
  assert.equal(config.lanes[0].enabled, true);
  assert.equal(config.lanes[1].enabled, false);
  assert.equal(config.lanes[2].enabled, false);

  const registry = normalizeLaneRegistry({
    lanes: {
      "lane-1": { task_id: "TASK-L1", awaiting_work: true },
      "lane-2": { task_id: "TASK-L2", awaiting_work: false },
      "lane-3": { task_id: "TASK-L3", awaiting_work: false }
    }
  });
  registry.lanes["lane-1"].relay_inflight = { relay_id: "r1" };
  assert.equal(registry.lanes["lane-2"].relay_inflight, null);
  assert.equal(registry.lanes["lane-3"].relay_inflight, null);
});

test("v44 runtime migrates pre-existing blocked relay and never terminal-blocks or reloads relay reconciliation", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );
  const start = source.indexOf("async function reconcileRelayInflight");
  const end = source.indexOf("async function relayWorkResult", start);
  const reconcile = source.slice(start, end);

  assert.match(reconcile, /if \(latch\.reconcile_blocked\)/);
  assert.match(reconcile, /latch\.reconcile_blocked = false/);
  assert.match(reconcile, /LANE_RESULT_RELAY_BLOCKED_LATCH_RECOVERED/);
  assert.match(reconcile, /classifyRelayMarkerState/);
  assert.match(reconcile, /LANE_RESULT_RELAY_NOT_CONFIRMED_RETRY/);
  assert.doesNotMatch(reconcile, /return "BLOCKED"/);
  assert.doesNotMatch(reconcile, /page\.reload/);
  assert.doesNotMatch(reconcile, /LANE_RESULT_RELAY_RECONCILE_RELOAD/);
});

test("v44 relay dedupe, retry, confirmation and Owner rebind all clear relay screenshot evidence", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /async function clearRelayInflight/);
  assert.match(source, /await unlinkRelayScreenshot\(latch\)/);
  assert.match(source, /LANE_RESULT_RELAY_DEDUPED_BY_MARKER[\s\S]*?return;/);
  assert.match(source, /await clearRelayInflight\(registryLane\)/);
  assert.match(source, /async function finalizeConfirmedRelay/);
  assert.match(source, /applyOwnerBrainTarget[\s\S]*?await clearRelayInflight\(registryLane\)/);
  assert.match(source, /applyOwnerWorkTarget[\s\S]*?await clearRelayInflight\(registryLane\)/);
});

test("v44 orphan screenshot GC is bounded and preserves every active lane reference", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );
  assert.match(source, /async function cleanupOrphanRelayEvidence/);
  assert.match(source, /maxDeletes = 24/);
  assert.match(source, /activeRelayScreenshotPaths\(registry\)/);
  assert.match(source, /if \(active\.has\(candidate\)\) continue/);
  assert.match(source, /if \(deleted >= maxDeletes\) break/);
});

test("v44 preserves Owner Brain hot-swap contract while cleaning only relay evidence", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );
  assert.match(source, /async function applyOwnerBrainTarget/);
  assert.match(source, /brain_url_revision/);
  assert.match(source, /registryLane\.brain_url = configuredUrl/);
  assert.match(source, /await clearRelayInflight\(registryLane\)/);
});

test("v43 Work dispatch marker envelope remains unchanged in v44", () => {
  const text = buildWorkDispatchInstruction({
    taskId: "TASK-049/WORK-DISPATCH-V43-E2E-04",
    dispatchId: "17bb5c7442e65d9f6350f61330c595dd",
    instruction: "READ ONLY"
  });
  assert.equal(
    text,
    [
      "MAGASIN_WORK_DISPATCH_V1",
      "task_id=TASK-049/WORK-DISPATCH-V43-E2E-04",
      "dispatch_id=17bb5c7442e65d9f6350f61330c595dd",
      "",
      "READ ONLY"
    ].join("\n")
  );
  assert.equal(
    workDispatchMarker("17bb5c7442e65d9f6350f61330c595dd"),
    "dispatch_id=17bb5c7442e65d9f6350f61330c595dd"
  );
});
