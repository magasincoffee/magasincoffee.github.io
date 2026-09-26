import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

await import("./ui2-009-employee-people-browser.mjs");
if(process.exitCode)throw new Error("UI2-009 Employee people browser gate failed");

await import("./ui2-010-employee-phone-acceptance.mjs");
if(process.exitCode)throw new Error("UI2-010 Employee phone acceptance gate failed");

await import("./ui2-011-manager-shell-today-browser.mjs");
if(process.exitCode)throw new Error("UI2-011 Manager shell Today browser gate failed");

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:8767";
const OUT = process.env.QA_OUT || "qa-artifacts/people-shift";
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
  external_requests: []
};

function pass(name, detail = "") {
  report.checks.push({ name, status: "PASS", detail: String(detail ?? "") });
}
function fail(name, detail = "") {
  report.checks.push({ name, status: "FAIL", detail: String(detail ?? "") });
}
async function check(name, fn) {
  try {
    pass(name, await fn());
  } catch (error) {
    fail(name, error?.message || error);
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  locale: "vi-VN",
  timezoneId: "Asia/Ho_Chi_Minh"
});
const page = await context.newPage();
const baseOrigin = new URL(BASE).origin;

page.on("console", (msg) => {
  if (msg.type() === "error") report.console_errors.push(msg.text());
});
page.on("pageerror", (error) => {
  report.page_errors.push(String(error?.stack || error?.message || error));
});
page.on("request", (request) => {
  const url = request.url();
  if (!url.startsWith(baseOrigin) && !url.startsWith("data:") && !url.startsWith("about:")) {
    report.external_requests.push({ url, method: request.method() });
  }
});
page.on("requestfailed", (request) => {
  report.request_failures.push({
    url: request.url(),
    method: request.method(),
    error: request.failure()?.errorText || "unknown"
  });
});
page.on("response", (response) => {
  if (response.status() >= 500) {
    report.http_errors.push({ url: response.url(), status: response.status() });
  }
});

try {
  await page.goto(`${BASE}/09_QA/people-shift/day10-fixture.html`, {
    waitUntil: "networkidle"
  });

  const employee = page.frameLocator("#employeeApp");

  await page.waitForSelector("#panel-publish .msd");
  await employee.locator("body[data-employee-availability-engine='1']").waitFor();
  await employee.locator("body[data-employee-schedule-engine='1']").waitFor();

  await check("canonical_engines_loaded", async () => {
    const loaded = await page.evaluate(() => ({
      availability: typeof globalThis.MAGASIN_EMPLOYEE?.availability?.refresh === "function",
      schedule: typeof globalThis.MAGASIN_EMPLOYEE?.schedule?.refresh === "function",
      ownerScheduling: Boolean(document.querySelector(".msd[data-scheduling-actor='OWNER']"))
    }));
    if (!loaded.availability || !loaded.schedule || !loaded.ownerScheduling) {
      throw new Error(JSON.stringify(loaded));
    }
    return JSON.stringify(loaded);
  });

  await check("employee_availability_registration", async () => {
    await employee.locator("button", { hasText: "Đăng ký lịch làm" }).first().click();
    await employee.locator("#weeklyRegistrationPanel.open").waitFor();

    const day = await employee.locator("#quickRegDay option").first().getAttribute("value");
    if (!day) throw new Error("registration day not populated");
    await employee.locator("#quickRegDay").selectOption(day);
    await employee.locator("#quickRegStart").selectOption("06:00");
    await employee.locator("#quickRegEnd").selectOption("12:00");
    await employee.locator("#quickRegStore").selectOption("CN-QA");

    await employee.locator("#weeklyRegistrationPanel button", { hasText: "Đăng ký" }).click();
    await employee.locator("#quickRegMsg").filter({ hasText: "Đã đăng ký lịch làm." }).waitFor();
    await employee.locator(".week-summary").filter({ hasText: "Đã đăng ký" }).waitFor();

    const saved = await page.evaluate(() =>
      globalThis.__PEOPLE_SHIFT_QA.state.availability.map((row) => ({
        work_date: row.work_date,
        start_time: row.start_time,
        end_time: row.end_time,
        preferred_store_id: row.preferred_store_id
      }))
    );
    if (saved.length !== 1 || saved[0].preferred_store_id !== "store-qa") {
      throw new Error(JSON.stringify(saved));
    }
    return JSON.stringify(saved[0]);
  });

  await check("owner_draft_requires_registered_availability", async () => {
    await page.locator("#msdReload").click();
    await page.locator(".msd-source-row").filter({ hasText: "Nhân viên QA" }).waitFor();
    await page.locator("#msdStart").click();
    await page.waitForFunction(() => globalThis.__PEOPLE_SHIFT_QA.state.generation?.status === "DRAFT");
    await page.locator(".msd-source-row").filter({ hasText: "Nhân viên QA" }).locator("[data-add-av]").click();
    await page.locator("#msdSave").click();
    await page.waitForFunction(() =>
      globalThis.__PEOPLE_SHIFT_QA.calls.some(call => call.name === "replace_schedule_generation_assignments") &&
      globalThis.MAGASIN_MANAGER_SCHEDULE_DRAFT.getState().busy === false
    );
    const state = await page.evaluate(() => ({
      status: globalThis.__PEOPLE_SHIFT_QA.state.generation?.status,
      weekStart: globalThis.__PEOPLE_SHIFT_QA.state.generation?.week_start,
      assignmentDate: globalThis.__PEOPLE_SHIFT_QA.state.assignments[0]?.work_date,
      assignments: globalThis.__PEOPLE_SHIFT_QA.state.assignments.length
    }));
    if (
      state.status !== "DRAFT" ||
      state.weekStart !== "2026-09-21" ||
      state.assignmentDate !== "2026-09-21" ||
      state.assignments !== 1
    ) {
      throw new Error(JSON.stringify(state));
    }
    return JSON.stringify(state);
  });

  await check("owner_validate_review_generation", async () => {
    await page.locator("#msdValidate").click();
    await page.locator("#msdStatus").filter({ hasText: "Lịch không có xung đột chặn phát hành" }).waitFor();
    await page.locator("#msdReview").click();
    await page.waitForFunction(() => globalThis.__PEOPLE_SHIFT_QA.state.generation?.status === "REVIEWED");
    const text = await page.locator("#panel-publish").innerText();
    if (!text.includes("ĐÃ DUYỆT")) throw new Error(text);
    return "REVIEWED";
  });

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });

  await check("owner_publish_official_schedule", async () => {
    await page.locator("#msdPublish").click();
    await page.waitForFunction(() => globalThis.__PEOPLE_SHIFT_QA.state.generation?.status === "PUBLISHED");
    await page.locator(".msd-official-row").filter({ hasText: "Nhân viên QA" }).waitFor();
    const state = await page.evaluate(() => ({
      status: globalThis.__PEOPLE_SHIFT_QA.state.generation?.status,
      official: globalThis.__PEOPLE_SHIFT_QA.state.official.length
    }));
    if (state.status !== "PUBLISHED" || state.official !== 1) {
      throw new Error(JSON.stringify(state));
    }
    return JSON.stringify(state);
  });

  await check("employee_approved_schedule_visible_after_publish", async () => {
    await employee.locator('[data-schedule-week="next"]').click();
    await employee.locator("#view-schedule .pill").filter({ hasText: "21/09/2026" }).waitFor();
    await employee.locator("#view-schedule .shift").filter({ hasText: "06:00–12:00" }).waitFor();
    const text = await employee.locator("#view-schedule").innerText();
    if (!text.includes("CN-QA")) throw new Error(text);
    return text.replace(/\s+/g, " ").trim().slice(0, 220);
  });

  await check("workflow_rpc_order", async () => {
    const names = await page.evaluate(() =>
      globalThis.__PEOPLE_SHIFT_QA.calls
        .filter((call) => call.kind === "rpc")
        .map((call) => call.name)
    );
    const required = [
      "save_my_availability",
      "create_schedule_generation",
      "replace_schedule_generation_assignments",
      "validate_schedule_generation_v1",
      "review_schedule_generation",
      "publish_schedule_generation",
      "get_manager_weekly_schedule",
      "list_my_approved_schedules_v2"
    ];
    let cursor = -1;
    for (const name of required) {
      const next = names.indexOf(name, cursor + 1);
      if (next < 0) throw new Error(`missing/out-of-order ${name}: ${JSON.stringify(names)}`);
      cursor = next;
    }
    return required.join(" → ");
  });

  await check("production_guardrails", async () => {
    const names = await page.evaluate(() =>
      globalThis.__PEOPLE_SHIFT_QA.calls
        .filter((call) => call.kind === "rpc")
        .map((call) => call.name)
    );
    const unexpected = names.filter((name) =>
      /migration|backfill|delete_|purge|admin|permission/i.test(name)
    );
    if (unexpected.length) throw new Error(JSON.stringify(unexpected));
    return "sanitized in-memory RPC fixture only; no migration/backfill/admin calls";
  });

  await check("no_external_network", async () => {
    if (report.external_requests.length) {
      throw new Error(JSON.stringify(report.external_requests));
    }
    return "all browser requests remained on local QA origin";
  });

  await check("console_errors", async () => {
    if (report.console_errors.length) throw new Error(report.console_errors.join("\n"));
    return "0";
  });
  await check("page_errors", async () => {
    if (report.page_errors.length) throw new Error(report.page_errors.join("\n"));
    return "0";
  });
  await check("request_failures", async () => {
    if (report.request_failures.length) throw new Error(JSON.stringify(report.request_failures));
    return "0";
  });
  await check("http_5xx", async () => {
    if (report.http_errors.length) throw new Error(JSON.stringify(report.http_errors));
    return "0";
  });

  await page.screenshot({
    path: path.join(OUT, "day10-people-shift.png"),
    fullPage: true
  });
} catch (error) {
  fail("browser_harness", error?.stack || error);
}

await browser.close();

const failed = report.checks.filter((item) => item.status === "FAIL");
report.status = failed.length ? "FAIL" : "PASS";
fs.writeFileSync(
  path.join(OUT, "day10-people-shift-report.json"),
  JSON.stringify(report, null, 2)
);

console.log(`PEOPLE_SHIFT_DAY10_BROWSER_E2E=${report.status}`);
for (const item of report.checks) {
  console.log(`[${item.status}] ${item.name}${item.detail ? " — " + item.detail : ""}`);
}
if (failed.length) process.exitCode = 1;
