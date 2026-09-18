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
  recovery = null,
  errorName = null
} = {}) {
  return {
    schema_version: 1,
    project: projectState.project || "MAGASIN Business OS",
    repository: projectState.repository || "magasincoffee/magasincoffee.github.io",
    project_status: projectState.status || null,
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
    execution_reason: execution?.reason || null,
    retry_count: Number.isInteger(retryCount) ? retryCount : 0,
    recovery_action: recovery?.action || null,
    recovery_reason: recovery?.reason || null,
    recovery_stall_reloads: Number.isInteger(recovery?.stall_reloads) ? recovery.stall_reloads : 0,
    recovery_unavailable_reloads: Number.isInteger(recovery?.unavailable_reloads) ? recovery.unavailable_reloads : 0,
    recovery_target_misses: Number.isInteger(recovery?.target_misses) ? recovery.target_misses : 0,
    recovery_rollover_failures: Number.isInteger(recovery?.rollover_failures) ? recovery.rollover_failures : 0,
    conversation_generation: Number.isInteger(recovery?.conversation_generation) ? recovery.conversation_generation : 0,
    rollover_burst_count: Number.isInteger(recovery?.rollover_burst_count) ? recovery.rollover_burst_count : 0,
    recovery_blocked: Boolean(recovery?.blocked),
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
