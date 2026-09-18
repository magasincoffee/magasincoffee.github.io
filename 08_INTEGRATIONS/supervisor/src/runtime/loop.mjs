import { ACTIONS, OBSERVATIONS, decideContinuation } from "../decision.mjs";
import { validateProjectState } from "../state.mjs";
import { executeDecision } from "../ui/actions.mjs";

export class SupervisorLoopController {
  constructor({
    execute = false,
    minActionIntervalMs = 15_000,
    handoffIdleConfirmMs = 20_000,
    workIdleConfirmMs = 20_000,
    now = () => Date.now(),
    onEvent = () => {}
  } = {}) {
    this.execute = execute;
    this.minActionIntervalMs = minActionIntervalMs;
    this.handoffIdleConfirmMs = handoffIdleConfirmMs;
    this.workIdleConfirmMs = workIdleConfirmMs;
    this.now = now;
    this.onEvent = onEvent;
    this.armed = true;
    this.lastActionAt = 0;
    this.assistantCountAtAction = null;
    this.sawRunningAfterAction = false;
    this.userPendingSignature = null;
    this.userPendingSince = 0;
    this.userPendingSawProgress = false;
  }

  markExternalContinuation(assistantMessageCount = 0, target = "EXTERNAL_CONTINUE") {
    this.armed = false;
    this.lastActionAt = this.now();
    this.assistantCountAtAction = Number(assistantMessageCount || 0);
    this.sawRunningAfterAction = false;
    this.resetUserPendingTracker();
    this.onEvent({
      type: "ACTION_EXECUTED",
      action: ACTIONS.CONTINUE,
      target
    });
  }

  resetUserPendingTracker() {
    this.userPendingSignature = null;
    this.userPendingSince = 0;
    this.userPendingSawProgress = false;
  }

  safeActivitySignature(snapshot = {}) {
    return [
      Number(snapshot.userMessageCount || 0),
      Number(snapshot.assistantMessageCount || 0),
      String(snapshot.lastMessageRole || ""),
      Number(snapshot.lastMessageCharCount || 0),
      Number(snapshot.lastAssistantCharCount || 0),
      Number(snapshot.mainTextCharCount || 0),
      Number(snapshot.mainElementCount || 0)
    ].join("|");
  }

  resolveWorkUiObservation(probe, { handoff = false } = {}) {
    const snapshot = probe?.snapshot || {};
    const original = probe?.classification?.observation;
    const signature = this.safeActivitySignature(snapshot);

    if (
      original === OBSERVATIONS.ASSISTANT_RUNNING &&
      snapshot.lastMessageRole === "user"
    ) {
      this.userPendingSignature = signature;
      this.userPendingSince = this.now();
      this.userPendingSawProgress = true;
      return {
        observation: original,
        workUiSettled: false
      };
    }

    if (original !== OBSERVATIONS.USER_PENDING) {
      this.resetUserPendingTracker();
      return {
        observation: original,
        workUiSettled: false
      };
    }

    if (snapshot.responseRunning || snapshot.mainBusy) {
      this.userPendingSignature = signature;
      this.userPendingSince = this.now();
      this.userPendingSawProgress = true;
      return {
        observation: original,
        workUiSettled: false
      };
    }

    if (this.userPendingSignature == null) {
      this.userPendingSignature = signature;
      this.userPendingSince = this.now();
      return {
        observation: original,
        workUiSettled: false
      };
    }

    if (signature !== this.userPendingSignature) {
      this.userPendingSignature = signature;
      this.userPendingSince = this.now();
      this.userPendingSawProgress = true;
      return {
        observation: original,
        workUiSettled: false
      };
    }

    const confirmMs = handoff
      ? this.handoffIdleConfirmMs
      : this.workIdleConfirmMs;
    const stableLongEnough =
      this.userPendingSince > 0 &&
      this.now() - this.userPendingSince >= confirmMs;
    const maySettle = handoff || this.userPendingSawProgress;

    if (stableLongEnough && maySettle) {
      this.onEvent({
        type: handoff ? "HANDOFF_IDLE_CONFIRMED" : "WORK_UI_IDLE_CONFIRMED",
        reason: handoff
          ? "Owner-pending role stayed structurally idle; reconcile the visible conversation instead of waiting forever."
          : "Observed Work UI progress followed by a stable idle window; treat the response as complete."
      });
      return {
        observation: OBSERVATIONS.RESPONSE_COMPLETE,
        workUiSettled: true
      };
    }

    return {
      observation: original,
      workUiSettled: false
    };
  }

  observeProgress(probe) {
    const snapshot = probe?.snapshot || {};
    const classification = probe?.classification || {};

    if (this.armed) return;

    if (classification.observation === "ASSISTANT_RUNNING") {
      this.sawRunningAfterAction = true;
      return;
    }

    const count = Number(snapshot.assistantMessageCount || 0);
    const progressed =
      this.assistantCountAtAction != null &&
      count > this.assistantCountAtAction;

    if (
      classification.observation === "RESPONSE_COMPLETE" &&
      (progressed || this.sawRunningAfterAction || snapshot.workUiSettled)
    ) {
      this.armed = true;
      this.sawRunningAfterAction = false;
      this.assistantCountAtAction = null;
      this.resetUserPendingTracker();
      this.onEvent({
        type: snapshot.workUiSettled
          ? "REARMED_AFTER_WORK_UI"
          : "REARMED_AFTER_RESPONSE"
      });
    }
  }

  async step({
    page,
    projectState,
    probe,
    retryCount = 0,
    maxRetries = 2,
    handoff = false
  }) {
    const state = validateProjectState(projectState);
    const resolved = this.resolveWorkUiObservation(probe, { handoff });
    const observation = resolved.observation;
    const effectiveProbe = {
      ...probe,
      classification: {
        ...probe.classification,
        observation
      },
      snapshot: {
        ...(probe?.snapshot || {}),
        workUiSettled: resolved.workUiSettled
      }
    };

    this.observeProgress(effectiveProbe);

    const decision = decideContinuation({
      projectState: state,
      observation,
      retryCount,
      maxRetries,
      handoff
    });

    if (decision.action === ACTIONS.CONTINUE) {
      if (!this.armed) {
        return {
          decision,
          execution: {
            executed: false,
            dryRun: !this.execute,
            action: decision.action,
            reason: "awaiting observable assistant progress"
          }
        };
      }

      const elapsed = this.now() - this.lastActionAt;
      if (this.lastActionAt > 0 && elapsed < this.minActionIntervalMs) {
        return {
          decision,
          execution: {
            executed: false,
            dryRun: !this.execute,
            action: decision.action,
            reason: "action cooldown active"
          }
        };
      }
    }

    if (decision.action === ACTIONS.RETRY) {
      const elapsed = this.now() - this.lastActionAt;
      if (this.lastActionAt > 0 && elapsed < this.minActionIntervalMs) {
        return {
          decision,
          execution: {
            executed: false,
            dryRun: !this.execute,
            action: decision.action,
            reason: "action cooldown active"
          }
        };
      }
    }

    const execution = await executeDecision({
      page,
      decision,
      dryRun: !this.execute
    });

    if (
      this.execute &&
      execution.executed &&
      (decision.action === ACTIONS.CONTINUE || decision.action === ACTIONS.RETRY)
    ) {
      this.armed = false;
      this.lastActionAt = this.now();
      this.assistantCountAtAction = Number(
        probe?.snapshot?.assistantMessageCount || 0
      );
      this.sawRunningAfterAction = false;
      this.resetUserPendingTracker();
      this.onEvent({
        type: "ACTION_EXECUTED",
        action: decision.action,
        target: execution.target || null
      });
    }

    return {
      decision,
      execution,
      effectiveObservation: observation,
      workUiSettled: resolved.workUiSettled
    };
  }
}
