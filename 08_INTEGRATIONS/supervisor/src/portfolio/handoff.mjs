import { getRegisteredProject, validateProjectRegistry } from "./project-registry.mjs";
import { PORTFOLIO_ACTIONS } from "./scheduler.mjs";

export const HANDOFF_ACTIONS = Object.freeze({
  STAY_CURRENT: "STAY_CURRENT",
  SWITCH_PROJECT: "SWITCH_PROJECT",
  NOOP_DUPLICATE: "NOOP_DUPLICATE"
});

export class ProjectHandoffError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProjectHandoffError";
  }
}

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ProjectHandoffError(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function checkpointFor(checkpoints, projectId, normalizedState) {
  const existing = checkpoints?.[projectId] || null;
  if (existing) {
    return Object.freeze({
      project_id: projectId,
      task: existing.task || normalizedState.current_task || null,
      checkpoint: existing.checkpoint || "UNKNOWN",
      updated_at: existing.updated_at || null,
      source: "PROJECT_CHECKPOINT"
    });
  }
  return Object.freeze({
    project_id: projectId,
    task: normalizedState.current_task || null,
    checkpoint: "CANONICAL_TARGET_STATE",
    updated_at: null,
    source: "NORMALIZED_PROJECT_STATE"
  });
}

export function makeHandoffOperationKey({
  fromProjectId,
  toProjectId,
  targetTask,
  targetCheckpoint
}) {
  return [
    "HANDOFF",
    requireText(fromProjectId, "fromProjectId"),
    requireText(toProjectId, "toProjectId"),
    requireText(targetTask || "NO_TASK", "targetTask"),
    requireText(targetCheckpoint, "targetCheckpoint")
  ].join("::");
}

export function snapshotProjectCheckpoint({
  normalizedState,
  task,
  checkpoint,
  updatedAt
}) {
  if (!normalizedState?.id) {
    throw new ProjectHandoffError("normalized project state is required");
  }
  return Object.freeze({
    project_id: normalizedState.id,
    task: task || normalizedState.current_task || null,
    checkpoint: requireText(checkpoint, "checkpoint"),
    updated_at: updatedAt || null,
    requires_user: Boolean(normalizedState.requires_user),
    blocked: Boolean(normalizedState.blocked),
    status: normalizedState.status || "UNKNOWN"
  });
}

export function planProjectHandoff({
  registry,
  schedulerDecision,
  currentProjectId,
  normalizedStates,
  checkpoints = {},
  completedOperations = []
}) {
  validateProjectRegistry(registry);

  if (
    !schedulerDecision ||
    schedulerDecision.action !== PORTFOLIO_ACTIONS.SELECT_PROJECT
  ) {
    throw new ProjectHandoffError(
      "handoff requires a scheduler SELECT_PROJECT decision"
    );
  }

  const currentId = requireText(currentProjectId, "currentProjectId");
  const targetId = requireText(schedulerDecision.project_id, "schedulerDecision.project_id");

  getRegisteredProject(registry, currentId);
  getRegisteredProject(registry, targetId);

  const states = new Map(
    (normalizedStates || [])
      .filter((state) => state?.id)
      .map((state) => [state.id, state])
  );

  const currentState = states.get(currentId);
  const targetState = states.get(targetId);
  if (!currentState) {
    throw new ProjectHandoffError("current project normalized state is missing");
  }
  if (!targetState) {
    throw new ProjectHandoffError("target project normalized state is missing");
  }

  if (
    targetState.status !== "READY" ||
    targetState.runnable_hint !== true ||
    targetState.blocked ||
    targetState.requires_user
  ) {
    throw new ProjectHandoffError("scheduler target is not safely runnable");
  }

  const targetCheckpoint = checkpointFor(checkpoints, targetId, targetState);

  if (currentId === targetId) {
    return Object.freeze({
      action: HANDOFF_ACTIONS.STAY_CURRENT,
      operation_key: null,
      from_project_id: currentId,
      to_project_id: targetId,
      target: targetCheckpoint,
      target_constraints: Object.freeze([...(targetState.constraints || [])])
    });
  }

  const key = makeHandoffOperationKey({
    fromProjectId: currentId,
    toProjectId: targetId,
    targetTask: targetCheckpoint.task,
    targetCheckpoint: targetCheckpoint.checkpoint
  });

  if (completedOperations.includes(key)) {
    return Object.freeze({
      action: HANDOFF_ACTIONS.NOOP_DUPLICATE,
      operation_key: key,
      from_project_id: currentId,
      to_project_id: targetId,
      target: targetCheckpoint,
      target_constraints: Object.freeze([...(targetState.constraints || [])])
    });
  }

  return Object.freeze({
    action: HANDOFF_ACTIONS.SWITCH_PROJECT,
    operation_key: key,
    from_project_id: currentId,
    to_project_id: targetId,
    source: Object.freeze({
      project_id: currentState.id,
      task: currentState.current_task || null,
      status: currentState.status,
      requires_user: Boolean(currentState.requires_user),
      blocked: Boolean(currentState.blocked)
    }),
    target: targetCheckpoint,
    target_constraints: Object.freeze([...(targetState.constraints || [])])
  });
}
