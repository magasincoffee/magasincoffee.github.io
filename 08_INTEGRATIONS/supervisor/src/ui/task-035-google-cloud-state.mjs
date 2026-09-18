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
  const version = await fetch(cdpUrl + "/json/version").then((r) => r.json());
  const ws = new URL(version.webSocketDebuggerUrl);
  const endpoint = new URL(cdpUrl);
  ws.hostname = endpoint.hostname;
  ws.port = endpoint.port;
  return chromium.connectOverCDP(ws.toString());
}

async function openAndSettle(context, url) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(5000);
  return page;
}

async function anyVisible(page, patterns) {
  for (const pattern of patterns) {
    try {
      if (await page.getByRole("button", { name: pattern }).first().isVisible({ timeout: 1000 })) return true;
    } catch {}
    try {
      if (await page.getByRole("link", { name: pattern }).first().isVisible({ timeout: 1000 })) return true;
    } catch {}
  }
  return false;
}

const cdpUrl = await findCdp();
console.log("GOOGLE_STATE_CDP_AVAILABLE=" + Boolean(cdpUrl));
if (!cdpUrl) process.exit(0);

const browser = await connect(cdpUrl);
const context = browser.contexts()[0];
if (!context) {
  console.log("GOOGLE_STATE_CONTEXT=False");
  process.exit(0);
}
console.log("GOOGLE_STATE_CONTEXT=True");

const apiPage = await openAndSettle(context, "https://console.cloud.google.com/apis/library/gmail.googleapis.com");
try {
  const apiUrl = new URL(apiPage.url());
  console.log("GOOGLE_PROJECT_SELECTED=" + Boolean(apiUrl.searchParams.get("project")));
  console.log("GMAIL_API_ENABLE_CONTROL=" + await anyVisible(apiPage, [/^Enable$/i, /^Bật$/i, /Enable API/i, /Bật API/i]));
  console.log("GMAIL_API_MANAGE_CONTROL=" + await anyVisible(apiPage, [/^Manage$/i, /^Quản lý$/i, /Manage API/i, /Quản lý API/i]));
} finally {
  await apiPage.close().catch(() => {});
}

const clientsPage = await openAndSettle(context, "https://console.cloud.google.com/auth/clients");
try {
  const url = new URL(clientsPage.url());
  console.log("AUTH_CLIENTS_PAGE_REACHED=" + (url.hostname === "console.cloud.google.com"));
  console.log("AUTH_CREATE_CLIENT_CONTROL=" + await anyVisible(clientsPage, [/Create client/i, /Tạo.*ứng dụng khách/i, /Create OAuth client/i]));
  let desktopVisible = false;
  try {
    desktopVisible = await clientsPage.getByText(/Desktop client|Ứng dụng.*máy tính|Desktop/i).first().isVisible({ timeout: 1500 });
  } catch {}
  console.log("AUTH_DESKTOP_CLIENT_VISIBLE=" + desktopVisible);
} finally {
  await clientsPage.close().catch(() => {});
}

process.exit(0);
