import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { BrowserScheduler, DEFAULT_CHATGPT_PAGE_BUDGET } from "../src/runtime/browser-scheduler.mjs";
import { validateEventFile } from "../../../.github/scripts/supervisor-release-event-validator.mjs";

class FakeAdapter {
  getChatGptPages() { return []; }
  async hasNonPersistedComposerArtifact() { return false; }
  async closePage() { return true; }
}

function lanes(enabledCount) {
  return ["lane-1", "lane-2", "lane-3"].map((lane_id, index) => ({ lane_id, enabled: index < enabledCount }));
}

function observedTurns(enabledCount, count) {
  const scheduler = new BrowserScheduler({ adapter: new FakeAdapter(), pageBudget: 3 });
  const out = [];
  for (let i = 0; i < count; i += 1) out.push(scheduler.nextEnabledTurn(lanes(enabledCount)).lane_id);
  return { scheduler, out };
}

test("RBT-009 Tier A one/two/three lane round-robin has bounded fairness", () => {
  const one = observedTurns(1, 6).out;
  assert.deepEqual(new Set(one), new Set(["lane-1"]));

  const two = observedTurns(2, 12).out;
  assert.deepEqual(new Set(two), new Set(["lane-1", "lane-2"]));
  for (let i = 0; i < two.length; i += 2) assert.deepEqual(new Set(two.slice(i, i + 2)), new Set(["lane-1", "lane-2"]));

  const three = observedTurns(3, 18).out;
  assert.deepEqual(new Set(three), new Set(["lane-1", "lane-2", "lane-3"]));
  for (let i = 0; i < three.length; i += 3) assert.deepEqual(new Set(three.slice(i, i + 3)), new Set(["lane-1", "lane-2", "lane-3"]));
});

test("RBT-009 long active lane cannot monopolize scheduler mutation lease", () => {
  const scheduler = new BrowserScheduler({ adapter: new FakeAdapter(), pageBudget: 3 });
  const release = scheduler.acquireMutationLease({ laneId: "lane-1", role: "WORK", reason: "LONG_ACTIVE" });
  assert.throws(() => scheduler.acquireMutationLease({ laneId: "lane-2", role: "WORK", reason: "OTHER" }), /mutation/i);
  release({ durable: true });
  const release2 = scheduler.acquireMutationLease({ laneId: "lane-2", role: "WORK", reason: "OTHER" });
  release2({ durable: true });
  assert.equal(scheduler.snapshot().mutation_lease_active, false);
  assert.equal(DEFAULT_CHATGPT_PAGE_BUDGET, 3);
});

function event(timestamp, event_type, extra = {}) {
  return { schema_version: "lane-event.v1", timestamp, lane_id: "lane-1", actor: "SUPERVISOR", event_type, task_id: "TASK-X", work_generation: 1, ...extra };
}

async function withEventFile(events, fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rbt009-events-"));
  const file = path.join(dir, "lane-events.ndjson");
  await fs.writeFile(file, events.map((x) => JSON.stringify(x)).join("\n") + "\n", "utf8");
  try { return await fn(file); } finally { await fs.rm(dir, { recursive: true, force: true }); }
}

test("RBT-009 event validator accepts coherent exact-once planning sequence", async () => {
  const t = (n) => `2026-09-21T0${n}:00:00.000Z`;
  const dispatch = "a".repeat(32);
  const relay = "b".repeat(32);
  const events = [
    event(t(1), "BRAIN_TASK_ASSIGNED", { actor: "BRAIN" }),
    event(t(2), "WORK_DISPATCH_CONFIRMED", { dispatch_id: dispatch }),
    event(t(3), "WORK_STARTED", { actor: "WORK" }),
    event(t(4), "WORK_ACTIVITY", { actor: "WORK" }),
    event(t(5), "WORK_COMPLETED", { actor: "WORK" }),
    event(t(6), "RESULT_RELAY_CONFIRMED", { relay_id: relay }),
    event(t(7), "BRAIN_RESULT_ACCEPTED", { actor: "BRAIN", relay_id: relay })
  ];
  await withEventFile(events, async (file) => {
    const summary = await validateEventFile(file, { since: t(1) });
    assert.equal(summary.confirmed_dispatch_count, 1);
    assert.equal(summary.confirmed_relay_count, 1);
    assert.equal(summary.duplicate_dispatch_count, 0);
    assert.equal(summary.duplicate_relay_count, 0);
    assert.equal(summary.privacy_safe, true);
    assert.equal(summary.transition_order_valid, true);
  });
});

test("RBT-009 event validator fails duplicate dispatch/relay and private fields", async () => {
  const base = "2026-09-21T01:00:00.000Z";
  const dispatch = "c".repeat(32);
  await withEventFile([
    event(base, "BRAIN_TASK_ASSIGNED"),
    event("2026-09-21T01:01:00.000Z", "WORK_DISPATCH_CONFIRMED", { dispatch_id: dispatch }),
    event("2026-09-21T01:02:00.000Z", "WORK_DISPATCH_CONFIRMED", { dispatch_id: dispatch })
  ], async (file) => {
    await assert.rejects(validateEventFile(file, { since: base }), /duplicate confirmed dispatch_id/);
  });

  await withEventFile([{ ...event(base, "RECOVERY"), message_body: "secret" }], async (file) => {
    await assert.rejects(validateEventFile(file, { since: base }), /forbidden event key/);
  });
});

test("RBT-009 production soak is workflow-gated, eight-hour and read-only by source contract", async () => {
  const workflow = await fs.readFile(new URL("../../../.github/workflows/supervisor-release-soak.yml", import.meta.url), "utf8");
  const soak = await fs.readFile(new URL("../../../.github/scripts/supervisor-release-soak.ps1", import.meta.url), "utf8");
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /28800/);
  assert.match(workflow, /actions:\s*read/);
  assert.match(workflow, /self-hosted/);
  assert.match(workflow, /supervisor-production-release-soak/);
  assert.match(soak, /DurationSeconds = 28800/);
  assert.match(soak, /SOAK_CONTINUOUS_DURATION_8H=True/);
  assert.match(soak, /SOAK_MONITOR_ZERO_BROWSER_MUTATION=True/);
  assert.doesNotMatch(soak, /Remove-Item\s+\$stopPath|Clear-LifecycleOwnerStopLatches|reopenTargetPage|newChatPage|sendMessage|Keyboard\.Press|Page\.Reload/i);
});

test("RBT-009 rollback/static cleanup guard preserves local state files", async () => {
  const installer = await fs.readFile(new URL("../windows/install-supervisor.ps1", import.meta.url), "utf8");
  assert.doesNotMatch(installer, /Remove-Item[^\n]*(lanes\.json|lane-registry\.json|STOP|AUTOSTART_DISABLED)/i);
  assert.doesNotMatch(installer, /Move-Item[^\n]*(lanes\.json|lane-registry\.json)/i);
});

test("RBT-009 does not bump runtime when only integration/workflow/docs are added", async () => {
  const runtime = await fs.readFile(new URL("../src/runtime/three-lane-cli.mjs", import.meta.url), "utf8");
  assert.match(runtime, /SUPERVISOR_RUNTIME_VERSION = "2026-09-20\.60"/);
});
