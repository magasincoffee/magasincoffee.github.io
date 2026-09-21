import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { SupervisorDiagnostics } from "../src/runtime/diagnostics.mjs";

function projectState() {
  return {
    current_phase: "P1_SCHEDULE_FIRST_CORE_FLOW",
    current_task: "TASK-044",
    current_task_title: "Portfolio-aware diagnostics",
    status: "READY",
    autonomy: "AUTO_CONTINUE",
    blocked: false,
    requires_user: false,
    owner_boundary: { pending: [] }
  };
}

function portfolio() {
  return {
    project_id: "magasin-business-os",
    repository: "magasincoffee/magasincoffee.github.io",
    cursor: {
      project_id: "magasin-business-os",
      task: "TASK-044",
      micro_task: "portfolio_aware_privacy_safe_diagnostics",
      checkpoint: "TASK_043_HANDOFF_VERIFIED",
      status: "IN_PROGRESS",
      last_commit: "d39cc211f19ce7223478d48ccfd19a7440c17d77"
    },
    scheduler: {
      action: "SELECT_PROJECT",
      project_id: "magasin-business-os"
    }
  };
}

function stepContext() {
  return {
    projectState: projectState(),
    portfolio: portfolio(),
    probe: {
      classification: {
        uiState: "READY_IDLE",
        observation: "RESPONSE_COMPLETE"
      },
      snapshot: {
        responseRunning: false,
        composerReady: true,
        pathKind: "conversation",
        userMessageCount: 9,
        assistantMessageCount: 9,
        lastMessageRole: "assistant",
        lastMessageCharCount: 120,
        lastAssistantCharCount: 120,
        maxConversationTurnOrdinal: 21
      }
    },
    result: {
      effectiveObservation: "RESPONSE_COMPLETE",
      workUiSettled: true,
      decision: {
        action: "WAIT",
        reason: "healthy idle"
      },
      execution: {
        executed: false,
        target: "",
        reason: "decision requires no UI action"
      }
    },
    controller: {
      armed: true,
      sawRunningAfterAction: false,
      userPendingSawProgress: false
    },
    ownerReconcileState: null,
    manualOwnerRecheck: false,
    recovery: {
      blocked: false,
      lastAction: "NONE"
    }
  };
}

test("portfolio diagnostics persist project/task/checkpoint context without conversation text", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "magasin-portfolio-diag-"));
  const diag = new SupervisorDiagnostics({
    root,
    runtimeVersion: "robot-v2-test",
    now: () => Date.parse("2026-09-18T16:55:00Z")
  });

  await diag.recordStep(stepContext());

  const latest = JSON.parse(
    await fs.readFile(path.join(root, "diagnostics", "latest.json"), "utf8")
  );

  assert.equal(latest.portfolio.project_id, "magasin-business-os");
  assert.equal(
    latest.portfolio.repository,
    "magasincoffee/magasincoffee.github.io"
  );
  assert.equal(latest.portfolio.cursor_task, "TASK-044");
  assert.equal(
    latest.portfolio.cursor_micro_task,
    "portfolio_aware_privacy_safe_diagnostics"
  );
  assert.equal(
    latest.portfolio.cursor_checkpoint,
    "TASK_043_HANDOFF_VERIFIED"
  );
  assert.equal(latest.portfolio.scheduler_action, "SELECT_PROJECT");
  assert.equal(latest.ui.last_message_role, "assistant");
  assert.equal("text" in latest.ui, false);
  assert.equal("prompt" in latest, false);
  assert.equal("request" in latest, false);
});

test("error diagnostics drop raw message and secret-like values while retaining safe metadata", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "magasin-portfolio-diag-"));
  const diag = new SupervisorDiagnostics({
    root,
    runtimeVersion: "robot-v2-test",
    now: () => Date.parse("2026-09-18T16:56:00Z")
  });

  const sensitive =
    "PRIVATE PROMPT bearer secret-token cookie=session-value user@example.com";
  const error = new Error(sensitive);
  error.code = "E_PROVIDER";

  const filePath = await diag.recordError({
    projectState: projectState(),
    portfolio: portfolio(),
    error,
    ownerReconcileState: null,
    recovery: {
      blocked: false,
      lastAction: "NONE"
    }
  });

  const incidentText = await fs.readFile(filePath, "utf8");
  const incident = JSON.parse(incidentText);
  const indexText = await fs.readFile(
    path.join(root, "diagnostics", "incidents.ndjson"),
    "utf8"
  );

  for (const persisted of [incidentText, indexText]) {
    assert.doesNotMatch(persisted, /PRIVATE PROMPT/);
    assert.doesNotMatch(persisted, /secret-token/);
    assert.doesNotMatch(persisted, /session-value/);
    assert.doesNotMatch(persisted, /user@example\.com/);
  }

  assert.equal(incident.portfolio.project_id, "magasin-business-os");
  assert.equal(incident.portfolio.cursor_task, "TASK-044");
  assert.equal(
    incident.portfolio.cursor_checkpoint,
    "TASK_043_HANDOFF_VERIFIED"
  );
  assert.equal(incident.error.name, "Error");
  assert.equal(incident.error.code, "E_PROVIDER");
  assert.equal(incident.error.message_present, true);
  assert.equal(incident.error.message_length, sensitive.length);
  assert.equal("message" in incident.error, false);
});
