import {
  reconcileStaleCursorLease
} from "../runtime/night-run.mjs";

export const PORTFOLIO_RECOVERY_ACTIONS = Object.freeze({
  WAIT_ACTIVE_LEASE: "WAIT_ACTIVE_LEASE",
  WAIT_RECONCILE_HEAD_CI: "WAIT_RECONCILE_HEAD_CI",
  RESUME_CHECKPOINT: "RESUME_CHECKPOINT",
  ADOPT_CANONICAL_CURSOR: "ADOPT_CANONICAL_CURSOR"
});

function validDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError("now must be a valid date");
  }
  return date;
}

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value.trim();
}

export function makeOperationKey({
  projectId,
  task,
  microTask,
  action
}) {
  return [
    requireText(projectId, "projectId"),
    requireText(task, "task"),
    requireText(microTask, "microTask"),
    requireText(action, "action")
  ].join("::");
}

export function hasCompletedOperation(cursor, operationKey) {
  const key = requireText(operationKey, "operationKey");
  return Array.isArray(cursor?.completed_operations)
    ? cursor.completed_operations.includes(key)
    : false;
}

export function markOperationCompleted(
  cursor,
  {
    operationKey,
    now = new Date(),
    maxEntries = 100
  } = {}
) {
  const key = requireText(operationKey, "operationKey");
  const at = validDate(now);
  if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 1000) {
    throw new TypeError("maxEntries must be an integer from 1 to 1000");
  }

  const existing = Array.isArray(cursor?.completed_operations)
    ? [...cursor.completed_operations]
    : [];

  if (existing.includes(key)) {
    return { ...cursor, completed_operations: existing };
  }

  existing.push(key);
  const bounded = existing.slice(-maxEntries);

  return {
    ...cursor,
    completed_operations: bounded,
    updated_at: at.toISOString()
  };
}

export function shouldExecuteOperation(cursor, operationKey) {
  return !hasCompletedOperation(cursor, operationKey);
}

export function reconcilePortfolioCursor({
  cursor,
  canonicalProjectId,
  canonicalTask,
  now = new Date(),
  headVerified = false,
  ciVerified = false
}) {
  if (!cursor || typeof cursor !== "object") {
    throw new TypeError("cursor is required");
  }

  const projectId = requireText(canonicalProjectId, "canonicalProjectId");
  const task = requireText(canonicalTask, "canonicalTask");
  const at = validDate(now);

  let working = { ...cursor };

  if (working.lease) {
    const expiresMs = Date.parse(working.lease.expires_at || "");
    if (!Number.isFinite(expiresMs)) {
      return {
        action: PORTFOLIO_RECOVERY_ACTIONS.WAIT_RECONCILE_HEAD_CI,
        reason: "LEASE_EXPIRY_INVALID",
        cursor: working
      };
    }

    if (expiresMs > at.getTime()) {
      return {
        action: PORTFOLIO_RECOVERY_ACTIONS.WAIT_ACTIVE_LEASE,
        reason: "ANOTHER_WORKER_MAY_STILL_BE_ACTIVE",
        cursor: working
      };
    }

    const stale = reconcileStaleCursorLease(working, {
      now: at,
      headVerified,
      ciVerified
    });

    if (stale.action === "WAIT_RECONCILE_HEAD_CI") {
      return {
        action: PORTFOLIO_RECOVERY_ACTIONS.WAIT_RECONCILE_HEAD_CI,
        reason: "STALE_LEASE_REQUIRES_HEAD_AND_CI",
        cursor: working
      };
    }

    working = stale.cursor;
  }

  if (
    working.project_id !== projectId ||
    working.task !== task
  ) {
    return {
      action: PORTFOLIO_RECOVERY_ACTIONS.ADOPT_CANONICAL_CURSOR,
      reason: "CANONICAL_PROJECT_STATE_ADVANCED",
      cursor: {
        ...working,
        project_id: projectId,
        task,
        micro_task: "reconcile_canonical_state",
        status: "READY",
        checkpoint: "CANONICAL_STATE_ADOPTED",
        lease: null,
        updated_at: at.toISOString()
      }
    };
  }

  return {
    action: PORTFOLIO_RECOVERY_ACTIONS.RESUME_CHECKPOINT,
    reason: "SAFE_TO_RESUME_CURRENT_CHECKPOINT",
    cursor: {
      ...working,
      lease: null,
      updated_at: at.toISOString()
    }
  };
}
