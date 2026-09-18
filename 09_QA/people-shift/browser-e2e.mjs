import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:8767";
const OUT = process.env.QA_OUT || "qa-artifacts/people-shift";
const ORIGIN = new URL(BASE).origin;
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
function attachDiagnostics(page) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.console_errors.push({ text: msg.text() });
    }
  });
  page.on("pageerror", (error) => {
    report.page_errors.push({ error: String(error?.stack || error?.message || error) });
  });
  page.on("request", (request) => {
    const url = request.url();
    if (
      !url.startsWith(ORIGIN) &&
      !url.startsWith("data:") &&
      !url.startsWith("about:")
    ) {
      report.external_requests.push({ url, method: request.method() });
    }
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!/favicon/i.test(url)) {
      report.request_failures.push({
        url,
        method: request.method(),
        error: request.failure()?.errorText || "unknown"
      });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 500 && !/favicon/i.test(response.url())) {
      report.http_errors.push({ url: response.url(), status: response.status() });
    }
  });
}
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: true });
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh"
  });
  const page = await context.newPage();
  attachDiagnostics(page);
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  await page.goto(BASE + "/09_QA/people-shift/harness.html", {
    waitUntil: "domcontentloaded",
    timeout: 20000
  });
  await page.waitForFunction(() => globalThis.__QA_AVAILABILITY_READY === true, null, {
    timeout: 10000
  });

  const employee = page.frameLocator("#employeeApp");

  await check("employee_availability_registration", async () => {
    await employee.locator("#quickRegDay option").first().waitFor({ state: "attached", timeout: 10000 });
    await employee.locator("#openWeeklyRegistration").click();
    await employee.locator("#weeklyRegistrationPanel.open").waitFor({ state: "visible", timeout: 5000 });
    const selectedDate = await employee.locator("#quickRegDay").inputValue();
    if (selectedDate !== "2026-09-28") {
      throw new Error("availability week mismatch: " + selectedDate);
    }
    await employee.locator("#quickRegisterButton").click();
    await employee.locator("#quickRegMsg").filter({ hasText: "Đã đăng ký lịch làm." }).waitFor({
      state: "visible",
      timeout: 5000
    });
    const summary = await employee.locator(".week-summary").innerText();
    if (!summary.includes("06:00–12:00") || !summary.includes("CN1")) {
      throw new Error(summary);
    }
    return selectedDate + " / 06:00-12:00 / CN1";
  });

  await check("owner_publish_engine_boots_on_registered_week", async () => {
    await page.evaluate(() => globalThis.__QA_LOAD_SCHEDULING_ENGINES());
    await page.waitForFunction(() => globalThis.__QA_SCHEDULING_READY === true, null, {
      timeout: 10000
    });
    await page.locator("#owpGenerate").waitFor({ state: "visible", timeout: 10000 });
    const week = await page.locator("#owpWeek").innerText();
    if (!week.includes("28/09/2026") || !week.includes("04/10/2026")) {
      throw new Error(week);
    }
    return week;
  });

  await check("owner_generates_draft_from_fixture", async () => {
    await page.locator("#owpGenerate").click();
    await page.locator("#owpSummary").filter({ hasText: "DRAFT" }).waitFor({
      state: "visible",
      timeout: 5000
    });
    const draft = await page.locator("#owpDraft").innerText();
    if (!draft.includes("QA Staff") || !draft.includes("CN1") || !draft.includes("06:00")) {
      throw new Error(draft);
    }
    return "DRAFT / QA Staff / CN1";
  });

  await check("owner_reviews_generation_before_publish", async () => {
    await page.locator("#owpReview").click();
    await page.locator("#owpSummary").filter({ hasText: "REVIEWED" }).waitFor({
      state: "visible",
      timeout: 5000
    });
    const disabled = await page.locator("#owpPublish").isDisabled();
    if (disabled) throw new Error("publish button stayed disabled after review");
    return "REVIEWED";
  });

  await check("owner_publishes_official_schedule", async () => {
    await page.locator("#owpPublish").click();
    await page.locator("#owpSummary").filter({ hasText: "PUBLISHED" }).waitFor({
      state: "visible",
      timeout: 5000
    });
    const official = await page.locator("#owpOfficial").innerText();
    if (!official.includes("QA Staff") || !official.includes("APPROVED")) {
      throw new Error(official);
    }
    return "PUBLISHED / 1 approved shift";
  });

  await check("employee_sees_published_approved_schedule", async () => {
    await page.evaluate(async () => {
      await globalThis.MAGASIN_EMPLOYEE.schedule.refresh();
    });
    await employee.locator("#view-schedule .schedule-main-panel .shift").waitFor({
      state: "visible",
      timeout: 5000
    });
    const schedule = await employee.locator("#view-schedule .schedule-main-panel").innerText();
    if (!schedule.includes("06:00–12:00") || !schedule.includes("CN1")) {
      throw new Error(schedule);
    }
    const pill = await employee.locator("#view-schedule .pill").innerText();
    if (!pill.includes("28/09/2026") || !pill.includes("04/10/2026")) {
      throw new Error("employee schedule week mismatch: " + pill);
    }
    return pill + " / CN1 / 06:00-12:00";
  });

  await check("contract_rpc_sequence_is_complete_and_mock_only", async () => {
    const calls = await page.evaluate(() => globalThis.__PEOPLE_SHIFT_QA_CALLS || []);
    const names = calls.filter((item) => item.kind === "rpc").map((item) => item.name);
    const allowed = new Set([
      "get_my_availability",
      "save_my_availability",
      "list_schedule_generations",
      "get_schedule_generation_assignments",
      "get_manager_weekly_schedule",
      "auto_generate_schedule_generation",
      "review_schedule_generation",
      "publish_schedule_generation",
      "list_my_approved_schedules_v2"
    ]);
    const unexpected = names.filter((name) => !allowed.has(name));
    if (unexpected.length) {
      throw new Error("unexpected RPCs: " + unexpected.join(","));
    }
    const save = names.indexOf("save_my_availability");
    const generate = names.indexOf("auto_generate_schedule_generation");
    const review = names.indexOf("review_schedule_generation");
    const publish = names.indexOf("publish_schedule_generation");
    const employeeRead = names.lastIndexOf("list_my_approved_schedules_v2");
    if (!(save >= 0 && save < generate && generate < review && review < publish && publish < employeeRead)) {
      throw new Error("sequence=" + names.join(" > "));
    }
    const state = await page.evaluate(() => globalThis.__PEOPLE_SHIFT_QA_STATE);
    if (state.generation?.status !== "PUBLISHED" || state.official?.length !== 1) {
      throw new Error(JSON.stringify(state));
    }
    return "availability > generate > review > publish > employee approved read";
  });

  await screenshot(page, "01-day10-desktop");

  await check("mobile_day10_surfaces_stay_usable", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    const outer = await page.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    if (outer.scrollWidth > outer.width + 1) {
      throw new Error("outer overflow " + JSON.stringify(outer));
    }
    const frame = page.frames().find((item) => item !== page.mainFrame());
    if (!frame) throw new Error("employee frame missing");
    const inner = await frame.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    if (inner.scrollWidth > inner.width + 1) {
      throw new Error("employee overflow " + JSON.stringify(inner));
    }
    if (!(await page.locator("#owpPublish").isVisible())) {
      throw new Error("Owner publish control is not visible on mobile");
    }
    return "390px owner + employee surfaces";
  });

  await screenshot(page, "02-day10-mobile");
  await context.close();
} catch (error) {
  fail("robot_exception", error?.stack || error);
} finally {
  await browser.close();
}

for (const [name, rows] of [
  ["console_errors", report.console_errors],
  ["page_errors", report.page_errors],
  ["request_failures", report.request_failures],
  ["http_5xx", report.http_errors],
  ["external_requests", report.external_requests]
]) {
  if (rows.length) fail(name, JSON.stringify(rows));
  else pass(name);
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
