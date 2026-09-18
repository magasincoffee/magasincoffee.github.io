import test from "node:test";
import assert from "node:assert/strict";

import {
  ChatGptUiAdapter,
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


function fakePage(url, { closed = false } = {}) {
  return {
    url: () => url,
    isClosed: () => closed
  };
}

test("keeps the already-managed ChatGPT page sticky when multiple ChatGPT tabs exist", () => {
  const managed = fakePage("https://chatgpt.com/c/managed");
  const other = fakePage("https://chatgpt.com/c/other");
  const adapter = new ChatGptUiAdapter();

  adapter.context = {
    pages: () => [managed, other]
  };
  adapter.page = managed;

  assert.equal(adapter.getActivePage(), managed);
  assert.equal(adapter.getActivePage().url(), "https://chatgpt.com/c/managed");
});

test("selects another ChatGPT page only after the managed page is closed", () => {
  const closedManaged = fakePage("https://chatgpt.com/c/managed", { closed: true });
  const other = fakePage("https://chatgpt.com/c/other");
  const adapter = new ChatGptUiAdapter();

  adapter.context = {
    pages: () => [closedManaged, other]
  };
  adapter.page = closedManaged;

  assert.equal(adapter.getActivePage(), other);
  assert.equal(adapter.getActivePage().url(), "https://chatgpt.com/c/other");
});
