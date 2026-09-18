import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--chrome") result.chrome = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
if (!args.chrome || !fs.existsSync(args.chrome)) {
  throw new Error("installed Chrome path is required");
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"]
]);

function safeFilePath(urlPath) {
  let pathname = decodeURIComponent(urlPath);
  if (pathname.endsWith("/")) pathname += "index.html";
  const relative = pathname.replace(/^\/+/, "");
  const candidate = path.resolve(repoRoot, relative);
  const prefix = repoRoot.endsWith(path.sep) ? repoRoot : repoRoot + path.sep;
  if (candidate !== repoRoot && !candidate.startsWith(prefix)) return null;
  return candidate;
}

const server = http.createServer(async (req, res) => {
  try {
    const parsed = new URL(req.url || "/", "http://127.0.0.1");
    const filePath = safeFilePath(parsed.pathname);
    if (!filePath) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    const stat = await fsp.stat(filePath).catch(() => null);
    if (!stat?.isFile()) {
      res.writeHead(404).end("Not found");
      return;
    }

    const body = await fsp.readFile(filePath);
    res.writeHead(200, {
      "content-type": MIME.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500).end("Internal error");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
if (!address || typeof address === "string") throw new Error("local E2E server failed");
const baseURL = `http://127.0.0.1:${address.port}`;
const baseOrigin = new URL(baseURL).origin;

const MOCK_CORE = String.raw`
(() => {
  const params = new URL(globalThis.location.href).searchParams;
  const scenario = params.get("scenario") || "owner";

  const ownerProfile = {
    id: "e2e-owner",
    full_name: "E2E Owner",
    username: "e2e-owner",
    role: "OWNER",
    status: "ACTIVE"
  };
  const deniedProfile = {
    id: "e2e-accountant",
    full_name: "E2E Accountant",
    username: "e2e-accountant",
    role: "ACCOUNTANT",
    status: "ACTIVE"
  };

  const payablesClient = {
    from(name) {
      return {
        async select() {
          if (scenario === "slow-payables") {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
          if (name === "v_procurement_supplier_payables") {
            return {
              data: [
                { balance_due: 1000000, overdue_balance: 200000 },
                { balance_due: 500000, overdue_balance: 0 }
              ],
              error: null
            };
          }
          if (name === "v_procurement_order_summary") {
            return {
              data: [
                { balance_due: 500000, status: "OPEN", is_overdue: true },
                { balance_due: 1000000, status: "OPEN", is_overdue: false },
                { balance_due: 999999, status: "CANCELLED", is_overdue: true }
              ],
              error: null
            };
          }
          return { data: [], error: null };
        }
      };
    }
  };

  globalThis.MAGASIN_CORE = {
    version: "E2E",
    date: {
      dateKey() { return "2026-09-18"; },
      monday() { return "2026-09-14"; }
    },
    roles: {
      hasRole(profile, roles) {
        return roles.map(String).map((x) => x.toUpperCase())
          .includes(String(profile?.role || "").toUpperCase());
      }
    },
    supabase: {
      async requireActive() {
        if (scenario === "slow-auth") {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
        return scenario === "denied" ? deniedProfile : ownerProfile;
      },
      get() {
        if (scenario === "partial") {
          throw new Error("synthetic payables source outage");
        }
        return payablesClient;
      },
      async rpc(name) {
        if (name === "get_manager_transfer_requests") {
          return {
            data: [
              { status: "PENDING" },
              { status: "APPROVED" }
            ],
            error: null
          };
        }
        if (name === "list_schedule_generations") {
          return {
            data: [
              { status: "DRAFT" },
              { status: "PUBLISHED" }
            ],
            error: null
          };
        }
        return { data: [], error: null };
      }
    },
    stores: {
      async accessible() {
        return [{ id: "store-e2e", code: "E2E", name: "E2E Store" }];
      }
    }
  };
})();
`;

const browser = await chromium.launch({
  executablePath: args.chrome,
  headless: true
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 900 }
});

const blockedExternal = [];
const nonGetRequests = [];

await context.route("**/*", async (route) => {
  const request = route.request();
  const requestURL = new URL(request.url());

  if (request.method() !== "GET") {
    nonGetRequests.push({ method: request.method(), url: request.url() });
  }

  if (
    requestURL.origin === baseOrigin &&
    requestURL.pathname === "/02_CORE/shared/shared-core-v1.js"
  ) {
    await route.fulfill({
      status: 200,
      contentType: "text/javascript; charset=utf-8",
      body: MOCK_CORE
    });
    return;
  }

  if (requestURL.hostname === "cdn.jsdelivr.net") {
    await route.fulfill({
      status: 200,
      contentType: "text/javascript; charset=utf-8",
      body: "globalThis.supabase = globalThis.supabase || {};"
    });
    return;
  }

  if (requestURL.origin === baseOrigin) {
    await route.continue();
    return;
  }

  blockedExternal.push(request.url());
  await route.abort();
});

async function waitForOwnerSources(page) {
  await page.waitForFunction(() => {
    return document.querySelector("#workforceQuality")?.textContent === "ACTUAL";
  });
}

async function assertNoHorizontalOverflow(page) {
  const size = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  assert.ok(
    size.scrollWidth <= size.innerWidth + 1,
    `horizontal overflow: ${size.scrollWidth} > ${size.innerWidth}`
  );
}

async function runOwnerNavigationScenario() {
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const homeResponse = await page.goto(`${baseURL}/04_OWNER/`, {
    waitUntil: "domcontentloaded"
  });
  assert.equal(homeResponse?.status(), 200);

  const controlLink = page.locator('a[href="/04_OWNER/ControlTower/"]');
  await controlLink.waitFor({ state: "visible" });

  const [controlResponse] = await Promise.all([
    page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/04_OWNER/ControlTower/"
    ),
    controlLink.click()
  ]);

  assert.equal(controlResponse.status(), 200);
  assert.equal(new URL(page.url()).pathname, "/04_OWNER/ControlTower/");
  await page.locator("#app").waitFor({ state: "visible" });
  await waitForOwnerSources(page);

  assert.equal((await page.locator("#ownerIdentity").textContent())?.trim(), "E2E Owner · OWNER");
  assert.equal((await page.locator("#reportingDate").textContent())?.trim(), "2026-09-18");
  assert.equal(
    (await page.locator("#globalConfidence").textContent())?.trim(),
    "ACTUAL 2 · ESTIMATE 0 · GAP 0 · NOT CONNECTED 3"
  );

  assert.equal(await page.locator("#revenueQuality").getAttribute("data-quality"), "NOT_CONNECTED");
  assert.equal((await page.locator("#revenueValue").textContent())?.trim(), "—");

  assert.equal(await page.locator("#payableQuality").getAttribute("data-quality"), "ACTUAL");
  assert.match((await page.locator("#payableValue").textContent()) || "", /1[.\s]?500[.\s]?000/);
  assert.equal((await page.locator("#payableOpenOrders").textContent())?.trim(), "2");
  assert.equal((await page.locator("#payableOverdueOrders").textContent())?.trim(), "1");

  assert.equal(await page.locator("#workforceQuality").getAttribute("data-quality"), "ACTUAL");
  assert.equal((await page.locator("#workforceGap").textContent())?.trim(), "—");
  assert.equal((await page.locator("#workforceUnresolved").textContent())?.trim(), "2");

  assert.equal(await page.locator("#inventoryQuality").getAttribute("data-quality"), "NOT_CONNECTED");
  assert.equal(await page.locator("#taskQuality").getAttribute("data-quality"), "NOT_CONNECTED");
  assert.equal(await page.locator("#qualityList .quality-row").count(), 5);

  assert.equal(
    await page.locator('a[href="/nhap-hang/"]').getAttribute("href"),
    "/nhap-hang/"
  );
  assert.equal(
    await page.locator('a[href="/04_OWNER/Workforce/"]').getAttribute("href"),
    "/04_OWNER/Workforce/"
  );

  const revenueBox = await page.locator(".grid .card").nth(0).boundingBox();
  const payablesBox = await page.locator(".grid .card").nth(1).boundingBox();
  assert.ok(revenueBox && payablesBox);
  assert.ok(Math.abs(revenueBox.y - payablesBox.y) <= 2);
  assert.ok(payablesBox.x > revenueBox.x);

  await assertNoHorizontalOverflow(page);
  assert.deepEqual(pageErrors, []);

  const workforceLink = page.locator('a[href="/04_OWNER/Workforce/"]');
  const [workforceResponse] = await Promise.all([
    page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/04_OWNER/Workforce/"
    ),
    workforceLink.click()
  ]);
  assert.equal(workforceResponse.status(), 200);
  assert.equal(new URL(page.url()).pathname, "/04_OWNER/Workforce/");

  await page.close();
  return {
    ownerHomeToControlTower: true,
    revenueFailClosed: true,
    payablesActual: true,
    workforceActual: true,
    drillDownRoute: true,
    desktopLayout: true
  };
}

async function runPartialScenario() {
  const page = await context.newPage();
  await page.goto(`${baseURL}/04_OWNER/ControlTower/?scenario=partial`, {
    waitUntil: "domcontentloaded"
  });
  await page.locator("#app").waitFor({ state: "visible" });
  await waitForOwnerSources(page);

  assert.equal(await page.locator("#payableQuality").getAttribute("data-quality"), "GAP");
  assert.equal((await page.locator("#payableValue").textContent())?.trim(), "—");
  assert.equal(await page.locator("#workforceQuality").getAttribute("data-quality"), "ACTUAL");
  assert.equal((await page.locator("#workforceUnresolved").textContent())?.trim(), "2");
  assert.equal(await page.locator("#revenueQuality").getAttribute("data-quality"), "NOT_CONNECTED");
  assert.equal(await page.locator("#denied").isVisible(), false);
  assert.equal(await page.locator("#app").isVisible(), true);
  assert.equal(
    (await page.locator("#globalConfidence").textContent())?.trim(),
    "ACTUAL 1 · ESTIMATE 0 · GAP 1 · NOT CONNECTED 3"
  );

  await page.close();
  return {
    failedSourceIsGap: true,
    healthySiblingRemainsVisible: true,
    deniedSurfaceNotReused: true
  };
}

async function runDeniedScenario() {
  const page = await context.newPage();
  await page.goto(`${baseURL}/04_OWNER/ControlTower/?scenario=denied`, {
    waitUntil: "domcontentloaded"
  });

  await page.locator("#denied").waitFor({ state: "visible" });
  assert.equal(await page.locator("#app").isVisible(), false);
  assert.equal(await page.locator("#loading").isVisible(), false);
  assert.match((await page.locator("#deniedText").textContent()) || "", /Chỉ Owner/i);

  await page.close();
  return { roleDenied: true };
}

async function runLoadingScenario() {
  const page = await context.newPage();
  await page.goto(`${baseURL}/04_OWNER/ControlTower/?scenario=slow-auth`, {
    waitUntil: "domcontentloaded"
  });

  assert.equal(await page.locator("#loading").isVisible(), true);
  assert.equal(await page.locator("#app").isVisible(), false);
  assert.equal(await page.locator("#denied").isVisible(), false);

  await page.locator("#app").waitFor({ state: "visible" });
  assert.equal(await page.locator("#loading").isVisible(), false);

  await page.close();
  return { loadingVisibleDuringAuth: true, appVisibleAfterAuth: true };
}

async function runIndependentSourceScenario() {
  const page = await context.newPage();
  await page.goto(`${baseURL}/04_OWNER/ControlTower/?scenario=slow-payables`, {
    waitUntil: "domcontentloaded"
  });
  await page.locator("#app").waitFor({ state: "visible" });

  await page.waitForFunction(
    () => document.querySelector("#workforceQuality")?.textContent === "ACTUAL",
    null,
    { timeout: 1000 }
  );

  assert.equal(
    await page.locator("#payableQuality").getAttribute("data-quality"),
    "NOT_CONNECTED"
  );
  assert.equal(
    await page.locator("#workforceQuality").getAttribute("data-quality"),
    "ACTUAL"
  );

  await page.waitForFunction(
    () => document.querySelector("#payableQuality")?.textContent === "ACTUAL",
    null,
    { timeout: 2500 }
  );

  await page.close();
  return {
    slowPayablesDoesNotBlockWorkforce: true,
    payablesEventuallyLoads: true
  };
}

async function runMobileScenario() {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL}/04_OWNER/ControlTower/`, {
    waitUntil: "domcontentloaded"
  });
  await page.locator("#app").waitFor({ state: "visible" });
  await waitForOwnerSources(page);
  await assertNoHorizontalOverflow(page);

  const layout = await page.evaluate(() => {
    const tokenCount = (value) =>
      value.trim().split(/\s+/).filter(Boolean).length;
    return {
      gridColumns: tokenCount(getComputedStyle(document.querySelector(".grid")).gridTemplateColumns),
      contextColumns: tokenCount(getComputedStyle(document.querySelector(".context")).gridTemplateColumns),
      topbarDisplay: getComputedStyle(document.querySelector(".topbar")).display,
      qualityColumns: tokenCount(getComputedStyle(document.querySelector(".quality-row")).gridTemplateColumns)
    };
  });

  assert.equal(layout.gridColumns, 1);
  assert.equal(layout.contextColumns, 1);
  assert.equal(layout.topbarDisplay, "block");
  assert.equal(layout.qualityColumns, 1);

  await page.close();
  return { width: 390, noOverflow: true, singleColumn: true };
}

try {
  const owner = await runOwnerNavigationScenario();
  const partial = await runPartialScenario();
  const denied = await runDeniedScenario();
  const loading = await runLoadingScenario();
  const independentSources = await runIndependentSourceScenario();
  const mobile = await runMobileScenario();

  assert.deepEqual(blockedExternal, []);
  assert.deepEqual(nonGetRequests, []);

  console.log(JSON.stringify({
    status: "PASS",
    browser: "installed Chrome via playwright-core",
    owner,
    partial,
    denied,
    loading,
    independentSources,
    mobile,
    network: {
      productionExternalRequests: blockedExternal.length,
      nonGetRequests: nonGetRequests.length
    },
    productionWrites: false
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
