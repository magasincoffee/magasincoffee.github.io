import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:8767";
const OUT = process.env.QA_OUT || "qa-artifacts/people-shift";
fs.mkdirSync(OUT, { recursive: true });

const report = {
  generated_at: new Date().toISOString(),
  status: "PASS",
  checks: [],
  page_errors: [],
  console_errors: [],
  request_failures: [],
  http_errors: []
};

function add(name, status, detail = "") {
  report.checks.push({ name, status, detail: String(detail || "") });
}
async function check(name, fn) {
  try {
    add(name, "PASS", await fn());
  } catch (error) {
    add(name, "FAIL", error?.message || error);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1100, height: 800 },
  locale: "vi-VN",
  timezoneId: "Asia/Ho_Chi_Minh"
});

page.on("pageerror", (error) => {
  report.page_errors.push(String(error?.stack || error?.message || error));
});
page.on("console", (msg) => {
  if (msg.type() === "error") report.console_errors.push(msg.text());
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
  await page.goto(BASE + "/09_QA/people-shift/employee-swap-fixture.html", {
    waitUntil: "networkidle",
    timeout: 20000
  });

  const employee = page.frameLocator("#employeeApp");

  await check("swap_engine_initializes_without_dom_api_exception", async () => {
    await employee.locator("#view-swap[data-employee-swap-engine='1']").waitFor({
      state: "attached",
      timeout: 10000
    });
    await employee.locator("#employeeSwapTarget").waitFor({
      state: "attached",
      timeout: 10000
    });
    await employee.locator("#employeeSwapReason").waitFor({
      state: "attached",
      timeout: 10000
    });
    return "target + reason controls initialized";
  });

  await check("swap_refresh_uses_mocked_read_rpcs", async () => {
    const calls = await page.evaluate(() => window.__EMPLOYEE_SWAP_QA?.calls || []);
    const names = calls.map((call) => call.name);
    if (!names.includes("list_my_shift_swaps_v2")) {
      throw new Error("history read RPC not exercised: " + JSON.stringify(names));
    }
    return JSON.stringify(names);
  });

  await check("give_shift_is_fail_closed_not_disguised_as_swap", async () => {
    const give=employee.locator("[data-give-shift-state='NOT_CONNECTED']");
    await give.waitFor({state:"attached"});
    await give.click();
    const opened=await employee.locator("#swapForm").evaluate(el=>el.classList.contains("open"));
    const submitCalls=await page.evaluate(()=>window.__EMPLOYEE_SWAP_QA.calls.filter(x=>x.name==="submit_shift_swap_request"));
    const toasts=await page.evaluate(()=>window.__EMPLOYEE_SWAP_QA.toasts);
    if(opened)throw new Error("Give opened Swap form");
    if(submitCalls.length)throw new Error(JSON.stringify(submitCalls));
    if(!toasts.some(x=>String(x.message).includes("Cho ca chưa có backend")))throw new Error(JSON.stringify(toasts));
    return "NOT_CONNECTED; 0 fake swap writes";
  });

  await check("swap_requires_reason_before_submit", async () => {
    await employee.locator("#swapChoices .swap-choice").first().click();
    await employee.locator("#employeeRequesterSchedule").waitFor({state:"attached"});
    await employee.locator("#employeeSwapTarget").selectOption("sch-target");
    await employee.locator("#swapForm .swap-actions .btn.primary").click();
    const result=await employee.locator("#swapResult").innerText();
    const calls=await page.evaluate(()=>window.__EMPLOYEE_SWAP_QA.calls.filter(x=>x.name==="submit_shift_swap_request"));
    if(!result.includes("Vui lòng nhập lý do đổi ca"))throw new Error(result);
    if(calls.length)throw new Error("submitted without reason");
    return "reason blocked before RPC";
  });

  await check("swap_submit_uses_verified_rpc_after_reason", async () => {
    await employee.locator("#employeeSwapReason").fill("Đổi ca vì lịch học");
    await employee.locator("#swapForm .swap-actions .btn.primary").click();
    await page.waitForFunction(()=>window.__EMPLOYEE_SWAP_QA.calls.some(x=>x.name==="submit_shift_swap_request"));
    const call=await page.evaluate(()=>window.__EMPLOYEE_SWAP_QA.calls.filter(x=>x.name==="submit_shift_swap_request").at(-1));
    if(call.args.p_requester_schedule_id!=="sch-me"||call.args.p_target_schedule_id!=="sch-target"||call.args.p_reason!=="Đổi ca vì lịch học")throw new Error(JSON.stringify(call));
    return JSON.stringify(call.args);
  });

  if (report.page_errors.length) {
    add("page_errors", "FAIL", JSON.stringify(report.page_errors));
  } else add("page_errors", "PASS", "0");

  if (report.console_errors.length) {
    add("console_errors", "FAIL", JSON.stringify(report.console_errors));
  } else add("console_errors", "PASS", "0");

  if (report.request_failures.length) {
    add("request_failures", "FAIL", JSON.stringify(report.request_failures));
  } else add("request_failures", "PASS", "0");

  if (report.http_errors.length) {
    add("http_5xx", "FAIL", JSON.stringify(report.http_errors));
  } else add("http_5xx", "PASS", "0");

  await page.screenshot({
    path: path.join(OUT, "employee-swap-regression.png"),
    fullPage: true
  });
} catch (error) {
  add("browser_harness", "FAIL", error?.stack || error);
} finally {
  await browser.close();
}

const failed = report.checks.filter((item) => item.status === "FAIL");
report.status = failed.length ? "FAIL" : "PASS";
fs.writeFileSync(
  path.join(OUT, "employee-swap-regression.json"),
  JSON.stringify(report, null, 2)
);

console.log("EMPLOYEE_SWAP_BROWSER_REGRESSION=" + report.status);
for (const item of report.checks) {
  console.log("[" + item.status + "] " + item.name + (item.detail ? " — " + item.detail : ""));
}
if (failed.length) process.exit(1);
