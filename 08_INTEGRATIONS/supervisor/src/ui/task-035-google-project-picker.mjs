import process from "node:process";

const PORTS = Array.from({ length: 11 }, (_, i) => 9222 + i);

async function findCdp() {
  for (const port of PORTS) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.webSocketDebuggerUrl) return `http://127.0.0.1:${port}`;
    } catch {}
  }
  return null;
}

async function connect(cdpUrl) {
  const { chromium } = await import("playwright-core");
  const version = await fetch(cdpUrl + "/json/version").then(r => r.json());
  const ws = new URL(version.webSocketDebuggerUrl);
  const endpoint = new URL(cdpUrl);
  ws.hostname = endpoint.hostname;
  ws.port = endpoint.port;
  return chromium.connectOverCDP(ws.toString());
}

async function clickFirstVisible(page, candidates) {
  for (const candidate of candidates) {
    try {
      const locator = candidate(page).first();
      if (await locator.isVisible({ timeout: 1200 })) {
        await locator.click();
        return true;
      }
    } catch {}
  }
  return false;
}

const cdpUrl = await findCdp();
console.log("PROJECT_PICKER_CDP_AVAILABLE=" + Boolean(cdpUrl));
if (!cdpUrl) process.exit(0);

const browser = await connect(cdpUrl);
const context = browser.contexts()[0];
if (!context) {
  console.log("PROJECT_PICKER_CONTEXT=False");
  process.exit(0);
}

const page = await context.newPage();
try {
  await page.goto("https://console.cloud.google.com/", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);

  const opened = await clickFirstVisible(page, [
    p => p.getByRole("button", { name: /Select a project|Chọn dự án|Project selector|Bộ chọn dự án/i }),
    p => p.locator('[aria-label*="project" i]'),
    p => p.getByText(/Select a project|Chọn dự án/i)
  ]);
  console.log("PROJECT_PICKER_OPENED=" + opened);
  if (!opened) process.exit(0);

  await page.waitForTimeout(2500);
  const dialog = page.locator('[role="dialog"], mat-dialog-container').last();
  const dialogVisible = await dialog.isVisible({ timeout: 1500 }).catch(() => false);
  console.log("PROJECT_PICKER_DIALOG_VISIBLE=" + dialogVisible);
  if (!dialogVisible) process.exit(0);

  let search = dialog.getByRole("textbox").first();
  const searchVisible = await search.isVisible({ timeout: 1200 }).catch(() => false);
  console.log("PROJECT_PICKER_SEARCH_VISIBLE=" + searchVisible);
  if (searchVisible) {
    await search.fill("MAGASIN");
    await page.waitForTimeout(2500);
  }

  const rows = dialog.locator('tr, [role="row"]').filter({ hasText: /MAGASIN/i });
  const rowCount = await rows.count().catch(() => 0);
  console.log("MAGASIN_PROJECT_ROW_COUNT=" + rowCount);

  if (rowCount === 1) {
    await rows.first().click();
    await page.waitForTimeout(4000);
    const selected = new URL(page.url()).searchParams.has("project");
    console.log("MAGASIN_PROJECT_AUTO_SELECTED=" + selected);
  } else {
    console.log("MAGASIN_PROJECT_AUTO_SELECTED=False");
  }
} finally {
  await page.close().catch(() => {});
}

process.exit(0);
