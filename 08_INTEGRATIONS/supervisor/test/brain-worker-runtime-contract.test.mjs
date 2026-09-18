import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Brain/Worker runtime uses dynamic directives and full response relay", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/brain-worker-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /parseBrainDirective/);
  assert.match(source, /captureCompletedAssistantTurn/);
  assert.match(source, /buildWorkerResultEnvelope/);
  assert.match(source, /action\.instruction/);
  assert.doesNotMatch(source, /ROLLOVER_INSTRUCTION/);
});

test("Brain/Worker runtime gates every logical rollover on conversationFull", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/brain-worker-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /assertRolloverAuthorized\(probe\.snapshot\)/);
  assert.match(source, /assertRolloverAuthorized\(snapshot\)/);
  assert.match(source, /conversation is missing; rollover denied/);
});

test("Worker response bodies are not part of persistent registry/log payloads", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/brain-worker-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /intentionally not written to logs\/status\/registry/);
  assert.doesNotMatch(source, /responseText:\s*ready\.captured\.text[\s\S]*atomicJsonWrite/);
});
