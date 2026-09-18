import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root = new URL("../../", import.meta.url);

async function read(relative) {
  return fs.readFile(new URL(relative, root), "utf8");
}

test("Five-Step architecture reset is canonical and schedule-first", async () => {
  const [architecture, current, queue, stateRaw] = await Promise.all([
    read("01_DOCS/MAGASIN/00_ARCHITECTURE_5_STEP_RESET.md"),
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
  assert.match(architecture, /Employee availability[\s\S]*Manager review\/edit[\s\S]*Robot schedule proposal[\s\S]*publish weekly schedule/);

  assert.equal(state.current_task, "TASK-032");
  assert.equal(state.status, "READY");
  assert.equal(state.autonomy, "AUTO_CONTINUE");
  assert.equal(state.requires_user, false);
  assert.equal(state.next_task, null);

  assert.match(current, /Schedule-first Core Flow/);
  assert.match(current, /TASK-032/);
  assert.match(queue, /TASK-026[^\n]*DEFERRED/);
  assert.match(queue, /TASK-027[^\n]*DONE/);
  assert.match(queue, /TASK-028[^\n]*DONE/);
  assert.match(queue, /TASK-029[^\n]*DONE/);
  assert.match(queue, /TASK-030[^\n]*DONE/);
  assert.match(queue, /TASK-031[^\n]*DONE/);
  assert.match(queue, /TASK-032[^\n]*READY/);
});

test("deferred SOP write path remains fail-closed", async () => {
  const [architecture, current] = await Promise.all([
    read("01_DOCS/MAGASIN/00_ARCHITECTURE_5_STEP_RESET.md"),
    read("01_DOCS/MAGASIN/00_CURRENT_STATE.md")
  ]);

  assert.match(architecture, /SOP\/Task write automation/);
  assert.match(current, /Do not implement write-capable SOP\/Task automation/);
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
