import { validateProjectRegistry } from "./project-registry.mjs";

export const PORTFOLIO_ACTIONS = Object.freeze({
  SELECT_PROJECT: "SELECT_PROJECT",
  WAIT_NO_RUNNABLE_PROJECT: "WAIT_NO_RUNNABLE_PROJECT",
  STOP_ALL_DONE: "STOP_ALL_DONE"
});

function byPriority(registry, states) {
  const priority = new Map(
    (registry.projects || []).map((project) => [
      project.id,
      Number.isFinite(Number(project.priority))
        ? Number(project.priority)
        : Number.MAX_SAFE_INTEGER
    ])
  );

  return [...states].sort((a, b) => {
    const pa = priority.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const pb = priority.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    return String(a.id).localeCompare(String(b.id));
  });
}

function classify(state) {
  if (!state) return "MISSING";
  if (state.status === "DONE") return "DONE";
  if (state.status === "BLOCKED" || state.blocked) return "BLOCKED";
  if (state.status === "WAIT_USER" || state.requires_user) return "WAIT_USER";
  if (state.status === "READY" && state.runnable_hint === true) return "RUNNABLE";
  return "FAIL_CLOSED";
}

export function selectPortfolioProject({
  registry,
  projectStates,
  currentProjectId = null
}) {
  const validated = validateProjectRegistry(registry);
  const enabledIds = new Set(validated.projectIds);
  const states = Array.isArray(projectStates) ? projectStates : [];

  const stateById = new Map();
  for (const state of states) {
    if (!state?.id) continue;
    if (!enabledIds.has(state.id)) {
      continue;
    }
    stateById.set(state.id, state);
  }

  const orderedStates = byPriority(
    registry,
    validated.projectIds.map((id) => stateById.get(id) || { id, status: "UNKNOWN" })
  );

  const skipped = orderedStates.map((state) => ({
    id: state.id,
    classification: classify(state),
    status: state.status || "UNKNOWN"
  }));

  if (currentProjectId && enabledIds.has(currentProjectId)) {
    const current = stateById.get(currentProjectId);
    if (classify(current) === "RUNNABLE") {
      return Object.freeze({
        action: PORTFOLIO_ACTIONS.SELECT_PROJECT,
        project_id: currentProjectId,
        reason: "CURRENT_PROJECT_STILL_RUNNABLE",
        skipped: Object.freeze(
          skipped.filter((item) => item.id !== currentProjectId)
        )
      });
    }
  }

  const runnable = orderedStates.find((state) => classify(state) === "RUNNABLE");
  if (runnable) {
    return Object.freeze({
      action: PORTFOLIO_ACTIONS.SELECT_PROJECT,
      project_id: runnable.id,
      reason: currentProjectId
        ? "CURRENT_PROJECT_NOT_RUNNABLE_SELECT_NEXT"
        : "SELECT_HIGHEST_PRIORITY_RUNNABLE",
      skipped: Object.freeze(skipped.filter((item) => item.id !== runnable.id))
    });
  }

  const allDone = orderedStates.every((state) => classify(state) === "DONE");
  if (allDone) {
    return Object.freeze({
      action: PORTFOLIO_ACTIONS.STOP_ALL_DONE,
      project_id: null,
      reason: "ALL_REGISTERED_PROJECTS_DONE",
      skipped: Object.freeze(skipped)
    });
  }

  return Object.freeze({
    action: PORTFOLIO_ACTIONS.WAIT_NO_RUNNABLE_PROJECT,
    project_id: null,
    reason: "NO_REGISTERED_PROJECT_IS_SAFELY_RUNNABLE",
    skipped: Object.freeze(skipped)
  });
}
