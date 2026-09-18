import process from "node:process";

const PORTS = Array.from({length: 11}, (_, i) => 9222 + i);

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

function classifyGoogle(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "accounts.google.com") return false;
    if (u.hostname === "console.cloud.google.com") return true;
  } catch {}
  return null;
}

function classifySupabase(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== "supabase.com") return null;
    if (/sign-?in|login/i.test(u.pathname)) return false;
    if (u.pathname.startsWith("/dashboard")) return true;
  } catch {}
  return null;
}

const cdpUrl = await findCdp();
console.log("CDP_AVAILABLE=" + Boolean(cdpUrl));
if (!cdpUrl) process.exit(0);

const { chromium } = await import("playwright-core");
const version = await fetch(cdpUrl + "/json/version").then(r => r.json());
const ws = new URL(version.webSocketDebuggerUrl);
const endpoint = new URL(cdpUrl);
ws.hostname = endpoint.hostname;
ws.port = endpoint.port;

const browser = await chromium.connectOverCDP(ws.toString());
try {
  const context = browser.contexts()[0];
  if (!context) {
    console.log("BROWSER_CONTEXT_AVAILABLE=False");
    process.exit(0);
  }
  console.log("BROWSER_CONTEXT_AVAILABLE=True");

  const google = await context.newPage();
  try {
    await google.goto("https://console.cloud.google.com/apis/credentials", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    }).catch(() => {});
    await google.waitForTimeout(3000);
    const state = classifyGoogle(google.url());
    console.log("GOOGLE_CLOUD_SESSION=" + (state === true ? "AUTHENTICATED" : state === false ? "LOGIN_REQUIRED" : "UNKNOWN"));
  } finally {
    await google.close().catch(() => {});
  }

  const supabase = await context.newPage();
  try {
    await supabase.goto("https://supabase.com/dashboard/project/menvbzlsncmpuvnaifxa/functions/secrets", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    }).catch(() => {});
    await supabase.waitForTimeout(3000);
    const state = classifySupabase(supabase.url());
    console.log("SUPABASE_WEB_SESSION=" + (state === true ? "AUTHENTICATED" : state === false ? "LOGIN_REQUIRED" : "UNKNOWN"));
  } finally {
    await supabase.close().catch(() => {});
  }
} finally {
  // Connected over CDP to the Owner/Robot Chrome. Never close that browser.
}
