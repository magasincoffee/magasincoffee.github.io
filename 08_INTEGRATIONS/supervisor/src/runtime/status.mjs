import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export function localSupervisorRoot(env = process.env) {
  const base = env.LOCALAPPDATA || env.HOME || process.cwd();
  return path.join(base, "MAGASIN", "BusinessOS", "supervisor");
}

export function defaultRuntimeStatusPath(env = process.env) {
  return path.join(localSupervisorRoot(env), "runtime-status.json");
}

export function buildRuntimeStatus({
  projectState = {},
  status = "STARTING",
  uiState = null,
  observation = null,
  decision = null,
  execution = null,
  retryCount = 0,
  errorName = null
} = {}) {
  return {
    schema_version: 1,
    project: projectState.project || "MAGASIN Business OS",
    repository: projectState.repository || "magasincoffee/magasincoffee.github.io",
    status,
    current_phase: projectState.current_phase || null,
    current_task: projectState.current_task || null,
    current_task_title: projectState.current_task_title || null,
    next_task: projectState.next_task || null,
    autonomy: projectState.autonomy || null,
    requires_user: Boolean(projectState.requires_user),
    blocked: Boolean(projectState.blocked),
    ui_state: uiState,
    observation,
    decision_action: decision?.action || null,
    decision_reason: decision?.reason || null,
    execution_target: execution?.target || null,
    execution_executed: Boolean(execution?.executed),
    retry_count: Number.isInteger(retryCount) ? retryCount : 0,
    error_name: errorName,
    updated_at: new Date().toISOString()
  };
}

export async function writeRuntimeStatus(payload, filePath = defaultRuntimeStatusPath()) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(payload, null, 2) + "\n", "utf8");
  await fs.rename(temporary, filePath);
  return filePath;
}
