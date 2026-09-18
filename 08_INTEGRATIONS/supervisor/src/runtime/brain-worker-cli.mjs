import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

import { ChatGptUiAdapter } from "../ui/playwright-adapter.mjs";
import { sendComposerInstruction } from "../ui/actions.mjs";
import { captureCompletedAssistantTurn } from "../ui/message-capture.mjs";
import { OBSERVATIONS } from "../decision.mjs";
import { targetFromUrl } from "./recovery.mjs";
import {
  BRAIN_WORKER_MODE,
  assertRolloverAuthorized,
  buildBrainBootstrapInstruction,
  buildBrainRolloverInstruction,
  buildWorkerResultEnvelope,
  canCreateWorker,
  newRegistry,
  parseBrainDirective,
  sanitizeRegistry
} from "./orchestration.mjs";
import {
  buildRuntimeStatus,
  defaultRuntimeStatusPath
} from "./status.mjs";

const DEFAULT_STATE_URL =
  "https://raw.githubusercontent.com/magasincoffee/magasincoffee.github.io/main/01_DOCS/MAGASIN/00_PROJECT_STATE.json";
const SUPERVISOR_RUNTIME_VERSION = "2026-09-19.17";

function parseArgs(argv) {
  const result = {
    cdpUrl: "http://127.0.0.1:9222",
    stateUrl: DEFAULT_STATE_URL,
    execute: false,
    pollMs: 5000
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--cdp-url") result.cdpUrl = argv[++i];
    else if (key === "--state-url") result.stateUrl = argv[++i];
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

async function fetchProjectState(url) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "user-agent": "MAGASIN-Supervisor-BrainWorker/0.4" }
  });
  if (!response.ok) {
    throw new Error(`project state fetch failed: HTTP ${response.status}`);
  }
  return response.json();
}

async function atomicJsonWrite(filePath, value) {
  const temp = `${filePath}.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(temp, JSON.stringify(value, null, 2) + "\n", "utf8");
  await fs.rename(temp, filePath);
}

async function loadRegistry(filePath) {
  try {
    return sanitizeRegistry(JSON.parse(await fs.readFile(filePath, "utf8")));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return newRegistry();
  }
}

async function safeLog(filePath, event = {}) {
  const safe = {
    timestamp: new Date().toISOString(),
    type: String(event.type || "EVENT"),
    role: event.role || undefined,
    worker_id: event.workerId || undefined,
    task_id: event.taskId || undefined,
    relay_id: event.relayId || undefined,
    digest: event.digest || undefined,
    chars: Number.isFinite(event.chars) ? event.chars : undefined,
    generation: Number.isFinite(event.generation) ? event.generation : undefined,
    reason: event.reason || undefined,
    error_name: event.errorName || undefined
  };
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, JSON.stringify(safe) + "\n", "utf8");
}

async function writeStatus(filePath, projectState, {
  status,
  brainStatus = null,
  workers = {},
  errorName = null,
  reason = null
}) {
  const base = buildRuntimeStatus({
    projectState,
    status,
    decision: reason ? { action: "WAIT", reason } : null,
    errorName
  });
  const workerList = Object.values(workers || {});
  const payload = {
    ...base,
    schema_version: 3,
    supervisor_runtime_version: SUPERVISOR_RUNTIME_VERSION,
    orchestration_mode: BRAIN_WORKER_MODE,
    brain_status: brainStatus,
    worker_count: workerList.length,
    worker_running: workerList
      .filter((worker) => worker.awaiting_result)
      .map((worker) => worker.worker_id)
  };
  await atomicJsonWrite(filePath, payload);
}

function targetUrl(target) {
  return `${target.origin}${target.pathname}`;
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

async function waitForTarget(page) {
  await page.waitForURL((value) => {
    try {
      targetFromUrl(value);
      return true;
    } catch {
      return false;
    }
  }, { timeout: 45_000 });
  return targetFromUrl(page.url());
}

async function openTargetPage(adapter, target) {
  const existing = adapter.findPageForTarget(target);
  if (existing) return existing;
  const page = await adapter.newChatPage(targetUrl(target));
  await page.waitForTimeout(1200);
  return page;
}

async function createConversationWithMessage(adapter, message, { execute }) {
  const page = await adapter.newChatPage("https://chatgpt.com/");
  await page.waitForTimeout(1000);
  const execution = await sendComposerInstruction(page, message, { dryRun: !execute });
  if (!execute) return { page, target: null, execution };
  if (!execution.executed) {
    throw new Error(`new conversation send failed: ${execution.reason || "unknown"}`);
  }
  const target = await waitForTarget(page);
  return { page, target, execution };
}

async function ensureBrain({ adapter, registry, projectState, config, execute, registryPath, logPath }) {
  if (registry.brain.target) {
    return openTargetPage(adapter, registry.brain.target);
  }
  if (!config?.brain?.bootstrap_authorized) {
    throw new Error("brain bootstrap is not authorized by source of truth");
  }

  const created = await createConversationWithMessage(
    adapter,
    buildBrainBootstrapInstruction(projectState),
    { execute }
  );
  if (!execute) return created.page;

  registry.brain.target = created.target;
  registry.brain.generation = 1;
  registry.brain.awaiting_response = true;
  await atomicJsonWrite(registryPath, sanitizeRegistry(registry));
  await safeLog(logPath, {
    type: "BRAIN_BOOTSTRAPPED",
    role: "brain",
    generation: 1
  });
  return created.page;
}

async function rolloverBrain({ adapter, registry, projectState, execute, registryPath, logPath, snapshot }) {
  assertRolloverAuthorized(snapshot);
  const created = await createConversationWithMessage(
    adapter,
    buildBrainRolloverInstruction(projectState, registry),
    { execute }
  );
  if (!execute) return created.page;

  registry.brain.target = created.target;
  registry.brain.generation += 1;
  registry.brain.awaiting_response = true;
  registry.brain.last_processed_digest = null;
  await atomicJsonWrite(registryPath, sanitizeRegistry(registry));
  await safeLog(logPath, {
    type: "BRAIN_ROLLOVER_FULL_CONFIRMED",
    role: "brain",
    generation: registry.brain.generation
  });
  return created.page;
}

function workerCapacity(config) {
  const value = Number(config?.workers?.max_parallel_workers || 3);
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    throw new Error("invalid max_parallel_workers");
  }
  return value;
}

async function dispatchWorker({
  adapter,
  registry,
  action,
  projectState,
  config,
  execute,
  registryPath,
  logPath
}) {
  const maxWorkers = workerCapacity(config);
  if (!canCreateWorker({
    registry,
    workerId: action.worker_id,
    maxWorkers,
    brainDirectiveValidated: true
  })) {
    throw new Error("worker capacity exceeded");
  }

  let worker = registry.workers[action.worker_id] || {
    worker_id: action.worker_id,
    target: null,
    generation: 0,
    task_id: null,
    status: "IDLE",
    awaiting_result: false,
    instruction_digest: null,
    last_result_relay_id: null,
    last_result_digest: null,
    relay_inflight_id: null
  };

  if (
    worker.awaiting_result &&
    worker.task_id === action.task_id &&
    worker.instruction_digest === action.instruction_digest
  ) {
    return;
  }
  if (worker.awaiting_result) {
    throw new Error(`worker ${worker.worker_id} is busy`);
  }

  let page = null;
  let isNewConversation = false;

  if (worker.target) {
    page = await openTargetPage(adapter, worker.target);
    const probe = await adapter.probePage(page);
    if (hardStopObservation(probe.classification.observation)) {
      throw new Error(`worker ${worker.worker_id} reached owner/security boundary`);
    }
    if (probe.snapshot.conversationMissing) {
      throw new Error(`worker ${worker.worker_id} conversation is missing; rollover denied`);
    }
    if (probe.snapshot.conversationFull) {
      assertRolloverAuthorized(probe.snapshot);
      page = await adapter.newChatPage("https://chatgpt.com/");
      isNewConversation = true;
    } else if (
      probe.classification.observation === OBSERVATIONS.ASSISTANT_RUNNING ||
      probe.classification.observation === OBSERVATIONS.USER_PENDING
    ) {
      throw new Error(`worker ${worker.worker_id} is not idle`);
    }
  } else {
    page = await adapter.newChatPage("https://chatgpt.com/");
    isNewConversation = true;
  }

  const execution = await sendComposerInstruction(page, action.instruction, {
    dryRun: !execute
  });
  if (!execute) return;
  if (!execution.executed) {
    throw new Error(`worker ${worker.worker_id} dispatch failed: ${execution.reason || "unknown"}`);
  }

  if (isNewConversation) {
    worker.target = await waitForTarget(page);
    worker.generation += 1;
  }
  worker.task_id = action.task_id;
  worker.status = "RUNNING";
  worker.awaiting_result = true;
  worker.instruction_digest = action.instruction_digest;
  worker.relay_inflight_id = null;
  registry.workers[action.worker_id] = worker;
  await atomicJsonWrite(registryPath, sanitizeRegistry(registry));
  await safeLog(logPath, {
    type: isNewConversation
      ? (worker.generation === 1 ? "WORKER_CREATED_BY_BRAIN" : "WORKER_ROLLOVER_FULL_CONFIRMED")
      : "WORKER_DISPATCHED",
    role: "worker",
    workerId: worker.worker_id,
    taskId: worker.task_id,
    digest: worker.instruction_digest,
    generation: worker.generation
  });
}

async function processBrainResponse({
  adapter,
  page,
  registry,
  projectState,
  config,
  execute,
  registryPath,
  logPath
}) {
  const probe = await adapter.probePage(page);
  if (hardStopObservation(probe.classification.observation)) {
    throw new Error("Brain reached Owner/security boundary");
  }
  if (probe.snapshot.conversationMissing) {
    throw new Error("Brain conversation is missing; rollover denied");
  }
  if (probe.classification.observation !== OBSERVATIONS.RESPONSE_COMPLETE) {
    return false;
  }

  const captured = await captureCompletedAssistantTurn(page);
  if (!captured) return false;
  if (captured.digest === registry.brain.last_processed_digest) {
    registry.brain.awaiting_response = false;
    return true;
  }

  const directive = parseBrainDirective(captured.text, {
    maxWorkers: workerCapacity(config)
  });

  for (const action of directive.actions) {
    await dispatchWorker({
      adapter,
      registry,
      action,
      projectState,
      config,
      execute,
      registryPath,
      logPath
    });
  }

  if (execute) {
    registry.brain.last_processed_digest = captured.digest;
    registry.brain.awaiting_response = false;
    await atomicJsonWrite(registryPath, sanitizeRegistry(registry));
    await safeLog(logPath, {
      type: "BRAIN_DIRECTIVE_APPLIED",
      role: "brain",
      digest: directive.digest,
      chars: captured.chars,
      generation: registry.brain.generation
    });
  }
  return true;
}

async function findReadyWorkerResult(adapter, registry) {
  for (const worker of Object.values(registry.workers || {})) {
    if (!worker.awaiting_result || !worker.target) continue;
    const page = await openTargetPage(adapter, worker.target);
    const probe = await adapter.probePage(page);
    if (hardStopObservation(probe.classification.observation)) {
      throw new Error(`worker ${worker.worker_id} reached Owner/security boundary`);
    }
    if (probe.snapshot.conversationMissing) {
      throw new Error(`worker ${worker.worker_id} conversation is missing; rollover denied`);
    }
    if (probe.classification.observation !== OBSERVATIONS.RESPONSE_COMPLETE) {
      continue;
    }
    const captured = await captureCompletedAssistantTurn(page);
    if (captured) return { worker, captured };
  }
  return null;
}

async function relayWorkerResult({
  adapter,
  brainPage,
  brainProbe,
  registry,
  ready,
  projectState,
  config,
  execute,
  registryPath,
  logPath
}) {
  let page = brainPage;
  if (brainProbe.snapshot.conversationMissing) {
    throw new Error("Brain conversation is missing; rollover denied");
  }
  if (brainProbe.snapshot.conversationFull) {
    page = await rolloverBrain({
      adapter,
      registry,
      projectState,
      config,
      execute,
      registryPath,
      logPath,
      snapshot: brainProbe.snapshot
    });
    return { brainPage: page, relayed: false };
  }
  if (brainProbe.classification.observation !== OBSERVATIONS.RESPONSE_COMPLETE) {
    return { brainPage: page, relayed: false };
  }

  const envelope = buildWorkerResultEnvelope({
    workerId: ready.worker.worker_id,
    taskId: ready.worker.task_id,
    generation: ready.worker.generation,
    turn: ready.captured.turn,
    responseText: ready.captured.text
  });

  if (ready.worker.last_result_relay_id === envelope.relay_id) {
    ready.worker.awaiting_result = false;
    ready.worker.status = "IDLE";
    await atomicJsonWrite(registryPath, sanitizeRegistry(registry));
    return { brainPage: page, relayed: false };
  }

  ready.worker.relay_inflight_id = envelope.relay_id;
  await atomicJsonWrite(registryPath, sanitizeRegistry(registry));

  const execution = await sendComposerInstruction(page, envelope.text, {
    dryRun: !execute
  });
  if (!execute) return { brainPage: page, relayed: false };
  if (!execution.executed) {
    throw new Error(`Worker result relay failed: ${execution.reason || "unknown"}`);
  }

  ready.worker.awaiting_result = false;
  ready.worker.status = "IDLE";
  ready.worker.last_result_relay_id = envelope.relay_id;
  ready.worker.last_result_digest = envelope.response_digest;
  ready.worker.relay_inflight_id = null;
  registry.brain.awaiting_response = true;
  await atomicJsonWrite(registryPath, sanitizeRegistry(registry));
  await safeLog(logPath, {
    type: "WORKER_RESULT_RELAYED",
    role: "worker",
    workerId: ready.worker.worker_id,
    taskId: ready.worker.task_id,
    relayId: envelope.relay_id,
    digest: envelope.response_digest,
    chars: envelope.char_count,
    generation: ready.worker.generation
  });

  // The full response body existed only in the local envelope variable and was
  // sent to Brain. It is intentionally not written to logs/status/registry.
  return { brainPage: page, relayed: true };
}

const args = parseArgs(process.argv.slice(2));
if (!Number.isFinite(args.pollMs) || args.pollMs < 1000) {
  throw new TypeError("poll-ms must be at least 1000");
}

const root = localRoot();
const stopPath = path.join(root, "STOP");
const registryPath = path.join(root, "orchestration.json");
const logPath = path.join(root, "supervisor.log");
const runtimeStatusPath = defaultRuntimeStatusPath();

let registry = await loadRegistry(registryPath);
let projectState = {};
let adapter = null;

await safeLog(logPath, {
  type: "RUNTIME_BOOT",
  role: "orchestrator",
  reason: `version=${SUPERVISOR_RUNTIME_VERSION};mode=${BRAIN_WORKER_MODE}`
});

try {
  adapter = new ChatGptUiAdapter({ cdpUrl: args.cdpUrl });
  await adapter.open();

  while (true) {
    try {
      await fs.access(stopPath);
      await writeStatus(runtimeStatusPath, projectState, {
        status: "STOPPED",
        workers: registry.workers
      });
      break;
    } catch {}

    try {
      projectState = await fetchProjectState(args.stateUrl);
      const config = projectState.supervisor_orchestration || {};

      if (config.mode !== BRAIN_WORKER_MODE) {
        throw new Error("source of truth no longer authorizes BRAIN_WORKER_V1");
      }
      if (projectState.status === "DONE") {
        await writeStatus(runtimeStatusPath, projectState, {
          status: "DONE",
          workers: registry.workers
        });
        await delay(args.pollMs);
        continue;
      }
      if (projectState.autonomy === "PAUSED") {
        await writeStatus(runtimeStatusPath, projectState, {
          status: "PAUSED",
          workers: registry.workers,
          reason: "repository autonomy is PAUSED"
        });
        process.exitCode = 76;
        break;
      }
      if (
        projectState.blocked ||
        projectState.status === "BLOCKED" ||
        projectState.requires_user ||
        projectState.status === "WAIT_USER"
      ) {
        await writeStatus(runtimeStatusPath, projectState, {
          status: "WAIT_USER",
          workers: registry.workers,
          reason: "repository requires Owner intervention"
        });
        await delay(args.pollMs);
        continue;
      }
      if (projectState.autonomy !== "AUTO_CONTINUE") {
        await writeStatus(runtimeStatusPath, projectState, {
          status: "READY",
          workers: registry.workers,
          reason: `autonomy mode is ${projectState.autonomy}`
        });
        await delay(args.pollMs);
        continue;
      }

      let brainPage = await ensureBrain({
        adapter,
        registry,
        projectState,
        config,
        execute: args.execute,
        registryPath,
        logPath
      });

      if (!args.execute && !registry.brain.target) {
        await writeStatus(runtimeStatusPath, projectState, {
          status: "DRY_RUN",
          brainStatus: "BOOTSTRAP_READY",
          workers: registry.workers
        });
        await delay(args.pollMs);
        continue;
      }

      if (registry.brain.awaiting_response) {
        await processBrainResponse({
          adapter,
          page: brainPage,
          registry,
          projectState,
          config,
          execute: args.execute,
          registryPath,
          logPath
        });
      }

      if (!registry.brain.awaiting_response) {
        const ready = await findReadyWorkerResult(adapter, registry);
        if (ready) {
          const brainProbe = await adapter.probePage(brainPage);
          const relay = await relayWorkerResult({
            adapter,
            brainPage,
            brainProbe,
            registry,
            ready,
            projectState,
            config,
            execute: args.execute,
            registryPath,
            logPath
          });
          brainPage = relay.brainPage;
        }
      }

      await writeStatus(runtimeStatusPath, projectState, {
        status: registry.brain.awaiting_response ? "RUNNING" : "READY",
        brainStatus: registry.brain.awaiting_response ? "THINKING" : "IDLE",
        workers: registry.workers
      });
    } catch (error) {
      await safeLog(logPath, {
        type: "BRAIN_WORKER_ERROR",
        role: "orchestrator",
        errorName: error?.name || "Error",
        reason: String(error?.message || error).slice(0, 240)
      });
      await writeStatus(runtimeStatusPath, projectState, {
        status: "WAIT_USER",
        brainStatus: registry.brain.awaiting_response ? "THINKING" : "ERROR",
        workers: registry.workers,
        errorName: error?.name || "Error",
        reason: String(error?.message || error).slice(0, 240)
      }).catch(() => {});
      await delay(args.pollMs);
    }

    await delay(args.pollMs);
  }
} finally {
  await adapter?.close().catch(() => {});
}
