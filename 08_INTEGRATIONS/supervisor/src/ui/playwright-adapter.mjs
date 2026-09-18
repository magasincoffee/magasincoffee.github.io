import fs from "node:fs";
import path from "node:path";

import { classifyUiSnapshot } from "./classifier.mjs";
import { collectSafeUiSnapshot } from "./snapshot.mjs";

export function defaultSupervisorProfileDir(env = process.env) {
  const base = env.LOCALAPPDATA || env.HOME || process.cwd();
  return path.join(base, "MAGASIN", "BusinessOS", "supervisor", "browser_profile");
}

export function resolveChromeExecutable(env = process.env) {
  const explicit = env.MAGASIN_SUPERVISOR_CHROME;
  if (explicit && fs.existsSync(explicit)) return explicit;

  const candidates = [
    env.ProgramFiles && path.join(env.ProgramFiles, "Google", "Chrome", "Application", "chrome.exe"),
    env["ProgramFiles(x86)"] && path.join(env["ProgramFiles(x86)"], "Google", "Chrome", "Application", "chrome.exe"),
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

export class ChatGptUiAdapter {
  constructor({
    profileDir = defaultSupervisorProfileDir(),
    chromeExecutable = resolveChromeExecutable(),
    url = "https://chatgpt.com/",
    headless = false,
    timeoutMs = 60_000,
    settleMs = 2_500
  } = {}) {
    this.profileDir = profileDir;
    this.chromeExecutable = chromeExecutable;
    this.url = url;
    this.headless = headless;
    this.timeoutMs = timeoutMs;
    this.settleMs = settleMs;
    this.playwright = null;
    this.context = null;
    this.page = null;
  }

  async open() {
    if (!this.chromeExecutable) {
      throw new Error("Google Chrome executable was not found");
    }

    const { chromium } = await import("playwright-core");
    fs.mkdirSync(this.profileDir, { recursive: true });

    this.context = await chromium.launchPersistentContext(this.profileDir, {
      executablePath: this.chromeExecutable,
      headless: this.headless,
      acceptDownloads: false,
      viewport: { width: 1440, height: 1000 }
    });

    this.context.setDefaultTimeout(this.timeoutMs);
    this.page = this.context.pages()[0] || await this.context.newPage();
    await this.page.goto(this.url, {
      waitUntil: "domcontentloaded",
      timeout: this.timeoutMs
    });
    await this.page.waitForTimeout(this.settleMs);
    return this.page;
  }

  async probe() {
    if (!this.page) throw new Error("adapter is not open");
    const snapshot = await collectSafeUiSnapshot(this.page);
    const classification = classifyUiSnapshot(snapshot);
    return { snapshot, classification };
  }

  async close() {
    if (this.context) {
      await this.context.close();
    }
    this.context = null;
    this.page = null;
  }
}
