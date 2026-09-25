import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:8766";
const OUT = process.env.QA_OUT || "qa-artifacts/control-tower";
fs.mkdirSync(OUT, { recursive: true });

const report = {
  generated_at: new Date().toISOString(),
  base_url: BASE,
  status: "PASS",
  checks: [],
  console_errors: [],
  expected_console_errors: [],
  page_errors: [],
  request_failures: [],
  http_errors: []
};

function pass(name, detail = "") {
  report.checks.push({ name, status: "PASS", detail });
}
function fail(name, detail = "") {
  report.checks.push({ name, status: "FAIL", detail: String(detail) });
}
async function check(name, fn) {
  try {
    const detail = await fn();
    pass(name, detail == null ? "" : String(detail));
  } catch (error) {
    fail(name, error?.message || error);
  }
}

const sharedCoreMock = String.raw`
(() => {
  const qs = new URL(globalThis.location.href).searchParams;
  const role = qs.get("qaRole") === "ACCOUNTANT" ? "ACCOUNTANT" : "OWNER";
  const failSource = qs.get("qaFail") || "";
  const profile = {
    id: "qa-profile",
    username: "qa-owner",
    full_name: role === "OWNER" ? "Owner QA" : "Accounting QA",
    role,
    status: "ACTIVE"
  };
  const calls = [];
  globalThis.__CONTROL_TOWER_QA_CALLS = calls;

  const payables = [
    { balance_due: 500000, overdue_balance: 120000 },
    { balance_due: 350000, overdue_balance: 0 }
  ];
  const orders = [
    { balance_due: 200000, status: "OPEN", is_overdue: true },
    { balance_due: 100000, status: "OPEN", is_overdue: false },
    { balance_due: 300000, status: "PARTIAL", is_overdue: false },
    { balance_due: 250000, status: "OPEN", is_overdue: false },
    { balance_due: 999999, status: "CANCELLED", is_overdue: true }
  ];

  const client = {
    from(name) {
      calls.push({ kind: "from", name });
      return {
        async select() {
          if (name === "v_procurement_supplier_payables") {
            return { data: payables, error: null };
          }
          if (name === "v_procurement_order_summary") {
            return { data: orders, error: null };
          }
          return { data: [], error: null };
        }
      };
    }
  };

  globalThis.MAGASIN_CORE = {
    supabase: {
      async requireActive() {
        calls.push({ kind: "auth", role });
        return profile;
      },
      get() {
        if (failSource === "payables") {
          throw new Error("qa injected payables failure");
        }
        return client;
      },
      async rpc(name, args) {
        calls.push({ kind: "rpc", name, args });
        if (failSource === "workforce") {
          throw new Error("qa injected workforce failure");
        }
        if (name === "get_manager_transfer_requests") {
          return {
            data: [{ status: "PENDING" }, { status: "APPROVED" }],
            error: null
          };
        }
        if (name === "list_schedule_generations") {
          return {
            data: [
              { id: "generation-qa", status: "DRAFT" },
              { id: "generation-published", status: "PUBLISHED" }
            ],
            error: null
          };
        }
        if (name === "get_workforce_staffing_requirements") {
          return {
            data: [{
              id: "requirement-qa",
              status: "ACTIVE",
              work_date: "2026-09-14",
              start_time: "06:00",
              end_time: "12:00",
              minimum_headcount: 2,
              skill_code: null,
              min_skill_level: 0
            }],
            error: null
          };
        }
        if (name === "get_schedule_generation_assignments") {
          return {
            data: [{
              work_date: "2026-09-14",
              start_time: "06:00",
              end_time: "12:00",
              skill_code: null,
              skill_level: 0
            }],
            error: null
          };
        }
        return { data: [], error: null };
      }
    },
    roles: {
      hasRole(value, roles) {
        return value?.status === "ACTIVE" &&
          roles.includes(String(value?.role || "").toUpperCase());
      }
    },
    date: {
      dateKey() { return "2026-09-18"; },
      monday() { return "2026-09-14"; }
    },
    stores: {
      async accessible() {
        calls.push({ kind: "stores" });
        return [{ id: "store-1", name: "QA Store" }];
      }
    },
    security: { escapeHtml(value) { return String(value ?? ""); } },
    ui: { toast() {} }
  };
})();
`;

function attachDiagnostics(page, label) {
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (
      label === "denied" &&
      text.includes("[CONTROL_TOWER_AUTH]") &&
      /Chỉ Owner được mở Control Tower/i.test(text)
    ) {
      report.expected_console_errors.push({ page: label, text });
      return;
    }
    report.console_errors.push({ page: label, text });
  });
  page.on("pageerror", (error) => {
    report.page_errors.push({
      page: label,
      error: String(error?.stack || error?.message || error)
    });
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!/favicon|google-analytics|googletagmanager/i.test(url)) {
      report.request_failures.push({
        page: label,
        url,
        method: request.method(),
        error: request.failure()?.errorText || "unknown"
      });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      report.http_errors.push({
        page: label,
        url: response.url(),
        status: response.status()
      });
    }
  });
}

async function newQaContext(browser, viewport) {
  const context = await browser.newContext({
    viewport,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh"
  });
  await context.route("https://cdn.jsdelivr.net/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "globalThis.supabase = globalThis.supabase || {};"
    });
  });
  await context.route("**/02_CORE/shared/shared-core-v1.js", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: sharedCoreMock
    });
  });
  return context;
}

async function shot(page, name) {
  await page.screenshot({
    path: path.join(OUT, `${name}.png`),
    fullPage: true
  });
}

const browser = await chromium.launch({ headless: true });

try {
  const desktop = await newQaContext(browser, { width: 1440, height: 1050 });
  const page = await desktop.newPage();
  attachDiagnostics(page, "desktop-owner");

  await check("owner_home_to_control_tower_navigation", async () => {
    await page.goto(`${BASE}/04_OWNER/`, {
      waitUntil: "domcontentloaded",
      timeout: 20000
    });
    const link = page.locator('a[href="/04_OWNER/ControlTower/"]');
    await link.waitFor({ state: "visible", timeout: 10000 });
    await Promise.all([
      page.waitForURL("**/04_OWNER/ControlTower/**", { timeout: 15000 }),
      link.click()
    ]);
    await page.locator("#app:not(.hidden)").waitFor({
      state: "visible",
      timeout: 10000
    });
    return page.url();
  });

  await check("ui2_004_owner_shell_desktop_nav_contract", async () => {
    await page.locator("#magasinUiV2Shell").waitFor({ state: "visible", timeout: 10000 });
    const state = await page.evaluate(() => {
      const shell = document.querySelector("#magasinUiV2Shell");
      const sidebar = document.querySelector(".m-shell-v2-sidebar");
      const topbar = document.querySelector(".m-shell-v2-topbar");
      const links = Array.from(document.querySelectorAll(".m-shell-v2-nav__item")).map((node) => ({
        key: node.dataset.shellKey,
        href: node.getAttribute("href"),
        current: node.getAttribute("aria-current")
      }));
      return {
        shell: !!shell,
        sidebarWidth: sidebar?.getBoundingClientRect().width || 0,
        topbarHeight: topbar?.getBoundingClientRect().height || 0,
        links
      };
    });
    const expected = {
      overview: "/04_OWNER/",
      attention: "/04_OWNER/ControlTower/",
      workforce: "/04_OWNER/Workforce/",
      procurement: "/nhap-hang/",
      access: "/04_OWNER/Access/"
    };
    if (!state.shell || state.sidebarWidth < 200 || state.topbarHeight < 56) {
      throw new Error(JSON.stringify(state));
    }
    if (state.links.length !== 5) throw new Error(JSON.stringify(state.links));
    for (const item of state.links) {
      if (expected[item.key] !== item.href) throw new Error(JSON.stringify(item));
    }
    const active = state.links.find((item) => item.current === "page");
    if (active?.key !== "attention") throw new Error(JSON.stringify(active));
    if (state.links.some((item) => /finance|settings/i.test(item.key))) {
      throw new Error(JSON.stringify(state.links));
    }
    return JSON.stringify(state);
  });

  await check("authenticated_owner_identity", async () => {
    const text = await page.locator("#ownerIdentity").innerText();
    if (!/Owner QA.*OWNER/i.test(text)) throw new Error(text);
    return text;
  });

  await check("reporting_context_visible", async () => {
    const date = await page.locator("#reportingDate").innerText();
    const scope = await page.locator("#branchScope").innerText();
    if (date !== "2026-09-18" || scope !== "ALL") {
      throw new Error(`date=${date}, scope=${scope}`);
    }
    return `${date} / ${scope}`;
  });

  await check("revenue_unverified_stays_not_connected", async () => {
    const quality = await page.locator("#revenueQuality").innerText();
    const amount = await page.locator("#revenueValue").innerText();
    if (quality !== "NOT CONNECTED" || amount.trim() !== "—") {
      throw new Error(`quality=${quality}, amount=${amount}`);
    }
    return quality;
  });

  await check("payables_actual_renders_from_read_fixture", async () => {
    const quality = await page.locator("#payableQuality").innerText();
    const amount = await page.locator("#payableValue").innerText();
    const open = await page.locator("#payableOpenOrders").innerText();
    const overdue = await page.locator("#payableOverdueOrders").innerText();
    if (quality !== "ACTUAL" || amount.trim() === "—" || open !== "4" || overdue !== "1") {
      throw new Error(
        `quality=${quality}, amount=${amount}, open=${open}, overdue=${overdue}`
      );
    }
    return `${amount}; open=${open}; overdue=${overdue}`;
  });

  await check("workforce_actual_renders_attention", async () => {
    const quality = await page.locator("#workforceQuality").innerText();
    const unresolved = await page.locator("#workforceUnresolved").innerText();
    const gap = await page.locator("#workforceGap").innerText();
    if (quality !== "ACTUAL" || unresolved !== "2" || gap !== "1") {
      throw new Error(
        `quality=${quality}, unresolved=${unresolved}, gap=${gap}`
      );
    }
    return `gap=${gap}; unresolved=${unresolved}`;
  });

  await check("unconnected_sections_are_explicit", async () => {
    const inventory = await page.locator("#inventoryQuality").innerText();
    const tasks = await page.locator("#taskQuality").innerText();
    if (inventory !== "NOT CONNECTED" || tasks !== "NOT CONNECTED") {
      throw new Error(`inventory=${inventory}, tasks=${tasks}`);
    }
    return `${inventory} / ${tasks}`;
  });

  await check("data_quality_list_covers_all_sections", async () => {
    const count = await page.locator("#qualityList .quality-row").count();
    if (count !== 5) throw new Error(`quality rows=${count}`);
    return `${count} rows`;
  });

  await check("drill_down_links_target_existing_modules", async () => {
    const procurement = await page
      .locator('.actions a[href="/nhap-hang/"]')
      .getAttribute("href");
    const workforce = await page
      .locator('.actions a[href="/04_OWNER/Workforce/"]')
      .getAttribute("href");
    if (procurement !== "/nhap-hang/" || workforce !== "/04_OWNER/Workforce/") {
      throw new Error(`procurement=${procurement}, workforce=${workforce}`);
    }
    return `${procurement} | ${workforce}`;
  });

  await check("browser_path_is_read_only", async () => {
    const calls = await page.evaluate(() => globalThis.__CONTROL_TOWER_QA_CALLS || []);
    const rpcNames = calls
      .filter((item) => item.kind === "rpc")
      .map((item) => item.name);
    const allowed = new Set([
      "get_manager_transfer_requests",
      "list_schedule_generations",
      "get_workforce_staffing_requirements",
      "get_schedule_generation_assignments"
    ]);
    const unexpected = rpcNames.filter((name) => !allowed.has(name));
    if (unexpected.length) {
      throw new Error(`unexpected RPCs: ${unexpected.join(",")}`);
    }
    if (!calls.some((item) => item.kind === "from")) {
      throw new Error("payables read models were not exercised");
    }
    return JSON.stringify(calls);
  });

  await shot(page, "01-owner-desktop");
  await desktop.close();

  const deniedContext = await newQaContext(browser, { width: 1200, height: 900 });
  const deniedPage = await deniedContext.newPage();
  attachDiagnostics(deniedPage, "denied");
  await check("non_owner_sees_denied_not_dashboard", async () => {
    await deniedPage.goto(
      `${BASE}/04_OWNER/ControlTower/?qaRole=ACCOUNTANT`,
      { waitUntil: "domcontentloaded", timeout: 20000 }
    );
    await deniedPage.locator("#denied:not(.hidden)").waitFor({
      state: "visible",
      timeout: 10000
    });
    const appHidden = await deniedPage.locator("#app.hidden").count();
    const calls = await deniedPage.evaluate(
      () => globalThis.__CONTROL_TOWER_QA_CALLS || []
    );
    const dataCalls = calls.filter((item) =>
      ["from", "rpc", "stores"].includes(item.kind)
    );
    if (!appHidden || dataCalls.length) {
      throw new Error(
        `appHidden=${appHidden}, dataCalls=${JSON.stringify(dataCalls)}`
      );
    }
    return await deniedPage.locator("#deniedText").innerText();
  });
  await shot(deniedPage, "02-denied");
  await deniedContext.close();

  const degradedContext = await newQaContext(browser, {
    width: 1200,
    height: 900
  });
  const degradedPage = await degradedContext.newPage();
  attachDiagnostics(degradedPage, "degraded-payables");
  await check("one_source_failure_keeps_dashboard_usable", async () => {
    await degradedPage.goto(
      `${BASE}/04_OWNER/ControlTower/?qaFail=payables`,
      { waitUntil: "domcontentloaded", timeout: 20000 }
    );
    await degradedPage.locator("#app:not(.hidden)").waitFor({
      state: "visible",
      timeout: 10000
    });
    await degradedPage
      .locator('#payableQuality[data-quality="GAP"]')
      .waitFor({ state: "visible", timeout: 10000 });
    await degradedPage
      .locator('#workforceQuality[data-quality="ACTUAL"]')
      .waitFor({ state: "visible", timeout: 10000 });

    const payableAmount = await degradedPage.locator("#payableValue").innerText();
    const deniedVisible = await degradedPage.locator("#denied:not(.hidden)").count();
    if (payableAmount.trim() !== "—" || deniedVisible) {
      throw new Error(
        `payableAmount=${payableAmount}, deniedVisible=${deniedVisible}`
      );
    }
    return "Payables=GAP; Workforce=ACTUAL";
  });
  await shot(degradedPage, "03-source-gap");
  await degradedContext.close();

  const tablet = await newQaContext(browser, { width: 900, height: 900 });
  const tabletPage = await tablet.newPage();
  attachDiagnostics(tabletPage, "tablet-owner-shell");
  await check("ui2_004_owner_tablet_drawer_smoke", async () => {
    await tabletPage.goto(`${BASE}/04_OWNER/ControlTower/`, {
      waitUntil: "domcontentloaded",
      timeout: 20000
    });
    await tabletPage.locator("#app:not(.hidden)").waitFor({ state: "visible", timeout: 10000 });
    const menu = tabletPage.locator("[data-shell-menu]");
    await menu.waitFor({ state: "visible", timeout: 10000 });
    await menu.click();
    const state = await tabletPage.evaluate(() => {
      const drawer = document.querySelector(".m-shell-v2-sidebar");
      return {
        open: document.body.dataset.shellDrawerOpen,
        expanded: document.querySelector("[data-shell-menu]")?.getAttribute("aria-expanded"),
        width: drawer?.getBoundingClientRect().width || 0,
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth
      };
    });
    if (state.open !== "true" || state.expanded !== "true" || state.width > 321 || state.scrollWidth > state.viewport + 1) {
      throw new Error(JSON.stringify(state));
    }
    await tabletPage.keyboard.press("Escape");
    const closed = await tabletPage.evaluate(() => document.body.dataset.shellDrawerOpen);
    if (closed !== "false") throw new Error("drawer did not close on Escape");
    return JSON.stringify(state);
  });
  await shot(tabletPage, "04-owner-tablet-shell");
  await tablet.close();

  const mobile = await newQaContext(browser, { width: 390, height: 844 });
  const mobilePage = await mobile.newPage();
  attachDiagnostics(mobilePage, "mobile-owner");
  await check("mobile_layout_has_no_horizontal_overflow", async () => {
    await mobilePage.goto(`${BASE}/04_OWNER/ControlTower/`, {
      waitUntil: "domcontentloaded",
      timeout: 20000
    });
    await mobilePage.locator("#app:not(.hidden)").waitFor({
      state: "visible",
      timeout: 10000
    });
    const metrics = await mobilePage.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      cards: Array.from(document.querySelectorAll(".card")).map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width };
      })
    }));
    if (metrics.scrollWidth > metrics.width + 1) {
      throw new Error(
        `scrollWidth=${metrics.scrollWidth}, viewport=${metrics.width}`
      );
    }
    if (metrics.cards.some((r) => r.left < -1 || r.right > metrics.width + 1)) {
      throw new Error(JSON.stringify(metrics.cards));
    }
    return `${metrics.width}px viewport / ${metrics.scrollWidth}px document`;
  });
  await check("ui2_004_owner_phone_drawer_touch_target", async () => {
    const menu = mobilePage.locator("[data-shell-menu]");
    const size = await menu.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    if (size.width < 43.5 || size.height < 43.5) throw new Error(JSON.stringify(size));
    await menu.click();
    const state = await mobilePage.evaluate(() => {
      const drawer = document.querySelector(".m-shell-v2-sidebar");
      return {
        open: document.body.dataset.shellDrawerOpen,
        width: drawer?.getBoundingClientRect().width || 0,
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth
      };
    });
    if (state.open !== "true" || state.width > state.viewport * .89 || state.scrollWidth > state.viewport + 1) {
      throw new Error(JSON.stringify(state));
    }
    await mobilePage.keyboard.press("Escape");
    return JSON.stringify({ size, state });
  });

  await shot(mobilePage, "04-owner-mobile");
  await mobile.close();
} catch (error) {
  fail("robot_exception", error?.stack || error);
} finally {
  await browser.close();
}

if (report.console_errors.length) {
  fail("console_errors", JSON.stringify(report.console_errors));
} else {
  pass(
    "console_errors",
    report.expected_console_errors.length
      ? `ignored ${report.expected_console_errors.length} expected denied-auth diagnostic`
      : ""
  );
}
if (report.page_errors.length) {
  fail("page_errors", JSON.stringify(report.page_errors));
} else {
  pass("page_errors");
}
if (report.request_failures.length) {
  fail("request_failures", JSON.stringify(report.request_failures));
} else {
  pass("request_failures");
}
if (report.http_errors.length) {
  fail("http_5xx", JSON.stringify(report.http_errors));
} else {
  pass("http_5xx");
}

const failed = report.checks.filter((item) => item.status === "FAIL");
report.status = failed.length ? "FAIL" : "PASS";
fs.writeFileSync(
  path.join(OUT, "control-tower-browser-e2e.json"),
  JSON.stringify(report, null, 2)
);
console.log(`CONTROL_TOWER_BROWSER_E2E=${report.status}`);
for (const item of report.checks) {
  console.log(
    `[${item.status}] ${item.name}${item.detail ? ` — ${item.detail}` : ""}`
  );
}
if (failed.length) process.exit(1);
