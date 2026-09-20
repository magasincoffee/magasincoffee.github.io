import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

import {
  ChatGptUiAdapter,
  isTransientNavigationError
} from "../ui/playwright-adapter.mjs";
import {
  sendComposerInstruction,
  sendComposerWithAttachment
} from "../ui/actions.mjs";
import {
  captureCompletedAssistantTurn,
  captureCompletedAssistantTurnScreenshot,
  captureRecentConversationTurns,
  captureUserTurnDigests,
  captureUserTurnTexts
} from "../ui/message-capture.mjs";
import { OBSERVATIONS } from "../decision.mjs";
import {
  isPersistableConversationUrl,
  pageMatchesTarget,
  targetFromUrl
} from "./recovery.mjs";
import {
  THREE_LANE_MODE,
  LANE_IDS,
  sha256,
  normalizeChatGptConversationUrl,
  parseLaneDirective,
  defaultLaneConfig,
  normalizeLaneConfig,
  defaultLaneRegistry,
  normalizeLaneRegistry,
  buildBrainStartRequest,
  buildWorkRolloverInstruction,
  buildWorkDispatchInstruction,
  workDispatchMarker,
  buildLaneResultRelay
} from "./three-lane.mjs";
import {
  classifyRelayMarkerState,
  activeRelayScreenshotPaths,
  migrateLegacyBlockedRelayLatches
} from "./relay-reconciliation.mjs";
import {
  RELAY_RETRY_STATES,
  beginRelaySendAttempt,
  relayRetryState,
  scheduleRelayRetry
} from "./relay-retry.mjs";
import {
  LANE_EVENT_TYPES,
  beginTaskAssignment,
  buildSafeWorkObservation,
  createLaneEventSink,
  markRelayConfirmed,
  markTaskCompleted,
  markTaskStarted,
  normalizeTaskTiming,
  observeWorkActivity,
  taskTimingMetrics
} from "./lane-events.mjs";
import {
  WORK_TARGET_MODES,
  acceptOwnerWorkTargetRevision,
  applyPendingWorkTargetIfSafe
} from "./work-target-state.mjs";

const SUPERVISOR_RUNTIME_VERSION = "2026-09-20.52";

let laneEventSink = null;
let laneEventErrorLogPath = null;

function parseArgs(argv) {
  const result = {
    cdpUrl: "http://127.0.0.1:9222",
    execute: false,
    pollMs: 4000,
    workTargetFixture: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--cdp-url") result.cdpUrl = argv[++i];
    else if (key === "--execute") result.execute = true;
    else if (key === "--poll-ms") result.pollMs = Number(argv[++i]);
    else if (key === "--work-target-fixture") result.workTargetFixture = true;
    else throw new Error(`unknown argument: ${key}`);
  }
  return result;
}

function localRoot() {
  const base = process.env.LOCALAPPDATA || process.env.HOME || process.cwd();
  return path.join(base, "MAGASIN", "BusinessOS", "supervisor");
}

async function atomicJsonWrite(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2) + "\n", "utf8");
  await fs.rename(temp, filePath);
}

function parseJsonText(text) {
  return JSON.parse(String(text || "").replace(/^\uFEFF/, ""));
}

async function readJson(filePath, fallback) {
  try {
    return parseJsonText(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return fallback;
  }
}

async function safeLog(filePath, event = {}) {
  const safe = {
    timestamp: new Date().toISOString(),
    type: String(event.type || "EVENT"),
    lane_id: event.laneId || undefined,
    task_id: event.taskId || undefined,
    relay_id: event.relayId || undefined,
    digest: event.digest || undefined,
    reason: event.reason || undefined,
    error_name: event.errorName || undefined
  };
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, JSON.stringify(safe) + "\n", "utf8");
}

function ensureLaneTaskTiming(registryLane, taskId = null) {
  registryLane.task_timing = normalizeTaskTiming(registryLane.task_timing);
  const timing = registryLane.task_timing;
  if (!timing.task_id && taskId) timing.task_id = String(taskId);
  if (timing.task_id && taskId && timing.task_id !== String(taskId)) {
    registryLane.task_timing = normalizeTaskTiming({ task_id: String(taskId) });
  }
  return registryLane.task_timing;
}

function timingEventFields(timing, at = new Date().toISOString()) {
  const metrics = taskTimingMetrics(timing, { now: at });
  return {
    ...(Number.isInteger(metrics.total_elapsed_ms)
      ? { elapsed_ms: metrics.total_elapsed_ms }
      : {}),
    ...(Number.isInteger(metrics.queue_time_ms)
      ? { queue_time_ms: metrics.queue_time_ms }
      : {}),
    ...(Number.isInteger(metrics.execution_time_ms)
      ? { execution_time_ms: metrics.execution_time_ms }
      : {})
  };
}

async function emitLaneEvent(event) {
  if (!laneEventSink) return false;
  const result = await laneEventSink.emit(event);
  if (!result.ok && laneEventErrorLogPath) {
    await safeLog(laneEventErrorLogPath, {
      type: "LANE_EVENT_SINK_ERROR",
      laneId: event.lane_id,
      reason: "EVENT_SINK_WRITE_FAILED"
    }).catch(() => {});
  }
  return result.ok;
}

function hardStopObservation(observation) {
  return new Set([
    OBSERVATIONS.AUTH_REQUIRED,
    OBSERVATIONS.MFA_REQUIRED,
    OBSERVATIONS.CAPTCHA,
    OBSERVATIONS.DESTRUCTIVE_ACTION,
    OBSERVATIONS.ADMIN_ESCALATION,
    OBSERVATIONS.AMBIGUOUS_DECISION
  ]).has(observation);
}

function accessDeniedMessage({ brain = false } = {}) {
  return brain
    ? "Bộ não này không mở được trong Chrome Robot. Hãy dùng link Brain mà tài khoản trong Chrome Robot có quyền truy cập."
    : "Work này không mở được trong Chrome Robot. Dừng luồng rồi dán LINK WORK khác hoặc bấm TỰ TẠO WORK để Robot tạo chat mới.";
}

async function openExactConversation(adapter, url, { brain = false } = {}) {
  const normalized = normalizeChatGptConversationUrl(url);
  const target = targetFromUrl(normalized);
  const existing = adapter.findPageForTarget(target);
  if (existing) {
    const probe = await adapter.probePage(existing).catch(() => null);
    if (probe?.snapshot?.conversationAccessDenied) {
      throw new Error(accessDeniedMessage({ brain }));
    }
    return existing;
  }

  const page = await adapter.reopenTargetPage(normalized);
  const probe = await adapter.probePage(page).catch(() => null);
  if (probe?.snapshot?.conversationAccessDenied) {
    throw new Error(accessDeniedMessage({ brain }));
  }
  if (!pageMatchesTarget(page.url(), target)) {
    throw new Error(
      brain
        ? "Không thể mở đúng cuộc trò chuyện Bộ não trong Chrome Robot."
        : "Không thể mở đúng cuộc trò chuyện Work trong Chrome Robot. Dừng luồng rồi dán LINK WORK khác hoặc bấm TỰ TẠO WORK."
    );
  }
  return page;
}

async function waitForConversationUrl(page) {
  await page.waitForURL(
    (value) => isPersistableConversationUrl(String(value)),
    { timeout: 45_000 }
  );

  // ChatGPT may briefly expose an internal /c/WEB:<uuid> route while a new
  // conversation is still being created. That route is not authoritative for
  // future reopen. Persist only the final canonical conversation URL emitted
  // by ChatGPT itself; never synthesize it from a transient WEB route.
  const target = targetFromUrl(page.url());
  return `${target.origin}${target.pathname}`;
}

function laneStatus(configLane, registryLane, status, message, extra = {}) {
  return {
    lane_id: configLane.lane_id,
    project_name: configLane.project_name,
    enabled: Boolean(configLane.enabled),
    status,
    message,
    brain_url: String(registryLane.brain_url || configLane.brain_url || ""),
    work_url: String(registryLane.work_url || ""),
    work_mode: String(registryLane.applied_work_mode || configLane.work_mode || "AUTO"),
    work_url_revision: Number(configLane.work_url_revision || 0),
    applied_work_url_revision: Number(registryLane.applied_work_url_revision || 0),
    pending_work_url_revision: Number(registryLane.pending_work_url_revision || 0),
    work_url_saved_at: configLane.work_url_saved_at || null,
    task_id: registryLane.task_id || null,
    awaiting_work: Boolean(registryLane.awaiting_work),
    updated_at: new Date().toISOString(),
    ...extra
  };
}

async function writeLaneStatus(statusPath, statuses) {
  await atomicJsonWrite(statusPath, {
    schema_version: "three-lane-status.v1",
    mode: THREE_LANE_MODE,
    supervisor_runtime_version: SUPERVISOR_RUNTIME_VERSION,
    truth_order: ["PROCESS_TRUTH", "LANE_TRUTH", "PERSISTED_RECOVERY_STATE"],
    persisted_state_role: "RECOVERY_ONLY",
    process_truth_required: true,
    updated_at: new Date().toISOString(),
    lanes: LANE_IDS.map((laneId) => statuses[laneId] || {
      lane_id: laneId,
      status: "STOPPED",
      message: "Luồng chưa khởi động."
    })
  });
}

async function assertConversationSafe(adapter, page, {
  brain = false,
  allowFull = false
} = {}) {
  const probe = await adapter.probePage(page);
  if (hardStopObservation(probe.classification.observation)) {
    throw new Error("Owner/security boundary detected");
  }
  if (probe.snapshot.conversationAccessDenied) {
    throw new Error(accessDeniedMessage({ brain }));
  }
  if (probe.snapshot.conversationMissing) {
    throw new Error(brain
      ? "Brain conversation is missing; Owner must provide a valid Brain URL"
      : "Work conversation is missing; automatic replacement is denied");
  }
  if (probe.snapshot.conversationFull && !allowFull) {
    throw new Error(brain
      ? "Brain conversation is full; Owner must provide a replacement Brain URL"
      : "Work conversation is full");
  }
  return probe;
}

async function captureSendBaseline(adapter, page) {
  const digests = await captureUserTurnDigests(page).catch(() => []);
  const probe = await adapter.probePage(page).catch(() => null);
  return {
    pre_user_count: digests.length,
    pre_max_turn_ordinal: Number(
      probe?.snapshot?.maxConversationTurnOrdinal || 0
    )
  };
}

async function waitForUserTurnDigest(
  page,
  digest,
  { timeoutMs = 6000, intervalMs = 250 } = {}
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const digests = await captureUserTurnDigests(page).catch(() => []);
    if (digests.includes(digest)) return true;
    await delay(intervalMs);
  }
  return false;
}

async function hasUserTurnMarker(page, marker) {
  const expected = String(marker || "");
  if (!expected) return false;
  const texts = await captureUserTurnTexts(page).catch(() => []);
  return texts.some((text) => String(text).includes(expected));
}

async function waitForUserTurnMarker(
  page,
  marker,
  { timeoutMs = 6000, intervalMs = 250 } = {}
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (await hasUserTurnMarker(page, marker)) return true;
    await delay(intervalMs);
  }
  return false;
}

function normalizeWorkInstructionText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function relayMarker(relayId) {
  return `relay_id=${relayId}`;
}

async function unlinkRelayScreenshot(latch) {
  const screenshotPath = String(latch?.screenshot_path || "").trim();
  if (!screenshotPath) return false;
  await fs.unlink(screenshotPath).catch(() => {});
  return true;
}

async function clearRelayInflight(registryLane) {
  const latch = registryLane?.relay_inflight || null;
  if (latch) await unlinkRelayScreenshot(latch);
  if (registryLane) registryLane.relay_inflight = null;
  return latch;
}

async function finalizeConfirmedRelay({
  registryLane,
  registry,
  registryPath,
  latch
}) {
  const confirmedAt = new Date().toISOString();
  const timing = ensureLaneTaskTiming(registryLane, registryLane.task_id);
  const confirmed = markRelayConfirmed(timing, {
    taskId: registryLane.task_id,
    at: confirmedAt
  });

  registryLane.last_result_relay_id = latch.relay_id;
  registryLane.last_work_result_digest = latch.response_digest;
  registryLane.awaiting_work = false;
  await clearRelayInflight(registryLane);
  await atomicJsonWrite(registryPath, registry);

  if (confirmed.changed) {
    await emitLaneEvent({
      timestamp: confirmedAt,
      lane_id: registryLane.lane_id,
      actor: "SUPERVISOR",
      event_type: LANE_EVENT_TYPES.RESULT_RELAY_CONFIRMED,
      task_id: registryLane.task_id,
      phase: "RELAYED",
      work_generation: Number(registryLane.work_generation || 0),
      relay_id: latch.relay_id,
      ...timingEventFields(timing, confirmedAt)
    });
  }
}

async function cleanupOrphanRelayEvidence({
  evidenceDir,
  registry,
  logPath,
  maxDeletes = 24
}) {
  await fs.mkdir(evidenceDir, { recursive: true });
  const active = new Set(
    [...activeRelayScreenshotPaths(registry)].map((item) => path.resolve(item))
  );
  const entries = await fs.readdir(evidenceDir, { withFileTypes: true })
    .catch(() => []);
  let deleted = 0;
  for (const entry of entries) {
    if (deleted >= maxDeletes) break;
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".png")) continue;
    const candidate = path.resolve(evidenceDir, entry.name);
    if (active.has(candidate)) continue;
    await fs.unlink(candidate).catch(() => {});
    deleted += 1;
  }
  if (deleted > 0) {
    await safeLog(logPath, {
      type: "LANE_RELAY_ORPHAN_EVIDENCE_CLEANED",
      reason: `count=${deleted}`
    });
  }
  return deleted;
}

async function hasRelayMarker(page, relayId) {
  const marker = relayMarker(relayId);
  const texts = await captureUserTurnTexts(page).catch(() => []);
  return texts.some((text) => text.includes(marker));
}

async function waitForRelayMarker(
  page,
  relayId,
  { timeoutMs = 6000, intervalMs = 250 } = {}
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (await hasRelayMarker(page, relayId)) return true;
    await delay(intervalMs);
  }
  return false;
}

async function waitForStableSendSurface(
  adapter,
  page,
  { brain = false, timeoutMs = 15_000, intervalMs = 400 } = {}
) {
  const deadline = Date.now() + timeoutMs;
  let lastProbe = null;
  let lastDigests = [];

  while (Date.now() <= deadline) {
    lastDigests = await captureUserTurnDigests(page).catch(() => []);
    lastProbe = await assertConversationSafe(adapter, page, {
      brain,
      allowFull: !brain
    }).catch(() => null);

    if (lastProbe) {
      const stable = Boolean(
        lastProbe.snapshot.composerReady &&
        !lastProbe.snapshot.responseRunning &&
        lastProbe.snapshot.lastMessageRole !== "user" &&
        lastProbe.classification.observation === OBSERVATIONS.RESPONSE_COMPLETE
      );
      if (stable) return { stable: true, probe: lastProbe, digests: lastDigests };
    }

    await delay(intervalMs);
  }

  return { stable: false, probe: lastProbe, digests: lastDigests };
}

async function inspectKnownTargetSendOutcome({
  adapter,
  page,
  digest,
  marker = null,
  preUserCount,
  preMaxTurnOrdinal,
  brain = false,
  reload = false
}) {
  if (marker && await hasUserTurnMarker(page, marker)) {
    return "CONFIRMED";
  }
  if (!marker && await waitForUserTurnDigest(page, digest, { timeoutMs: 1200 })) {
    return "CONFIRMED";
  }

  if (reload) {
    await page.reload({
      waitUntil: "domcontentloaded",
      timeout: 30_000
    });
  }

  const observed = await waitForStableSendSurface(adapter, page, {
    brain,
    timeoutMs: reload ? 15_000 : 4_000
  });
  const digests = observed.digests || [];
  if (marker && await hasUserTurnMarker(page, marker)) return "CONFIRMED";
  if (!marker && digests.includes(digest)) return "CONFIRMED";
  if (!observed.stable || !observed.probe) return "PENDING";

  // Marker-backed Work sends are unambiguous. Once the exact Work page is
  // stable, absence of the marker proves this dispatch was not persisted,
  // even if unrelated Work activity changed the baseline in the meantime.
  if (marker) return "NOT_CONFIRMED";

  const probe = observed.probe;
  const baselineKnown =
    Number.isFinite(Number(preUserCount)) &&
    Number.isFinite(Number(preMaxTurnOrdinal));

  if (baselineKnown) {
    const noNewUserTurn =
      digests.length <= Number(preUserCount) &&
      Number(probe.snapshot.maxConversationTurnOrdinal || 0) <=
        Number(preMaxTurnOrdinal);
    if (noNewUserTurn) return "NOT_CONFIRMED";
    return "UNCERTAIN";
  }

  // Legacy v34/v35 latches may lack a baseline. Once the exact conversation
  // has been hard-reloaded and reaches a stable assistant-complete surface,
  // absence of the exact digest proves the attempted send was not persisted.
  return "NOT_CONFIRMED";
}

async function finalizeConfirmedDispatch({
  foundUrl,
  registryLane,
  latch,
  registry,
  registryPath
}) {
  const startedAt = new Date().toISOString();
  const timing = ensureLaneTaskTiming(registryLane, latch.task_id);
  const started = markTaskStarted(timing, {
    taskId: latch.task_id,
    directiveDigest: latch.directive_digest,
    at: startedAt
  });

  if (foundUrl) registryLane.work_url = foundUrl;
  registryLane.task_id = latch.task_id;
  registryLane.instruction_digest =
    latch.directive_instruction_digest || latch.instruction_digest;
  registryLane.last_brain_directive_digest =
    latch.directive_digest || registryLane.last_brain_directive_digest;
  registryLane.awaiting_work = true;
  registryLane.dispatch_inflight = null;
  await atomicJsonWrite(registryPath, registry);

  if (started.changed) {
    const correlation = latch.dispatch_id
      ? { dispatch_id: latch.dispatch_id }
      : {};
    const common = {
      timestamp: startedAt,
      lane_id: registryLane.lane_id,
      task_id: latch.task_id,
      work_generation: Number(registryLane.work_generation || 0),
      ...correlation,
      ...timingEventFields(timing, startedAt)
    };
    await emitLaneEvent({
      ...common,
      actor: "SUPERVISOR",
      event_type: LANE_EVENT_TYPES.WORK_DISPATCH_CONFIRMED,
      phase: "STARTED"
    });
    await emitLaneEvent({
      ...common,
      actor: "WORK",
      event_type: LANE_EVENT_TYPES.WORK_STARTED,
      phase: "STARTED"
    });
  }
}

async function reconcileBrainRequest({
  adapter,
  page,
  lane,
  registryLane,
  registry,
  registryPath,
  logPath
}) {
  const latch = registryLane.brain_request_inflight;
  if (!latch) return "NONE";

  if (latch.reconcile_blocked) return "BLOCKED";
  const reload = !latch.reconcile_reloaded;
  if (reload) {
    latch.reconcile_reloaded = true;
    latch.reconcile_started_at = new Date().toISOString();
    await atomicJsonWrite(registryPath, registry);
    await safeLog(logPath, {
      type: "LANE_BRAIN_SEND_RECONCILE_RELOAD",
      laneId: lane.lane_id,
      digest: latch.digest
    });
  }

  const outcome = await inspectKnownTargetSendOutcome({
    adapter,
    page,
    digest: latch.digest,
    preUserCount: latch.pre_user_count,
    preMaxTurnOrdinal: latch.pre_max_turn_ordinal,
    brain: true,
    reload
  });

  if (outcome === "PENDING") return "PENDING";

  if (outcome === "CONFIRMED") {
    registryLane.brain_request_sent = true;
    registryLane.brain_request_inflight = null;
    await atomicJsonWrite(registryPath, registry);
    return "CONFIRMED";
  }

  if (outcome === "NOT_CONFIRMED") {
    registryLane.brain_request_inflight = null;
    await atomicJsonWrite(registryPath, registry);
    await safeLog(logPath, {
      type: "LANE_BRAIN_SEND_NOT_CONFIRMED_RETRY",
      laneId: lane.lane_id,
      digest: latch.digest
    });
    return "NOT_CONFIRMED";
  }

  latch.reconcile_blocked = true;
  await atomicJsonWrite(registryPath, registry);
  await safeLog(logPath, {
    type: "LANE_BRAIN_SEND_RECONCILE_BLOCKED",
    laneId: lane.lane_id,
    digest: latch.digest,
    reason: "stable target changed without matching digest"
  });
  return "BLOCKED";
}

async function adoptExistingBrainDirective({
  adapter,
  page,
  lane,
  registryLane,
  registry,
  registryPath,
  logPath
}) {
  const probe = await assertConversationSafe(adapter, page, { brain: true })
    .catch(() => null);
  if (!probe || probe.snapshot.responseRunning) return null;

  const turns = await captureRecentConversationTurns(page, { limit: 30 })
    .catch(() => []);
  if (!turns.length) return null;

  let candidate = null;
  let candidateIndex = -1;
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (turn.role !== "assistant") continue;
    try {
      candidate = parseLaneDirective(turn.text);
      candidateIndex = index;
      break;
    } catch {
      // Keep scanning older assistant turns for the latest valid directive.
    }
  }
  if (!candidate || candidateIndex < 0) return null;

  // A valid directive remains authoritative when the only later turns are
  // duplicate first-handshake prompts generated by this Robot. Any later
  // Owner/user content or later assistant output means the older directive is
  // stale and must not be adopted.
  const expectedStartDigest = sha256(buildBrainStartRequest({
    laneId: lane.lane_id,
    projectName: lane.project_name
  }));
  const laterTurns = turns.slice(candidateIndex + 1);
  const onlyRobotHandshakeAfterDirective = laterTurns.every((turn) =>
    turn.role === "user" && turn.digest === expectedStartDigest
  );
  if (laterTurns.length && !onlyRobotHandshakeAfterDirective) return null;

  registryLane.brain_request_sent = true;
  registryLane.brain_request_inflight = null;
  await atomicJsonWrite(registryPath, registry);
  await safeLog(logPath, {
    type: laterTurns.length
      ? "LANE_BRAIN_DIRECTIVE_RECOVERED_BEFORE_DUPLICATE_HANDSHAKE"
      : "LANE_BRAIN_DIRECTIVE_ADOPTED_AS_HANDSHAKE",
    laneId: lane.lane_id,
    taskId: candidate.action === "WORK" ? candidate.task_id : undefined,
    digest: candidate.digest
  });
  return candidate;
}

async function ensureBrainRequest({
  adapter,
  page,
  lane,
  registryLane,
  execute,
  registry,
  registryPath,
  logPath
}) {
  if (registryLane.brain_request_sent) return null;

  const existingDirective = await adoptExistingBrainDirective({
    adapter,
    page,
    lane,
    registryLane,
    registry,
    registryPath,
    logPath
  });
  if (existingDirective) return existingDirective;

  if (registryLane.brain_request_inflight) {
    const outcome = await reconcileBrainRequest({
      adapter,
      page,
      lane,
      registryLane,
      registry,
      registryPath,
      logPath
    });
    if (outcome === "CONFIRMED") return null;
    if (outcome === "PENDING" || outcome === "BLOCKED") {
      const directiveAfterReconcile = await adoptExistingBrainDirective({
        adapter,
        page,
        lane,
        registryLane,
        registry,
        registryPath,
        logPath
      });
      return directiveAfterReconcile;
    }
  }

  const probe = await assertConversationSafe(adapter, page, { brain: true });
  if (probe.classification.observation !== OBSERVATIONS.RESPONSE_COMPLETE) {
    return null;
  }

  const request = buildBrainStartRequest({
    laneId: lane.lane_id,
    projectName: lane.project_name
  });
  const digest = sha256(request);
  const baseline = await captureSendBaseline(adapter, page);
  registryLane.brain_request_inflight = {
    digest,
    ...baseline
  };
  await atomicJsonWrite(registryPath, registry);

  if (!execute) return null;
  let sent = null;
  try {
    sent = await sendComposerInstruction(page, request, { dryRun: false });
  } catch (error) {
    await safeLog(logPath, {
      type: "LANE_BRAIN_SEND_ATTEMPT_ERROR",
      laneId: lane.lane_id,
      digest,
      errorName: error?.name || "Error",
      reason: String(error?.message || error).slice(0, 220)
    });
    return null;
  }
  if (!sent.executed) return null;

  const confirmed = await waitForUserTurnDigest(page, digest);
  if (!confirmed) {
    await safeLog(logPath, {
      type: "LANE_BRAIN_SEND_PENDING_CONFIRMATION",
      laneId: lane.lane_id,
      digest
    });
    const directiveAfterSend = await adoptExistingBrainDirective({
      adapter,
      page,
      lane,
      registryLane,
      registry,
      registryPath,
      logPath
    });
    return directiveAfterSend;
  }

  registryLane.brain_request_sent = true;
  registryLane.brain_request_inflight = null;
  await atomicJsonWrite(registryPath, registry);
  await safeLog(logPath, {
    type: "LANE_BRAIN_REQUEST_SENT",
    laneId: lane.lane_id,
    digest
  });
  return null;
}

async function findWorkConversationForLatch(adapter, latch) {
  const candidates = [];
  const marker = latch.dispatch_id ? workDispatchMarker(latch.dispatch_id) : null;
  for (const page of adapter.getChatGptPages()) {
    let matched = false;
    if (marker) {
      matched = await hasUserTurnMarker(page, marker);
    } else {
      const digests = await captureUserTurnDigests(page).catch(() => []);
      matched = digests.includes(latch.instruction_digest);
    }
    if (!matched) continue;
    try {
      const target = targetFromUrl(page.url());
      candidates.push({
        page,
        url: `${target.origin}${target.pathname}`
      });
    } catch {
      // Ignore non-conversation pages.
    }
  }

  const unique = new Map(candidates.map((item) => [item.url, item]));
  if (unique.size > 1) {
    throw new Error("multiple Work conversations match an uncertain dispatch");
  }
  return unique.size === 1 ? [...unique.values()][0] : null;
}

async function findBrainDirectiveForLatch(brainPage, latch, currentDirective = null) {
  if (
    currentDirective &&
    currentDirective.action === "WORK" &&
    currentDirective.digest === latch.directive_digest
  ) {
    return currentDirective;
  }
  if (!brainPage) return null;

  const turns = await captureRecentConversationTurns(brainPage, { limit: 30 })
    .catch(() => []);
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    if (turns[index].role !== "assistant") continue;
    try {
      const directive = parseLaneDirective(turns[index].text);
      if (
        directive.action === "WORK" &&
        directive.digest === latch.directive_digest
      ) {
        return directive;
      }
    } catch {
      // Ignore non-directive assistant turns.
    }
  }
  return null;
}

async function reconcileDispatchInflight({
  adapter,
  lane,
  registryLane,
  registry,
  registryPath,
  logPath,
  brainPage = null,
  directive = null
}) {
  const latch = registryLane.dispatch_inflight;
  if (!latch) return "NONE";

  const found = await findWorkConversationForLatch(adapter, latch);
  if (found) {
    await finalizeConfirmedDispatch({
      foundUrl: found.url,
      registryLane,
      latch,
      registry,
      registryPath
    });
    return "CONFIRMED";
  }

  if (!registryLane.work_url || latch.create_new) {
    throw new Error(
      "Robot chưa thể xác minh lần gửi vào Work mới; giữ an toàn để không tạo/gửi trùng."
    );
  }

  const page = await openExactConversation(
    adapter,
    registryLane.work_url,
    { brain: false }
  );

  // v42 and older could permanently block when unrelated Work activity
  // changed the baseline after an unconfirmed send. On the first v43 pass,
  // recover only a known existing Work target: if the exact Brain directive
  // can be recovered and its normalized instruction is absent from a stable
  // Work conversation, the old latch is safe to discard and retry.
  if (latch.reconcile_blocked && !latch.dispatch_id && !latch.create_new) {
    const legacyDirective = await findBrainDirectiveForLatch(
      brainPage,
      latch,
      directive
    );
    const stable = await waitForStableSendSurface(adapter, page, {
      brain: false,
      timeoutMs: 4_000
    });
    if (!stable.stable || !stable.probe) return "PENDING";
    if (!legacyDirective) return "BLOCKED";

    const userTexts = await captureUserTurnTexts(page).catch(() => []);
    const normalizedExpected = normalizeWorkInstructionText(
      legacyDirective.instruction
    );
    const legacySendExists = userTexts.some((text) =>
      normalizeWorkInstructionText(text) === normalizedExpected
    );
    if (legacySendExists) {
      await finalizeConfirmedDispatch({
        foundUrl: registryLane.work_url,
        registryLane,
        latch: {
          ...latch,
          directive_instruction_digest: legacyDirective.instruction_digest
        },
        registry,
        registryPath
      });
      await safeLog(logPath, {
        type: "LANE_WORK_LEGACY_BLOCKED_LATCH_CONFIRMED",
        laneId: lane.lane_id,
        taskId: latch.task_id,
        digest: latch.instruction_digest
      });
      return "CONFIRMED";
    }

    registryLane.dispatch_inflight = null;
    await atomicJsonWrite(registryPath, registry);
    await safeLog(logPath, {
      type: "LANE_WORK_LEGACY_BLOCKED_LATCH_REBASED",
      laneId: lane.lane_id,
      taskId: latch.task_id,
      digest: latch.instruction_digest
    });
    return "NOT_CONFIRMED";
  }

  if (latch.reconcile_blocked) return "BLOCKED";
  const reload = !latch.reconcile_reloaded;
  if (reload) {
    latch.reconcile_reloaded = true;
    latch.reconcile_started_at = new Date().toISOString();
    await atomicJsonWrite(registryPath, registry);
    await safeLog(logPath, {
      type: "LANE_WORK_SEND_RECONCILE_RELOAD",
      laneId: lane.lane_id,
      taskId: latch.task_id,
      digest: latch.instruction_digest
    });
  }

  const outcome = await inspectKnownTargetSendOutcome({
    adapter,
    page,
    digest: latch.instruction_digest,
    marker: latch.dispatch_id ? workDispatchMarker(latch.dispatch_id) : null,
    preUserCount: latch.pre_user_count,
    preMaxTurnOrdinal: latch.pre_max_turn_ordinal,
    brain: false,
    reload
  });

  if (outcome === "PENDING") {
    await safeLog(logPath, {
      type: "LANE_WORK_SEND_RECONCILE_PENDING",
      laneId: lane.lane_id,
      taskId: latch.task_id,
      digest: latch.instruction_digest
    });
    return "PENDING";
  }

  if (outcome === "CONFIRMED") {
    await finalizeConfirmedDispatch({
      foundUrl: registryLane.work_url,
      registryLane,
      latch,
      registry,
      registryPath
    });
    return "CONFIRMED";
  }

  if (outcome === "NOT_CONFIRMED") {
    registryLane.dispatch_inflight = null;
    await atomicJsonWrite(registryPath, registry);
    await safeLog(logPath, {
      type: "LANE_WORK_SEND_NOT_CONFIRMED_RETRY",
      laneId: lane.lane_id,
      taskId: latch.task_id,
      digest: latch.instruction_digest
    });
    return "NOT_CONFIRMED";
  }

  latch.reconcile_blocked = true;
  await atomicJsonWrite(registryPath, registry);
  await safeLog(logPath, {
    type: "LANE_WORK_SEND_RECONCILE_BLOCKED",
    laneId: lane.lane_id,
    taskId: latch.task_id,
    digest: latch.instruction_digest,
    reason: "stable target changed without matching digest"
  });
  return "BLOCKED";
}

async function createWorkConversation(adapter, instruction) {
  const page = await adapter.newChatPage("https://chatgpt.com/");
  const sent = await sendComposerInstruction(page, instruction, { dryRun: false });
  if (!sent.executed) {
    throw new Error(`new Work conversation send failed: ${sent.reason || "unknown"}`);
  }
  const url = await waitForConversationUrl(page);
  return { page, url };
}

async function dispatchWork({
  adapter,
  lane,
  registryLane,
  directive,
  execute,
  registry,
  registryPath,
  logPath
}) {
  if (registryLane.awaiting_work) {
    if (
      registryLane.task_id === directive.task_id &&
      registryLane.instruction_digest === directive.instruction_digest
    ) {
      return;
    }
    throw new Error("Brain issued a new task while the previous Work task is still running");
  }

  if (registryLane.dispatch_inflight) {
    const outcome = await reconcileDispatchInflight({
      adapter,
      lane,
      registryLane,
      registry,
      registryPath,
      logPath,
      directive
    });
    if (outcome === "CONFIRMED" || outcome === "PENDING" || outcome === "BLOCKED") return;
  }

  let page = null;
  let createNew = !registryLane.work_url;
  let workBody = directive.instruction;

  if (registryLane.work_url) {
    page = await openExactConversation(adapter, registryLane.work_url, { brain: false });
    const probe = await assertConversationSafe(adapter, page, {
      brain: false,
      allowFull: true
    });

    if (probe.snapshot.conversationFull) {
      createNew = true;
      workBody = buildWorkRolloverInstruction({
        projectName: lane.project_name,
        taskId: directive.task_id,
        instruction: directive.instruction
      });
    } else if (
      probe.classification.observation === OBSERVATIONS.ASSISTANT_RUNNING ||
      probe.classification.observation === OBSERVATIONS.USER_PENDING
    ) {
      throw new Error("Work conversation is not idle");
    }
  }

  const dispatchId = sha256([
    lane.lane_id,
    directive.task_id,
    directive.digest
  ].join("|")).slice(0, 32);
  const outgoingInstruction = buildWorkDispatchInstruction({
    taskId: directive.task_id,
    dispatchId,
    instruction: workBody
  });
  const instructionDigest = sha256(outgoingInstruction);
  const baseline = page
    ? await captureSendBaseline(adapter, page)
    : { pre_user_count: 0, pre_max_turn_ordinal: 0 };
  const assignedAt = new Date().toISOString();
  const timing = ensureLaneTaskTiming(registryLane, directive.task_id);
  const assigned = beginTaskAssignment(timing, {
    taskId: directive.task_id,
    directiveDigest: directive.digest,
    at: assignedAt
  });

  registryLane.dispatch_inflight = {
    task_id: directive.task_id,
    dispatch_id: dispatchId,
    instruction_digest: instructionDigest,
    directive_instruction_digest: directive.instruction_digest,
    directive_digest: directive.digest,
    create_new: createNew,
    ...baseline
  };
  await atomicJsonWrite(registryPath, registry);

  if (assigned.changed) {
    await emitLaneEvent({
      timestamp: assignedAt,
      lane_id: lane.lane_id,
      actor: "BRAIN",
      event_type: LANE_EVENT_TYPES.BRAIN_TASK_ASSIGNED,
      task_id: directive.task_id,
      phase: "ASSIGNED",
      work_generation: Number(registryLane.work_generation || 0)
    });
  }

  if (!execute) return;

  let workUrl = registryLane.work_url;
  try {
    if (createNew) {
      const created = await createWorkConversation(adapter, outgoingInstruction);
      page = created.page;
      workUrl = created.url;
      registryLane.work_generation += 1;
    } else {
      const sent = await sendComposerInstruction(
        page,
        outgoingInstruction,
        { dryRun: false }
      );
      if (!sent.executed) {
        await safeLog(logPath, {
          type: "LANE_WORK_SEND_NOT_EXECUTED",
          laneId: lane.lane_id,
          taskId: directive.task_id,
          digest: instructionDigest,
          reason: sent.reason || "unknown"
        });
        return;
      }
    }
  } catch (error) {
    await safeLog(logPath, {
      type: "LANE_WORK_SEND_ATTEMPT_ERROR",
      laneId: lane.lane_id,
      taskId: directive.task_id,
      digest: instructionDigest,
      errorName: error?.name || "Error",
      reason: String(error?.message || error).slice(0, 220)
    });
    return;
  }

  const confirmed = await waitForUserTurnMarker(
    page,
    workDispatchMarker(dispatchId)
  );
  if (!confirmed) {
    // Persist a discovered conversation URL even while the send itself still
    // needs reconciliation. This lets the next loop hard-reload the exact
    // Work target and prove whether the instruction reached the server.
    if (workUrl) registryLane.work_url = workUrl;
    await atomicJsonWrite(registryPath, registry);
    await safeLog(logPath, {
      type: "LANE_WORK_SEND_PENDING_CONFIRMATION",
      laneId: lane.lane_id,
      taskId: directive.task_id,
      digest: instructionDigest
    });
    return;
  }

  await finalizeConfirmedDispatch({
    foundUrl: workUrl,
    registryLane,
    latch: registryLane.dispatch_inflight,
    registry,
    registryPath
  });
  await safeLog(logPath, {
    type: createNew ? "LANE_WORK_CREATED" : "LANE_WORK_DISPATCHED",
    laneId: lane.lane_id,
    taskId: directive.task_id,
    digest: instructionDigest
  });
}

async function reconcileRelayInflight({
  adapter,
  lane,
  brainPage,
  registryLane,
  registry,
  registryPath,
  logPath
}) {
  const latch = registryLane.relay_inflight;
  if (!latch) return "NONE";

  // v43 and older may have persisted a terminal reconcile_blocked latch after
  // unrelated Brain activity changed the old text/baseline heuristic. Relay
  // recovery remains marker-authoritative; blocked is migration metadata only.
  if (latch.reconcile_blocked) {
    latch.reconcile_blocked = false;
    delete latch.reconcile_started_at;
    delete latch.reconcile_reloaded;
    delete latch.reconcile_runtime_version;
    await atomicJsonWrite(registryPath, registry);
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_BLOCKED_LATCH_RECOVERED",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: latch.relay_id,
      digest: latch.response_digest
    });
  }

  let markerPresent = await hasRelayMarker(brainPage, latch.relay_id);
  if (markerPresent) {
    await finalizeConfirmedRelay({
      registryLane,
      registry,
      registryPath,
      latch
    });
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_RECONCILE_CONFIRMED",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: latch.relay_id,
      digest: latch.response_digest
    });
    return "CONFIRMED";
  }

  const retryState = relayRetryState(latch);
  if (retryState === RELAY_RETRY_STATES.EXHAUSTED) {
    return "EXHAUSTED";
  }
  if (retryState === RELAY_RETRY_STATES.WAIT) {
    return "PENDING";
  }

  // A latch with no completed send attempt (including a pre-v48 latch left
  // behind by a pre-send UI failure) is safe to retry with the same evidence.
  if (
    Number(latch.attempt_count || 0) === 0 ||
    latch.last_attempt_state === "RETRY_SCHEDULED" ||
    latch.last_attempt_state === "PRE_SEND_FAILED"
  ) {
    return "RETRY_READY";
  }

  const observed = await waitForStableSendSurface(adapter, brainPage, {
    brain: true,
    timeoutMs: 4_000
  });
  markerPresent = await hasRelayMarker(brainPage, latch.relay_id);

  const outcome = classifyRelayMarkerState({
    markerPresent,
    brainStable: Boolean(observed.stable && observed.probe)
  });

  if (outcome === "CONFIRMED") {
    await finalizeConfirmedRelay({
      registryLane,
      registry,
      registryPath,
      latch
    });
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_RECONCILE_CONFIRMED",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: latch.relay_id,
      digest: latch.response_digest
    });
    return "CONFIRMED";
  }

  if (outcome === "PENDING") {
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_RECONCILE_PENDING",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: latch.relay_id,
      digest: latch.response_digest
    });
    return "PENDING";
  }

  // Stable Brain + missing relay marker proves the previous send did not
  // persist. Keep the same latch/screenshot, back off, and count the attempt
  // instead of clearing evidence and recapturing forever.
  const scheduled = scheduleRelayRetry(latch);
  await atomicJsonWrite(registryPath, registry);
  await safeLog(logPath, {
    type: scheduled === RELAY_RETRY_STATES.EXHAUSTED
      ? "LANE_RESULT_RELAY_RETRY_EXHAUSTED"
      : "LANE_RESULT_RELAY_NOT_CONFIRMED_RETRY",
    laneId: lane.lane_id,
    taskId: registryLane.task_id,
    relayId: latch.relay_id,
    digest: latch.response_digest,
    reason: `attempts=${Number(latch.attempt_count || 0)}`
  });
  return scheduled === RELAY_RETRY_STATES.EXHAUSTED
    ? "EXHAUSTED"
    : "PENDING";
}

async function relayWorkResult({
  adapter,
  lane,
  brainPage,
  workPage,
  registryLane,
  captured,
  execute,
  registry,
  registryPath,
  evidenceDir,
  logPath
}) {
  const relay = buildLaneResultRelay({
    laneId: lane.lane_id,
    projectName: lane.project_name,
    taskId: registryLane.task_id,
    generation: registryLane.work_generation,
    responseText: captured.text
  });

  if (
    registryLane.last_result_relay_id === relay.relay_id ||
    await hasRelayMarker(brainPage, relay.relay_id)
  ) {
    await finalizeConfirmedRelay({
      registryLane,
      registry,
      registryPath,
      latch: {
        relay_id: relay.relay_id,
        response_digest: relay.response_digest
      }
    });
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_DEDUPED_BY_MARKER",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: relay.relay_id,
      digest: relay.response_digest
    });
    return "CONFIRMED";
  }

  let latch = registryLane.relay_inflight;
  if (latch) {
    const outcome = await reconcileRelayInflight({
      adapter,
      lane,
      brainPage,
      registryLane,
      registry,
      registryPath,
      logPath
    });
    if (
      outcome === "CONFIRMED" ||
      outcome === "PENDING" ||
      outcome === "EXHAUSTED"
    ) {
      return outcome;
    }
    latch = registryLane.relay_inflight;
  }

  const brainProbe = await assertConversationSafe(adapter, brainPage, { brain: true });
  if (brainProbe.classification.observation !== OBSERVATIONS.RESPONSE_COMPLETE) {
    return "PENDING";
  }

  if (!latch) {
    await fs.mkdir(evidenceDir, { recursive: true });
    const screenshotPath = path.join(
      evidenceDir,
      `${lane.lane_id}-${relay.relay_id}.png`
    );
    await captureCompletedAssistantTurnScreenshot(workPage, screenshotPath);
    const screenshotStat = await fs.stat(screenshotPath);
    if (!screenshotStat.isFile() || screenshotStat.size <= 0) {
      await fs.unlink(screenshotPath).catch(() => {});
      throw new Error("Work result screenshot was not created correctly");
    }
    await safeLog(logPath, {
      type: "LANE_RESULT_SCREENSHOT_CAPTURED",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: relay.relay_id,
      digest: relay.response_digest
    });

    const relayBaseline = await captureSendBaseline(adapter, brainPage);
    latch = {
      relay_id: relay.relay_id,
      response_digest: relay.response_digest,
      text_digest: sha256(relay.text),
      screenshot_path: screenshotPath,
      attempt_count: 0,
      retry_not_before: null,
      retry_exhausted: false,
      last_attempt_state: "READY",
      ...relayBaseline
    };
    registryLane.relay_inflight = latch;
    await atomicJsonWrite(registryPath, registry);
  }

  if (relayRetryState(latch) === RELAY_RETRY_STATES.EXHAUSTED) {
    return "EXHAUSTED";
  }

  const screenshotPath = String(latch.screenshot_path || "").trim();
  const screenshotStat = screenshotPath
    ? await fs.stat(screenshotPath).catch(() => null)
    : null;
  if (!screenshotStat?.isFile() || screenshotStat.size <= 0) {
    await clearRelayInflight(registryLane);
    await atomicJsonWrite(registryPath, registry);
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_EVIDENCE_MISSING",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: relay.relay_id,
      digest: relay.response_digest
    });
    return "PENDING";
  }

  if (!execute) return "PENDING";

  beginRelaySendAttempt(latch);
  await atomicJsonWrite(registryPath, registry);

  let sent = null;
  try {
    sent = await sendComposerWithAttachment(
      brainPage,
      relay.text,
      screenshotPath,
      { dryRun: false }
    );
  } catch (error) {
    latch.last_attempt_state = "PRE_SEND_FAILED";
    const scheduled = scheduleRelayRetry(latch);
    await atomicJsonWrite(registryPath, registry);
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_ATTEMPT_ERROR",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: relay.relay_id,
      digest: relay.response_digest,
      errorName: error?.name || "Error",
      reason: String(error?.message || error).slice(0, 180)
    });
    if (scheduled === RELAY_RETRY_STATES.EXHAUSTED) {
      await safeLog(logPath, {
        type: "LANE_RESULT_RELAY_RETRY_EXHAUSTED",
        laneId: lane.lane_id,
        taskId: registryLane.task_id,
        relayId: relay.relay_id,
        digest: relay.response_digest,
        reason: `attempts=${latch.attempt_count}`
      });
      return "EXHAUSTED";
    }
    return "PENDING";
  }

  if (!sent.executed) {
    latch.last_attempt_state = "PRE_SEND_FAILED";
    const scheduled = scheduleRelayRetry(latch);
    await atomicJsonWrite(registryPath, registry);
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_NOT_EXECUTED",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: relay.relay_id,
      digest: relay.response_digest,
      reason: sent.reason || "unknown"
    });
    if (scheduled === RELAY_RETRY_STATES.EXHAUSTED) {
      await safeLog(logPath, {
        type: "LANE_RESULT_RELAY_RETRY_EXHAUSTED",
        laneId: lane.lane_id,
        taskId: registryLane.task_id,
        relayId: relay.relay_id,
        digest: relay.response_digest,
        reason: `attempts=${latch.attempt_count}`
      });
      return "EXHAUSTED";
    }
    return "PENDING";
  }

  latch.last_attempt_state = "SEND_CLICKED";
  latch.retry_not_before = null;
  await atomicJsonWrite(registryPath, registry);
  await safeLog(logPath, {
    type: "LANE_RESULT_RELAY_SEND_CLICKED",
    laneId: lane.lane_id,
    taskId: registryLane.task_id,
    relayId: relay.relay_id,
    digest: relay.response_digest
  });

  const relayConfirmed = await waitForRelayMarker(
    brainPage,
    relay.relay_id
  );
  if (!relayConfirmed) {
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_PENDING_CONFIRMATION",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: relay.relay_id,
      digest: relay.response_digest
    });
    return "PENDING";
  }

  await finalizeConfirmedRelay({
    registryLane,
    registry,
    registryPath,
    latch: {
      relay_id: relay.relay_id,
      response_digest: relay.response_digest
    }
  });
  await safeLog(logPath, {
    type: "LANE_WORK_RESULT_RELAYED",
    laneId: lane.lane_id,
    taskId: registryLane.task_id,
    relayId: relay.relay_id,
    digest: relay.response_digest
  });
  return "CONFIRMED";
}

async function applyOwnerBrainTarget({
  lane,
  registryLane,
  registry,
  registryPath,
  logPath
}) {
  const revision = Number(lane.brain_url_revision || 0);
  if (revision <= Number(registryLane.applied_brain_url_revision || 0)) {
    return false;
  }

  const raw = String(lane.brain_url || "").trim();
  let configuredUrl = "";
  if (raw) {
    try {
      configuredUrl = normalizeChatGptConversationUrl(raw);
    } catch {
      throw new Error("LINK BỘ NÃO không hợp lệ. Hãy dán link cuộc trò chuyện ChatGPT dùng làm Bộ não.");
    }
  }

  const changed = configuredUrl !== String(registryLane.brain_url || "");
  if (changed) {
    await clearRelayInflight(registryLane);

    registryLane.brain_url = configuredUrl;
    registryLane.brain_request_sent = false;
    registryLane.brain_request_inflight = null;
    registryLane.last_brain_directive_digest = null;

    // A blocked Work-dispatch latch belongs to the old Brain directive. An
    // explicit Owner Brain change is the authority to abandon that blocked
    // directive, but only when no Work result is actively pending.
    if (
      !registryLane.awaiting_work &&
      registryLane.dispatch_inflight?.reconcile_blocked
    ) {
      await safeLog(logPath, {
        type: "LANE_OWNER_BRAIN_REBASE_CANCELLED_BLOCKED_DISPATCH",
        laneId: lane.lane_id,
        taskId: registryLane.dispatch_inflight.task_id,
        digest: registryLane.dispatch_inflight.instruction_digest
      });
      registryLane.dispatch_inflight = null;
      registryLane.task_id = null;
      registryLane.instruction_digest = null;
      registryLane.task_timing = normalizeTaskTiming(null);
    }

    // A relay latch is target-specific. When Owner changes Brain, its evidence
    // has already been cleaned above; keep the active Work task/result pending
    // so it can be relayed to the newly selected Brain exactly once.

    await safeLog(logPath, {
      type: "LANE_OWNER_BRAIN_TARGET_CHANGED",
      laneId: lane.lane_id,
      digest: configuredUrl ? sha256(configuredUrl) : "NONE"
    });
  }

  registryLane.applied_brain_url_revision = revision;
  await atomicJsonWrite(registryPath, registry);
  return changed;
}

async function emitWorkTargetTransition({
  lane,
  registryLane,
  eventType,
  phase,
  reasonCode,
  revision
}) {
  await emitLaneEvent({
    lane_id: lane.lane_id,
    actor: "SUPERVISOR",
    event_type: eventType,
    task_id: registryLane.task_id || undefined,
    phase,
    reason_code: reasonCode,
    work_generation: Number(registryLane.work_generation || 0),
    work_url_revision: Number(revision || 0)
  });
}

async function applyOwnerWorkStateReset({
  lane,
  registryLane,
  registry,
  registryPath,
  logPath
}) {
  const revision = Number(lane.work_state_reset_revision || 0);
  if (revision <= Number(registryLane.applied_work_state_reset_revision || 0)) {
    return false;
  }

  // Destructive state reset is reserved for the explicit Owner-authorized
  // maintenance workflow. Work target save/hot-swap never enters this path.
  await clearRelayInflight(registryLane);
  registryLane.task_id = null;
  registryLane.instruction_digest = null;
  registryLane.last_brain_directive_digest = null;
  registryLane.last_work_result_digest = null;
  registryLane.last_result_relay_id = null;
  registryLane.dispatch_inflight = null;
  registryLane.brain_request_inflight = null;
  registryLane.awaiting_work = false;
  registryLane.task_timing = normalizeTaskTiming(null);
  registryLane.pending_work_url = "";
  registryLane.pending_work_url_revision = 0;
  registryLane.pending_work_saved_at = null;
  registryLane.pending_work_mode = null;
  registryLane.work_generation = Number(registryLane.work_generation || 0) + 1;
  registryLane.applied_work_state_reset_revision = revision;

  await atomicJsonWrite(registryPath, registry);
  await safeLog(logPath, {
    type: "LANE_OWNER_MAINTENANCE_WORK_STATE_RESET",
    laneId: lane.lane_id,
    reason: `reset_revision=${revision}`
  });
  return true;
}

async function applyOwnerWorkTarget({
  lane,
  registryLane,
  registry,
  registryPath,
  logPath
}) {
  const revision = Number(lane.work_url_revision || 0);
  const latestSeenRevision = Math.max(
    Number(registryLane.applied_work_url_revision || 0),
    Number(registryLane.pending_work_url_revision || 0)
  );
  if (revision <= latestSeenRevision) {
    return false;
  }

  const mode = String(lane.work_mode || "").toUpperCase() === WORK_TARGET_MODES.AUTO
    ? WORK_TARGET_MODES.AUTO
    : WORK_TARGET_MODES.OWNER;
  const raw = String(lane.work_url || "").trim();
  let configuredUrl = "";

  if (mode === WORK_TARGET_MODES.OWNER) {
    if (!raw) {
      throw new Error("LINK WORK không hợp lệ. LƯU WORK cần một cuộc trò chuyện ChatGPT cụ thể.");
    }
    try {
      configuredUrl = normalizeChatGptConversationUrl(raw);
    } catch {
      throw new Error("LINK WORK không hợp lệ. Hãy dán link cuộc trò chuyện ChatGPT hoặc dùng TỰ TẠO WORK.");
    }
  }

  const outcome = acceptOwnerWorkTargetRevision(registryLane, {
    url: configuredUrl,
    mode,
    revision,
    saved_at: lane.work_url_saved_at || null
  });

  if (outcome.status === "NOOP") return false;

  await atomicJsonWrite(registryPath, registry);
  await safeLog(logPath, {
    type: "LANE_OWNER_WORK_TARGET_REVISION",
    laneId: lane.lane_id,
    taskId: registryLane.task_id,
    reason: `revision=${revision};state=${outcome.status};mode=${mode}`
  });

  await emitWorkTargetTransition({
    lane,
    registryLane,
    eventType: LANE_EVENT_TYPES.WORK_TARGET_SAVED,
    phase: "SAVED",
    reasonCode: "OWNER_WORK_REVISION",
    revision
  });

  if (outcome.status === "PENDING") {
    await emitWorkTargetTransition({
      lane,
      registryLane,
      eventType: LANE_EVENT_TYPES.WORK_TARGET_PENDING,
      phase: "PENDING",
      reasonCode: "ACTIVE_WORK_PRESERVED",
      revision
    });
  } else {
    await emitWorkTargetTransition({
      lane,
      registryLane,
      eventType: LANE_EVENT_TYPES.WORK_TARGET_APPLIED,
      phase: "APPLIED",
      reasonCode: outcome.status === "ACKNOWLEDGED"
        ? "SAME_TARGET_NO_CHURN"
        : "OWNER_WORK_REVISION",
      revision
    });
  }

  return true;
}

async function applyPendingWorkTargetAtSafeBoundary({
  lane,
  registryLane,
  registry,
  registryPath,
  logPath
}) {
  const outcome = applyPendingWorkTargetIfSafe(registryLane);
  if (outcome.status === "NONE" || outcome.status === "PENDING") {
    return outcome;
  }

  // NOOP may clear a stale pending revision; persist that normalization.
  await atomicJsonWrite(registryPath, registry);

  if (outcome.status === "APPLIED") {
    await safeLog(logPath, {
      type: "LANE_OWNER_WORK_TARGET_APPLIED",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      reason: `revision=${outcome.revision};mode=${outcome.mode};safe_boundary=true`
    });
    await emitWorkTargetTransition({
      lane,
      registryLane,
      eventType: LANE_EVENT_TYPES.WORK_TARGET_APPLIED,
      phase: "APPLIED",
      reasonCode: "SAFE_BOUNDARY",
      revision: outcome.revision
    });
  }

  return outcome;
}

async function processLane({
  adapter,
  lane,
  registryLane,
  execute,
  registry,
  registryPath,
  evidenceDir,
  logPath
}) {
  if (!lane.enabled) {
    return laneStatus(lane, registryLane, "STOPPED", "Luồng đang dừng.");
  }

  await applyOwnerBrainTarget({
    lane,
    registryLane,
    registry,
    registryPath,
    logPath
  });

  let brainUrl = null;
  try {
    brainUrl = normalizeChatGptConversationUrl(registryLane.brain_url);
  } catch (error) {
    return laneStatus(lane, registryLane, "NEED_BRAIN_URL", error.message);
  }
  if (!brainUrl) {
    return laneStatus(
      lane,
      registryLane,
      "NEED_BRAIN_URL",
      "Nhập URL cuộc trò chuyện Bộ não rồi bấm LƯU BỘ NÃO hoặc BẮT ĐẦU LUỒNG."
    );
  }

  await applyOwnerWorkStateReset({
    lane,
    registryLane,
    registry,
    registryPath,
    logPath
  });

  await applyOwnerWorkTarget({
    lane,
    registryLane,
    registry,
    registryPath,
    logPath
  });

  await applyPendingWorkTargetAtSafeBoundary({
    lane,
    registryLane,
    registry,
    registryPath,
    logPath
  });

  const brainPage = await openExactConversation(adapter, brainUrl, { brain: true });
  const brainProbe = await assertConversationSafe(adapter, brainPage, { brain: true });

  if (registryLane.relay_inflight) {
    const relayOutcome = await reconcileRelayInflight({
      adapter,
      lane,
      brainPage,
      registryLane,
      registry,
      registryPath,
      logPath
    });
    if (relayOutcome === "EXHAUSTED") {
      return laneStatus(
        lane,
        registryLane,
        "WAIT_OWNER",
        "Robot đã thử gửi kết quả 3 lần nhưng ô nhập Bộ não vẫn không sẵn sàng. Đã dừng retry để tránh vòng lặp; không có gửi trùng."
      );
    }
    if (relayOutcome === "PENDING") {
      return laneStatus(
        lane,
        registryLane,
        "RECOVERING",
        "Đang chờ xác minh/backoff lần gửi kết quả trước; Robot không tải lại hoặc gửi lặp liên tục."
      );
    }
  }
  if (registryLane.dispatch_inflight) {
    const dispatchOutcome = await reconcileDispatchInflight({
      adapter,
      lane,
      registryLane,
      registry,
      registryPath,
      logPath,
      brainPage
    });
    if (dispatchOutcome === "PENDING") {
      return laneStatus(
        lane,
        registryLane,
        "RECOVERING",
        "Đang tự xác minh lần gửi Work trước; chỉ quan sát, không tải lại trang lặp lại."
      );
    }
    if (dispatchOutcome === "BLOCKED") {
      return laneStatus(
        lane,
        registryLane,
        "WAIT_OWNER",
        "Work chat có thay đổi ngoài dự kiến; Robot đã dừng tự gửi lại để tránh trùng."
      );
    }
  }

  await applyPendingWorkTargetAtSafeBoundary({
    lane,
    registryLane,
    registry,
    registryPath,
    logPath
  });

  if (registryLane.awaiting_work) {
    if (!registryLane.work_url) {
      throw new Error("Work URL is missing while a result is pending");
    }
    const workPage = await openExactConversation(adapter, registryLane.work_url, { brain: false });
    const workProbe = await assertConversationSafe(adapter, workPage, {
      brain: false,
      allowFull: true
    });

    const activityAt = new Date().toISOString();
    const timing = ensureLaneTaskTiming(registryLane, registryLane.task_id);
    const activity = observeWorkActivity(
      timing,
      buildSafeWorkObservation(
        workProbe.snapshot,
        workProbe.classification.observation === OBSERVATIONS.RESPONSE_COMPLETE
      ),
      { at: activityAt }
    );
    if (activity.baseline_initialized || activity.changed) {
      await atomicJsonWrite(registryPath, registry);
      if (activity.event_due) {
        await emitLaneEvent({
          timestamp: activityAt,
          lane_id: lane.lane_id,
          actor: "WORK",
          event_type: LANE_EVENT_TYPES.WORK_ACTIVITY,
          task_id: registryLane.task_id,
          phase: "WORKING",
          reason_code: activity.reason_code,
          work_generation: Number(registryLane.work_generation || 0),
          ...timingEventFields(timing, activityAt)
        });
      }
    }

    if (hardStopObservation(workProbe.classification.observation)) {
      return laneStatus(
        lane,
        registryLane,
        "WAIT_OWNER",
        "Work chat cần bạn xử lý đăng nhập/xác minh hoặc điều kiện an toàn."
      );
    }

    if (workProbe.classification.observation !== OBSERVATIONS.RESPONSE_COMPLETE) {
      return laneStatus(
        lane,
        registryLane,
        "WORKING",
        `Đang thực hiện ${registryLane.task_id || "công việc hiện tại"}.`
      );
    }

    const captured = await captureCompletedAssistantTurn(workPage);
    if (!captured) {
      return laneStatus(
        lane,
        registryLane,
        "WORKING",
        "Đang chờ Work chat hoàn tất câu trả lời."
      );
    }

    if (
      captured.digest === registryLane.last_work_result_digest &&
      registryLane.last_result_relay_id
    ) {
      registryLane.awaiting_work = false;
      await atomicJsonWrite(registryPath, registry);
    } else {
      const completedAt = new Date().toISOString();
      const completionTiming = ensureLaneTaskTiming(
        registryLane,
        registryLane.task_id
      );
      const completed = markTaskCompleted(completionTiming, {
        taskId: registryLane.task_id,
        at: completedAt
      });
      if (completed.changed) {
        await atomicJsonWrite(registryPath, registry);
        await emitLaneEvent({
          timestamp: completedAt,
          lane_id: lane.lane_id,
          actor: "WORK",
          event_type: LANE_EVENT_TYPES.WORK_COMPLETED,
          task_id: registryLane.task_id,
          phase: "COMPLETED",
          work_generation: Number(registryLane.work_generation || 0),
          ...timingEventFields(completionTiming, completedAt)
        });
      }

      const relayOutcome = await relayWorkResult({
        adapter,
        lane,
        brainPage,
        workPage,
        registryLane,
        captured,
        execute,
        registry,
        registryPath,
        evidenceDir,
        logPath
      });
      if (registryLane.awaiting_work) {
        if (relayOutcome === "EXHAUSTED") {
          return laneStatus(
            lane,
            registryLane,
            "WAIT_OWNER",
            "Robot đã thử gửi kết quả 3 lần nhưng ô nhập Bộ não vẫn không sẵn sàng. Đã dừng retry để tránh vòng lặp; không có gửi trùng."
          );
        }
        if (relayOutcome === "PENDING") {
          return laneStatus(
            lane,
            registryLane,
            "RECOVERING",
            "Kết quả Work đã sẵn sàng; Robot đang backoff/xác minh lần gửi trước."
          );
        }
        return laneStatus(
          lane,
          registryLane,
          "RELAYING_RESULT",
          "Đã nhận kết quả Work; đang gửi ảnh và toàn bộ nội dung về Bộ não."
        );
      }
    }

    await applyPendingWorkTargetAtSafeBoundary({
      lane,
      registryLane,
      registry,
      registryPath,
      logPath
    });

    return laneStatus(
      lane,
      registryLane,
      "WAITING_BRAIN",
      "Đã gửi kết quả về Bộ não; đang chờ lệnh tiếp theo."
    );
  }

  let directive = null;
  if (!registryLane.brain_request_sent) {
    directive = await ensureBrainRequest({
      adapter,
      page: brainPage,
      lane,
      registryLane,
      execute,
      registry,
      registryPath,
      logPath
    });
    if (!directive) {
      return laneStatus(
        lane,
        registryLane,
        "WAITING_BRAIN",
        "Đang chờ Bộ não giao công việc đầu tiên."
      );
    }
  }

  if (!directive && brainProbe.classification.observation !== OBSERVATIONS.RESPONSE_COMPLETE) {
    return laneStatus(
      lane,
      registryLane,
      "WAITING_BRAIN",
      "Bộ não đang trả lời hoặc chưa sẵn sàng."
    );
  }

  if (!directive) {
    const captured = await captureCompletedAssistantTurn(brainPage);
    if (!captured) {
      return laneStatus(
        lane,
        registryLane,
        "WAITING_BRAIN",
        "Đang chờ Bộ não trả lệnh."
      );
    }

    try {
      directive = parseLaneDirective(captured.text);
    } catch {
      return laneStatus(
        lane,
        registryLane,
        "WAITING_BRAIN",
        "Bộ não chưa trả block MAGASIN_LANE_DIRECTIVE_V1 hợp lệ."
      );
    }
  }

  if (directive.digest === registryLane.last_brain_directive_digest) {
    return laneStatus(
      lane,
      registryLane,
      directive.action === "IDLE" ? "READY" : "WAITING_BRAIN",
      directive.action === "IDLE"
        ? "Bộ não chưa có công việc mới."
        : "Đang chờ trạng thái Work thay đổi."
    );
  }

  if (directive.action === "IDLE") {
    registryLane.last_brain_directive_digest = directive.digest;
    registryLane.task_id = null;
    registryLane.instruction_digest = null;
    await atomicJsonWrite(registryPath, registry);
    return laneStatus(
      lane,
      registryLane,
      "READY",
      "Bộ não chưa có công việc mới."
    );
  }

  await dispatchWork({
    adapter,
    lane,
    registryLane,
    directive,
    execute,
    registry,
    registryPath,
    logPath
  });

  return laneStatus(
    lane,
    registryLane,
    registryLane.awaiting_work ? "WORKING" : "STARTING",
    registryLane.awaiting_work
      ? `Đang thực hiện ${registryLane.task_id}.`
      : "Đang tạo hoặc gửi lệnh cho Work chat."
  );
}

const args = parseArgs(process.argv.slice(2));
if (args.workTargetFixture) {
  await import("./work-target-acceptance-cli.mjs");
  process.exit(0);
}
if (!Number.isFinite(args.pollMs) || args.pollMs < 1000) {
  throw new TypeError("poll-ms must be at least 1000");
}

const root = localRoot();
const configPath = path.join(root, "lanes.json");
const registryPath = path.join(root, "lane-registry.json");
const statusPath = path.join(root, "lane-status.json");
const evidenceDir = path.join(root, "lane-evidence");
const logPath = path.join(root, "supervisor.log");
const eventPath = path.join(root, "lane-events.ndjson");
const stopPath = path.join(root, "STOP");

laneEventErrorLogPath = logPath;
laneEventSink = createLaneEventSink({ filePath: eventPath });

let config = normalizeLaneConfig(
  await readJson(configPath, defaultLaneConfig())
);
let registry = normalizeLaneRegistry(
  await readJson(registryPath, defaultLaneRegistry())
);
const startupRelayMigrations = migrateLegacyBlockedRelayLatches(registry);
await atomicJsonWrite(configPath, config);
await atomicJsonWrite(registryPath, registry);
if (startupRelayMigrations > 0) {
  await safeLog(logPath, {
    type: "RUNTIME_RELAY_BLOCKED_LATCHES_MIGRATED",
    reason: `count=${startupRelayMigrations}`
  });
}
await cleanupOrphanRelayEvidence({
  evidenceDir,
  registry,
  logPath
});

const statuses = {};
let evidenceCleanupTicks = 0;
let adapter = null;
let cdpRecoveryFailures = 0;
let restartRequested = false;

await safeLog(logPath, {
  type: "RUNTIME_BOOT",
  reason: `version=${SUPERVISOR_RUNTIME_VERSION};mode=${THREE_LANE_MODE}`
});
await emitLaneEvent({
  actor: "SUPERVISOR",
  event_type: LANE_EVENT_TYPES.RECOVERY,
  phase: "RECOVERY",
  reason_code: "RUNTIME_BOOT"
});

try {
  adapter = new ChatGptUiAdapter({ cdpUrl: args.cdpUrl });
  await adapter.open();

  while (true) {
    try {
      await fs.access(stopPath);
      for (const lane of config.lanes) {
        statuses[lane.lane_id] = laneStatus(
          lane,
          registry.lanes[lane.lane_id],
          "STOPPED",
          "Supervisor đã dừng."
        );
      }
      await writeLaneStatus(statusPath, statuses);
      break;
    } catch {}

    config = normalizeLaneConfig(
      await readJson(configPath, defaultLaneConfig())
    );
    registry = normalizeLaneRegistry(
      await readJson(registryPath, defaultLaneRegistry())
    );
    const loopRelayMigrations = migrateLegacyBlockedRelayLatches(registry);
    if (loopRelayMigrations > 0) {
      await atomicJsonWrite(registryPath, registry);
      await safeLog(logPath, {
        type: "RUNTIME_RELAY_BLOCKED_LATCHES_MIGRATED",
        reason: `count=${loopRelayMigrations}`
      });
    }

    evidenceCleanupTicks += 1;
    if (evidenceCleanupTicks >= 12) {
      await cleanupOrphanRelayEvidence({
        evidenceDir,
        registry,
        logPath
      });
      evidenceCleanupTicks = 0;
    }

    for (const lane of config.lanes) {
      const registryLane = registry.lanes[lane.lane_id];
      try {
        statuses[lane.lane_id] = await processLane({
          adapter,
          lane,
          registryLane,
          execute: args.execute,
          registry,
          registryPath,
          evidenceDir,
          logPath
        });
        if (lane.enabled) cdpRecoveryFailures = 0;
      } catch (error) {
        const transient = isTransientNavigationError(error);
        let reconnected = false;
        if (transient) {
          reconnected = await adapter.reconnectOverCdp()
            .then(() => true)
            .catch(() => false);
          if (reconnected) {
            cdpRecoveryFailures = 0;
          } else {
            cdpRecoveryFailures += 1;
          }
        }
        statuses[lane.lane_id] = laneStatus(
          lane,
          registryLane,
          transient ? "RECOVERING" : "WAIT_OWNER",
          transient
            ? "Mất kết nối tạm thời; Robot đang tự kết nối lại và sẽ thử tiếp."
            : String(error?.message || error).slice(0, 220),
          { error_name: error?.name || "Error" }
        );
        await safeLog(logPath, {
          type: "LANE_ERROR",
          laneId: lane.lane_id,
          taskId: registryLane.task_id,
          errorName: error?.name || "Error",
          reason: String(error?.message || error).slice(0, 240)
        });
        await emitLaneEvent({
          lane_id: lane.lane_id,
          actor: "SUPERVISOR",
          event_type: transient
            ? LANE_EVENT_TYPES.RECOVERY
            : LANE_EVENT_TYPES.ERROR,
          task_id: registryLane.task_id,
          phase: transient ? "RECOVERY" : "ERROR",
          reason_code: transient
            ? "TRANSIENT_NAVIGATION_ERROR"
            : "LANE_PROCESSING_ERROR",
          work_generation: Number(registryLane.work_generation || 0)
        });

        if (transient && !reconnected && cdpRecoveryFailures >= 3) {
          restartRequested = true;
          await safeLog(logPath, {
            type: "RUNTIME_CDP_RESTART_REQUESTED",
            laneId: lane.lane_id,
            taskId: registryLane.task_id,
            reason: "bounded transient CDP reconnect budget exhausted"
          });
          await emitLaneEvent({
            lane_id: lane.lane_id,
            actor: "SUPERVISOR",
            event_type: LANE_EVENT_TYPES.RECOVERY,
            task_id: registryLane.task_id,
            phase: "RECOVERY",
            reason_code: "CDP_RESTART_REQUESTED",
            work_generation: Number(registryLane.work_generation || 0)
          });
          break;
        }
      }
    }

    await writeLaneStatus(statusPath, statuses);
    if (restartRequested) {
      process.exitCode = 75;
      break;
    }
    await delay(args.pollMs);
  }
} finally {
  await adapter?.close().catch(() => {});
}
