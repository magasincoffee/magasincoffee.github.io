import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

async function read(rel) {
  return fs.readFile(new URL(rel, import.meta.url), "utf8");
}

function functionSlice(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0, "missing start: " + startNeedle);
  assert.ok(end > start, "missing end: " + endNeedle);
  return source.slice(start, end);
}

test("RBT-004 runtime is v53 and imports exactly one canonical scheduler", async () => {
  const runtime = await read("../src/runtime/three-lane-cli.mjs");
  assert.match(runtime, /SUPERVISOR_RUNTIME_VERSION = "2026-09-20\.53"/);
  assert.match(runtime, /from "\.\/browser-scheduler\.mjs"/);
  assert.equal((runtime.match(/new BrowserScheduler\(/g) || []).length, 1);
  assert.match(runtime, /pageBudget: args\.pageBudget/);
});

test("main loop schedules one enabled lane turn at a time instead of processing all lanes", async () => {
  const runtime = await read("../src/runtime/three-lane-cli.mjs");
  const loop = functionSlice(runtime, "while (true) {", "} finally {");
  assert.match(loop, /const turn = scheduler\.nextEnabledTurn\(config\.lanes\)/);
  assert.match(loop, /const lane = config\.lanes\.find\(\(item\) => item\.lane_id === turn\.lane_id\)/);
  assert.match(loop, /statuses\[lane\.lane_id\] = await processLane\(/);
  assert.doesNotMatch(loop, /for \(const lane of config\.lanes\) \{[\s\S]*?await processLane\(/);
  assert.match(loop, /if \(turn\.round_complete\) \{[\s\S]*?await delay\(args\.pollMs\)/);
});

test("bounded lane turn separates completed-result capture from relay mutation", async () => {
  const runtime = await read("../src/runtime/three-lane-cli.mjs");
  const turn = functionSlice(runtime, "async function processLaneTurn", "async function processLane(args)");
  const completed = turn.indexOf("markTaskCompleted");
  const boundedReturn = turn.indexOf("relay mutation được tách sang bounded turn kế tiếp", completed);
  const relay = turn.indexOf("relayWorkResult", boundedReturn);
  assert.ok(completed >= 0);
  assert.ok(boundedReturn > completed);
  assert.ok(relay > boundedReturn);
});

test("lane page observations are released after every turn", async () => {
  const runtime = await read("../src/runtime/three-lane-cli.mjs");
  const wrapper = functionSlice(runtime, "async function processLane(args)", "const args = parseArgs");
  assert.match(wrapper, /finally \{[\s\S]*?releaseLaneObservations/);
});

test("Brain and Work exact targets carry scheduler lane/revision/generation metadata", async () => {
  const runtime = await read("../src/runtime/three-lane-cli.mjs");
  const turn = functionSlice(runtime, "async function processLaneTurn", "async function processLane(args)");
  assert.match(turn, /scheduler,[\s\S]*?laneId: lane\.lane_id,[\s\S]*?targetRevision: Number\(registryLane\.applied_brain_url_revision/);
  assert.match(turn, /targetRevision: Number\(registryLane\.applied_work_url_revision/);
  assert.match(turn, /generation: Number\(registryLane\.work_generation/);
});

test("all destructive sends and reconcile reloads are guarded by global mutation lease", async () => {
  const runtime = await read("../src/runtime/three-lane-cli.mjs");
  assert.match(runtime, /reason: "BRAIN_REQUEST_SEND"/);
  assert.match(runtime, /reason: "BRAIN_RECONCILE_RELOAD"/);
  assert.match(runtime, /reason: "WORK_RECONCILE_RELOAD"/);
  assert.match(runtime, /reason: "WORK_DISPATCH_SEND"/);
  assert.match(runtime, /reason: "RESULT_RELAY_SEND"/);
  assert.match(runtime, /scheduler\.createPageUnderMutation/);
});

test("adapter exposes page count, safe composer-artifact guard and close primitive without second browser", async () => {
  const adapter = await read("../src/ui/playwright-adapter.mjs");
  assert.match(adapter, /getChatGptPageCount\(\)/);
  assert.match(adapter, /hasNonPersistedComposerArtifact\(page\)/);
  assert.match(adapter, /async closePage\(page\)/);
  assert.equal((adapter.match(/launchPersistentContext/g) || []).length, 1);
  assert.equal((adapter.match(/connectOverCDP/g) || []).length, 2);
});

test("RBT-003 active versus pending Work fields remain durable registry truth", async () => {
  const state = await read("../src/runtime/work-target-state.mjs");
  const runtime = await read("../src/runtime/three-lane-cli.mjs");
  assert.match(state, /pending_work_url/);
  assert.match(state, /pending_work_url_revision/);
  assert.match(state, /pending_work_mode/);
  assert.match(state, /hasActiveWorkTransaction/);
  assert.match(runtime, /applyPendingWorkTargetAtSafeBoundary/);
  assert.doesNotMatch(await read("../src/runtime/browser-scheduler.mjs"), /pending_work_url\s*=/);
  assert.doesNotMatch(await read("../src/runtime/browser-scheduler.mjs"), /dispatch_inflight\s*=/);
  assert.doesNotMatch(await read("../src/runtime/browser-scheduler.mjs"), /relay_inflight\s*=/);
  assert.doesNotMatch(await read("../src/runtime/browser-scheduler.mjs"), /task_id\s*=/);
});

test("scheduler status is metadata-only and does not expose target URLs", async () => {
  const runtime = await read("../src/runtime/three-lane-cli.mjs");
  const scheduler = await read("../src/runtime/browser-scheduler.mjs");
  assert.match(runtime, /scheduler: scheduler \? scheduler\.snapshot\(\) : null/);
  assert.doesNotMatch(scheduler, /snapshot\(\)[\s\S]*?target_key/);
  assert.doesNotMatch(scheduler, /snapshot\(\)[\s\S]*?url:/);
});

test("TASK-RBT-004 does not add watchdog or multi-signal Work-full implementation", async () => {
  const scheduler = await read("../src/runtime/browser-scheduler.mjs");
  assert.doesNotMatch(scheduler, /STALL_CHECK|WORKING_LONG|FULL_CONFIRMED|30[_ -]?minute/i);
});
