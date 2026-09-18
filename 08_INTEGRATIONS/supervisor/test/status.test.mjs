import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRuntimeStatus,
  defaultRuntimeStatusPath
} from "../src/runtime/status.mjs";

test("runtime status exposes project/task/action metadata without private content", () => {
  const payload = buildRuntimeStatus({
    projectState: {
      project: "MAGASIN Business OS",
      repository: "magasincoffee/magasincoffee.github.io",
      current_phase: "P1",
      current_task: "TASK-009",
      current_task_title: "Store/product canonical model review",
      next_task: "TASK-010",
      autonomy: "AUTO_CONTINUE",
      requires_user: false,
      blocked: false
    },
    status: "RUNNING",
    uiState: "RUNNING",
    observation: "ASSISTANT_RUNNING",
    decision: { action: "WAIT", reason: "assistant is still running" },
    execution: { executed: false },
    retryCount: 1
  });

  assert.equal(payload.project, "MAGASIN Business OS");
  assert.equal(payload.current_task, "TASK-009");
  assert.equal(payload.status, "RUNNING");
  assert.equal(payload.decision_action, "WAIT");
  assert.equal(payload.retry_count, 1);

  const keys = Object.keys(payload).join(" ");
  assert.doesNotMatch(keys, /cookie|token|credential|message_body|prompt/i);
});

test("runtime status path stays under local MAGASIN BusinessOS supervisor root", () => {
  const file = defaultRuntimeStatusPath({
    LOCALAPPDATA: "C:\\Users\\Owner\\AppData\\Local"
  });
  assert.match(file, /MAGASIN[\\/]BusinessOS[\\/]supervisor[\\/]runtime-status\.json$/);
});


test("runtime status exposes why an action did not execute", () => {
  const payload = buildRuntimeStatus({
    projectState: {
      project: "MAGASIN Business OS",
      repository: "magasincoffee/magasincoffee.github.io",
      current_phase: "P1",
      current_task: "TASK-009",
      current_task_title: "Store/product canonical model review",
      next_task: "TASK-010",
      autonomy: "AUTO_CONTINUE"
    },
    status: "READY",
    decision: { action: "CONTINUE", reason: "assistant response completed" },
    execution: { executed: false, reason: "awaiting observable assistant progress" }
  });

  assert.equal(payload.execution_executed, false);
  assert.equal(payload.execution_reason, "awaiting observable assistant progress");
});
