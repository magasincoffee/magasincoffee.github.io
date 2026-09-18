import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("runtime observes WAIT_USER instead of short-circuiting before ChatGPT", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/supervisor-loop-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /const ownerWait = isOwnerWaitState\(projectState\)/);
  assert.match(source, /OWNER_BOUNDARY_OBSERVED/);
  assert.match(source, /ownerReconcile: ownerReconcileRequested/);
  assert.match(source, /OWNER_RECONCILE_SENT/);
  assert.match(source, /OWNER_RECONCILE_SETTLED/);

  const legacyGate =
    /projectState\.requires_user[\s\S]{0,220}projectState\.status === "WAIT_USER"[\s\S]{0,500}continue;/;
  assert.doesNotMatch(source, legacyGate);
});

test("BLOCKED remains a hard stop while WAIT_USER has a reconciliation path", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/supervisor-loop-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /projectState\.blocked \|\| projectState\.status === "BLOCKED"/);
  assert.match(source, /Project is BLOCKED; no automatic Owner reconciliation is allowed/);
});


test("manual Owner resolved acknowledgement can re-arm one reconciliation for the matching boundary", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/supervisor-loop-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /owner-resolved\.json/);
  assert.match(source, /ownerAckMatchesProject/);
  assert.match(source, /OWNER_RESOLVED_ACK_OBSERVED/);
  assert.match(source, /ownerReconcileState\.manualAck = true/);
  assert.match(source, /if \(ownerReconcileState\.manualAck\)/);
  assert.match(source, /clearOwnerResolvedAck\(ownerResolvedAckPath\)/);
});

test("manual acknowledgement cannot match a different current task", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/supervisor-loop-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /task !== String\(projectState\.current_task/);
  assert.match(source, /OWNER_RESOLVED_ACK_IGNORED/);
});
