export const RELAY_SEND_MAX_ATTEMPTS = 3;

const RETRY_DELAYS_MS = Object.freeze([
  15_000,
  30_000,
  60_000
]);

export const RELAY_RETRY_STATES = Object.freeze({
  READY: "READY",
  WAIT: "WAIT",
  EXHAUSTED: "EXHAUSTED"
});

export function relayRetryState(latch, now = Date.now()) {
  if (latch?.retry_exhausted) return RELAY_RETRY_STATES.EXHAUSTED;
  const retryAt = Date.parse(String(latch?.retry_not_before || ""));
  if (Number.isFinite(retryAt) && retryAt > now) {
    return RELAY_RETRY_STATES.WAIT;
  }
  return RELAY_RETRY_STATES.READY;
}

export function beginRelaySendAttempt(latch) {
  if (!latch || typeof latch !== "object") {
    throw new TypeError("relay latch is required");
  }
  latch.attempt_count = Math.max(0, Number(latch.attempt_count || 0)) + 1;
  latch.retry_not_before = null;
  latch.retry_exhausted = false;
  latch.last_attempt_state = "SENDING";
  return latch.attempt_count;
}

export function scheduleRelayRetry(
  latch,
  { now = Date.now(), maxAttempts = RELAY_SEND_MAX_ATTEMPTS } = {}
) {
  if (!latch || typeof latch !== "object") {
    throw new TypeError("relay latch is required");
  }

  const attempts = Math.max(0, Number(latch.attempt_count || 0));
  if (attempts >= maxAttempts) {
    latch.retry_not_before = null;
    latch.retry_exhausted = true;
    latch.last_attempt_state = "EXHAUSTED";
    return RELAY_RETRY_STATES.EXHAUSTED;
  }

  const delayIndex = Math.min(
    Math.max(0, attempts - 1),
    RETRY_DELAYS_MS.length - 1
  );
  latch.retry_not_before = new Date(now + RETRY_DELAYS_MS[delayIndex]).toISOString();
  latch.retry_exhausted = false;
  latch.last_attempt_state = "RETRY_SCHEDULED";
  return RELAY_RETRY_STATES.WAIT;
}
