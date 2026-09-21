import crypto from "node:crypto";
import { canonicalConversationPathname } from "./recovery.mjs";
import { defaultTaskTiming, normalizeTaskTiming } from "./lane-events.mjs";
import { normalizeWorkTargetMode } from "./work-target-state.mjs";
import {
  defaultWorkWatchdog,
  normalizeWorkWatchdog
} from "./work-watchdog.mjs";
import { normalizeWorkRollover } from "./work-rollover.mjs";
import {
  defaultTargetHealth,
  normalizeTargetHealth
} from "./target-health.mjs";

export const THREE_LANE_MODE = "THREE_LANE_V1";
export const LANE_DIRECTIVE_START = "<<<MAGASIN_LANE_DIRECTIVE_V1>>>";
export const LANE_DIRECTIVE_END = "<<<END_MAGASIN_LANE_DIRECTIVE_V1>>>";
export const LANE_IDS = Object.freeze(["lane-1", "lane-2", "lane-3"]);

export const BRAIN_RESULT_VERDICTS = Object.freeze({
  ACCEPT: "ACCEPT",
  REJECT: "REJECT"
});

export const BRAIN_RESULT_REASON_CODES = Object.freeze([
  "DOD_MET",
  "EVIDENCE_VERIFIED",
  "CORRECTION_REQUIRED",
  "EVIDENCE_INCOMPLETE",
  "OWNER_INTERVENTION_REQUIRED",
  "DEPENDENCY_BLOCKED"
]);

const BRAIN_RESULT_REASON_CODE_SET = new Set(BRAIN_RESULT_REASON_CODES);
const TASK_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._:\/-]{0,79}$/;
const RELAY_ID_RE = /^[a-f0-9]{32}$/i;

function planningContractError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function parseTaskId(value, fieldName = "task_id") {
  const taskId = String(value || "").trim();
  if (!TASK_ID_RE.test(taskId)) {
    throw planningContractError("INVALID_TASK_ID", `invalid ${fieldName}`);
  }
  return taskId;
}

function parseRelayId(value, fieldName = "relay_id") {
  const relayId = String(value || "").trim();
  if (!RELAY_ID_RE.test(relayId)) {
    throw planningContractError("INVALID_RELAY_ID", `invalid ${fieldName}`);
  }
  return relayId.toLowerCase();
}

function parsePreviousResult(value) {
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw planningContractError("INVALID_PREVIOUS_RESULT", "previous_result must be an object");
  }
  const verdict = String(value.verdict || "").trim().toUpperCase();
  if (!Object.values(BRAIN_RESULT_VERDICTS).includes(verdict)) {
    throw planningContractError("INVALID_PREVIOUS_RESULT_VERDICT", "previous_result verdict must be ACCEPT or REJECT");
  }
  const reasonCode = value.reason_code === undefined || value.reason_code === null || value.reason_code === ""
    ? null
    : String(value.reason_code).trim().toUpperCase();
  if (reasonCode && !BRAIN_RESULT_REASON_CODE_SET.has(reasonCode)) {
    throw planningContractError("INVALID_PREVIOUS_RESULT_REASON", "previous_result reason_code is not allowlisted");
  }
  return {
    task_id: parseTaskId(value.task_id, "previous_result.task_id"),
    relay_id: parseRelayId(value.relay_id, "previous_result.relay_id"),
    verdict,
    reason_code: reasonCode
  };
}

function parseCorrectionOf(value) {
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw planningContractError("INVALID_CORRECTION_OF", "correction_of must be an object");
  }
  return {
    task_id: parseTaskId(value.task_id, "correction_of.task_id"),
    relay_id: parseRelayId(value.relay_id, "correction_of.relay_id")
  };
}

export function directiveDispatchDigest(directive = {}) {
  if (directive.action !== "WORK") return null;
  return sha256(JSON.stringify({
    action: "WORK",
    task_id: String(directive.task_id || ""),
    instruction: String(directive.instruction || ""),
    correction_of: directive.correction_of || null
  }));
}

export function normalizeLastResultVerdict(value = null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const verdict = String(value.verdict || "").trim().toUpperCase();
    if (!Object.values(BRAIN_RESULT_VERDICTS).includes(verdict)) return null;
    const reasonCode = value.reason_code
      ? String(value.reason_code).trim().toUpperCase()
      : null;
    if (reasonCode && !BRAIN_RESULT_REASON_CODE_SET.has(reasonCode)) return null;
    const recordedAt = String(value.recorded_at || "").trim();
    if (!recordedAt || !Number.isFinite(Date.parse(recordedAt))) return null;
    return {
      task_id: parseTaskId(value.task_id, "last_result_verdict.task_id"),
      relay_id: parseRelayId(value.relay_id, "last_result_verdict.relay_id"),
      verdict,
      reason_code: reasonCode,
      recorded_at: recordedAt
    };
  } catch {
    return null;
  }
}

export function applyBrainResultVerdict(
  registryLane,
  previousResult,
  { at = new Date().toISOString() } = {}
) {
  if (!previousResult) return { changed: false, legacy: true, record: null };
  const existing = normalizeLastResultVerdict(registryLane?.last_result_verdict);

  if (existing && existing.relay_id === previousResult.relay_id) {
    if (
      existing.task_id === previousResult.task_id &&
      existing.verdict === previousResult.verdict &&
      existing.reason_code === previousResult.reason_code
    ) {
      return {
        changed: false,
        legacy: false,
        idempotent: true,
        record: existing
      };
    }
    throw planningContractError(
      "BRAIN_VERDICT_CONFLICT",
      "conflicting Brain verdict for the same relay_id"
    );
  }

  if (!registryLane?.last_result_relay_id) {
    throw planningContractError(
      "BRAIN_VERDICT_NO_RELAY",
      "Brain verdict has no confirmed result relay to correlate"
    );
  }
  if (
    String(registryLane.last_result_relay_id).toLowerCase() !==
    previousResult.relay_id
  ) {
    throw planningContractError(
      "BRAIN_VERDICT_RELAY_MISMATCH",
      "Brain verdict relay_id does not match durable lane truth"
    );
  }
  if (String(registryLane.task_id || "") !== previousResult.task_id) {
    throw planningContractError(
      "BRAIN_VERDICT_TASK_MISMATCH",
      "Brain verdict task_id does not match durable lane truth"
    );
  }

  const record = {
    task_id: previousResult.task_id,
    relay_id: previousResult.relay_id,
    verdict: previousResult.verdict,
    reason_code: previousResult.reason_code,
    recorded_at: new Date(at).toISOString()
  };
  registryLane.last_result_verdict = record;
  return {
    changed: true,
    legacy: false,
    idempotent: false,
    record
  };
}

export function validateRejectCorrection(directive = {}) {
  const previous = directive.previous_result || null;
  if (!previous || previous.verdict !== BRAIN_RESULT_VERDICTS.REJECT) {
    return { correction: false };
  }
  if (directive.action === "IDLE") {
    return { correction: false, owner_path: true };
  }
  const correction = directive.correction_of || null;
  if (!correction) {
    throw planningContractError(
      "BRAIN_REJECT_CORRECTION_REQUIRED",
      "REJECT + WORK requires explicit correction_of correlation"
    );
  }
  if (
    correction.task_id !== previous.task_id ||
    correction.relay_id !== previous.relay_id
  ) {
    throw planningContractError(
      "BRAIN_REJECT_CORRECTION_MISMATCH",
      "REJECT correction_of must match the rejected result"
    );
  }
  return { correction: true, owner_path: false };
}

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
  const previousResult = parsePreviousResult(payload?.previous_result);
  const correctionOf = parseCorrectionOf(payload?.correction_of);

  if (action === "IDLE") {
    if (correctionOf) {
      throw planningContractError(
        "INVALID_CORRECTION_OF",
        "IDLE cannot carry correction_of"
      );
    }
    const directive = {
      schema_version: "lane-directive.v1",
      action: "IDLE",
      digest: sha256(jsonText)
    };
    if (previousResult) directive.previous_result = previousResult;
    validateRejectCorrection(directive);
    return directive;
  }
  if (action !== "WORK") throw new Error("unsupported lane directive action");

  const taskId = parseTaskId(payload.task_id);
  const instruction = String(payload.instruction || "").trim();
  if (!instruction) throw new Error("lane WORK instruction is empty");

  const directive = {
    schema_version: "lane-directive.v1",
    action: "WORK",
    task_id: taskId,
    instruction,
    instruction_digest: sha256(instruction),
    digest: sha256(jsonText)
  };
  if (previousResult) directive.previous_result = previousResult;
  if (correctionOf) directive.correction_of = correctionOf;
  validateRejectCorrection(directive);
  return directive;
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
      last_result_verdict: null,
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
      brain_target_health: defaultTargetHealth(),
      work_target_health: defaultTargetHealth(),
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
      last_result_verdict: normalizeLastResultVerdict(lane.last_result_verdict),
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
      brain_target_health: normalizeTargetHealth(lane.brain_target_health),
      work_target_health: normalizeTargetHealth(lane.work_target_health),
      applied_work_url_revision: Number(lane.applied_work_url_revision || 0)
    };
  }
  return safe;
}

export function buildLegacyBrainStartRequestV59({ laneId, projectName }) {
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

export function buildBrainStartRequest({ laneId, projectName }) {
  return [
    `Bạn là BỘ NÃO của ${laneId} — ${projectName} trong MAGASIN Supervisor Three-Lane V1.`,
    "Robot chỉ làm việc theo lệnh trong cuộc trò chuyện Brain URL mà Owner đã chọn cho đúng luồng này.",
    "Contract vận hành: PLAN → DISPATCH → VERIFY → ACCEPT/REJECT → NEXT PLAN.",
    "Trước WORK: chọn đúng một primary outcome; dependency phải đã thỏa hoặc nêu rõ; scope bounded; instruction phải có Definition of Done, evidence cần trả và stop boundary.",
    "Mục tiêu planning: khoảng <=20 phút active implementation khi task có thể chia. Nếu dự kiến >30 phút và có thể chia an toàn, hãy chia nhỏ trước dispatch. Đây không phải runtime timeout; operation inherently long-running vẫn được phép.",
    "Không lộ chain-of-thought/private reasoning; chỉ phát contract/output máy đọc được cần thiết.",
    "Work không tự quyết định roadmap và không tự bắt đầu task tiếp theo.",
    "Hãy đọc ngữ cảnh cuộc trò chuyện hiện tại và giao đúng một việc tiếp theo cho Work chat bằng block máy đọc được:",
    LANE_DIRECTIVE_START,
    '{"action":"WORK","task_id":"TASK-ID","instruction":"Một task tự đủ ngữ cảnh; nêu dependency, DoD, evidence và điểm DỪNG."}',
    LANE_DIRECTIVE_END,
    "Nếu chưa có việc dependency-correct/an toàn để làm, trả:",
    LANE_DIRECTIVE_START,
    '{"action":"IDLE"}',
    LANE_DIRECTIVE_END,
    "Khi Robot relay kết quả, VERIFY trước; nếu hỗ trợ metadata optional thì phát previous_result ACCEPT/REJECT đúng task_id + relay_id. REJECT + WORK phải là correction bounded và có correction_of cùng task_id + relay_id; không nhảy sang task roadmap khác.",
    "Không yêu cầu Robot tự tìm Brain khác. Không yêu cầu Robot tự tạo Brain mới."
  ].join("\n");
}

export function knownBrainStartRequestDigests({ laneId, projectName }) {
  return new Set([
    sha256(buildBrainStartRequest({ laneId, projectName })),
    sha256(buildLegacyBrainStartRequestV59({ laneId, projectName }))
  ]);
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

export function buildLegacyWorkDispatchInstructionV59({
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

export function buildWorkDispatchInstruction({
  taskId,
  dispatchId,
  instruction
}) {
  const legacy = buildLegacyWorkDispatchInstructionV59({
    taskId,
    dispatchId,
    instruction
  });
  return [
    legacy,
    "",
    "RUNTIME GUARD — chỉ thực hiện đúng task_id được giao ở trên.",
    "Không tự bắt đầu task tiếp theo. Không tự quyết định roadmap hoặc mở rộng sang task khác.",
    "Trả evidence/result cho đúng task này rồi DỪNG để Brain VERIFY và ACCEPT/REJECT."
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
      "VERIFY kết quả này theo DoD/evidence trước khi lập task tiếp theo.",
      `Nếu ACCEPT và có next task, trả một MAGASIN_LANE_DIRECTIVE_V1 có previous_result={\"task_id\":\"${taskId}\",\"relay_id\":\"${relayId}\",\"verdict\":\"ACCEPT\",\"reason_code\":\"DOD_MET\"} cùng đúng một WORK dependency-correct; hoặc IDLE nếu chưa có việc.`,
      `Nếu REJECT và có correction tự động, trả previous_result REJECT + đúng một WORK bounded với correction_of={\"task_id\":\"${taskId}\",\"relay_id\":\"${relayId}\"}. Không được nhảy sang task roadmap khác.`,
      "Nếu REJECT cần Owner intervention, trả IDLE với previous_result REJECT (reason_code OWNER_INTERVENTION_REQUIRED).",
      "Không gửi prose ngoài MAGASIN_LANE_DIRECTIVE_V1 khi Robot đang polling."
    ].join("\n")
  };
}
