import test from "node:test";
import assert from "node:assert/strict";

import {
  PORTFOLIO_RECOVERY_ACTIONS,
  hasCompletedOperation,
  makeOperationKey,
  markOperationCompleted,
  reconcilePortfolioCursor,
  shouldExecuteOperation
} from "../src/portfolio/recovery-engine.mjs";

const baseCursor = () => ({
  schema_version: "business-os-execution-cursor.v1",
  night_run_id: "NIGHT_RUN_2026-09-18",
  project_id: "magasin-business-os",
  task: "TASK-041",
  micro_task: "portfolio_recovery_engine",
  status: "IN_PROGRESS",
  checkpoint: "STARTED",
  resume_policy: "SAFE_RECONCILE_HEAD_STATE_CI",
  lease: null,
  last_commit: "abc123",
  updated_at: "2026-09-18T23:40:00.000Z"
});

test("active lease blocks crash/reboot takeover to prevent duplicate work", () => {
  const cursor = baseCursor();
  cursor.lease = {
    holder: "worker-a",
    acquired_at: "2026-09-18T23:40:00.000Z",
    expires_at: "2026-09-18T23:50:00.000Z"
  };

  const result = reconcilePortfolioCursor({
    cursor,
    canonicalProjectId: "magasin-business-os",
    canonicalTask: "TASK-041",
    now: "2026-09-18T23:45:00.000Z",
    headVerified: true,
    ciVerified: true
  });

  assert.equal(
    result.action,
    PORTFOLIO_RECOVERY_ACTIONS.WAIT_ACTIVE_LEASE
  );
  assert.equal(result.cursor.lease.holder, "worker-a");
});

test("expired lease still waits until both HEAD and CI are reconciled", () => {
  const cursor = baseCursor();
  cursor.lease = {
    holder: "worker-a",
    acquired_at: "2026-09-18T23:30:00.000Z",
    expires_at: "2026-09-18T23:31:00.000Z"
  };

  const result = reconcilePortfolioCursor({
    cursor,
    canonicalProjectId: "magasin-business-os",
    canonicalTask: "TASK-041",
    now: "2026-09-18T23:45:00.000Z",
    headVerified: true,
    ciVerified: false
  });

  assert.equal(
    result.action,
    PORTFOLIO_RECOVERY_ACTIONS.WAIT_RECONCILE_HEAD_CI
  );
  assert.notEqual(result.cursor.lease, null);
});

test("verified stale lease is released and resumes the current checkpoint", () => {
  const cursor = baseCursor();
  cursor.lease = {
    holder: "worker-a",
    acquired_at: "2026-09-18T23:30:00.000Z",
    expires_at: "2026-09-18T23:31:00.000Z"
  };

  const result = reconcilePortfolioCursor({
    cursor,
    canonicalProjectId: "magasin-business-os",
    canonicalTask: "TASK-041",
    now: "2026-09-18T23:45:00.000Z",
    headVerified: true,
    ciVerified: true
  });

  assert.equal(
    result.action,
    PORTFOLIO_RECOVERY_ACTIONS.RESUME_CHECKPOINT
  );
  assert.equal(result.cursor.lease, null);
  assert.equal(result.cursor.checkpoint, "STARTED");
});

test("canonical task advancement discards stale task replay", () => {
  const cursor = baseCursor();

  const result = reconcilePortfolioCursor({
    cursor,
    canonicalProjectId: "magasin-media-robot",
    canonicalTask: "TASK-042",
    now: "2026-09-18T23:45:00.000Z",
    headVerified: true,
    ciVerified: true
  });

  assert.equal(
    result.action,
    PORTFOLIO_RECOVERY_ACTIONS.ADOPT_CANONICAL_CURSOR
  );
  assert.equal(result.cursor.project_id, "magasin-media-robot");
  assert.equal(result.cursor.task, "TASK-042");
  assert.equal(result.cursor.checkpoint, "CANONICAL_STATE_ADOPTED");
});

test("completed operation keys suppress duplicate side effects after restart", () => {
  const cursor = baseCursor();
  const key = makeOperationKey({
    projectId: "magasin-business-os",
    task: "TASK-041",
    microTask: "restart_test",
    action: "SEND_CONTINUE"
  });

  assert.equal(shouldExecuteOperation(cursor, key), true);

  const completed = markOperationCompleted(cursor, {
    operationKey: key,
    now: "2026-09-18T23:45:00.000Z"
  });

  assert.equal(hasCompletedOperation(completed, key), true);
  assert.equal(shouldExecuteOperation(completed, key), false);

  const idempotent = markOperationCompleted(completed, {
    operationKey: key,
    now: "2026-09-18T23:46:00.000Z"
  });
  assert.equal(idempotent.completed_operations.length, 1);
});

test("completed operation history stays bounded", () => {
  let cursor = baseCursor();
  for (let i = 0; i < 5; i += 1) {
    cursor = markOperationCompleted(cursor, {
      operationKey: `project::task::micro::action-${i}`,
      now: new Date(Date.UTC(2026, 8, 18, 16, 45, i)),
      maxEntries: 3
    });
  }
  assert.deepEqual(cursor.completed_operations, [
    "project::task::micro::action-2",
    "project::task::micro::action-3",
    "project::task::micro::action-4"
  ]);
});
