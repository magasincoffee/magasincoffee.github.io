import { ACTIONS, OBSERVATIONS, decideContinuation } from "../decision.mjs";
import { validateProjectState } from "../state.mjs";
import { executeDecision } from "../ui/actions.mjs";

export class SupervisorLoopController {
  constructor({
    execute = false,
    minActionIntervalMs = 15_000,
    handoffIdleConfirmMs = 20_000,
    now = () => Date.now(),
    onEvent = () => {}
  } = {}) {
    this.execute = execute;
    this.minActionIntervalMs = minActionIntervalMs;
    this.handoffIdleConfirmMs = handoffIdleConfirmMs;
    this.now = now;
    this.onEvent = onEvent;
    this.armed = true;
    this.lastActionAt = 0;
    this.assistantCountAtAction = null;
    this.sawRunningAfterAction = false;
    this.handoffPendingSignature = null;
    this.handoffPendingSince = 0;
  }

  markExternalContinuation(assistantMessageCount = 0, target = "EXTERNAL_CONTINUE") {
    this.armed = false;
    this.lastActionAt = this.now();
    this.assistantCountAtAction = Number(assistantMessageCount || 0);
    this.sawRunningAfterAction = false;
    this.onEvent({
      type: "ACTION_EXECUTED",
      action: ACTIONS.CONTINUE,
      target
    });
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
      (progressed || this.sawRunningAfterAction)
    ) {
      this.armed = true;
      this.sawRunningAfterAction = false;
      this.assistantCountAtAction = null;
      this.onEvent({ type: "REARMED_AFTER_RESPONSE" });
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
    this.observeProgress(probe);

    let observation = probe.classification.observation;
    const snapshot = probe?.snapshot || {};

    // ChatGPT Work can render tool/activity traces outside the standard
    // assistant message container. The last standard role can therefore stay
    // "user" even after Work has visibly finished. To avoid a permanent
    // USER_PENDING deadlock, confirm that privacy-safe UI structure is stable
    // for a bounded idle window before the one-time handoff reconciliation.
    if (handoff && observation === OBSERVATIONS.USER_PENDING) {
      const signature = [
        Number(snapshot.userMessageCount || 0),
        Number(snapshot.assistantMessageCount || 0),
        String(snapshot.lastMessageRole || ""),
        Number(snapshot.lastMessageCharCount || 0),
        Number(snapshot.lastAssistantCharCount || 0),
        Number(snapshot.mainTextCharCount || 0),
        Number(snapshot.mainElementCount || 0)
      ].join("|");

      if (snapshot.responseRunning || snapshot.mainBusy) {
        this.handoffPendingSignature = signature;
        this.handoffPendingSince = this.now();
      } else if (signature !== this.handoffPendingSignature) {
        this.handoffPendingSignature = signature;
        this.handoffPendingSince = this.now();
      } else if (
        this.handoffPendingSince > 0 &&
        this.now() - this.handoffPendingSince >= this.handoffIdleConfirmMs
      ) {
        observation = OBSERVATIONS.RESPONSE_COMPLETE;
        this.onEvent({
          type: "HANDOFF_IDLE_CONFIRMED",
          reason: "Owner-pending role stayed structurally idle; reconcile the visible conversation instead of waiting forever."
        });
      }
    } else {
      this.handoffPendingSignature = null;
      this.handoffPendingSince = 0;
    }

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
      this.onEvent({
        type: "ACTION_EXECUTED",
        action: decision.action,
        target: execution.target || null
      });
    }

    return { decision, execution };
  }
}
