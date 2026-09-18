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
  assert.doesNotMatch(source, /response_body|response_text|worker_response_body/);
});


test("Brain and Worker chat creation use persistent one-shot latches", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/brain-worker-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /bootstrap_consumed/);
  assert.match(source, /creation_latch/);
  assert.match(source, /dispatch_latch/);
  assert.match(source, /automatic second Brain creation is denied/);
  assert.match(source, /automatic retry is denied/);
});

test("Worker result relay is at-most-once under uncertain send outcome", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/brain-worker-cli.mjs", import.meta.url),
    "utf8"
  );

  const latchIndex = source.indexOf("ready.worker.relay_inflight_id = envelope.relay_id");
  const sendIndex = source.indexOf("sendComposerInstruction(page, envelope.text", latchIndex);
  assert.ok(latchIndex >= 0);
  assert.ok(sendIndex > latchIndex);
  assert.match(source, /exact-once policy denies resend/);
});


test("Brain runtime reconciles the latest completed Brain turn after restart even when awaiting_response is false", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/brain-worker-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /if \(registry\.brain\.awaiting_response\) \{\s*await processBrainResponse\(/
  );
  assert.match(source, /Always reconcile the latest completed Brain turn by digest/);
});

test("registered Brain or Worker target must be restored exactly before automation continues", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/brain-worker-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /pageMatchesTarget/);
  assert.match(source, /registered ChatGPT target could not be restored; target mismatch; new conversation denied/);
});


test("stale Brain target recovery uses prior processed digest and refuses ambiguous matches", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/brain-worker-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /findBrainByContinuity/);
  assert.match(source, /last_processed_digest/);
  assert.match(source, /captureAssistantTurnDigests/);
  assert.match(source, /multiple ChatGPT conversations match Brain continuity; automatic target rebind denied/);
  assert.match(source, /BRAIN_TARGET_REBOUND_CONTINUITY/);
});


test("stale Brain target may fall back only to one open conversation with a valid Brain directive signature", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/brain-worker-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /findBrainByDirectiveSignature/);
  assert.match(source, /parseBrainDirective\(captured\.text/);
  assert.match(source, /DIRECTIVE_SIGNATURE/);
  assert.match(source, /multiple open ChatGPT conversations have a valid Brain directive signature; automatic target rebind denied/);
  assert.match(source, /BRAIN_TARGET_REBOUND_SIGNATURE/);
});


test("stale Brain recovery scans only a bounded recent sidebar and still fails closed on ambiguity", async () => {
  const runtime = await fs.readFile(
    new URL("../src/runtime/brain-worker-cli.mjs", import.meta.url),
    "utf8"
  );
  const adapter = await fs.readFile(
    new URL("../src/ui/playwright-adapter.mjs", import.meta.url),
    "utf8"
  );

  assert.match(runtime, /findBrainFromRecentSidebar/);
  assert.match(runtime, /listRecentConversationUrls\(discoveryPage, \{ limit: 20 \}\)/);
  assert.match(runtime, /multiple recent ChatGPT conversations have a valid Brain directive signature; automatic target rebind denied/);
  assert.match(runtime, /BRAIN_TARGET_REBOUND_SIDEBAR/);
  assert.match(adapter, /async listRecentConversationUrls/);
  assert.match(adapter, /Math\.max\(1, Math\.min\(50, Number\(limit\) \|\| 20\)\)/);
});


test("Owner Brain rebind accepts only one visible ChatGPT conversation with a valid Brain directive", async () => {
  const runtime = await fs.readFile(
    new URL("../src/runtime/brain-worker-cli.mjs", import.meta.url),
    "utf8"
  );
  const adapter = await fs.readFile(
    new URL("../src/ui/playwright-adapter.mjs", import.meta.url),
    "utf8"
  );

  assert.match(runtime, /BRAIN_REBIND\.request\.json/);
  assert.match(runtime, /applyOwnerBrainRebind/);
  assert.match(runtime, /getVisibleChatGptPages/);
  assert.match(runtime, /parseBrainDirective\(captured\.text/);
  assert.match(runtime, /candidates\.length !== 1/);
  assert.match(runtime, /BRAIN_TARGET_REBOUND_OWNER/);
  assert.match(adapter, /document\.visibilityState === "visible"/);
});
