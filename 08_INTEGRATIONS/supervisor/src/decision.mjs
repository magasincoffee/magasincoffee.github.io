import { validateProjectState } from "./state.mjs";

export const OBSERVATIONS = Object.freeze({
  RESPONSE_COMPLETE: "RESPONSE_COMPLETE",
  ASSISTANT_RUNNING: "ASSISTANT_RUNNING",
  NETWORK_ERROR: "NETWORK_ERROR",
  TRANSIENT_ERROR: "TRANSIENT_ERROR",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  MFA_REQUIRED: "MFA_REQUIRED",
  CAPTCHA: "CAPTCHA",
  DESTRUCTIVE_ACTION: "DESTRUCTIVE_ACTION",
  ADMIN_ESCALATION: "ADMIN_ESCALATION",
  AMBIGUOUS_DECISION: "AMBIGUOUS_DECISION",
  UNKNOWN: "UNKNOWN"
});

export const ACTIONS = Object.freeze({
  CONTINUE: "CONTINUE",
  WAIT: "WAIT",
  RETRY: "RETRY",
  STOP_WAIT_USER: "STOP_WAIT_USER",
  STOP_DONE: "STOP_DONE"
});

export const CANONICAL_CONTINUE_INSTRUCTION =
  "Tiếp tục dự án MAGASIN theo repository source of truth. Đọc CURRENT_STATE, PROJECT_STATE, TASK_QUEUE và tiếp tục đúng micro-task hiện tại; test, sửa lỗi, regression/E2E, cập nhật state rồi sang task kế tiếp nếu không cần Owner.";

const HARD_STOPS = new Set([
  OBSERVATIONS.AUTH_REQUIRED,
  OBSERVATIONS.MFA_REQUIRED,
  OBSERVATIONS.CAPTCHA,
  OBSERVATIONS.DESTRUCTIVE_ACTION,
  OBSERVATIONS.ADMIN_ESCALATION,
  OBSERVATIONS.AMBIGUOUS_DECISION
]);

const TRANSIENT = new Set([
  OBSERVATIONS.NETWORK_ERROR,
  OBSERVATIONS.TRANSIENT_ERROR
]);

export function decideContinuation({
  projectState,
  observation,
  retryCount = 0,
  maxRetries = 2
}) {
  const state = validateProjectState(projectState);

  if (!Number.isInteger(retryCount) || retryCount < 0) {
    throw new TypeError("retryCount must be a non-negative integer");
  }
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new TypeError("maxRetries must be a non-negative integer");
  }

  if (state.status === "DONE") {
    return { action: ACTIONS.STOP_DONE, reason: "project state is DONE" };
  }

  if (
    state.requires_user ||
    state.blocked ||
    state.status === "WAIT_USER" ||
    state.status === "BLOCKED"
  ) {
    return {
      action: ACTIONS.STOP_WAIT_USER,
      reason: "project state requires owner intervention"
    };
  }

  if (HARD_STOPS.has(observation)) {
    return {
      action: ACTIONS.STOP_WAIT_USER,
      reason: `unsafe or owner-required observation: ${observation}`
    };
  }

  if (state.autonomy !== "AUTO_CONTINUE") {
    return {
      action: ACTIONS.WAIT,
      reason: `autonomy mode is ${state.autonomy}`
    };
  }

  if (TRANSIENT.has(observation)) {
    if (retryCount < maxRetries) {
      return {
        action: ACTIONS.RETRY,
        reason: `transient observation: ${observation}`,
        nextRetryCount: retryCount + 1
      };
    }
    return {
      action: ACTIONS.STOP_WAIT_USER,
      reason: "transient retry budget exhausted"
    };
  }

  if (observation === OBSERVATIONS.RESPONSE_COMPLETE) {
    return {
      action: ACTIONS.CONTINUE,
      reason: "assistant response completed and autonomous continuation is allowed",
      instruction: CANONICAL_CONTINUE_INSTRUCTION
    };
  }

  if (observation === OBSERVATIONS.ASSISTANT_RUNNING) {
    return { action: ACTIONS.WAIT, reason: "assistant is still running" };
  }

  return {
    action: ACTIONS.WAIT,
    reason: "unknown UI state; fail closed"
  };
}
