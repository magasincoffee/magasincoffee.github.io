import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:8767";
const OUT = process.env.QA_OUT || "qa-artifacts/people-shift";
const STATE_KEY = "magasin.people-shift.qa.v1";
fs.mkdirSync(OUT, { recursive: true });

const report = {
  generated_at: new Date().toISOString(),
  base_url: BASE,
  status: "PASS",
  checks: [],
  console_errors: [],
  page_errors: [],
  request_failures: [],
  http_errors: [],
  production_network_attempts: []
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

function installQaCore() {
  const STATE_KEY = "magasin.people-shift.qa.v1";
  const topPath = globalThis.top?.location?.pathname || globalThis.location.pathname;
  const topSearch = new URLSearchParams(globalThis.top?.location?.search || "");
  const employeeSurface = topPath.startsWith("/06_EMPLOYEE/");
  const stage = topSearch.get("qaStage") || "";
  const currentMonday =
    employeeSurface && stage === "availability" ? "2026-09-14" : "2026-09-21";

  const initialState = {
    availability: [],
    generation: null,
    assignments: [],
    official: [],
    calls: []
  };

  function readState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      return raw ? { ...initialState, ...JSON.parse(raw) } : { ...initialState };
    } catch {
      return { ...initialState };
    }
  }

  function writeState(state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function record(name, args, mode = "read") {
    const state = readState();
    state.calls.push({ name, args, mode, mocked: true });
    writeState(state);
    return state;
  }

  function dateKey(value) {
    return String(value || currentMonday).slice(0, 10);
  }

  function addDays(value, days) {
    const d = new Date(dateKey(value) + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + Number(days || 0));
    return d.toISOString().slice(0, 10);
  }

  function weekDays(value) {
    return Array.from({ length: 7 }, (_, index) => addDays(value, index));
  }

  function formatDate(value) {
    const parts = dateKey(value).split("-");
    return parts.length === 3
      ? parts[2] + "/" + parts[1] + "/" + parts[0]
      : String(value || "");
  }

  function time5(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
    return match ? String(match[1]).padStart(2, "0") + ":" + match[2] : "";
  }

  function minutes(value) {
    const t = time5(value);
    if (!t) return 0;
    const parts = t.split(":").map(Number);
    return parts[0] * 60 + parts[1];
  }

  function shiftKind(value) {
    const m = minutes(value);
    return m < 720 ? "morning" : m < 1020 ? "afternoon" : "evening";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  const profile = employeeSurface
    ? {
        id: "employee-qa",
        username: "employee.qa",
        full_name: "Nhân viên QA",
        role: "STAFF",
        status: "ACTIVE"
      }
    : {
        id: "owner-qa",
        username: "owner.qa",
        full_name: "Owner QA",
        role: "OWNER",
        status: "ACTIVE"
      };

  const stores = [{ id: "store-1", code: "CN1", name: "QA Store" }];

  async function rpc(name, args = {}) {
    const writeRpcs = new Set([
      "save_my_availability",
      "auto_generate_schedule_generation",
      "review_schedule_generation",
      "publish_schedule_generation"
    ]);
    let state = record(name, args, writeRpcs.has(name) ? "write-mocked" : "read");

    if (name === "get_my_availability") {
      return { data: state.availability, error: null };
    }

    if (name === "save_my_availability") {
      const row = {
        availability_id: "availability-qa-1",
        work_date: args.p_work_date,
        start_time: args.p_start_time,
        end_time: args.p_end_time,
        availability_type: args.p_availability_type || "AVAILABLE",
        preferred_store_id: args.p_preferred_store_id,
        employee_name: "Nhân viên QA",
        username: "employee.qa"
      };
      state.availability = [row];
      writeState(state);
      return { data: row.availability_id, error: null };
    }

    if (name === "get_workforce_staffing_requirements") {
      return {
        data: state.availability.length
          ? [{
              id: "requirement-qa-1",
              status: "ACTIVE",
              work_date: state.availability[0].work_date,
              start_time: state.availability[0].start_time,
              end_time: state.availability[0].end_time,
              minimum_headcount: 1,
              target_headcount: 1,
              maximum_headcount: 1,
              skill_code: null,
              min_skill_level: 0
            }]
          : [],
        error: null
      };
    }

    if (name === "get_manager_weekly_availability") {
      return {
        data: state.availability.map((row) => ({
          ...row,
          preferred_store_code: "CN1"
        })),
        error: null
      };
    }

    if (name === "get_manager_transfer_requests") {
      return { data: [], error: null };
    }

    if (name === "list_schedule_generations") {
      return {
        data: state.generation ? [state.generation] : [],
        error: null
      };
    }

    if (name === "auto_generate_schedule_generation") {
      if (!state.availability.length) {
        return { data: null, error: new Error("QA requires availability before generation") };
      }
      state.generation = {
        id: "generation-qa-1",
        status: "DRAFT",
        algorithm_version: args.p_algorithm_version || "GREEDY_V1"
      };
      const source = state.availability[0];
      state.assignments = [{
        work_date: source.work_date,
        start_time: source.start_time,
        end_time: source.end_time,
        employee_name: "Nhân viên QA",
        employee_id: "employee-qa",
        store_code: "CN1",
        store_id: "store-1",
        score: 100,
        warning: "",
        skill_code: null,
        skill_level: 0
      }];
      writeState(state);
      return {
        data: {
          generation_id: state.generation.id,
          status: state.generation.status,
          algorithm_version: state.generation.algorithm_version
        },
        error: null
      };
    }

    if (name === "get_schedule_generation_assignments") {
      return { data: state.assignments, error: null };
    }

    if (name === "review_schedule_generation") {
      if (!state.generation || state.generation.status !== "DRAFT") {
        return { data: null, error: new Error("Generation must be DRAFT") };
      }
      state.generation.status = "REVIEWED";
      writeState(state);
      return { data: { status: "REVIEWED" }, error: null };
    }

    if (name === "publish_schedule_generation") {
      if (!state.generation || state.generation.status !== "REVIEWED") {
        return { data: null, error: new Error("Generation must be REVIEWED") };
      }
      state.generation.status = "PUBLISHED";
      state.official = state.assignments.map((row) => ({
        ...row,
        status: "APPROVED"
      }));
      writeState(state);
      return {
        data: {
          published: true,
          inserted_schedule_count: state.official.length
        },
        error: null
      };
    }

    if (name === "get_manager_weekly_schedule") {
      return { data: state.official, error: null };
    }

    if (name === "list_my_approved_schedules_v2") {
      return { data: state.official, error: null };
    }

    return { data: [], error: null };
  }

  globalThis.__PEOPLE_SHIFT_QA = {
    getState: readState,
    reset() {
      localStorage.removeItem(STATE_KEY);
    }
  };

  globalThis.MAGASIN_CORE = {
    DAYS: ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"],
    supabase: {
      async requireActive() {
        return profile;
      },
      rpc
    },
    roles: {
      label: { OWNER: "Owner", STAFF: "Nhân viên", EMPLOYEE: "Nhân viên" },
      hasRole(value, roles) {
        return value?.status === "ACTIVE" &&
          roles.includes(String(value?.role || "").toUpperCase());
      }
    },
    date: {
      dateKey: () => "2026-09-21",
      monday: () => currentMonday,
      addDays,
      weekDays,
      formatDate
    },
    time: {
      time5,
      minutes,
      shiftKind
    },
    stores: {
      async accessible() { return stores; },
      async active() { return stores; }
    },
    security: { escapeHtml },
    ui: {
      toast() {},
      setLoading() {}
    }
  };
}

const sharedCoreMock = "(" + installQaCore.toString() + ")();";

function attachDiagnostics(page, label) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.console_errors.push({ page: label, text: msg.text() });
    }
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
  page.on("request", (request) => {
    const url = request.url();
    if (/supabase\.(co|in)|supabase\.com|rest\/v1|auth\/v1|rpc\//i.test(url)) {
      report.production_network_attempts.push({
        page: label,
        url,
        method: request.method()
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

async function newQaContext(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh"
  });

  await context.route("https://cdn.jsdelivr.net/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "globalThis.supabase = { createClient(){ return { auth:{ async getSession(){ return { data:{ session:null }, error:null }; }, async signOut(){ return { error:null }; }, onAuthStateChange(){ return { data:{ subscription:{ unsubscribe(){} } } }; } } }; } };"
    });
  });

  await context.route("**/02_CORE/security/security-runtime.js*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "globalThis.MAGASIN_SECURITY = globalThis.MAGASIN_SECURITY || {};"
    });
  });

  await context.route("**/02_CORE/shared/shared-core-v1.js*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: sharedCoreMock
    });
  });

  return context;
}

async function readQaState(page) {
  return await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STATE_KEY);
}

async function shot(page, name) {
  await page.screenshot({
    path: path.join(OUT, name + ".png"),
    fullPage: true
  });
}

const browser = await chromium.launch({ headless: true });

try {
  const context = await newQaContext(browser);
  const page = await context.newPage();
  attachDiagnostics(page, "people-shift");

  await page.goto(BASE + "/06_EMPLOYEE/?qaStage=availability", {
    waitUntil: "domcontentloaded",
    timeout: 20000
  });

  const employeeApp = page
    .frameLocator("#app")
    .frameLocator("#employeeApp");

  await check("employee_availability_registration", async () => {
    const openButton = employeeApp.getByRole("button", {
      name: /Đăng ký lịch làm/
    }).first();
    await openButton.waitFor({ state: "visible", timeout: 15000 });
    await openButton.click();

    const day = employeeApp.locator("#quickRegDay");
    await day.locator("option").first().waitFor({
      state: "attached",
      timeout: 10000
    });
    await day.selectOption("2026-09-21");
    await employeeApp.locator("#quickRegStart").selectOption("06:00");
    await employeeApp.locator("#quickRegEnd").selectOption("12:00");
    await employeeApp.locator("#quickRegStore").selectOption("CN1");

    await employeeApp
      .getByRole("button", { name: "Đăng ký", exact: true })
      .click();

    await employeeApp.locator("#quickRegMsg").filter({
      hasText: "Đã đăng ký lịch làm."
    }).waitFor({ state: "visible", timeout: 10000 });

    const state = await readQaState(page);
    if (state?.availability?.length !== 1) {
      throw new Error("availability=" + JSON.stringify(state?.availability));
    }
    const row = state.availability[0];
    if (
      row.work_date !== "2026-09-21" ||
      row.start_time !== "06:00" ||
      row.end_time !== "12:00" ||
      row.preferred_store_id !== "store-1"
    ) {
      throw new Error(JSON.stringify(row));
    }
    return row.work_date + " " + row.start_time + "-" + row.end_time + " CN1";
  });

  await shot(page, "01-employee-availability");

  await page.goto(BASE + "/04_OWNER/Workforce/", {
    waitUntil: "domcontentloaded",
    timeout: 20000
  });

  const ownerShell = page
    .frameLocator("#app")
    .frameLocator("#app");

  await check("owner_workforce_publish_surface", async () => {
    const workforceNav = ownerShell.locator('button[data-view="workforce"]').last();
    await workforceNav.waitFor({ state: "visible", timeout: 15000 });
    await workforceNav.click();

    const publishTab = ownerShell.locator('button[data-tab="publish"]');
    await publishTab.waitFor({ state: "visible", timeout: 10000 });
    await publishTab.click();

    await ownerShell.locator("#owpGenerate").waitFor({
      state: "visible",
      timeout: 15000
    });
    return "publish engine loaded";
  });

  await check("generation_review_publish_contract", async () => {
    await ownerShell.locator("#owpGenerate").click();
    await ownerShell.locator("#owpMsg").filter({
      hasText: "Đã tạo lịch dự thảo"
    }).waitFor({ state: "visible", timeout: 10000 });

    const review = ownerShell.locator("#owpReview");
    if (await review.isDisabled()) throw new Error("review remained disabled");
    await review.click();

    await ownerShell.locator("#owpMsg").filter({
      hasText: "Rà soát hợp lệ"
    }).waitFor({ state: "visible", timeout: 10000 });

    const publish = ownerShell.locator("#owpPublish");
    if (await publish.isDisabled()) throw new Error("publish remained disabled");

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await publish.click();

    await ownerShell.locator("#owpMsg").filter({
      hasText: "Đã phát hành"
    }).waitFor({ state: "visible", timeout: 10000 });

    const official = ownerShell.locator("#owpOfficial");
    await official.getByText("Nhân viên QA").waitFor({
      state: "visible",
      timeout: 10000
    });

    const state = await readQaState(page);
    if (state?.generation?.status !== "PUBLISHED") {
      throw new Error("generation=" + JSON.stringify(state?.generation));
    }
    if (state?.official?.length !== 1 || state.official[0].status !== "APPROVED") {
      throw new Error("official=" + JSON.stringify(state?.official));
    }
    return "generation=" + state.generation.status + "; official=" + state.official.length;
  });

  await shot(page, "02-owner-published-schedule");

  await page.goto(BASE + "/06_EMPLOYEE/?qaStage=published", {
    waitUntil: "domcontentloaded",
    timeout: 20000
  });

  const publishedEmployeeApp = page
    .frameLocator("#app")
    .frameLocator("#employeeApp");

  await check("employee_sees_approved_schedule", async () => {
    const scheduleLink = publishedEmployeeApp.locator('a[data-view="schedule"]');
    await scheduleLink.waitFor({ state: "visible", timeout: 15000 });
    await publishedEmployeeApp.locator(".header-menu").click();
    await scheduleLink.click();

    const scheduleView = publishedEmployeeApp.locator("#view-schedule");
    await scheduleView.waitFor({ state: "visible", timeout: 10000 });

    await scheduleView.getByText("06:00–12:00").waitFor({
      state: "visible",
      timeout: 10000
    });
    await scheduleView.getByText("CN1").waitFor({
      state: "visible",
      timeout: 10000
    });

    const state = await readQaState(page);
    if (state?.official?.[0]?.status !== "APPROVED") {
      throw new Error(JSON.stringify(state?.official));
    }
    return "approved shift visible to employee";
  });

  await shot(page, "03-employee-approved-schedule");

  await check("mocked_write_sequence_only", async () => {
    const state = await readQaState(page);
    const writes = (state?.calls || [])
      .filter((call) => call.mode === "write-mocked")
      .map((call) => call.name);

    const expected = [
      "save_my_availability",
      "auto_generate_schedule_generation",
      "review_schedule_generation",
      "publish_schedule_generation"
    ];

    for (const name of expected) {
      if (!writes.includes(name)) {
        throw new Error("missing mocked write: " + name + "; writes=" + writes.join(","));
      }
    }

    let last = -1;
    for (const name of expected) {
      const index = writes.indexOf(name);
      if (index <= last) {
        throw new Error("write order invalid: " + writes.join(" -> "));
      }
      last = index;
    }

    const unexpected = writes.filter((name) => !expected.includes(name));
    if (unexpected.length) {
      throw new Error("unexpected mocked writes: " + unexpected.join(","));
    }

    return writes.join(" -> ");
  });

  await context.close();
} catch (error) {
  fail("robot_exception", error?.stack || error);
} finally {
  await browser.close();
}

for (const entry of [
  ["console_errors", report.console_errors],
  ["page_errors", report.page_errors],
  ["request_failures", report.request_failures],
  ["http_5xx", report.http_errors],
  ["production_network_attempts", report.production_network_attempts]
]) {
  if (entry[1].length) fail(entry[0], JSON.stringify(entry[1]));
  else pass(entry[0]);
}

const failed = report.checks.filter((item) => item.status === "FAIL");
report.status = failed.length ? "FAIL" : "PASS";

fs.writeFileSync(
  path.join(OUT, "people-shift-browser-e2e.json"),
  JSON.stringify(report, null, 2)
);

console.log("PEOPLE_SHIFT_BROWSER_E2E=" + report.status);
for (const item of report.checks) {
  console.log(
    "[" + item.status + "] " + item.name + (item.detail ? " — " + item.detail : "")
  );
}
if (failed.length) process.exit(1);
