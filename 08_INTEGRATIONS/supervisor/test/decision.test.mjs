import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTIONS,
  OBSERVATIONS,
  decideContinuation
} from "../src/decision.mjs";

function state(overrides = {}) {
  return {
    project: "MAGASIN Business OS",
    current_phase: "P1",
    current_task: "TASK-003",
    status: "RUNNING",
    autonomy: "AUTO_CONTINUE",
    blocked: false,
    requires_user: false,
    next_task: "TASK-004",
    ...overrides
  };
}

test("continues only after completed response and allowed state", () => {
  const result = decideContinuation({
    projectState: state(),
    observation: OBSERVATIONS.RESPONSE_COMPLETE
  });
  assert.equal(result.action, ACTIONS.CONTINUE);
  assert.match(result.instruction, /repository source of truth/);
});

test("waits while assistant is still running", () => {
  const result = decideContinuation({
    projectState: state(),
    observation: OBSERVATIONS.ASSISTANT_RUNNING
  });
  assert.equal(result.action, ACTIONS.WAIT);
});

test("hard-stops on authentication requirement", () => {
  const result = decideContinuation({
    projectState: state(),
    observation: OBSERVATIONS.AUTH_REQUIRED
  });
  assert.equal(result.action, ACTIONS.STOP_WAIT_USER);
});

test("hard-stops when project state requires owner", () => {
  const result = decideContinuation({
    projectState: state({ requires_user: true }),
    observation: OBSERVATIONS.RESPONSE_COMPLETE
  });
  assert.equal(result.action, ACTIONS.STOP_WAIT_USER);
});

test("retries a transient error within budget", () => {
  const result = decideContinuation({
    projectState: state(),
    observation: OBSERVATIONS.NETWORK_ERROR,
    retryCount: 0,
    maxRetries: 2
  });
  assert.equal(result.action, ACTIONS.RETRY);
  assert.equal(result.nextRetryCount, 1);
});

test("stops after transient retry budget is exhausted", () => {
  const result = decideContinuation({
    projectState: state(),
    observation: OBSERVATIONS.NETWORK_ERROR,
    retryCount: 2,
    maxRetries: 2
  });
  assert.equal(result.action, ACTIONS.STOP_WAIT_USER);
});

test("fails closed for unknown UI state", () => {
  const result = decideContinuation({
    projectState: state(),
    observation: OBSERVATIONS.UNKNOWN
  });
  assert.equal(result.action, ACTIONS.WAIT);
});

test("does not continue in MANUAL autonomy mode", () => {
  const result = decideContinuation({
    projectState: state({ autonomy: "MANUAL" }),
    observation: OBSERVATIONS.RESPONSE_COMPLETE
  });
  assert.equal(result.action, ACTIONS.WAIT);
});

test("stops cleanly when project is DONE", () => {
  const result = decideContinuation({
    projectState: state({ status: "DONE" }),
    observation: OBSERVATIONS.RESPONSE_COMPLETE
  });
  assert.equal(result.action, ACTIONS.STOP_DONE);
});
