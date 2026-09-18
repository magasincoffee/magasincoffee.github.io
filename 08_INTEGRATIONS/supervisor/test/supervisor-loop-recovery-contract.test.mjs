import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("long-running Supervisor adopts a newly created ChatGPT conversation after send", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/supervisor-loop-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /execution\.target === "COMPOSER_SEND"/);
  assert.match(source, /targetFromUrl\(page\.url\(\)\)/);
  assert.match(source, /writeTarget\(targetPath, target\)/);
  assert.match(source, /TARGET_ADOPTED/);
  assert.match(source, /noteConversationAdopted\(\)/);
});

test("fresh-chat rollover atomically persists the new target instead of revisiting the old chat", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/supervisor-loop-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /CONVERSATION_ROLLOVER/);
  assert.match(source, /await writeTarget\(targetPath, newTarget\)/);
  assert.match(source, /page\.waitForURL/);
  assert.match(source, /ROLLOVER_CONVERSATION_FULL/);
  assert.match(source, /ROLLOVER_CONVERSATION_MISSING/);
});

test("stale target adopts a healthy existing conversation and never creates a new chat from target mismatch", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/supervisor-loop-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /isHealthyConversationProbe\(mismatchProbe\)/);
  assert.match(source, /CURRENT_HEALTHY_CONVERSATION/);
  assert.match(source, /Automatic creation of another chat is disabled to prevent a chat storm/);

  const start = source.indexOf(
    "if (targetRecovery === RECOVERY_ACTIONS.ROLLOVER_TARGET_MISSING)"
  );
  const end = source.indexOf(
    "const probe = await session.probe()",
    start
  );
  assert.ok(start >= 0 && end > start);
  const targetMismatchBlock = source.slice(start, end);
  assert.doesNotMatch(targetMismatchBlock, /createFreshConversation\(/);
  assert.match(targetMismatchBlock, /recovery\.block\(\)/);
});

test("ambiguous unavailable UI fails closed after reload instead of creating another chat", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/supervisor-loop-cli.mjs", import.meta.url),
    "utf8"
  );

  const match = source.match(
    /if \(recoveryAction === RECOVERY_ACTIONS\.ROLLOVER_UNAVAILABLE\) \{([\s\S]*?)\n    \}\n\n    if \(/
  );
  assert.ok(match);
  const unavailableBlock = match[1];
  assert.doesNotMatch(unavailableBlock, /createFreshConversation\(/);
  assert.match(unavailableBlock, /recovery\.block\(\)/);
});
