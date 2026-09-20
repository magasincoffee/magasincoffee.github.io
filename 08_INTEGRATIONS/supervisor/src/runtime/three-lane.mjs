import crypto from "node:crypto";
import { canonicalConversationPathname } from "./recovery.mjs";
import { defaultTaskTiming, normalizeTaskTiming } from "./lane-events.mjs";
import { normalizeWorkTargetMode } from "./work-target-state.mjs";
import {
  defaultWorkWatchdog,
  normalizeWorkWatchdog
} from "./work-watchdog.mjs";
import { normalizeWorkRollover } from "./work-rollover.mjs";

export const THREE_LANE_MODE = "THREE_LANE_V1";
export const LANE_DIRECTIVE_START = "<<<MAGASIN_LANE_DIRECTIVE_V1>>>";
export const LANE_DIRECTIVE_END = "<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>";
export const LANE_IDS = Object.freeze(["lane-1", "lane-2", "lane-3"]);

export function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

export function normalizeChatGptConversationUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  let url = null;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("invalid ChatGPT conversation URL");
  }
  if (
    url.protocol !== "https:" ||
    (url.hostname !== "chatgpt.com" && !url.hostname.endsWith(".chatgpt.com")) ||
    !/^\/(c|g|project)\//.test(url.pathname)
  ) {
    throw new Error("Brain/Work URL must be a specific ChatGPT conversation");
  }
  return `${url.origin}${canonicalConversationPathname(url.pathname)}`;
}

export function parseLaneDirective(text) {
  const raw = String(text || "");
  const start = raw.lastIndexOf(LANE_DIRECTIVE_START);
  const end = raw.indexOf(LANE_DIRECTIVE_END, start + LANE_DIRECTIVE_START.length);
  if (start < 0 || end < 0) {
    throw new Error("Brain response missing MAGASIN_LANE_DIRECTIVE_V1 block");
  }

  const jsonText = raw.slice(start + LANE_DIRECTIVE_START.length, end).trim();
  const payload = JSON.parse(jsonText);
  const action = String(payload?.action || "").toUpperCase();

  if (action === "IDLE") {
    return {
      schema_version: "lane-directive.v1",
      action: "IDLE",
      digest: sha256(jsonText)
    };
  }
  if (action !== "WORK") throw new Error("unsupported lane directive action");

  const taskId = String(payload.task_id || "").trim();
  const instruction = String(payload.instruction || "").trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:\/-]{0,79}$/.test(taskId)) {
    throw new Error("invalid lane task_id");
  }
  if (!instruction) throw new Error("lane WORK instruction is empty");

  return {
    schema_version: "lane-directive.v1",
    action: "WORK",
    task_id: taskId,
    instruction,
    instruction_digest: sha256(instruction),
    digest: sha256(jsonText)
  };
}

export function defaultLaneConfig() {
  return {
    schema_version: "three-lane-config.v1",
    mode: THREE_LANE_MODE,
    lanes: LANE_IDS.map((laneId, index) => ({
      lane_id: laneId,
      project_name: `Dự án ${index + 1}`,
      brain_url: "",
      brain_url_revision: 0,
      work_url: "",
      work_url_revision: 0,
      work_url_saved_at: null,
      work_mode: "AUTO",
      work_state_reset_revision: 0,
      relay_retry_rearm_revision: 0,
      relay_retry_rearm_requested_at: null,
      enabled: false
    }))
  };
}

export function normalizeLaneConfig(value = {}) {
  const defaults = defaultLaneConfig();
  const input = Array.isArray(value?.lanes) ? value.lanes : [];
  return {
    schema_version: defaults.schema_version,
    mode: THREE_LANE_MODE,
    lanes: LANE_IDS.map((laneId, index) => {
      const lane = input.find((item) => item?.lane_id === laneId) || {};
      return {
        lane_id: laneId,
        project_name: String(lane.project_name || `Dự án ${index + 1}`).slice(0, 120),
        brain_url: String(lane.brain_url || "").trim(),
        brain_url_revision: Number(
          lane.brain_url_revision ?? (String(lane.brain_url || "").trim() ? 1 : 0)
        ),
        work_url: String(lane.work_url || "").trim(),
        work_url_revision: Number(lane.work_url_revision || 0),
        work_url_saved_at: String(lane.work_url_saved_at || "").trim() || null,
        work_mode: normalizeWorkTargetMode(
          lane.work_mode,
          String(lane.work_url || "").trim()
        ),
        work_state_reset_revision: Number(lane.work_state_reset_revision || 0),
        relay_retry_rearm_revision: Number(lane.relay_retry_rearm_revision || 0),
        relay_retry_rearm_requested_at:
          String(lane.relay_retry_rearm_requested_at || "").trim() || null,
        enabled: Boolean(lane.enabled)
      };
    })
  };
}

function normalizeStoredConversationUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return normalizeChatGptConversationUrl(raw);
  } catch {
    return raw;
  }
}

export function defaultLaneRegistry() {
  return {
    schema_version: "three-lane-registry.v1",
    mode: THREE_LANE_MODE,
    lanes: Object.fromEntries(LANE_IDS.map((laneId) => [laneId, {
      lane_id: laneId,
      brain_url: "",
      applied_brain_url_revision: 0,
      work_url: "",
      work_generation: 0,
      applied_work_mode: "AUTO",
      applied_work_saved_at: null,
      pending_work_url: "",
      pending_work_url_revision: 0,
      pending_work_saved_at: null,
      pending_work_mode: null,
      applied_work_state_reset_revision: 0,
      task_id: null,
      instruction_digest: null,
      last_brain_directive_digest: null,
      last_work_result_digest: null,
      last_result_relay_id: null,
      last_dispatch_id: null,
      dispatch_inflight: null,
      relay_inflight: null,
      applied_relay_retry_rearm_revision: 0,
      brain_request_inflight: null,
      brain_request_sent: false,
      awaiting_work: false,
      task_timing: defaultTaskTiming(),
      work_watchdog: defaultWorkWatchdog(),
      work_rollover: null,
      applied_work_url_revision: 0
    }]))
  };
}

export function normalizeLaneRegistry(value = {}) {
  const safe = defaultLaneRegistry();
  for (const laneId of LANE_IDS) {
    const lane = value?.lanes?.[laneId] || {};
    safe.lanes[laneId] = {
      lane_id: laneId,
      brain_url: normalizeStoredConversationUrl(lane.brain_url),
      applied_brain_url_revision: Number(lane.applied_brain_url_revision || 0),
      work_url: normalizeStoredConversationUrl(lane.work_url),
      work_generation: Number(lane.work_generation || 0),
      applied_work_mode: normalizeWorkTargetMode(
        lane.applied_work_mode,
        lane.work_url
      ),
      applied_work_saved_at:
        String(lane.applied_work_saved_at || "").trim() || null,
      pending_work_url: normalizeStoredConversationUrl(lane.pending_work_url),
      pending_work_url_revision: Number(lane.pending_work_url_revision || 0),
      pending_work_saved_at:
        String(lane.pending_work_saved_at || "").trim() || null,
      pending_work_mode: Number(lane.pending_work_url_revision || 0) > 0
        ? normalizeWorkTargetMode(lane.pending_work_mode, lane.pending_work_url)
        : null,
      applied_work_state_reset_revision:
        Number(lane.applied_work_state_reset_revision || 0),
      task_id: lane.task_id || null,
      instruction_digest: lane.instruction_digest || null,
      last_brain_directive_digest: lane.last_brain_directive_digest || null,
      last_work_result_digest: lane.last_work_result_digest || null,
      last_result_relay_id: lane.last_result_relay_id || null,
      last_dispatch_id: lane.last_dispatch_id || null,
      dispatch_inflight: lane.dispatch_inflight || null,
      relay_inflight: lane.relay_inflight || null,
      applied_relay_retry_rearm_revision:
        Number(lane.applied_relay_retry_rearm_revision || 0),
      brain_request_inflight: lane.brain_request_inflight || null,
      brain_request_sent: Boolean(lane.brain_request_sent),
      awaiting_work: Boolean(lane.awaiting_work),
      task_timing: normalizeTaskTiming(lane.task_timing),
      work_watchdog: normalizeWorkWatchdog(lane.work_watchdog),
      work_rollover: normalizeWorkRollover(lane.work_rollover),
      applied_work_url_revision: Number(lane.applied_work_url_revision || 0)
    };
  }
  return safe;
}

export function buildBrainStartRequest({ laneId, projectName }) {
  return [
    `Bạn là BỘ NÃO của ${laneId} — ${projectName} trong MAGASIN Supervisor Three-Lane V1.`,
    "Robot chỉ làm việc theo lệnh trong cuộc trò chuyện Brain URL mà Owner đã chọn cho đúng luồng này.",
    "Hãy đọc ngữ cảnh cuộc trò chuyện hiện tại và giao đúng một việc tiếp theo cho Work chat bằng block máy đọc được:",
    LANE_DIRECTIVE_START,
    '{"action":"WORK","task_id":"TASK-ID","instruction":"Chỉ thị đầy đủ, tự đủ ngữ cảnh cho Work chat."}',
    LANE_DIRECTIVE_END,
    "Nếu chưa có việc an toàn để làm, trả:",
    LANE_DIRECTIVE_START,
    '{"action":"IDLE"}',
    LANE_DIRECTIVE_END,
    "Không yêu cầu Robot tự tìm Brain khác. Không yêu cầu Robot tự tạo Brain mới."
  ].join("\n");
}

export function buildWorkRolloverInstruction({ projectName, taskId, instruction }) {
  return [
    `Tiếp tục Work chat cho dự án ${projectName}.`,
    "Work chat trước đã được ChatGPT xác nhận đầy nên Robot tạo chat mới theo đúng guard.",
    `Task: ${taskId}`,
    "",
    instruction
  ].join("\n");
}

export function workDispatchMarker(dispatchId) {
  const id = String(dispatchId || "").trim();
  if (!id) throw new Error("dispatch_id is required");
  return `dispatch_id=${id}`;
}

export function buildWorkDispatchInstruction({
  taskId,
  dispatchId,
  instruction
}) {
  const body = String(instruction || "").trim();
  if (!body) throw new Error("Work instruction is required");
  return [
    "MAGASIN_WORK_DISPATCH_V1",
    `task_id=${String(taskId || "").trim()}`,
    workDispatchMarker(dispatchId),
    "",
    body
  ].join("\n");
}

export function buildLaneResultRelay({
  laneId,
  projectName,
  taskId,
  generation,
  responseText
}) {
  const body = String(responseText || "");
  if (!body.trim()) throw new Error("work result is empty");
  const responseDigest = sha256(body);
  const relayId = sha256([
    laneId,
    taskId,
    generation,
    responseDigest
  ].join("|")).slice(0, 32);

  return {
    relay_id: relayId,
    response_digest: responseDigest,
    text: [
      `KẾT QUẢ WORK — ${laneId} — ${projectName}`,
      `task_id=${taskId}`,
      `relay_id=${relayId}`,
      "",
      "Ảnh đính kèm là ảnh chụp assistant turn cuối của Work chat.",
      "Toàn bộ text kết quả:",
      "",
      body,
      "",
      "Hãy reconcile kết quả này và trả MAGASIN_LANE_DIRECTIVE_V1 tiếp theo cho đúng luồng."
    ].join("\n")
  };
}
