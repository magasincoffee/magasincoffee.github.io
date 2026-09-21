import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  acquireCursorLease
} from "../src/runtime/night-run.mjs";
import {
  PORTFOLIO_RECOVERY_ACTIONS,
  makeOperationKey,
  markOperationCompleted,
  reconcilePortfolioCursor,
  shouldExecuteOperation
} from "../src/portfolio/recovery-engine.mjs";
import {
  HANDOFF_ACTIONS,
  planProjectHandoff
} from "../src/portfolio/handoff.mjs";
import { PORTFOLIO_ACTIONS } from "../src/portfolio/scheduler.mjs";

const repoRoot = new URL("../../../", import.meta.url);
const registry = JSON.parse(
  await fs.readFile(
    new URL("02_CORE/contracts/business-os-project-registry.v1.json", repoRoot),
    "utf8"
  )
);

function runnableState(id, overrides = {}) {
  return {
    id,
    status: "READY",
    runnable_hint: true,
    requires_user: false,
    blocked: false,
    current_task: id === "magasin-business-os"
      ? "TASK-045"
      : "SAYDIVOICE_PROVIDER_ADAPTER",
    constraints: id === "magasin-media-robot"
      ? [
          "NO_LIVE_GENERATE_WITHOUT_SEPARATE_AUTHORIZATION",
          "NO_LIVE_DOWNLOAD_WITHOUT_SEPARATE_AUTHORIZATION"
        ]
      : [],
    ...overrides
  };
}

function cursor(overrides = {}) {
  return {
    schema_version: "business-os-execution-cursor.v1",
    night_run_id: "NIGHT_RUN_2026-09-18",
    project_id: "magasin-business-os",
    task: "TASK-045",
    micro_task: "restart_resume_simulation",
    status: "IN_PROGRESS",
    checkpoint: "TASK_044_DIAGNOSTICS_VERIFIED",
    resume_policy: "SAFE_RECONCILE_HEAD_STATE_CI",
    lease: null,
    last_commit: "task-044-green",
    updated_at: "2026-09-18T23:58:00.000Z",
    completed_operations: [],
    ...overrides
  };
}

test("restart sequence blocks active takeover, reconciles stale lease, then resumes same checkpoint", () => {
  const leased = acquireCursorLease(cursor(), {
    holder: "worker-before-crash",
    now: "2026-09-18T23:58:00.000Z",
    ttlMs: 60_000
  });

  const active = reconcilePortfolioCursor({
    cursor: leased,
    canonicalProjectId: "magasin-business-os",
    canonicalTask: "TASK-045",
    canonicalProjectState: runnableState("magasin-business-os"),
    now: "2026-09-18T23:58:30.000Z",
    headVerified: true,
    ciVerified: true
  });
  assert.equal(
    active.action,
    PORTFOLIO_RECOVERY_ACTIONS.WAIT_ACTIVE_LEASE
  );
  assert.equal(active.cursor.lease.holder, "worker-before-crash");

  const notReconciled = reconcilePortfolioCursor({
    cursor: leased,
    canonicalProjectId: "magasin-business-os",
    canonicalTask: "TASK-045",
    canonicalProjectState: runnableState("magasin-business-os"),
    now: "2026-09-19T00:00:00.000Z",
    headVerified: true,
    ciVerified: false
  });
  assert.equal(
    notReconciled.action,
    PORTFOLIO_RECOVERY_ACTIONS.WAIT_RECONCILE_HEAD_CI
  );
  assert.notEqual(notReconciled.cursor.lease, null);

  const resumed = reconcilePortfolioCursor({
    cursor: leased,
    canonicalProjectId: "magasin-business-os",
    canonicalTask: "TASK-045",
    canonicalProjectState: runnableState("magasin-business-os"),
    now: "2026-09-19T00:00:00.000Z",
    headVerified: true,
    ciVerified: true
  });
  assert.equal(
    resumed.action,
    PORTFOLIO_RECOVERY_ACTIONS.RESUME_CHECKPOINT
  );
  assert.equal(resumed.cursor.lease, null);
  assert.equal(
    resumed.cursor.checkpoint,
    "TASK_044_DIAGNOSTICS_VERIFIED"
  );
});

test("completed operation survives restart and suppresses duplicate side effect", () => {
  const key = makeOperationKey({
    projectId: "magasin-business-os",
    task: "TASK-045",
    microTask: "restart_resume_simulation",
    action: "PROJECT_HANDOFF"
  });

  const beforeCrash = markOperationCompleted(cursor(), {
    operationKey: key,
    now: "2026-09-18T23:58:10.000Z"
  });

  const recovered = reconcilePortfolioCursor({
    cursor: beforeCrash,
    canonicalProjectId: "magasin-business-os",
    canonicalTask: "TASK-045",
    canonicalProjectState: runnableState("magasin-business-os"),
    now: "2026-09-18T23:59:00.000Z",
    headVerified: true,
    ciVerified: true
  });

  assert.equal(
    recovered.action,
    PORTFOLIO_RECOVERY_ACTIONS.RESUME_CHECKPOINT
  );
  assert.equal(shouldExecuteOperation(recovered.cursor, key), false);
  assert.deepEqual(recovered.cursor.completed_operations, [key]);
});

test("restart remains fail-closed at WAIT_USER or BLOCKED project boundary", () => {
  for (const state of [
    runnableState("magasin-business-os", {
      status: "WAIT_USER",
      requires_user: true,
      runnable_hint: false
    }),
    runnableState("magasin-business-os", {
      status: "BLOCKED",
      blocked: true,
      runnable_hint: false
    })
  ]) {
    const result = reconcilePortfolioCursor({
      cursor: cursor(),
      canonicalProjectId: "magasin-business-os",
      canonicalTask: "TASK-045",
      canonicalProjectState: state,
      now: "2026-09-19T00:00:00.000Z",
      headVerified: true,
      ciVerified: true
    });

    assert.equal(
      result.action,
      PORTFOLIO_RECOVERY_ACTIONS.WAIT_PROJECT_BOUNDARY
    );
    assert.equal(result.cursor.task, "TASK-045");
    assert.notEqual(result.cursor.status, "READY");
  }
});

test("canonical task advancement after restart discards stale task replay", () => {
  const result = reconcilePortfolioCursor({
    cursor: cursor(),
    canonicalProjectId: "magasin-business-os",
    canonicalTask: "TASK-046",
    canonicalProjectState: runnableState("magasin-business-os", {
      current_task: "TASK-046"
    }),
    now: "2026-09-19T00:01:00.000Z",
    headVerified: true,
    ciVerified: true
  });

  assert.equal(
    result.action,
    PORTFOLIO_RECOVERY_ACTIONS.ADOPT_CANONICAL_CURSOR
  );
  assert.equal(result.cursor.task, "TASK-046");
  assert.equal(result.cursor.checkpoint, "CANONICAL_STATE_ADOPTED");
  assert.equal(result.cursor.lease, null);
});

test("project checkpoint handoff remains project-local across restart", () => {
  const business = runnableState("magasin-business-os");
  const media = runnableState("magasin-media-robot");
  const decision = {
    action: PORTFOLIO_ACTIONS.SELECT_PROJECT,
    project_id: "magasin-media-robot",
    reason: "CURRENT_PROJECT_NOT_RUNNABLE"
  };

  const handoff = planProjectHandoff({
    registry,
    schedulerDecision: decision,
    currentProjectId: "magasin-business-os",
    normalizedStates: [business, media],
    checkpoints: {
      "magasin-business-os": {
        task: "TASK-045",
        checkpoint: "BUSINESS_RESTART_POINT"
      },
      "magasin-media-robot": {
        task: "SAYDIVOICE_PROVIDER_ADAPTER",
        checkpoint: "MEDIA_OFFLINE_VERIFIED"
      }
    }
  });

  assert.equal(handoff.action, HANDOFF_ACTIONS.SWITCH_PROJECT);
  assert.equal(handoff.target.project_id, "magasin-media-robot");
  assert.equal(handoff.target.checkpoint, "MEDIA_OFFLINE_VERIFIED");
  assert.notEqual(handoff.target.checkpoint, "BUSINESS_RESTART_POINT");
  assert.ok(
    handoff.target_constraints.includes(
      "NO_LIVE_GENERATE_WITHOUT_SEPARATE_AUTHORIZATION"
    )
  );

  const duplicate = planProjectHandoff({
    registry,
    schedulerDecision: decision,
    currentProjectId: "magasin-business-os",
    normalizedStates: [business, media],
    checkpoints: {
      "magasin-business-os": {
        task: "TASK-045",
        checkpoint: "BUSINESS_RESTART_POINT"
      },
      "magasin-media-robot": {
        task: "SAYDIVOICE_PROVIDER_ADAPTER",
        checkpoint: "MEDIA_OFFLINE_VERIFIED"
      }
    },
    completedOperations: [handoff.operation_key]
  });

  assert.equal(duplicate.action, HANDOFF_ACTIONS.NOOP_DUPLICATE);
  assert.equal(duplicate.target.checkpoint, "MEDIA_OFFLINE_VERIFIED");
});
