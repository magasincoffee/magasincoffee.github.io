import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:8767";
const OUT = process.env.QA_OUT || "qa-artifacts/people-shift";
fs.mkdirSync(OUT, { recursive: true });
const report = { status: "PASS", checks: [], screenshots: [], pageErrors: [], requests: [] };
const check = async (name, fn) => {
  try { report.checks.push({ name, status: "PASS", detail: String(await fn() ?? "") }); }
  catch (e) { report.status = "FAIL"; report.checks.push({ name, status: "FAIL", detail: String(e?.stack || e) }); }
};
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1440, 1024, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 940 }, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh"
    });
    const page = await context.newPage();
    page.on("pageerror", e => report.pageErrors.push(width + ": " + String(e?.stack || e)));
    page.on("request", r => report.requests.push(r.url()));
    await page.goto(BASE + "/09_QA/people-shift/manager-dashboard-b-fixture.html",
      { waitUntil: "networkidle", timeout: 25000 });
    await page.locator('[data-manager-dashboard-b="1"] .mdb-kpis').waitFor();
    await check("manager_dashboard_b_" + width + "_layout_and_authentic_data_boundary", async () => {
      const result = await page.evaluate(() => {
        const root = document.querySelector('#view-dashboard'), cards = [...root.querySelectorAll('.mdb-kpi')];
        const data = cards.map(c => ({
          heading: c.querySelector('.mdb-kpi-heading span:last-child')?.textContent?.trim(),
          value: c.querySelector('.mdb-kpi-value')?.textContent?.trim(),
          source: c.dataset.kpiSource
        }));
        return {
          data, people: root.querySelectorAll('.mdb-person').length,
          timelineRows: root.querySelectorAll('.mdb-timeline-row').length,
          screens: [...root.querySelectorAll('.mdb-panel h2')].map(x => x.textContent.trim()),
          scroll: document.documentElement.scrollWidth, viewport: innerWidth,
          branchOptions: root.querySelectorAll('[data-mdb-store] option').length,
          salesAbsent: cards[2]?.dataset.kpiSource === 'NOT_CONNECTED',
          shortagesAbsent: cards[3]?.dataset.kpiSource === 'NOT_CONNECTED'
        };
      });
      const expected = ["Nhân sự hôm nay", "Khách trong ngày", "Doanh thu hôm nay", "Ca đang thiếu"];
      if (result.data.length !== 4 || JSON.stringify(result.data.map(c => c.heading)) !== JSON.stringify(expected)
        || result.data[0].value !== '3' || result.data.slice(1).some(c => c.value !== '—')
        || result.people !== 3 || result.timelineRows !== 3 || result.branchOptions !== 3
        || !result.salesAbsent || !result.shortagesAbsent || result.scroll > result.viewport + 1
        || !result.screens.includes("Lịch làm hôm nay") || !result.screens.includes("Tình trạng ca hôm nay")
      ) throw new Error(JSON.stringify(result));
      return JSON.stringify(result);
    });
    await check("manager_dashboard_b_" + width + "_store_scope_and_navigation", async () => {
      await page.locator('[data-mdb-store]').selectOption('qa-one');
      const state = await page.evaluate(() => ({
        workers: document.querySelector('.mdb-kpi-value')?.textContent.trim(),
        visibleRoster: [...document.querySelectorAll('.mdb-person-name small')].map(x => x.textContent.trim()),
        timeline: document.querySelectorAll('.mdb-timeline-row').length
      }));
      if (state.workers !== '2' || state.visibleRoster.length !== 2 || state.timeline !== 2 ||
        state.visibleRoster.some(x => x !== 'CN-QA-1')) throw new Error(JSON.stringify(state));
      await page.locator('.mdb-panel-head [data-workforce-jump="schedule"]').click();
      if (await page.locator('body').getAttribute('data-last-qa-jump') !== 'schedule')
        throw new Error("Existing canonical schedule jump missing");
      return JSON.stringify(state);
    });
    const file = path.join(OUT, "manager-dashboard-b-" + width + ".png");
    await page.screenshot({ path: file, fullPage: true });report.screenshots.push(file);
    await context.close();
  }

  const c = await browser.newContext({ viewport: { width: 1280, height: 820 }, timezoneId: "Asia/Ho_Chi_Minh" });
  const p = await c.newPage();
  await p.goto(BASE + "/09_QA/people-shift/manager-dashboard-b-fixture.html?mode=error",
    { waitUntil: "networkidle" });
  await check("manager_dashboard_b_error_fails_closed", async () => {
    const data = await p.evaluate(() => ({
      state: document.querySelector('[data-kpi-source="error"]')?.dataset.kpiSource,
      people: document.querySelector('.mdb-kpi-value')?.textContent.trim(),
      rowCount: document.querySelectorAll('.mdb-person').length,
      errorShown: document.querySelector('.mdb-empty')?.textContent.includes('Chưa tải được lịch chính thức')
    }));
    if (data.state !== 'error' || data.people !== '—' || data.rowCount !== 0 || !data.errorShown)
      throw new Error(JSON.stringify(data));
    return JSON.stringify(data);
  });
  await p.goto(BASE + "/09_QA/people-shift/manager-dashboard-b-fixture.html?mode=empty",
    { waitUntil: "networkidle" });
  await check("manager_dashboard_b_empty_not_fabricated", async () => {
    const state = await p.evaluate(() => ({
      people: document.querySelector('.mdb-kpi-value')?.textContent.trim(),
      rows: document.querySelectorAll('.mdb-person').length,
      empty: document.querySelector('.mdb-empty')?.textContent
    }));
    if (state.people !== '0' || state.rows !== 0 || !state.empty?.includes('Chưa có ca'))
      throw new Error(JSON.stringify(state));
    return JSON.stringify(state);
  });
  await c.close();
} finally { await browser.close(); }
await check("manager_dashboard_b_browser_errors", async () => {
  if (report.pageErrors.length) throw new Error(report.pageErrors.join("\n"));
  const local = new URL(BASE).origin;
  if (report.requests.some(u => !u.startsWith(local) && !u.startsWith("data:") && !u.startsWith("about:")))
    throw new Error("Unexpected external request in read-only visual fixture");
  return "no runtime errors or external network calls";
});
fs.writeFileSync(path.join(OUT, "manager-dashboard-b-report.json"), JSON.stringify(report, null, 2));
console.log("MANAGER_DASHBOARD_B_BROWSER=" + report.status);
for (const x of report.checks) console.log("[" + x.status + "] " + x.name + " — " + x.detail);
if (report.status !== "PASS") process.exitCode = 1;
