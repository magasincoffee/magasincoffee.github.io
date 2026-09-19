import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("active Three-Lane runtime contains no Brain auto-discovery path", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /findBrainBy/);
  assert.doesNotMatch(source, /listRecentConversationUrls/);
  assert.doesNotMatch(source, /getVisibleChatGptPages/);
  assert.doesNotMatch(source, /BRAIN_REBIND/);
  assert.match(source, /normalizeChatGptConversationUrl\(lane\.brain_url\)/);
  assert.match(source, /openExactConversation\(adapter, brainUrl, \{ brain: true \}\)/);
});

test("Work URL is Robot-managed and rollover requires positive conversationFull", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /registryLane\.work_url/);
  assert.match(source, /probe\.snapshot\.conversationFull/);
  assert.match(source, /createNew = true/);
  assert.match(source, /buildWorkRolloverInstruction/);
  assert.match(source, /Work conversation is missing; automatic replacement is denied/);
});

test("Work result relay captures screenshot and sends screenshot plus full text", async () => {
  const runtime = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );
  const capture = await fs.readFile(
    new URL("../src/ui/message-capture.mjs", import.meta.url),
    "utf8"
  );
  const actions = await fs.readFile(
    new URL("../src/ui/actions.mjs", import.meta.url),
    "utf8"
  );

  assert.match(runtime, /captureCompletedAssistantTurnScreenshot/);
  assert.match(runtime, /sendComposerWithAttachment/);
  assert.match(runtime, /buildLaneResultRelay/);
  assert.match(runtime, /fs\.unlink\(screenshotPath\)/);
  assert.match(capture, /locator\.screenshot/);
  assert.match(actions, /setInputFiles/);
  assert.match(actions, /COMPOSER_ATTACHMENT_SEND/);
});

test("dispatch and relay use exact-once inflight latches", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /dispatch_inflight/);
  assert.match(source, /relay_inflight/);
  assert.match(source, /captureUserTurnDigests/);
  assert.match(source, /inspectKnownTargetSendOutcome/);
  assert.match(source, /LANE_WORK_SEND_NOT_CONFIRMED_RETRY/);
  assert.match(source, /last_result_relay_id/);
});

test("one lane error is caught without terminating the other lane loop", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /for \(const lane of config\.lanes\)/);
  assert.match(source, /statuses\[lane\.lane_id\] = await processLane/);
  assert.match(source, /type: "LANE_ERROR"/);
});

test("WORKING status requires enabled lane with an active pending Work result", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /if \(!lane\.enabled\)/);
  assert.match(source, /if \(registryLane\.awaiting_work\)/);
  assert.match(source, /laneStatus\([\s\S]*?"WORKING"/);
});


test("new Work URLs are stored through canonical target normalization", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /const target = targetFromUrl\(page\.url\(\)\)/);
  assert.match(source, /return \`\$\{target\.origin\}\$\{target\.pathname\}\`/);
  assert.match(source, /internal \/c\/WEB:<uuid> route/);
});


test("Owner Work URL override is revisioned and resets stale pending Work state once", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /async function applyOwnerWorkTarget/);
  assert.match(source, /work_url_revision/);
  assert.match(source, /applied_work_url_revision/);
  assert.match(source, /LANE_OWNER_WORK_TARGET_CHANGED/);
  assert.match(source, /registryLane\.dispatch_inflight = null/);
  assert.match(source, /registryLane\.relay_inflight = null/);
  assert.match(source, /registryLane\.awaiting_work = false/);
});

test("transient fetch and CDP failures recover instead of escalating to Owner", async () => {
  const runtime = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );
  const adapter = await fs.readFile(
    new URL("../src/ui/playwright-adapter.mjs", import.meta.url),
    "utf8"
  );

  assert.match(adapter, /fetch failed/);
  assert.match(adapter, /ECONNRESET/);
  assert.match(adapter, /ETIMEDOUT/);
  assert.match(runtime, /transient \? "RECOVERING" : "WAIT_OWNER"/);
  assert.match(runtime, /reconnectOverCdp/);
  assert.match(runtime, /Robot đang tự kết nối lại và sẽ thử tiếp/);
});


test("exhausted transient CDP recovery exits 75 so Windows wrapper relaunches Robot Chrome", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /cdpRecoveryFailures/);
  assert.match(source, /cdpRecoveryFailures >= 3/);
  assert.match(source, /RUNTIME_CDP_RESTART_REQUESTED/);
  assert.match(source, /process\.exitCode = 75/);
  assert.match(source, /bounded transient CDP reconnect budget exhausted/);
});


test("inaccessible Brain or Work conversations surface plain-language Owner guidance", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /function accessDeniedMessage/);
  assert.match(source, /Work này không mở được trong Chrome Robot/);
  assert.match(source, /Bộ não này không mở được trong Chrome Robot/);
  assert.match(source, /conversationAccessDenied/);
  assert.match(source, /TỰ TẠO WORK/);
});


test("unconfirmed existing-Work send reloads exact target and auto-retries only when server state proves no send", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /async function inspectKnownTargetSendOutcome/);
  assert.match(source, /page\.reload\(/);
  assert.match(source, /waitForUserTurnDigest/);
  assert.match(source, /pre_user_count/);
  assert.match(source, /pre_max_turn_ordinal/);
  assert.match(source, /return "NOT_CONFIRMED"/);
  assert.match(source, /LANE_WORK_SEND_NOT_CONFIRMED_RETRY/);
  assert.match(source, /if \(outcome === "CONFIRMED"\) return/);
  assert.doesNotMatch(source, /Work instruction send outcome is uncertain; automatic resend is denied/);
});

test("legacy v34 inflight latch can self-heal after hard reload on a stable completed Work chat", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /v34 and older latches did not persist a pre-send baseline/);
  assert.match(source, /if \(!baselineKnown && stable\) return "NOT_CONFIRMED"/);
});

test("Brain request and result relay use the same safe send reconciliation", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /LANE_BRAIN_SEND_NOT_CONFIRMED_RETRY/);
  assert.match(source, /LANE_RESULT_RELAY_NOT_CONFIRMED_RETRY/);
  assert.match(source, /LANE_BRAIN_SEND_PENDING_CONFIRMATION/);
  assert.match(source, /LANE_RESULT_RELAY_PENDING_CONFIRMATION/);
  assert.match(source, /captureSendBaseline/);
});


test("unconfirmed existing-Work send hard-reloads and auto-retries only when server state proves no send", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /async function inspectKnownTargetSendOutcome/);
  assert.match(source, /page\.reload\(/);
  assert.match(source, /waitForUserTurnDigest/);
  assert.match(source, /pre_user_count/);
  assert.match(source, /pre_max_turn_ordinal/);
  assert.match(source, /return "NOT_CONFIRMED"/);
  assert.match(source, /LANE_WORK_SEND_NOT_CONFIRMED_RETRY/);
  assert.doesNotMatch(source, /Work instruction send outcome is uncertain; automatic resend is denied/);
});

test("legacy v34 inflight latch self-heals after hard reload on a stable completed Work chat", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /v34 and older latches did not persist a pre-send baseline/);
  assert.match(source, /if \(!baselineKnown && stable\) return "NOT_CONFIRMED"/);
});

test("Brain request and result relay use the same safe send reconciliation", async () => {
  const source = await fs.readFile(
    new URL("../src/runtime/three-lane-cli.mjs", import.meta.url),
    "utf8"
  );

  assert.match(source, /LANE_BRAIN_SEND_NOT_CONFIRMED_RETRY/);
  assert.match(source, /LANE_RESULT_RELAY_NOT_CONFIRMED_RETRY/);
  assert.match(source, /LANE_BRAIN_SEND_PENDING_CONFIRMATION/);
  assert.match(source, /LANE_RESULT_RELAY_PENDING_CONFIRMATION/);
  assert.match(source, /captureSendBaseline/);
});
