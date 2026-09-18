import {
  ProjectRegistryError,
  validateProjectRegistry
} from "./project-registry.mjs";

export class PortfolioSchedulerError extends Error {
  constructor(message) {
    super(message);
    this.name = "PortfolioSchedulerError";
  }
}

export const PORTFOLIO_ACTIONS = Object.freeze({
  RUN_PROJECT: "RUN_PROJECT",
  WAIT_PORTFOLIO: "WAIT_PORTFOLIO",
  PORTFOLIO_DONE: "PORTFOLIO_DONE"
});

function requirePriority(project) {
  const priority = Number(project?.priority);
  if (!Number.isInteger(priority) || priority <= 0) {
    throw new PortfolioSchedulerError(
      `project ${project?.id || "unknown"} priority must be a positive integer`
    );
  }
  return priority;
}

function indexStates(states = []) {
  if (!Array.isArray(states)) {
    throw new PortfolioSchedulerError("normalized project states must be an array");
  }

  const map = new Map();
  for (const state of states) {
    const id = String(state?.id || "").trim();
    if (!id) {
      throw new PortfolioSchedulerError("normalized project state requires id");
    }
    if (map.has(id)) {
      throw new PortfolioSchedulerError(`duplicate normalized project state: ${id}`);
    }
    map.set(id, state);
  }
  return map;
}

function stateReason(state) {
  if (!state) return "MISSING_STATE";
  if (state.blocked || state.status === "BLOCKED") return "BLOCKED";
  if (state.requires_user || state.status === "WAIT_USER") return "WAIT_USER";
  if (state.status === "DONE") return "DONE";
  if (state.status !== "READY") return "UNKNOWN_STATE";
  if (state.runnable_hint !== true) return "NOT_RUNNABLE";
  return null;
}

function runnable(state) {
  return stateReason(state) == null;
}

function safeSelected(project, state) {
  return Object.freeze({
    id: project.id,
    repository: project.repository,
    priority: Number(project.priority),
    state_strategy: project.state_strategy,
    status: state.status,
    current_task: state.current_task || null,
    current_task_title: state.current_task_title || null,
    next_task: state.next_task || null,
    constraints: Object.freeze([...(state.constraints || [])])
  });
}

export function schedulePortfolio({
  registry,
  states,
  preferredProjectId = null
} = {}) {
  let validated;
  try {
    validated = validateProjectRegistry(registry);
  } catch (error) {
    if (error instanceof ProjectRegistryError) {
      throw new PortfolioSchedulerError(error.message);
    }
    throw error;
  }

  const stateMap = indexStates(states);
  const registeredIds = new Set(validated.projectIds);

  for (const id of stateMap.keys()) {
    if (!registeredIds.has(id)) {
      throw new PortfolioSchedulerError(
        `normalized state belongs to unregistered project: ${id}`
      );
    }
  }

  const projects = [...validated.projects]
    .map((project) => ({ ...project, priority: requirePriority(project) }))
    .sort((a, b) => a.priority - b.priority);

  const priorities = projects.map((project) => project.priority);
  if (new Set(priorities).size !== priorities.length) {
    throw new PortfolioSchedulerError("project priorities must be unique");
  }

  let preferred = null;
  if (preferredProjectId != null) {
    const preferredId = String(preferredProjectId).trim();
    preferred = projects.find((project) => project.id === preferredId) || null;
    if (!preferred) {
      throw new PortfolioSchedulerError(
        `preferred project is not registered: ${preferredId}`
      );
    }
  }

  const quarantined = [];
  const done = [];
  const runnableProjects = [];

  for (const project of projects) {
    const state = stateMap.get(project.id);
    const reason = stateReason(state);
    if (reason === "DONE") {
      done.push(
        Object.freeze({
          id: project.id,
          repository: project.repository,
          reason
        })
      );
      continue;
    }
    if (reason) {
      quarantined.push(
        Object.freeze({
          id: project.id,
          repository: project.repository,
          reason
        })
      );
      continue;
    }
    runnableProjects.push({ project, state });
  }

  const preferredRunnable = preferred
    ? runnableProjects.find(({ project }) => project.id === preferred.id)
    : null;
  const selectedEntry = preferredRunnable || runnableProjects[0] || null;

  const common = {
    quarantined: Object.freeze(quarantined),
    done: Object.freeze(done),
    runnable_project_ids: Object.freeze(
      runnableProjects.map(({ project }) => project.id)
    )
  };

  if (selectedEntry) {
    return Object.freeze({
      action: PORTFOLIO_ACTIONS.RUN_PROJECT,
      selected: safeSelected(selectedEntry.project, selectedEntry.state),
      ...common
    });
  }

  if (done.length === projects.length) {
    return Object.freeze({
      action: PORTFOLIO_ACTIONS.PORTFOLIO_DONE,
      selected: null,
      ...common
    });
  }

  return Object.freeze({
    action: PORTFOLIO_ACTIONS.WAIT_PORTFOLIO,
    selected: null,
    ...common
  });
}
