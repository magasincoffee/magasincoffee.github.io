import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  ChatGptUiAdapter,
  defaultSupervisorProfileDir,
  resolveChromeExecutable
} from "./playwright-adapter.mjs";

const profileDir = defaultSupervisorProfileDir();
const targetFile = path.join(path.dirname(profileDir), "target.json");
const timeoutMs = 15 * 60 * 1000;
const pollMs = 2_000;

const adapter = new ChatGptUiAdapter({
  profileDir,
  chromeExecutable: resolveChromeExecutable(),
  url: "https://chatgpt.com/",
  headless: false,
  timeoutMs: 60_000,
  settleMs: 1_500
});

const started = Date.now();
let lastState = null;

try {
  await adapter.open();
  console.log("SETUP_READY: use this Chrome window to sign in, then open the MAGASIN project conversation.");
  console.log("No credentials, cookies, tokens, or message text will be captured.");

  while (Date.now() - started < timeoutMs) {
    const { snapshot, classification } = await adapter.probe();

    if (classification.uiState !== lastState) {
      console.log(`UI_STATE=${classification.uiState}`);
      lastState = classification.uiState;
    }

    if (snapshot.conversationPath && snapshot.composerReady) {
      const currentUrl = new URL(adapter.page.url());
      await fs.mkdir(path.dirname(targetFile), { recursive: true });
      await fs.writeFile(
        targetFile,
        JSON.stringify({
          origin: currentUrl.origin,
          pathname: currentUrl.pathname,
          capturedAt: new Date().toISOString()
        }, null, 2) + "\n",
        "utf8"
      );

      console.log("SETUP_PASS: authenticated conversation target stored locally.");
      console.log("TARGET_STORAGE=LOCAL_ONLY");
      process.exitCode = 0;
      break;
    }

    await adapter.page.waitForTimeout(pollMs);
  }

  if (!adapter.page) {
    process.exitCode = 25;
  } else if (Date.now() - started >= timeoutMs) {
    console.error("SETUP_TIMEOUT: conversation target was not detected within 15 minutes.");
    process.exitCode = 25;
  }
} finally {
  await adapter.close();
}
