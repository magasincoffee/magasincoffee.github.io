import test from "node:test";
import assert from "node:assert/strict";

import { SupervisorLoopController } from "../src/runtime/loop.mjs";

function state(overrides = {}) {
  return {
    project: "MAGASIN Business OS",
    current_phase: "P1",
    current_task: "TASK-007",
    status: "RUNNING",
    autonomy: "AUTO_CONTINUE",
    blocked: false,
    requires_user: false,
    next_task: "TASK-008",
    ...overrides
  };
}

function page() {
  let fills = 0;
  let clicks = 0;
  const p = {
    get fills() { return fills; },
    get clicks() { return clicks; },
    async evaluate() { return [{ text: "", ariaLabel: "Send prompt", testId: "send-button" }]; },
    locator(selector) {
      if (selector.includes("prompt-textarea") || selector.includes("contenteditable")) {
        return {
          first() { return this; },
          async isVisible() { return true; },
          async fill() { fills += 1; },
          async press() {}
        };
      }
      return {
        first() { return this; },
        async isVisible() { return true; },
        async click() { clicks += 1; }
      };
    },
    getByRole() {
      return {
        first() { return this; },
        async isVisible() { return true; },
        async click() { clicks += 1; }
      };
    }
  };
  return p;
}

function probe(observation, assistantMessageCount = 1) {
  return {
    classification: { observation },
    snapshot: { assistantMessageCount }
  };
}

test("controller sends at most once until assistant progress is observed", async () => {
  let now = 20_000;
  const controller = new SupervisorLoopController({
    execute: true,
    minActionIntervalMs: 1000,
    now: () => now
  });
  const p = page();

  const first = await controller.step({
    page: p,
    projectState: state(),
    probe: probe("RESPONSE_COMPLETE", 3)
  });
  assert.equal(first.execution.executed, true);

  now += 2000;
  const duplicate = await controller.step({
    page: p,
    projectState: state(),
    probe: probe("RESPONSE_COMPLETE", 3)
  });
  assert.equal(duplicate.execution.executed, false);
  assert.match(duplicate.execution.reason, /awaiting observable assistant progress/);

  await controller.step({
    page: p,
    projectState: state(),
    probe: probe("ASSISTANT_RUNNING", 3)
  });

  now += 2000;
  const next = await controller.step({
    page: p,
    projectState: state(),
    probe: probe("RESPONSE_COMPLETE", 4)
  });
  assert.equal(next.execution.executed, true);
});

test("controller never acts when project state requires owner", async () => {
  const controller = new SupervisorLoopController({ execute: true });
  const p = page();

  const result = await controller.step({
    page: p,
    projectState: state({ status: "WAIT_USER", requires_user: true }),
    probe: probe("RESPONSE_COMPLETE", 2)
  });

  assert.equal(result.execution.executed, false);
  assert.equal(p.fills, 0);
  assert.equal(p.clicks, 0);
});

test("dry-run controller never mutates page", async () => {
  const controller = new SupervisorLoopController({ execute: false });
  const p = page();

  const result = await controller.step({
    page: p,
    projectState: state(),
    probe: probe("RESPONSE_COMPLETE", 2)
  });

  assert.equal(result.execution.executed, false);
  assert.equal(result.execution.dryRun, true);
  assert.equal(p.fills, 0);
  assert.equal(p.clicks, 0);
});


test("external rollover continuation is guarded against duplicate sends until progress", async () => {
  let now = 50_000;
  const controller = new SupervisorLoopController({
    execute: true,
    minActionIntervalMs: 1000,
    now: () => now
  });
  const p = page();

  controller.markExternalContinuation(0, "ROLLOVER_COMPOSER_SEND");

  now += 2000;
  const beforeProgress = await controller.step({
    page: p,
    projectState: state(),
    probe: probe("RESPONSE_COMPLETE", 0)
  });
  assert.equal(beforeProgress.execution.executed, false);
  assert.match(beforeProgress.execution.reason, /awaiting observable assistant progress/);

  await controller.step({
    page: p,
    projectState: state(),
    probe: probe("ASSISTANT_RUNNING", 0)
  });

  now += 2000;
  const afterProgress = await controller.step({
    page: p,
    projectState: state(),
    probe: probe("RESPONSE_COMPLETE", 1)
  });
  assert.equal(afterProgress.execution.executed, true);
});


test("failed continuation can execute a bounded retry before assistant progress", async () => {
  let now = 80_000;
  const controller = new SupervisorLoopController({
    execute: true,
    minActionIntervalMs: 1000,
    now: () => now
  });
  const p = page();

  const first = await controller.step({
    page: p,
    projectState: state(),
    probe: probe("RESPONSE_COMPLETE", 5)
  });
  assert.equal(first.execution.executed, true);
  assert.equal(first.decision.action, "CONTINUE");

  // The send failed before any assistant progress. ChatGPT now exposes the
  // exact safe retry control. RETRY must not be blocked by the CONTINUE
  // progress latch, otherwise the robot deadlocks in RETRYING forever.
  now += 2000;
  p.evaluate = async () => [
    { text: "Thử lại", ariaLabel: "", testId: null }
  ];

  const retry = await controller.step({
    page: p,
    projectState: state(),
    probe: probe("TRANSIENT_ERROR", 5),
    retryCount: 0,
    maxRetries: 2
  });

  assert.equal(retry.decision.action, "RETRY");
  assert.equal(retry.execution.executed, true);
  assert.equal(retry.execution.target, "SAFE_RETRY_CONTROL");

  // Duplicate retry clicks remain bounded by the existing action cooldown.
  now += 500;
  const cooldown = await controller.step({
    page: p,
    projectState: state(),
    probe: probe("TRANSIENT_ERROR", 5),
    retryCount: 1,
    maxRetries: 2
  });
  assert.equal(cooldown.execution.executed, false);
  assert.match(cooldown.execution.reason, /action cooldown active/);

  // The decision engine still hard-stops when the bounded retry budget is used.
  now += 2000;
  const exhausted = await controller.step({
    page: p,
    projectState: state(),
    probe: probe("TRANSIENT_ERROR", 5),
    retryCount: 2,
    maxRetries: 2
  });
  assert.equal(exhausted.decision.action, "STOP_WAIT_USER");
  assert.equal(exhausted.execution.executed, false);
});


test("Work UI USER_PENDING settles into one handoff reconcile after a stable idle window", async () => {
  let now = 100_000;
  const controller = new SupervisorLoopController({
    execute: true,
    minActionIntervalMs: 1000,
    handoffIdleConfirmMs: 10_000,
    now: () => now
  });
  const p = page();

  const pendingProbe = {
    classification: { observation: "USER_PENDING" },
    snapshot: {
      assistantMessageCount: 0,
      userMessageCount: 1,
      lastMessageRole: "user",
      lastMessageCharCount: 120,
      lastAssistantCharCount: 0,
      mainTextCharCount: 900,
      mainElementCount: 150,
      responseRunning: false,
      mainBusy: false
    }
  };

  const first = await controller.step({
    page: p,
    projectState: state({
      current_phase: "P1_SCHEDULE_FIRST_CORE_FLOW",
      current_task: "TASK-029",
      current_task_title: "Schedule-first canonical flow contract"
    }),
    probe: pendingProbe,
    handoff: true
  });
  assert.equal(first.decision.action, "WAIT");
  assert.equal(first.execution.executed, false);

  now += 5000;
  const stillWaiting = await controller.step({
    page: p,
    projectState: state(),
    probe: pendingProbe,
    handoff: true
  });
  assert.equal(stillWaiting.decision.action, "WAIT");

  // A visible Work activity change resets the quiet window.
  now += 1000;
  const changed = structuredClone(pendingProbe);
  changed.snapshot.mainElementCount += 1;
  const reset = await controller.step({
    page: p,
    projectState: state(),
    probe: changed,
    handoff: true
  });
  assert.equal(reset.decision.action, "WAIT");

  now += 10_500;
  const reconcile = await controller.step({
    page: p,
    projectState: state(),
    probe: changed,
    handoff: true
  });
  assert.equal(reconcile.decision.action, "CONTINUE");
  assert.equal(reconcile.execution.executed, true);
  assert.match(reconcile.decision.instruction, /TIẾP QUẢN PHIÊN ĐANG MỞ/);

  // Normal duplicate protection still applies immediately after handoff send.
  now += 2000;
  const duplicate = await controller.step({
    page: p,
    projectState: state(),
    probe: probe("RESPONSE_COMPLETE", 0),
    handoff: false
  });
  assert.equal(duplicate.execution.executed, false);
  assert.match(duplicate.execution.reason, /awaiting observable assistant progress/);
});

test("Work UI busy state never promotes USER_PENDING to handoff continuation", async () => {
  let now = 200_000;
  const controller = new SupervisorLoopController({
    execute: true,
    handoffIdleConfirmMs: 5000,
    now: () => now
  });

  const busyProbe = {
    classification: { observation: "USER_PENDING" },
    snapshot: {
      assistantMessageCount: 0,
      userMessageCount: 1,
      lastMessageRole: "user",
      lastMessageCharCount: 80,
      mainTextCharCount: 500,
      mainElementCount: 90,
      responseRunning: true,
      mainBusy: true
    }
  };

  await controller.step({
    page: page(),
    projectState: state(),
    probe: busyProbe,
    handoff: true
  });

  now += 20_000;
  const result = await controller.step({
    page: page(),
    projectState: state(),
    probe: busyProbe,
    handoff: true
  });

  assert.equal(result.decision.action, "WAIT");
  assert.equal(result.execution.executed, false);
});
