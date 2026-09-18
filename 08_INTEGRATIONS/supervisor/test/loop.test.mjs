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
