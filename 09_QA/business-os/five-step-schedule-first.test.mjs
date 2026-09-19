import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root = new URL("../../", import.meta.url);

async function read(relative) {
  return fs.readFile(new URL(relative, root), "utf8");
}

test("Five-Step architecture reset remains canonical under Profitability & Cash priority", async () => {
  const [architecture, enterprise, current, queue, stateRaw] = await Promise.all([
    read("01_DOCS/MAGASIN/00_ARCHITECTURE_5_STEP_RESET.md"),
    read("01_DOCS/MAGASIN/00_ENTERPRISE_ARCHITECTURE_5_STEP_PROFIT_CASH.md"),
    read("01_DOCS/MAGASIN/00_CURRENT_STATE.md"),
    read("01_DOCS/MAGASIN/00_TASK_QUEUE.md"),
    read("01_DOCS/MAGASIN/00_PROJECT_STATE.json")
  ]);
  const state = JSON.parse(stateRaw);

  assert.match(architecture, /QUESTION every requirement/);
  assert.match(architecture, /DELETE before adding/);
  assert.match(architecture, /SIMPLIFY \/ OPTIMIZE/);
  assert.match(architecture, /ACCELERATE cycle time/);
  assert.match(architecture, /AUTOMATE last/);
  assert.match(architecture, /Current critical path: Profitability & Cash first/i);

  assert.match(enterprise, /Profitability & Cash là critical business priority số 1/i);
  assert.match(enterprise, /FINANCIAL TRUTH SPINE/);
  assert.equal(state.architecture_handoff?.primary_priority, "PROFITABILITY_CASH");
  assert.equal(state.prepared_execution_queue?.id, "PFC_3H_V1");
  assert.ok(["READY", "WAIT_USER"].includes(state.status));
  if (state.status === "READY") {
    assert.equal(state.autonomy, "AUTO_CONTINUE");
    assert.equal(state.requires_user, false);
  }
  assert.equal(state.night_run?.id, "NIGHT_RUN_2026-09-18");

  assert.match(current, /Profitability & Cash first/);
  assert.match(current, /financial truth spine/i);
  assert.match(queue, /TASK-026[^\n]*DEFERRED/);
  assert.match(queue, /TASK-051[^\n]*DONE/);
  assert.match(queue, /TASK-052[^\n]*DONE/);
  assert.match(queue, /TASK-053[^\n]*DONE/);
  assert.match(queue, /TASK-054[^\n]*DONE/);

  if (state.status === "READY" && state.current_task) {
    const currentTask = String(state.current_task);
    assert.match(currentTask, /^[A-Z0-9/_-]+$/);
    assert.match(queue, new RegExp(currentTask + "[^\\n]*READY / AUTO_CONTINUE"));
  }
});

test("deferred SOP write path remains fail-closed", async () => {
  const [architecture, queue] = await Promise.all([
    read("01_DOCS/MAGASIN/00_ARCHITECTURE_5_STEP_RESET.md"),
    read("01_DOCS/MAGASIN/00_TASK_QUEUE.md")
  ]);

  assert.match(architecture, /SOP\/Task write automation while its Owner rule boundary is still unresolved/);
  assert.match(queue, /TASK-026[^\n]*DEFERRED/);
});

test("conversation-aware handoff architecture is part of Five-Step execution", async () => {
  const [architecture, handoff, current] = await Promise.all([
    read("01_DOCS/MAGASIN/00_ARCHITECTURE_5_STEP_RESET.md"),
    read("01_DOCS/MAGASIN/00_SUPERVISOR_HANDOFF_ARCHITECTURE.md"),
    read("01_DOCS/MAGASIN/00_CURRENT_STATE.md")
  ]);

  assert.match(architecture, /Conversation-aware execution handoff/);
  assert.match(handoff, /same supervised ChatGPT browser profile/);
  assert.match(handoff, /live explicit Owner instruction/);
  assert.match(handoff, /assistant is running → WAIT/);
  assert.match(handoff, /HANDOFF_RECONCILE/);
  assert.match(handoff, /QUESTION[\s\S]*DELETE[\s\S]*SIMPLIFY[\s\S]*ACCELERATE[\s\S]*AUTOMATE/);
  assert.match(current, /conversation-aware handoff/);
});

test("deferred Gmail activation stays fail-closed and non-blocking", async () => {
  const [emailConfig, task036, stateRaw] = await Promise.all([
    read("01_DOCS/MAGASIN/05_SYSTEM/MAGASIN_EMAIL_ADAPTER_CONFIG_V1.md"),
    read("01_DOCS/MAGASIN/05_SYSTEM/SCHEDULE_FIRST_CLOSURE_REGRESSION_V1.md"),
    read("01_DOCS/MAGASIN/00_PROJECT_STATE.json")
  ]);
  const state = JSON.parse(stateRaw);

  assert.match(emailConfig, /DEFERRED_BY_OWNER \/ FAIL_CLOSED/);
  assert.match(emailConfig, /notification-email-worker not deployed/);
  assert.match(task036, /external email is not required/i);
  assert.equal(state.deferred_activation.blocking, false);
  assert.equal(state.deferred_activation.email_worker_deployed, false);
  assert.equal(state.deferred_activation.send_email, false);
  assert.equal(
    state.deferred_activation.guardrail,
    "KEEP_EMAIL_FAIL_CLOSED_UNTIL_REACTIVATED_BY_OWNER"
  );
});
