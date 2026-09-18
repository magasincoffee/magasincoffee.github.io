export const RECOVERY_ACTIONS = Object.freeze({
  NONE: "NONE",
  WAIT_TARGET: "WAIT_TARGET",
  RELOAD_STALLED: "RELOAD_STALLED",
  RELOAD_UNAVAILABLE: "RELOAD_UNAVAILABLE",
  ROLLOVER_CONVERSATION_FULL: "ROLLOVER_CONVERSATION_FULL",
  ROLLOVER_CONVERSATION_MISSING: "ROLLOVER_CONVERSATION_MISSING",
  ROLLOVER_TARGET_MISSING: "ROLLOVER_TARGET_MISSING",
  ROLLOVER_STALLED: "ROLLOVER_STALLED",
  ROLLOVER_UNAVAILABLE: "ROLLOVER_UNAVAILABLE",
  WAIT_USER_RECOVERY_EXHAUSTED: "WAIT_USER_RECOVERY_EXHAUSTED"
});

export function isConversationPathname(pathname) {
  return typeof pathname === "string" &&
    /^\/(c|g|project)\//.test(pathname);
}

export function targetFromUrl(value) {
  const url = value instanceof URL ? value : new URL(value);
  if (url.protocol !== "https:" ||
      (url.hostname !== "chatgpt.com" && !url.hostname.endsWith(".chatgpt.com")) ||
      !isConversationPathname(url.pathname)) {
    throw new Error("invalid ChatGPT conversation URL");
  }
  return {
    origin: "https://chatgpt.com",
    pathname: url.pathname
  };
}

export function pageMatchesTarget(value, target) {
  try {
    const url = value instanceof URL ? value : new URL(value);
    return url.origin === target?.origin && url.pathname === target?.pathname;
  } catch {
    return false;
  }
}

function isUnavailableSnapshot(snapshot = {}) {
  return Boolean(snapshot.conversationPath) &&
    !snapshot.composerReady &&
    !snapshot.responseRunning &&
    !snapshot.loginRequired &&
    !snapshot.hasCaptcha &&
    !snapshot.hasNetworkError &&
    !snapshot.hasTransientError;
}

export class SupervisorRecoveryController {
  constructor({
    stallMs = 6 * 60_000,
    unavailableGraceMs = 90_000,
    reloadCooldownMs = 45_000,
    targetMissThreshold = 2,
    maxStallReloads = 2,
    maxUnavailableReloads = 1,
    maxRolloverFailures = 3,
    now = () => Date.now()
  } = {}) {
    this.stallMs = stallMs;
    this.unavailableGraceMs = unavailableGraceMs;
    this.reloadCooldownMs = reloadCooldownMs;
    this.targetMissThreshold = targetMissThreshold;
    this.maxStallReloads = maxStallReloads;
    this.maxUnavailableReloads = maxUnavailableReloads;
    this.maxRolloverFailures = maxRolloverFailures;
    this.now = now;

    this.runningSince = null;
    this.lastProgressMarker = null;
    this.unavailableSince = null;
    this.lastReloadAt = 0;
    this.stallReloads = 0;
    this.unavailableReloads = 0;
    this.targetMisses = 0;
    this.rolloverFailures = 0;
    this.conversationGeneration = 0;
    this.blocked = false;
  }

  observeTarget({ matched }) {
    if (this.blocked) {
      return RECOVERY_ACTIONS.WAIT_USER_RECOVERY_EXHAUSTED;
    }

    if (matched) {
      this.targetMisses = 0;
      return RECOVERY_ACTIONS.NONE;
    }

    this.targetMisses += 1;
    if (this.targetMisses >= this.targetMissThreshold) {
      return RECOVERY_ACTIONS.ROLLOVER_TARGET_MISSING;
    }
    return RECOVERY_ACTIONS.WAIT_TARGET;
  }

  observeProbe({ snapshot = {}, classification = {} }) {
    if (this.blocked) {
      return RECOVERY_ACTIONS.WAIT_USER_RECOVERY_EXHAUSTED;
    }

    if (snapshot.conversationFull) {
      return RECOVERY_ACTIONS.ROLLOVER_CONVERSATION_FULL;
    }

    if (snapshot.conversationMissing) {
      return RECOVERY_ACTIONS.ROLLOVER_CONVERSATION_MISSING;
    }

    const now = this.now();
    const observation = classification.observation;

    if (observation === "ASSISTANT_RUNNING") {
      const progressMarker = `${Number(snapshot.assistantMessageCount || 0)}:${Number(snapshot.lastAssistantCharCount || 0)}`;
      if (this.runningSince == null || progressMarker !== this.lastProgressMarker) {
        this.runningSince = now;
        this.lastProgressMarker = progressMarker;
        this.stallReloads = 0;
      }
      this.unavailableSince = null;
      this.unavailableReloads = 0;

      const elapsed = now - this.runningSince;
      const cooldownElapsed =
        this.lastReloadAt === 0 ||
        now - this.lastReloadAt >= this.reloadCooldownMs;

      if (elapsed >= this.stallMs && cooldownElapsed) {
        if (this.stallReloads < this.maxStallReloads) {
          return RECOVERY_ACTIONS.RELOAD_STALLED;
        }
        return RECOVERY_ACTIONS.ROLLOVER_STALLED;
      }

      return RECOVERY_ACTIONS.NONE;
    }

    this.runningSince = null;
    this.lastProgressMarker = null;
    this.stallReloads = 0;

    if (isUnavailableSnapshot(snapshot)) {
      if (this.unavailableSince == null) this.unavailableSince = now;
      const elapsed = now - this.unavailableSince;
      const cooldownElapsed =
        this.lastReloadAt === 0 ||
        now - this.lastReloadAt >= this.reloadCooldownMs;

      if (elapsed >= this.unavailableGraceMs && cooldownElapsed) {
        if (this.unavailableReloads < this.maxUnavailableReloads) {
          return RECOVERY_ACTIONS.RELOAD_UNAVAILABLE;
        }
        return RECOVERY_ACTIONS.ROLLOVER_UNAVAILABLE;
      }

      return RECOVERY_ACTIONS.NONE;
    }

    this.unavailableSince = null;
    this.unavailableReloads = 0;
    return RECOVERY_ACTIONS.NONE;
  }

  record(action, { success = true } = {}) {
    const now = this.now();

    if (action === RECOVERY_ACTIONS.RELOAD_STALLED) {
      this.stallReloads += 1;
      this.lastReloadAt = now;
      return;
    }

    if (action === RECOVERY_ACTIONS.RELOAD_UNAVAILABLE) {
      this.unavailableReloads += 1;
      this.lastReloadAt = now;
      return;
    }

    if (String(action).startsWith("ROLLOVER_")) {
      if (success) {
        this.conversationGeneration += 1;
        this.rolloverFailures = 0;
        this.targetMisses = 0;
        this.runningSince = null;
        this.lastProgressMarker = null;
        this.unavailableSince = null;
        this.lastReloadAt = 0;
        this.stallReloads = 0;
        this.unavailableReloads = 0;
        this.blocked = false;
      } else {
        this.rolloverFailures += 1;
        if (this.rolloverFailures >= this.maxRolloverFailures) {
          this.blocked = true;
        }
      }
    }
  }

  block() {
    this.blocked = true;
  }

  noteConversationAdopted() {
    this.conversationGeneration += 1;
    this.targetMisses = 0;
    this.runningSince = null;
    this.lastProgressMarker = null;
    this.unavailableSince = null;
    this.lastReloadAt = 0;
    this.stallReloads = 0;
    this.unavailableReloads = 0;
    this.rolloverFailures = 0;
    this.blocked = false;
  }

  status(action = RECOVERY_ACTIONS.NONE) {
    return {
      action,
      stall_reloads: this.stallReloads,
      unavailable_reloads: this.unavailableReloads,
      target_misses: this.targetMisses,
      rollover_failures: this.rolloverFailures,
      conversation_generation: this.conversationGeneration,
      blocked: this.blocked
    };
  }
}
