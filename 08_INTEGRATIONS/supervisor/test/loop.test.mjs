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
