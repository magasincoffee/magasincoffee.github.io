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
  captureUserTurnDigests,
  captureUserTurnTexts
} from "../ui/message-capture.mjs";
import { OBSERVATIONS } from "../decision.mjs";
import { pageMatchesTarget, targetFromUrl } from "./recovery.mjs";
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
  buildLaneResultRelay
} from "./three-lane.mjs";

const SUPERVISOR_RUNTIME_VERSION = "2026-09-19.40";

function parseArgs(argv) {
  const result = {
    cdpUrl: "http://127.0.0.1:9222",
    execute: false,
    pollMs: 4000
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--cdp-url") result.cdpUrl = argv[++i];
    else if (key === "--execute") result.execute = true;
    else if (key === "--poll-ms") result.pollMs = Number(argv[++i]);
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
  await page.waitForURL((value) => {
    try {
      targetFromUrl(String(value));
      return true;
    } catch {
      return false;
    }
  }, { timeout: 45_000 });

  // ChatGPT may briefly expose an internal /c/WEB:<uuid> route immediately
  // after a new conversation is created. Store only the canonical target so
  // the next exact restore opens the same conversation successfully.
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

function relayMarker(relayId) {
  return `relay_id=${relayId}`;
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
  preUserCount,
  preMaxTurnOrdinal,
  brain = false,
  reload = false
}) {
  if (await waitForUserTurnDigest(page, digest, { timeoutMs: 1200 })) {
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
  if (digests.includes(digest)) return "CONFIRMED";
  if (!observed.stable || !observed.probe) return "PENDING";

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
  if (foundUrl) registryLane.work_url = foundUrl;
  registryLane.task_id = latch.task_id;
  registryLane.instruction_digest = latch.instruction_digest;
  registryLane.awaiting_work = true;
  registryLane.dispatch_inflight = null;
  await atomicJsonWrite(registryPath, registry);
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
  if (registryLane.brain_request_sent) return false;
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
    if (outcome === "CONFIRMED") return true;
    if (outcome === "PENDING" || outcome === "BLOCKED") return false;
  }

  const probe = await assertConversationSafe(adapter, page, { brain: true });
  if (probe.classification.observation !== OBSERVATIONS.RESPONSE_COMPLETE) {
    return false;
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

  if (!execute) return false;
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
    return false;
  }
  if (!sent.executed) return false;

  const confirmed = await waitForUserTurnDigest(page, digest);
  if (!confirmed) {
    await safeLog(logPath, {
      type: "LANE_BRAIN_SEND_PENDING_CONFIRMATION",
      laneId: lane.lane_id,
      digest
    });
    return false;
  }

  registryLane.brain_request_sent = true;
  registryLane.brain_request_inflight = null;
  await atomicJsonWrite(registryPath, registry);
  await safeLog(logPath, {
    type: "LANE_BRAIN_REQUEST_SENT",
    laneId: lane.lane_id,
    digest
  });
  return true;
}

async function findWorkConversationByInstruction(adapter, instructionDigest) {
  const candidates = [];
  for (const page of adapter.getChatGptPages()) {
    const digests = await captureUserTurnDigests(page).catch(() => []);
    if (!digests.includes(instructionDigest)) continue;
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
    throw new Error("multiple Work conversations match an uncertain instruction");
  }
  return unique.size === 1 ? [...unique.values()][0] : null;
}

async function reconcileDispatchInflight({
  adapter,
  lane,
  registryLane,
  registry,
  registryPath,
  logPath
}) {
  const latch = registryLane.dispatch_inflight;
  if (!latch) return "NONE";

  const found = await findWorkConversationByInstruction(
    adapter,
    latch.instruction_digest
  );
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
      logPath
    });
    if (outcome === "CONFIRMED" || outcome === "PENDING" || outcome === "BLOCKED") return;
  }

  let page = null;
  let createNew = !registryLane.work_url;
  let outgoingInstruction = directive.instruction;

  if (registryLane.work_url) {
    page = await openExactConversation(adapter, registryLane.work_url, { brain: false });
    const probe = await assertConversationSafe(adapter, page, {
      brain: false,
      allowFull: true
    });

    if (probe.snapshot.conversationFull) {
      createNew = true;
      outgoingInstruction = buildWorkRolloverInstruction({
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

  const instructionDigest = sha256(outgoingInstruction);
  const baseline = page
    ? await captureSendBaseline(adapter, page)
    : { pre_user_count: 0, pre_max_turn_ordinal: 0 };
  registryLane.dispatch_inflight = {
    task_id: directive.task_id,
    instruction_digest: instructionDigest,
    directive_digest: directive.digest,
    create_new: createNew,
    ...baseline
  };
  await atomicJsonWrite(registryPath, registry);

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

  const confirmed = await waitForUserTurnDigest(page, instructionDigest);
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

  registryLane.work_url = workUrl;
  registryLane.task_id = directive.task_id;
  registryLane.instruction_digest = instructionDigest;
  registryLane.last_brain_directive_digest = directive.digest;
  registryLane.awaiting_work = true;
  registryLane.dispatch_inflight = null;
  await atomicJsonWrite(registryPath, registry);
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

  if (latch.reconcile_blocked) return "BLOCKED";
  const reload =
    !latch.reconcile_reloaded ||
    latch.reconcile_runtime_version !== SUPERVISOR_RUNTIME_VERSION;
  if (reload) {
    latch.reconcile_reloaded = true;
    latch.reconcile_runtime_version = SUPERVISOR_RUNTIME_VERSION;
    latch.reconcile_started_at = new Date().toISOString();
    await atomicJsonWrite(registryPath, registry);
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_RECONCILE_RELOAD",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: latch.relay_id,
      digest: latch.response_digest
    });
  }

  if (await hasRelayMarker(brainPage, latch.relay_id)) {
    registryLane.last_result_relay_id = latch.relay_id;
    registryLane.last_work_result_digest = latch.response_digest;
    registryLane.awaiting_work = false;
    registryLane.relay_inflight = null;
    await fs.unlink(latch.screenshot_path).catch(() => {});
    await atomicJsonWrite(registryPath, registry);
    return "CONFIRMED";
  }

  const outcome = await inspectKnownTargetSendOutcome({
    adapter,
    page: brainPage,
    digest: latch.text_digest,
    preUserCount: latch.pre_user_count,
    preMaxTurnOrdinal: latch.pre_max_turn_ordinal,
    brain: true,
    reload
  });

  if (await hasRelayMarker(brainPage, latch.relay_id)) {
    registryLane.last_result_relay_id = latch.relay_id;
    registryLane.last_work_result_digest = latch.response_digest;
    registryLane.awaiting_work = false;
    registryLane.relay_inflight = null;
    await fs.unlink(latch.screenshot_path).catch(() => {});
    await atomicJsonWrite(registryPath, registry);
    return "CONFIRMED";
  }

  if (outcome === "PENDING") return "PENDING";

  if (outcome === "CONFIRMED") {
    registryLane.last_result_relay_id = latch.relay_id;
    registryLane.last_work_result_digest = latch.response_digest;
    registryLane.awaiting_work = false;
    registryLane.relay_inflight = null;
    await fs.unlink(latch.screenshot_path).catch(() => {});
    await atomicJsonWrite(registryPath, registry);
    return "CONFIRMED";
  }

  if (outcome === "NOT_CONFIRMED") {
    registryLane.relay_inflight = null;
    await fs.unlink(latch.screenshot_path).catch(() => {});
    await atomicJsonWrite(registryPath, registry);
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_NOT_CONFIRMED_RETRY",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: latch.relay_id,
      digest: latch.response_digest
    });
    return "NOT_CONFIRMED";
  }

  latch.reconcile_blocked = true;
  await atomicJsonWrite(registryPath, registry);
  await safeLog(logPath, {
    type: "LANE_RESULT_RELAY_RECONCILE_BLOCKED",
    laneId: lane.lane_id,
    taskId: registryLane.task_id,
    relayId: latch.relay_id,
    digest: latch.response_digest,
    reason: "stable Brain target changed without matching relay digest"
  });
  return "BLOCKED";
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
    registryLane.last_result_relay_id = relay.relay_id;
    registryLane.last_work_result_digest = relay.response_digest;
    registryLane.awaiting_work = false;
    registryLane.relay_inflight = null;
    await atomicJsonWrite(registryPath, registry);
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_DEDUPED_BY_MARKER",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: relay.relay_id,
      digest: relay.response_digest
    });
    return;
  }

  if (registryLane.relay_inflight) {
    const outcome = await reconcileRelayInflight({
      adapter,
      lane,
      brainPage,
      registryLane,
      registry,
      registryPath,
      logPath
    });
    if (outcome === "CONFIRMED" || outcome === "PENDING" || outcome === "BLOCKED") return;
  }

  const brainProbe = await assertConversationSafe(adapter, brainPage, { brain: true });
  if (brainProbe.classification.observation !== OBSERVATIONS.RESPONSE_COMPLETE) {
    return;
  }

  await fs.mkdir(evidenceDir, { recursive: true });
  const screenshotPath = path.join(
    evidenceDir,
    `${lane.lane_id}-${relay.relay_id}.png`
  );
  await captureCompletedAssistantTurnScreenshot(workPage, screenshotPath);
  const screenshotStat = await fs.stat(screenshotPath);
  if (!screenshotStat.isFile() || screenshotStat.size <= 0) {
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
  registryLane.relay_inflight = {
    relay_id: relay.relay_id,
    response_digest: relay.response_digest,
    text_digest: sha256(relay.text),
    screenshot_path: screenshotPath,
    ...relayBaseline
  };
  await atomicJsonWrite(registryPath, registry);

  if (!execute) return;
  let sent = null;
  try {
    sent = await sendComposerWithAttachment(
      brainPage,
      relay.text,
      screenshotPath,
      { dryRun: false }
    );
  } catch (error) {
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_ATTEMPT_ERROR",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: relay.relay_id,
      digest: relay.response_digest,
      errorName: error?.name || "Error",
      reason: String(error?.message || error).slice(0, 220)
    });
    return;
  }
  if (!sent.executed) {
    await safeLog(logPath, {
      type: "LANE_RESULT_RELAY_NOT_EXECUTED",
      laneId: lane.lane_id,
      taskId: registryLane.task_id,
      relayId: relay.relay_id,
      digest: relay.response_digest,
      reason: sent.reason || "unknown"
    });
    return;
  }

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
    return;
  }

  registryLane.last_result_relay_id = relay.relay_id;
  registryLane.last_work_result_digest = relay.response_digest;
  registryLane.awaiting_work = false;
  registryLane.relay_inflight = null;
  await fs.unlink(screenshotPath).catch(() => {});
  await atomicJsonWrite(registryPath, registry);
  await safeLog(logPath, {
    type: "LANE_WORK_RESULT_RELAYED",
    laneId: lane.lane_id,
    taskId: registryLane.task_id,
    relayId: relay.relay_id,
    digest: relay.response_digest
  });
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
    if (registryLane.relay_inflight?.screenshot_path) {
      await fs.unlink(registryLane.relay_inflight.screenshot_path).catch(() => {});
    }

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
    }

    // A relay latch is target-specific. When Owner changes Brain, abandon only
    // the old Brain delivery latch; keep the active Work task/result pending so
    // it can be relayed to the newly selected Brain exactly once.
    registryLane.relay_inflight = null;

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

async function applyOwnerWorkTarget({
  lane,
  registryLane,
  registry,
  registryPath,
  logPath
}) {
  const revision = Number(lane.work_url_revision || 0);
  if (revision <= Number(registryLane.applied_work_url_revision || 0)) {
    return false;
  }

  const raw = String(lane.work_url || "").trim();
  let configuredUrl = "";
  if (raw) {
    try {
      configuredUrl = normalizeChatGptConversationUrl(raw);
    } catch {
      throw new Error("LINK WORK không hợp lệ. Hãy dán link cuộc trò chuyện ChatGPT hoặc để trống để Robot tự tạo.");
    }
  }

  const changed = configuredUrl !== String(registryLane.work_url || "");
  if (changed) {
    if (registryLane.relay_inflight?.screenshot_path) {
      await fs.unlink(registryLane.relay_inflight.screenshot_path).catch(() => {});
    }

    registryLane.work_url = configuredUrl;
    registryLane.work_generation = Number(registryLane.work_generation || 0) + 1;
    registryLane.task_id = null;
    registryLane.instruction_digest = null;
    registryLane.last_brain_directive_digest = null;
    registryLane.last_work_result_digest = null;
    registryLane.last_result_relay_id = null;
    registryLane.dispatch_inflight = null;
    registryLane.relay_inflight = null;
    registryLane.awaiting_work = false;

    await safeLog(logPath, {
      type: "LANE_OWNER_WORK_TARGET_CHANGED",
      laneId: lane.lane_id,
      digest: configuredUrl ? sha256(configuredUrl) : "AUTO"
    });
  }

  registryLane.applied_work_url_revision = revision;
  await atomicJsonWrite(registryPath, registry);
  return changed;
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

  await applyOwnerWorkTarget({
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
    if (relayOutcome === "PENDING") {
      return laneStatus(
        lane,
        registryLane,
        "RECOVERING",
        "Đang tự xác minh lần gửi kết quả trước; Robot không tải lại trang lặp lại."
      );
    }
    if (relayOutcome === "BLOCKED") {
      return laneStatus(
        lane,
        registryLane,
        "WAIT_OWNER",
        "Kết quả gửi về Bộ não có thay đổi ngoài dự kiến; Robot đã dừng tự gửi lại để tránh trùng."
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
      logPath
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

  if (registryLane.awaiting_work) {
    if (!registryLane.work_url) {
      throw new Error("Work URL is missing while a result is pending");
    }
    const workPage = await openExactConversation(adapter, registryLane.work_url, { brain: false });
    const workProbe = await assertConversationSafe(adapter, workPage, {
      brain: false,
      allowFull: true
    });

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
      await relayWorkResult({
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
        return laneStatus(
          lane,
          registryLane,
          "RELAYING_RESULT",
          "Đã nhận kết quả Work; đang gửi ảnh và toàn bộ nội dung về Bộ não."
        );
      }
    }

    return laneStatus(
      lane,
      registryLane,
      "WAITING_BRAIN",
      "Đã gửi kết quả về Bộ não; đang chờ lệnh tiếp theo."
    );
  }

  if (!registryLane.brain_request_sent) {
    await ensureBrainRequest({
      adapter,
      page: brainPage,
      lane,
      registryLane,
      execute,
      registry,
      registryPath,
      logPath
    });
    return laneStatus(
      lane,
      registryLane,
      "WAITING_BRAIN",
      "Đang chờ Bộ não giao công việc đầu tiên."
    );
  }

  if (brainProbe.classification.observation !== OBSERVATIONS.RESPONSE_COMPLETE) {
    return laneStatus(
      lane,
      registryLane,
      "WAITING_BRAIN",
      "Bộ não đang trả lời hoặc chưa sẵn sàng."
    );
  }

  const captured = await captureCompletedAssistantTurn(brainPage);
  if (!captured) {
    return laneStatus(
      lane,
      registryLane,
      "WAITING_BRAIN",
      "Đang chờ Bộ não trả lệnh."
    );
  }

  let directive = null;
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
if (!Number.isFinite(args.pollMs) || args.pollMs < 1000) {
  throw new TypeError("poll-ms must be at least 1000");
}

const root = localRoot();
const configPath = path.join(root, "lanes.json");
const registryPath = path.join(root, "lane-registry.json");
const statusPath = path.join(root, "lane-status.json");
const evidenceDir = path.join(root, "lane-evidence");
const logPath = path.join(root, "supervisor.log");
const stopPath = path.join(root, "STOP");

let config = normalizeLaneConfig(
  await readJson(configPath, defaultLaneConfig())
);
let registry = normalizeLaneRegistry(
  await readJson(registryPath, defaultLaneRegistry())
);
await atomicJsonWrite(configPath, config);
await atomicJsonWrite(registryPath, registry);

const statuses = {};
let adapter = null;
let cdpRecoveryFailures = 0;
let restartRequested = false;

await safeLog(logPath, {
  type: "RUNTIME_BOOT",
  reason: `version=${SUPERVISOR_RUNTIME_VERSION};mode=${THREE_LANE_MODE}`
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

        if (transient && !reconnected && cdpRecoveryFailures >= 3) {
          restartRequested = true;
          await safeLog(logPath, {
            type: "RUNTIME_CDP_RESTART_REQUESTED",
            laneId: lane.lane_id,
            taskId: registryLane.task_id,
            reason: "bounded transient CDP reconnect budget exhausted"
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
