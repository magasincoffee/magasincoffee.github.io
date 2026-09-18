import test from "node:test";
import assert from "node:assert/strict";

import { OBSERVATIONS } from "../src/decision.mjs";
import { UI_STATES, classifyUiSnapshot } from "../src/ui/classifier.mjs";

const base = {
  composerReady: true,
  assistantMessageCount: 1,
  userMessageCount: 1,
  conversationPath: true,
  loginRequired: false,
  hasCaptcha: false,
  responseRunning: false,
  hasNetworkError: false,
  hasTransientError: false
};

test("classifies authenticated idle conversation as response complete", () => {
  const result = classifyUiSnapshot(base);
  assert.equal(result.uiState, UI_STATES.READY_IDLE);
  assert.equal(result.observation, OBSERVATIONS.RESPONSE_COMPLETE);
});

test("does not continue from empty home composer without conversation evidence", () => {
  const result = classifyUiSnapshot({
    ...base,
    assistantMessageCount: 0,
    userMessageCount: 0,
    conversationPath: false
  });
  assert.equal(result.uiState, UI_STATES.UNKNOWN);
  assert.equal(result.observation, OBSERVATIONS.UNKNOWN);
});

test("captcha takes precedence and hard-stops", () => {
  const result = classifyUiSnapshot({ ...base, hasCaptcha: true });
  assert.equal(result.uiState, UI_STATES.CAPTCHA);
  assert.equal(result.observation, OBSERVATIONS.CAPTCHA);
});

test("login required maps to auth-required observation", () => {
  const result = classifyUiSnapshot({
    ...base,
    composerReady: false,
    loginRequired: true
  });
  assert.equal(result.uiState, UI_STATES.LOGIN_REQUIRED);
  assert.equal(result.observation, OBSERVATIONS.AUTH_REQUIRED);
});

test("running response never classifies as complete", () => {
  const result = classifyUiSnapshot({ ...base, responseRunning: true });
  assert.equal(result.uiState, UI_STATES.RUNNING);
  assert.equal(result.observation, OBSERVATIONS.ASSISTANT_RUNNING);
});

test("network errors map to bounded-retry observation", () => {
  const result = classifyUiSnapshot({ ...base, hasNetworkError: true });
  assert.equal(result.uiState, UI_STATES.NETWORK_ERROR);
  assert.equal(result.observation, OBSERVATIONS.NETWORK_ERROR);
});


test("explicit retry control is transient even when error banner parsing misses", () => {
  const result = classifyUiSnapshot({
    composerReady: true,
    assistantMessageCount: 1,
    userMessageCount: 1,
    conversationPath: true,
    loginRequired: false,
    hasCaptcha: false,
    responseRunning: false,
    hasNetworkError: false,
    hasTransientError: false,
    hasRetryControl: true
  });
  assert.equal(result.uiState, UI_STATES.TRANSIENT_ERROR);
  assert.equal(result.observation, OBSERVATIONS.TRANSIENT_ERROR);
});
