import { ACTIONS, decideContinuation } from "../decision.mjs";
import { validateProjectState } from "../state.mjs";
import { executeDecision } from "../ui/actions.mjs";

export class SupervisorLoopController {
  constructor({
    execute = false,
    minActionIntervalMs = 15_000,
    now = () => Date.now(),
    onEvent = () => {}
  } = {}) {
    this.execute = execute;
    this.minActionIntervalMs = minActionIntervalMs;
    this.now = now;
    this.onEvent = onEvent;
    this.armed = true;
    this.lastActionAt = 0;
    this.assistantCountAtAction = null;
    this.sawRunningAfterAction = false;
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

  async step({ page, projectState, probe, retryCount = 0, maxRetries = 2 }) {
    const state = validateProjectState(projectState);
    this.observeProgress(probe);

    const decision = decideContinuation({
      projectState: state,
      observation: probe.classification.observation,
      retryCount,
      maxRetries
    });

    if (
      decision.action === ACTIONS.CONTINUE ||
      decision.action === ACTIONS.RETRY
    ) {
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
