import process from "node:process";

import { ACTIONS, CANONICAL_CONTINUE_INSTRUCTION } from "../decision.mjs";
import { executeDecision } from "../ui/actions.mjs";

const cdpUrl = process.argv.includes("--cdp-url")
  ? process.argv[process.argv.indexOf("--cdp-url") + 1]
  : "http://127.0.0.1:9222";

const { chromium } = await import("playwright-core");
const browser = await chromium.connectOverCDP(cdpUrl);
const context = browser.contexts()[0];
if (!context) throw new Error("CDP browser context unavailable");

const page = await context.newPage();

try {
  await page.setContent(`
    <style>
      #prompt-textarea { width: 500px; height: 80px; border: 1px solid #999; }
      button { width: 140px; height: 40px; }
    </style>
    <div id="prompt-textarea" contenteditable="true"></div>
    <button data-testid="send-button" aria-label="Send prompt">Send</button>
    <script>
      window.__sent = 0;
      document.querySelector('[data-testid="send-button"]').addEventListener('click', () => {
        window.__sent += 1;
      });
    </script>
  `);

  const continueResult = await executeDecision({
    page,
    decision: {
      action: ACTIONS.CONTINUE,
      instruction: CANONICAL_CONTINUE_INSTRUCTION
    },
    dryRun: false
  });

  const continueState = await page.evaluate(() => ({
    text: document.querySelector("#prompt-textarea").innerText,
    sent: window.__sent
  }));

  if (!continueResult.executed ||
      continueResult.target !== "COMPOSER_SEND" ||
      continueState.text !== CANONICAL_CONTINUE_INSTRUCTION ||
      continueState.sent !== 1) {
    throw new Error("synthetic CONTINUE E2E assertion failed");
  }

  await page.setContent(`
    <style>button { width: 140px; height: 40px; }</style>
    <button aria-label="Try again">Try again</button>
    <script>
      window.__retried = 0;
      document.querySelector('button').addEventListener('click', () => {
        window.__retried += 1;
      });
    </script>
  `);

  const retryResult = await executeDecision({
    page,
    decision: { action: ACTIONS.RETRY },
    dryRun: false
  });

  const retried = await page.evaluate(() => window.__retried);

  if (!retryResult.executed ||
      retryResult.target !== "SAFE_RETRY_CONTROL" ||
      retried !== 1) {
    throw new Error("synthetic RETRY E2E assertion failed");
  }

  console.log(JSON.stringify({
    status: "PASS",
    continue: {
      executed: true,
      target: continueResult.target
    },
    retry: {
      executed: true,
      target: retryResult.target
    },
    externalSideEffect: false
  }, null, 2));
} finally {
  await page.close().catch(() => {});
}

process.exit(0);
