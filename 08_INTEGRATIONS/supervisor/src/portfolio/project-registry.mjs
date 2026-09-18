export class ProjectRegistryError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProjectRegistryError";
  }
}

const APPROVED_PROJECT_IDS = Object.freeze([
  "magasin-business-os",
  "magasin-media-robot"
]);

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ProjectRegistryError(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function normalizeStatus(value) {
  const status = String(value || "").trim().toUpperCase();
  if (["READY", "WAIT_USER", "BLOCKED", "DONE"].includes(status)) return status;
  return "UNKNOWN";
}

export function validateProjectRegistry(registry) {
  if (!registry || registry.schema_version !== "business-os-project-registry.v1") {
    throw new ProjectRegistryError("unsupported project registry");
  }
  if (registry.discovery_policy !== "DENY_UNREGISTERED") {
    throw new ProjectRegistryError("registry must deny unregistered projects");
  }
  if (registry.owner_boundary_policy !== "SKIP_BLOCKED_PROJECT_NOT_GLOBAL_STOP") {
    throw new ProjectRegistryError("registry owner-boundary policy is not fail-closed");
  }

  const projects = Array.isArray(registry.projects) ? registry.projects : [];
  const enabled = projects.filter((project) => project?.enabled);
  const ids = enabled.map((project, index) =>
    requireText(project?.id, `projects[${index}].id`)
  );

  if (ids.length !== APPROVED_PROJECT_IDS.length) {
    throw new ProjectRegistryError("V1 registry must contain exactly two enabled projects");
  }
  if (new Set(ids).size !== ids.length) {
    throw new ProjectRegistryError("project ids must be unique");
  }
  for (const approved of APPROVED_PROJECT_IDS) {
    if (!ids.includes(approved)) {
      throw new ProjectRegistryError(`approved project missing: ${approved}`);
    }
  }

  for (const project of enabled) {
    requireText(project.repository, `${project.id}.repository`);
    requireText(project.state_strategy, `${project.id}.state_strategy`);
    if (!["PROJECT_STATE_JSON", "DOC_PAIR"].includes(project.state_strategy)) {
      throw new ProjectRegistryError(
        `unsupported state strategy for ${project.id}: ${project.state_strategy}`
      );
    }
    requireText(project.state_ref, `${project.id}.state_ref`);
    if (project.state_strategy === "PROJECT_STATE_JSON") {
      requireText(project.task_queue_ref, `${project.id}.task_queue_ref`);
    } else {
      requireText(project.next_ref, `${project.id}.next_ref`);
      requireText(project.rules_ref, `${project.id}.rules_ref`);
    }
  }

  return Object.freeze({
    projectIds: Object.freeze([...ids]),
    projects: Object.freeze(enabled.map((project) => Object.freeze({ ...project })))
  });
}

export function getRegisteredProject(registry, projectId) {
  const validated = validateProjectRegistry(registry);
  const found = validated.projects.find((project) => project.id === projectId);
  if (!found) {
    throw new ProjectRegistryError(`unregistered project: ${projectId}`);
  }
  return found;
}

function normalizeBusinessOs(project, source) {
  const state = source?.state;
  if (!state || typeof state !== "object") {
    throw new ProjectRegistryError("PROJECT_STATE_JSON adapter requires source.state");
  }

  const status = normalizeStatus(state.status);
  const blocked = Boolean(state.blocked || status === "BLOCKED");
  const requiresUser = Boolean(
    blocked || state.requires_user || status === "WAIT_USER"
  );

  return Object.freeze({
    id: project.id,
    repository: project.repository,
    state_strategy: project.state_strategy,
    status,
    blocked,
    requires_user: requiresUser,
    runnable_hint:
      status === "READY" &&
      state.autonomy === "AUTO_CONTINUE" &&
      !blocked &&
      !requiresUser,
    autonomy: state.autonomy || null,
    current_task: state.current_task || null,
    current_task_title: state.current_task_title || null,
    next_task: state.next_task || null,
    evidence: Object.freeze({
      source: project.state_ref,
      project_matches: state.project === "MAGASIN Business OS",
      repository_matches: state.repository === project.repository
    }),
    constraints: Object.freeze([])
  });
}

function headingAfterPrefix(markdown, prefix) {
  const lines = String(markdown || "").split(/\r?\n/);
  const normalizedPrefix = prefix.toLowerCase();
  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (!match) continue;
    const heading = match[1].trim();
    if (heading.toLowerCase().startsWith(normalizedPrefix)) {
      return heading;
    }
  }
  return null;
}

function normalizeMediaRobot(project, source) {
  const current = String(source?.current_status || "");
  const next = String(source?.next_step || "");
  const rules = String(source?.rules || "");

  if (!current.trim() || !next.trim() || !rules.trim()) {
    throw new ProjectRegistryError(
      "DOC_PAIR adapter requires current_status, next_step and rules"
    );
  }

  const blocked = /\bBLOCKED\b|hard stop|security boundary/i.test(
    `${current}\n${next}`
  );
  const ownerWait =
    /\bWAIT_USER\b|owner decision required|requires owner/i.test(
      `${current}\n${next}`
    );

  const activeObjective =
    /## Current active objective/i.test(current) &&
    /SaydiVoice provider adapter/i.test(current);
  const immediateNext = headingAfterPrefix(next, "Immediate next step");
  const offlineGate =
    /no additional live generation is required for ordinary implementation work/i.test(
      current
    ) &&
    /Before another live Generate is requested, complete all offline\/unit verification/i.test(
      next
    );
  const rulesPresent =
    /## Mandatory session protocol/i.test(rules) &&
    /## Secrets and privacy/i.test(rules);

  let status = "UNKNOWN";
  if (blocked) status = "BLOCKED";
  else if (ownerWait) status = "WAIT_USER";
  else if (activeObjective && immediateNext && offlineGate && rulesPresent) {
    status = "READY";
  }

  const requiresUser = status === "WAIT_USER" || status === "BLOCKED";

  return Object.freeze({
    id: project.id,
    repository: project.repository,
    state_strategy: project.state_strategy,
    status,
    blocked: status === "BLOCKED",
    requires_user: requiresUser,
    runnable_hint: status === "READY",
    autonomy: status === "READY" ? "SAFE_OFFLINE_IMPLEMENTATION" : null,
    current_task: "SAYDIVOICE_PROVIDER_ADAPTER",
    current_task_title: activeObjective
      ? "Production SaydiVoice provider adapter"
      : null,
    next_task: immediateNext,
    evidence: Object.freeze({
      current_status_ref: project.state_ref,
      next_ref: project.next_ref,
      rules_ref: project.rules_ref,
      active_objective: activeObjective,
      immediate_next_step: Boolean(immediateNext),
      offline_gate: offlineGate,
      rules_present: rulesPresent
    }),
    constraints: Object.freeze([
      "NO_LIVE_GENERATE_WITHOUT_SEPARATE_AUTHORIZATION",
      "NO_LIVE_DOWNLOAD_WITHOUT_SEPARATE_AUTHORIZATION",
      "LOCAL_BROWSER_PROFILE_ONLY",
      "NO_SECRETS_OR_RUNTIME_MEDIA_IN_GIT"
    ])
  });
}

export function normalizeProjectState(project, source) {
  if (!project || typeof project !== "object") {
    throw new ProjectRegistryError("project definition is required");
  }
  if (project.state_strategy === "PROJECT_STATE_JSON") {
    return normalizeBusinessOs(project, source);
  }
  if (project.state_strategy === "DOC_PAIR") {
    return normalizeMediaRobot(project, source);
  }
  throw new ProjectRegistryError(
    `unsupported project state strategy: ${project.state_strategy}`
  );
}
