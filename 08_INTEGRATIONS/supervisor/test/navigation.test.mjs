import test from "node:test";
import assert from "node:assert/strict";

import {
  isChatGptUrl,
  isTransientNavigationError
} from "../src/ui/playwright-adapter.mjs";

test("recognizes ChatGPT pages only", () => {
  assert.equal(isChatGptUrl("https://chatgpt.com/"), true);
  assert.equal(isChatGptUrl("https://chatgpt.com/c/example"), true);
  assert.equal(isChatGptUrl("https://accounts.google.com/"), false);
  assert.equal(isChatGptUrl("not a url"), false);
});

test("treats execution-context navigation races as transient", () => {
  assert.equal(
    isTransientNavigationError(
      new Error("Execution context was destroyed, most likely because of a navigation")
    ),
    true
  );
});

test("does not hide unrelated programming errors", () => {
  assert.equal(
    isTransientNavigationError(new Error("selector contract violated")),
    false
  );
});
