import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:8768";
const outDir = process.env.QA_OUT || "qa-artifacts/sop-task";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const diagnostics = { consoleErrors: [], pageErrors: [], requestFailures: [], http5xx: [], legacyRuntimeRequests: [] };

page.on("console", msg => {
  if (msg.type() === "error") diagnostics.consoleErrors.push(msg.text());
});
page.on("pageerror", err => diagnostics.pageErrors.push(String(err)));
page.on("requestfailed", req => diagnostics.requestFailures.push({ url: req.url(), error: req.failure()?.errorText || "failed" }));
page.on("response", res => {
  if (res.status() >= 500) diagnostics.http5xx.push({ url: res.url(), status: res.status() });
});
page.on("request", req => {
  if (req.url().includes("manager-v13-runtime.html")) diagnostics.legacyRuntimeRequests.push(req.url());
});

await page.route("https://cdn.jsdelivr.net/**", route =>
  route.fulfill({ status: 200, contentType: "application/javascript", body: "" })
);

await page.addInitScript(() => {
  const profile = { id: "qa-owner", full_name: "QA Owner", username: "qa-owner", role: "OWNER", status: "ACTIVE" };
  function query(table) {
    const q = {};
    for (const method of ["select","eq","neq","in","gte","lte","lt","gt","order","limit","range","filter","is","not","or","match"]) {
      q[method] = () => q;
    }
    q.insert = () => q;
    q.update = () => q;
    q.upsert = () => q;
    q.delete = () => q;
    q.single = async () => ({ data: table === "profiles" ? profile : null, error: null });
    q.maybeSingle = q.single;
    q.then = (resolve, reject) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject);
    return q;
  }
  window.supabase = {
    createClient() {
      return {
        auth: {
          getSession: async () => ({ data: { session: { user: { id: "qa-owner" } } }, error: null }),
          getUser: async () => ({ data: { user: { id: "qa-owner" } }, error: null }),
          signOut: async () => ({ error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
        },
        from: table => query(table),
        rpc: async () => ({ data: [], error: null })
      };
    }
  };
});

const response = await page.goto(`${base}/05_MANAGER/Cong-viec/`, { waitUntil: "domcontentloaded" });
assert.equal(response?.status(), 200, "Task deep link must return HTTP 200");

await page.waitForFunction(() => {
  const frame = document.getElementById("app");
  return frame && !frame.hidden && String(frame.getAttribute("src") || "").includes("/05_MANAGER/runtime/manager-runtime-v1.html");
});

let shell = null;
for (let i = 0; i < 40; i++) {
  shell = page.frames().find(f => f.url().includes("/05_MANAGER/runtime/manager-shell-v1.html"));
  if (shell) break;
  await page.waitForTimeout(100);
}
assert.ok(shell, "canonical Manager shell frame must load");

let taskActive = false;
for (let i = 0; i < 50; i++) {
  taskActive = await shell.locator("#view-tasks").evaluate(el => el.classList.contains("active"));
  if (taskActive) break;
  await page.waitForTimeout(100);
}

const runtimeFrame = page.frames().find(f => f.url().includes("/05_MANAGER/runtime/manager-runtime-v1.html"));
const heading = await shell.locator("#view-tasks h2").first().textContent();
const debug = {
  topUrl: page.url(),
  frames: page.frames().map(f => f.url()),
  runtime: runtimeFrame ? await runtimeFrame.evaluate(() => ({
    bridgeLoaded: Boolean(window.MAGASIN_MANAGER_ROUTE_BRIDGE_V1),
    scripts: [...document.scripts].map(x => x.src || "inline")
  })) : null,
  shell: await shell.evaluate(() => ({
    taskClass: document.getElementById("view-tasks")?.className || null,
    activeViews: [...document.querySelectorAll(".view.active")].map(x => x.id),
    pageTitle: document.getElementById("pageTitle")?.textContent || null,
    routeBridgeBound: document.documentElement.dataset.routeBridgeBound || null
  })),
  heading: heading?.trim(),
  diagnostics
};

await page.screenshot({ path: path.join(outDir, "manager-task-route.png"), fullPage: true });
fs.writeFileSync(path.join(outDir, "manager-task-route-result.json"), JSON.stringify(debug, null, 2));
console.log("TASK_ROUTE_DEBUG " + JSON.stringify(debug));

assert.equal(taskActive, true, "Task view must become active from /05_MANAGER/Cong-viec/");
assert.equal(heading?.trim(), "Công việc");
assert.equal(await shell.locator('#view-tasks [data-task-quality="NOT_CONNECTED"]').innerText(), "NOT CONNECTED");
assert.equal(await shell.locator('#view-tasks [data-task-source-state="NOT_CONNECTED"]').count(), 1);
assert.equal(await shell.locator('#view-tasks [data-modal="Giao việc"]').count(), 0);
for (const prototype of ["Kiểm tra tồn hàng cuối ca","Vệ sinh máy dập nắp","Checklist mở ca","Kiểm tra thiết bị đầu ca"]) {
  assert.equal(await shell.getByText(prototype, { exact:true }).count(), 0, `prototype Task row leaked: ${prototype}`);
}
assert.equal(new URL(page.url()).pathname, "/05_MANAGER/Cong-viec/");
assert.deepEqual(diagnostics.legacyRuntimeRequests, [], "legacy Manager runtime must never be requested");
assert.deepEqual(diagnostics.pageErrors, [], "unexpected page errors");
assert.deepEqual(diagnostics.http5xx, [], "unexpected HTTP 5xx");

await browser.close();
console.log("PASS Manager Task canonical deep-link browser smoke");
