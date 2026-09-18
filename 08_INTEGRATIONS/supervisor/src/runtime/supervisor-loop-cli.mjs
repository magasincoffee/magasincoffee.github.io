import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

import { SupervisorSession } from "./session.mjs";
import { SupervisorLoopController } from "./loop.mjs";

const DEFAULT_STATE_URL =
  "https://raw.githubusercontent.com/magasincoffee/magasincoffee.github.io/main/01_DOCS/MAGASIN/00_PROJECT_STATE.json";

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
    else if (key === "--target") result.targetPath = argv[++i];
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
    headers: { "user-agent": "MAGASIN-Supervisor/0.1" }
  });
  if (!response.ok) {
    throw new Error(`project state fetch failed: HTTP ${response.status}`);
  }
  return response.json();
}

function validateTarget(value) {
  if (!value || value.origin !== "https://chatgpt.com") {
    throw new Error("invalid local ChatGPT target origin");
  }
  if (typeof value.pathname !== "string" ||
      !/^\/(c|g|project)\//.test(value.pathname)) {
    throw new Error("invalid local ChatGPT target path");
  }
  return value;
}

async function safeAppendLog(logPath, event) {
  const safe = {
    timestamp: new Date().toISOString(),
    type: String(event.type || "EVENT"),
    action: event.action || undefined,
    target: event.target || undefined,
    errorName: event.errorName || undefined
  };
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, JSON.stringify(safe) + "\n", "utf8");
}

const args = parseArgs(process.argv.slice(2));
if (!Number.isFinite(args.pollMs) || args.pollMs < 1000) {
  throw new TypeError("poll-ms must be at least 1000");
}

const root = localRoot();
const targetPath = args.targetPath || path.join(root, "target.json");
const stopPath = path.join(root, "STOP");
const logPath = path.join(root, "supervisor.log");
const target = validateTarget(JSON.parse(await fs.readFile(targetPath, "utf8")));

const session = new SupervisorSession({
  cdpUrl: args.cdpUrl,
  maxConnectRetries: 2,
  onEvent: (event) => {
    safeAppendLog(logPath, event).catch(() => {});
  }
});

const controller = new SupervisorLoopController({
  execute: args.execute,
  onEvent: (event) => {
    safeAppendLog(logPath, event).catch(() => {});
  }
});

let retryCount = 0;

while (true) {
  try {
    await fs.access(stopPath);
    await safeAppendLog(logPath, { type: "STOP_SENTINEL" });
    process.exitCode = 0;
    break;
  } catch {}

  try {
    const projectState = await fetchProjectState(args.stateUrl);

    if (
      projectState.requires_user ||
      projectState.blocked ||
      projectState.status === "WAIT_USER" ||
      projectState.status === "BLOCKED"
    ) {
      await safeAppendLog(logPath, { type: "WAIT_USER" });
      await delay(args.pollMs);
      continue;
    }

    const adapter = await session.connect();
    const page = adapter.getActivePage();
    if (!page) throw new Error("no active ChatGPT page");

    const wanted = `${target.origin}${target.pathname}`;
    if (page.url() !== wanted) {
      await page.goto(wanted, {
        waitUntil: "domcontentloaded",
        timeout: 60_000
      });
      await page.waitForTimeout(1200);
    }

    const probe = await session.probe();
    const result = await controller.step({
      page,
      projectState,
      probe,
      retryCount,
      maxRetries: 2
    });

    if (result.decision.action === "RETRY" && result.execution.executed) {
      retryCount += 1;
    } else if (result.probe?.classification?.observation !== "NETWORK_ERROR") {
      retryCount = 0;
    }

    await safeAppendLog(logPath, {
      type: "STEP",
      action: result.decision.action,
      target: result.execution.target || undefined
    });
  } catch (error) {
    await safeAppendLog(logPath, {
      type: "LOOP_ERROR",
      errorName: error?.name || "Error"
    });
    await session.disconnect().catch(() => {});
  }

  await delay(args.pollMs);
}

await session.disconnect().catch(() => {});
