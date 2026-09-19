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
  captureUserTurnDigests
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

const SUPERVISOR_RUNTIME_VERSION = "2026-09-19.32";

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

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
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

async function openExactConversation(adapter, url) {
  const normalized = normalizeChatGptConversationUrl(url);
  const target = targetFromUrl(normalized);
  const existing = adapter.findPageForTarget(target);
  if (existing) return existing;

  const page = await adapter.reopenTargetPage(normalized);
  if (!pageMatchesTarget(page.url(), target)) {
    throw new Error("configured conversation could not be restored exactly");
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
    brain_url: String(configLane.brain_url || ""),
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

async function reconcileBrainRequest({ page, lane, registryLane }) {
  if (!registryLane.brain_request_inflight) return false;
  const digests = await captureUserTurnDigests(page).catch(() => []);
  if (!digests.includes(registryLane.brain_request_inflight.digest)) {
    throw new Error("Brain start request outcome is uncertain; stop the lane and verify the Brain chat");
  }
  registryLane.brain_request_sent = true;
  registryLane.brain_request_inflight = null;
  return true;
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
    const reconciled = await reconcileBrainRequest({ page, lane, registryLane });
    if (reconciled) {
      await atomicJsonWrite(registryPath, registry);
      return true;
    }
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
  registryLane.brain_request_inflight = { digest };
  await atomicJsonWrite(registryPath, registry);

  if (!execute) return false;
  const sent = await sendComposerInstruction(page, request, { dryRun: false });
  if (!sent.executed) {
    throw new Error(`Brain start request failed: ${sent.reason || "unknown"}`);
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
  registryLane,
  registry,
  registryPath
}) {
  const latch = registryLane.dispatch_inflight;
  if (!latch) return false;

  const found = await findWorkConversationByInstruction(adapter, latch.instruction_digest);
  if (!found) {
    throw new Error("Work instruction send outcome is uncertain; automatic resend is denied");
  }

  registryLane.work_url = found.url;
  registryLane.task_id = latch.task_id;
  registryLane.instruction_digest = latch.instruction_digest;
  registryLane.awaiting_work = true;
  registryLane.dispatch_inflight = null;
  await atomicJsonWrite(registryPath, registry);
  return true;
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
    await reconcileDispatchInflight({
      adapter,
      registryLane,
      registry,
      registryPath
    });
    return;
  }

  let page = null;
  let createNew = !registryLane.work_url;
  let outgoingInstruction = directive.instruction;

  if (registryLane.work_url) {
    page = await openExactConversation(adapter, registryLane.work_url);
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
  registryLane.dispatch_inflight = {
    task_id: directive.task_id,
    instruction_digest: instructionDigest,
    directive_digest: directive.digest,
    create_new: createNew
  };
  await atomicJsonWrite(registryPath, registry);

  if (!execute) return;

  let workUrl = registryLane.work_url;
  if (createNew) {
    const created = await createWorkConversation(adapter, outgoingInstruction);
    page = created.page;
    workUrl = created.url;
    registryLane.work_generation += 1;
  } else {
    const sent = await sendComposerInstruction(page, outgoingInstruction, { dryRun: false });
    if (!sent.executed) {
      throw new Error(`Work instruction send failed: ${sent.reason || "unknown"}`);
    }
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
  brainPage,
  registryLane,
  registry,
  registryPath
}) {
  const latch = registryLane.relay_inflight;
  if (!latch) return false;

  const digests = await captureUserTurnDigests(brainPage).catch(() => []);
  if (!digests.includes(latch.text_digest)) {
    throw new Error("Work result relay outcome is uncertain; automatic resend is denied");
  }

  registryLane.last_result_relay_id = latch.relay_id;
  registryLane.last_work_result_digest = latch.response_digest;
  registryLane.awaiting_work = false;
  registryLane.relay_inflight = null;
  await fs.unlink(latch.screenshot_path).catch(() => {});
  await atomicJsonWrite(registryPath, registry);
  return true;
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

  if (registryLane.last_result_relay_id === relay.relay_id) {
    registryLane.awaiting_work = false;
    await atomicJsonWrite(registryPath, registry);
    return;
  }

  if (registryLane.relay_inflight) {
    await reconcileRelayInflight({
      brainPage,
      registryLane,
      registry,
      registryPath
    });
    return;
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

  registryLane.relay_inflight = {
    relay_id: relay.relay_id,
    response_digest: relay.response_digest,
    text_digest: sha256(relay.text),
    screenshot_path: screenshotPath
  };
  await atomicJsonWrite(registryPath, registry);

  if (!execute) return;
  const sent = await sendComposerWithAttachment(
    brainPage,
    relay.text,
    screenshotPath,
    { dryRun: false }
  );
  if (!sent.executed) {
    throw new Error(`Work result relay failed: ${sent.reason || "unknown"}`);
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

  let brainUrl = null;
  try {
    brainUrl = normalizeChatGptConversationUrl(lane.brain_url);
  } catch (error) {
    return laneStatus(lane, registryLane, "NEED_BRAIN_URL", error.message);
  }
  if (!brainUrl) {
    return laneStatus(
      lane,
      registryLane,
      "NEED_BRAIN_URL",
      "Nhập URL cuộc trò chuyện Bộ não rồi bấm BẮT ĐẦU LUỒNG."
    );
  }

  if (registryLane.brain_url !== brainUrl) {
    if (registryLane.awaiting_work && registryLane.brain_url) {
      return laneStatus(
        lane,
        registryLane,
        "WAIT_OWNER",
        "Không đổi Bộ não khi Work đang chạy. Dừng luồng trước khi thay URL Bộ não."
      );
    }
    registryLane.brain_url = brainUrl;
    registryLane.brain_request_sent = false;
    registryLane.brain_request_inflight = null;
    registryLane.last_brain_directive_digest = null;
    await atomicJsonWrite(registryPath, registry);
  }

  await applyOwnerWorkTarget({
    lane,
    registryLane,
    registry,
    registryPath,
    logPath
  });

  const brainPage = await openExactConversation(adapter, brainUrl);
  const brainProbe = await assertConversationSafe(adapter, brainPage, { brain: true });

  if (registryLane.relay_inflight) {
    await reconcileRelayInflight({
      brainPage,
      registryLane,
      registry,
      registryPath
    });
  }
  if (registryLane.dispatch_inflight) {
    await reconcileDispatchInflight({
      adapter,
      registryLane,
      registry,
      registryPath
    });
  }

  if (registryLane.awaiting_work) {
    if (!registryLane.work_url) {
      throw new Error("Work URL is missing while a result is pending");
    }
    const workPage = await openExactConversation(adapter, registryLane.work_url);
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
      } catch (error) {
        const transient = isTransientNavigationError(error);
        if (transient) {
          await adapter.reconnectOverCdp().catch(() => {});
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
      }
    }

    await writeLaneStatus(statusPath, statuses);
    await delay(args.pollMs);
  }
} finally {
  await adapter?.close().catch(() => {});
}
