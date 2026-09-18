import test from "node:test";
import assert from "node:assert/strict";

import { ACTIONS } from "../src/decision.mjs";
import { executeDecision } from "../src/ui/actions.mjs";

function fakeLocator({
  visible = true,
  onClick = () => {},
  onFill = () => {},
  onPress = () => {}
} = {}) {
  return {
    first() { return this; },
    async isVisible() { return visible; },
    async click() { onClick(); },
    async fill(value) { onFill(value); },
    async press(key) { onPress(key); }
  };
}

function fakePage({
  composerVisible = true,
  controls = [],
  onClick = () => {},
  onFill = () => {},
  onPress = () => {}
} = {}) {
  return {
    async evaluate() { return controls; },
    locator(selector) {
      if (selector.includes("prompt-textarea") || selector.includes("contenteditable")) {
        return fakeLocator({
          visible: composerVisible,
          onFill,
          onPress
        });
      }
      if (selector.includes("data-testid")) {
        return fakeLocator({ visible: true, onClick });
      }
      return fakeLocator({ visible: false });
    },
    getByRole() {
      return fakeLocator({ visible: true, onClick });
    }
  };
}

test("dry-run continue plans composer send without mutation", async () => {
  let filled = false;
  const result = await executeDecision({
    page: fakePage({ onFill: () => { filled = true; } }),
    decision: {
      action: ACTIONS.CONTINUE,
      instruction: "continue"
    },
    dryRun: true
  });

  assert.equal(result.target, "COMPOSER_SEND");
  assert.equal(result.executed, false);
  assert.equal(filled, false);
});

test("live continue fills canonical instruction and uses send control", async () => {
  let filled = null;
  let clicks = 0;
  const controls = [{ text: "", ariaLabel: "Send prompt", testId: "send-button" }];

  const result = await executeDecision({
    page: fakePage({
      controls,
      onFill: (value) => { filled = value; },
      onClick: () => { clicks += 1; }
    }),
    decision: {
      action: ACTIONS.CONTINUE,
      instruction: "canonical continue instruction"
    },
    dryRun: false
  });

  assert.equal(result.executed, true);
  assert.equal(filled, "canonical continue instruction");
  assert.equal(clicks, 1);
});

test("retry clicks only a recognized retry control", async () => {
  let clicks = 0;
  const result = await executeDecision({
    page: fakePage({
      controls: [{ text: "Try again", ariaLabel: "", testId: null }],
      onClick: () => { clicks += 1; }
    }),
    decision: { action: ACTIONS.RETRY },
    dryRun: false
  });

  assert.equal(result.executed, true);
  assert.equal(result.target, "SAFE_RETRY_CONTROL");
  assert.equal(clicks, 1);
});

test("retry fails closed when no safe retry control exists", async () => {
  const result = await executeDecision({
    page: fakePage({
      controls: [{ text: "Delete account", ariaLabel: "", testId: null }]
    }),
    decision: { action: ACTIONS.RETRY },
    dryRun: false
  });

  assert.equal(result.executed, false);
  assert.match(result.reason, /safe retry control not present/);
});

test("continue does not send if composer is unavailable", async () => {
  const result = await executeDecision({
    page: fakePage({ composerVisible: false }),
    decision: {
      action: ACTIONS.CONTINUE,
      instruction: "continue"
    },
    dryRun: false
  });

  assert.equal(result.executed, false);
  assert.match(result.reason, /composer is not ready/);
});

test("wait/stop decisions never mutate UI", async () => {
  for (const action of [ACTIONS.WAIT, ACTIONS.STOP_WAIT_USER, ACTIONS.STOP_DONE]) {
    const result = await executeDecision({
      page: fakePage(),
      decision: { action },
      dryRun: false
    });
    assert.equal(result.executed, false);
  }
});
