import test from "node:test";
import assert from "node:assert/strict";

import {
  RECOVERY_ACTIONS,
  SupervisorRecoveryController,
  isConversationPathname,
  pageMatchesTarget,
  targetFromUrl
} from "../src/runtime/recovery.mjs";

test("recognizes supported ChatGPT conversation paths", () => {
  assert.equal(isConversationPathname("/c/abc"), true);
  assert.equal(isConversationPathname("/g/example/abc"), true);
  assert.equal(isConversationPathname("/project/example"), true);
  assert.equal(isConversationPathname("/"), false);
});

test("normalizes a ChatGPT conversation URL into a local target", () => {
  assert.deepEqual(
    targetFromUrl("https://chatgpt.com/c/abc?model=auto#x"),
    { origin: "https://chatgpt.com", pathname: "/c/abc" }
  );
  assert.equal(
    pageMatchesTarget("https://chatgpt.com/c/abc?model=auto", {
      origin: "https://chatgpt.com",
      pathname: "/c/abc"
    }),
    true
  );
});

test("full conversation immediately requests a fresh chat rollover", () => {
  const recovery = new SupervisorRecoveryController();
  const action = recovery.observeProbe({
    snapshot: { conversationFull: true },
    classification: { observation: "RESPONSE_COMPLETE" }
  });
  assert.equal(action, RECOVERY_ACTIONS.ROLLOVER_CONVERSATION_FULL);
});

test("missing target uses a bounded navigation budget before rollover", () => {
  const recovery = new SupervisorRecoveryController({ targetMissThreshold: 2 });
  assert.equal(
    recovery.observeTarget({ matched: false }),
    RECOVERY_ACTIONS.WAIT_TARGET
  );
  assert.equal(
    recovery.observeTarget({ matched: false }),
    RECOVERY_ACTIONS.ROLLOVER_TARGET_MISSING
  );
  assert.equal(
    recovery.observeTarget({ matched: true }),
    RECOVERY_ACTIONS.NONE
  );
});

test("stalled response reloads twice then rolls over instead of reload-looping forever", () => {
  let now = 0;
  const recovery = new SupervisorRecoveryController({
    stallMs: 1000,
    reloadCooldownMs: 100,
    maxStallReloads: 2,
    now: () => now
  });

  const running = {
    snapshot: {
      conversationPath: true,
      composerReady: false,
      responseRunning: true
    },
    classification: { observation: "ASSISTANT_RUNNING" }
  };

  assert.equal(recovery.observeProbe(running), RECOVERY_ACTIONS.NONE);

  now = 1000;
  assert.equal(recovery.observeProbe(running), RECOVERY_ACTIONS.RELOAD_STALLED);
  recovery.record(RECOVERY_ACTIONS.RELOAD_STALLED);

  now = 1101;
  assert.equal(recovery.observeProbe(running), RECOVERY_ACTIONS.RELOAD_STALLED);
  recovery.record(RECOVERY_ACTIONS.RELOAD_STALLED);

  now = 1202;
  assert.equal(recovery.observeProbe(running), RECOVERY_ACTIONS.ROLLOVER_STALLED);
});

test("conversation UI unavailable gets one reload then a fresh chat", () => {
  let now = 0;
  const recovery = new SupervisorRecoveryController({
    unavailableGraceMs: 500,
    reloadCooldownMs: 100,
    maxUnavailableReloads: 1,
    now: () => now
  });

  const unavailable = {
    snapshot: {
      conversationPath: true,
      composerReady: false,
      responseRunning: false,
      loginRequired: false,
      hasCaptcha: false,
      hasNetworkError: false,
      hasTransientError: false
    },
    classification: { observation: "UNKNOWN" }
  };

  assert.equal(recovery.observeProbe(unavailable), RECOVERY_ACTIONS.NONE);
  now = 500;
  assert.equal(recovery.observeProbe(unavailable), RECOVERY_ACTIONS.RELOAD_UNAVAILABLE);
  recovery.record(RECOVERY_ACTIONS.RELOAD_UNAVAILABLE);

  now = 601;
  assert.equal(recovery.observeProbe(unavailable), RECOVERY_ACTIONS.ROLLOVER_UNAVAILABLE);
});

test("recovery blocks only after bounded rollover failures", () => {
  const recovery = new SupervisorRecoveryController({ maxRolloverFailures: 3 });
  const action = RECOVERY_ACTIONS.ROLLOVER_TARGET_MISSING;

  recovery.record(action, { success: false });
  recovery.record(action, { success: false });
  assert.equal(recovery.blocked, false);

  recovery.record(action, { success: false });
  assert.equal(recovery.blocked, true);
  assert.equal(
    recovery.observeTarget({ matched: false }),
    RECOVERY_ACTIONS.WAIT_USER_RECOVERY_EXHAUSTED
  );
});

test("successful rollover advances conversation generation and clears recovery counters", () => {
  const recovery = new SupervisorRecoveryController({ targetMissThreshold: 1 });
  assert.equal(
    recovery.observeTarget({ matched: false }),
    RECOVERY_ACTIONS.ROLLOVER_TARGET_MISSING
  );
  recovery.record(RECOVERY_ACTIONS.ROLLOVER_TARGET_MISSING, { success: true });
  const status = recovery.status();
  assert.equal(status.conversation_generation, 1);
  assert.equal(status.target_misses, 0);
  assert.equal(status.rollover_failures, 0);
});


test("assistant text progress resets the stall clock instead of reloading active work", () => {
  let now = 0;
  const recovery = new SupervisorRecoveryController({
    stallMs: 1000,
    reloadCooldownMs: 100,
    now: () => now
  });

  const running = (chars) => ({
    snapshot: {
      conversationPath: true,
      composerReady: false,
      responseRunning: true,
      assistantMessageCount: 4,
      lastAssistantCharCount: chars
    },
    classification: { observation: "ASSISTANT_RUNNING" }
  });

  assert.equal(recovery.observeProbe(running(100)), RECOVERY_ACTIONS.NONE);

  now = 900;
  assert.equal(recovery.observeProbe(running(180)), RECOVERY_ACTIONS.NONE);

  now = 1700;
  assert.equal(recovery.observeProbe(running(260)), RECOVERY_ACTIONS.NONE);

  now = 2701;
  assert.equal(recovery.observeProbe(running(260)), RECOVERY_ACTIONS.RELOAD_STALLED);
});

test("adopting a ChatGPT-created conversation resets stale target recovery state", () => {
  const recovery = new SupervisorRecoveryController({ targetMissThreshold: 1 });
  assert.equal(
    recovery.observeTarget({ matched: false }),
    RECOVERY_ACTIONS.ROLLOVER_TARGET_MISSING
  );

  recovery.noteConversationAdopted();
  const status = recovery.status();
  assert.equal(status.conversation_generation, 1);
  assert.equal(status.target_misses, 0);
  assert.equal(status.rollover_failures, 0);
  assert.equal(status.blocked, false);
});


test("stalled reload budget survives hydration/progress-marker changes after reload", () => {
  let now = 0;
  const recovery = new SupervisorRecoveryController({
    stallMs: 1000,
    reloadCooldownMs: 100,
    maxStallReloads: 2,
    now: () => now
  });

  const running = (count, chars) => ({
    snapshot: {
      conversationPath: true,
      composerReady: false,
      responseRunning: true,
      assistantMessageCount: count,
      lastAssistantCharCount: chars
    },
    classification: { observation: "ASSISTANT_RUNNING" }
  });

  assert.equal(recovery.observeProbe(running(4, 100)), RECOVERY_ACTIONS.NONE);

  now = 1000;
  assert.equal(recovery.observeProbe(running(4, 100)), RECOVERY_ACTIONS.RELOAD_STALLED);
  recovery.record(RECOVERY_ACTIONS.RELOAD_STALLED);

  // Reload hydration changes the marker. This must reset the stall clock but
  // must not erase the already-consumed reload budget.
  now = 1100;
  assert.equal(recovery.observeProbe(running(3, 20)), RECOVERY_ACTIONS.NONE);
  assert.equal(recovery.status().stall_reloads, 1);

  now = 2100;
  assert.equal(recovery.observeProbe(running(3, 20)), RECOVERY_ACTIONS.RELOAD_STALLED);
  recovery.record(RECOVERY_ACTIONS.RELOAD_STALLED);

  now = 2200;
  assert.equal(recovery.observeProbe(running(4, 100)), RECOVERY_ACTIONS.NONE);
  assert.equal(recovery.status().stall_reloads, 2);

  now = 3200;
  assert.equal(recovery.observeProbe(running(4, 100)), RECOVERY_ACTIONS.ROLLOVER_STALLED);
});


test("successful rollover suppresses an immediate duplicate full-chat rollover", () => {
  let now = 10_000;
  const recovery = new SupervisorRecoveryController({
    rolloverCooldownMs: 120_000,
    now: () => now
  });

  recovery.record(RECOVERY_ACTIONS.ROLLOVER_CONVERSATION_FULL, { success: true });

  const action = recovery.observeProbe({
    snapshot: { conversationFull: true },
    classification: { observation: "RESPONSE_COMPLETE" }
  });

  assert.equal(action, RECOVERY_ACTIONS.NONE);
  assert.equal(recovery.status().rollover_cooldown_active, true);

  now += 120_001;
  assert.equal(
    recovery.observeProbe({
      snapshot: { conversationFull: true },
      classification: { observation: "RESPONSE_COMPLETE" }
    }),
    RECOVERY_ACTIONS.ROLLOVER_CONVERSATION_FULL
  );
});


test("repeated rollovers without a healthy completed response fail closed instead of creating chats forever", () => {
  let now = 1_000;
  const recovery = new SupervisorRecoveryController({
    rolloverCooldownMs: 100,
    now: () => now
  });

  recovery.record(RECOVERY_ACTIONS.ROLLOVER_CONVERSATION_FULL, { success: true });
  now += 101;
  assert.equal(
    recovery.observeProbe({
      snapshot: { conversationFull: true },
      classification: { observation: "RESPONSE_COMPLETE" }
    }),
    RECOVERY_ACTIONS.ROLLOVER_CONVERSATION_FULL
  );
  recovery.record(RECOVERY_ACTIONS.ROLLOVER_CONVERSATION_FULL, { success: true });

  now += 101;
  assert.equal(
    recovery.observeProbe({
      snapshot: { conversationFull: true },
      classification: { observation: "UNKNOWN" }
    }),
    RECOVERY_ACTIONS.WAIT_USER_RECOVERY_EXHAUSTED
  );
  assert.equal(recovery.status().blocked, true);
});

test("a healthy completed response clears the rollover burst guard", () => {
  let now = 5_000;
  const recovery = new SupervisorRecoveryController({
    rolloverCooldownMs: 100,
    now: () => now
  });

  recovery.record(RECOVERY_ACTIONS.ROLLOVER_CONVERSATION_FULL, { success: true });
  assert.equal(recovery.status().rollover_burst_count, 1);

  recovery.observeProbe({
    snapshot: {
      conversationPath: true,
      composerReady: true,
      responseRunning: false
    },
    classification: { observation: "RESPONSE_COMPLETE" }
  });

  assert.equal(recovery.status().rollover_burst_count, 0);
});
