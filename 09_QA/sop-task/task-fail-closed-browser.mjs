import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:8768";
const OUT = process.env.QA_OUT || "qa-artifacts/sop-task";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const diagnostics = { pageErrors: [], requestFailures: [], http5xx: [] };

function attach(page) {
  page.on("pageerror", e => diagnostics.pageErrors.push(String(e)));
  page.on("requestfailed", r => diagnostics.requestFailures.push({ url:r.url(), error:r.failure()?.errorText || "failed" }));
  page.on("response", r => { if (r.status() >= 500) diagnostics.http5xx.push({ url:r.url(), status:r.status() }); });
}

try {
  const employee = await browser.newPage({ viewport:{ width:1280, height:900 } });
  attach(employee);
  const er = await employee.goto(`${BASE}/06_EMPLOYEE/app/employee-v40.html`, { waitUntil:"domcontentloaded" });
  assert.equal(er?.status(), 200);
  const badge = employee.locator('#taskBadge[data-task-quality="NOT_CONNECTED"]');
  await badge.waitFor({ state:"visible", timeout:5000 });
  assert.equal((await badge.innerText()).trim(), "NOT CONNECTED");
  assert.equal(await employee.locator('.task-panel[data-task-source-state="NOT_CONNECTED"]').count(), 1);
  assert.equal(await employee.getByText("Đang tải công việc…", { exact:true }).count(), 0);
  assert.equal(await employee.getByText("Hôm nay không có công việc", { exact:true }).count(), 0);
  await employee.screenshot({ path:path.join(OUT,"employee-task-fail-closed.png"), fullPage:true });

  const ownerContext = await browser.newContext({ viewport:{ width:1280, height:900 } });
  await ownerContext.route("https://cdn.jsdelivr.net/**", route =>
    route.fulfill({ status:200, contentType:"application/javascript", body:"globalThis.supabase = globalThis.supabase || {};" })
  );
  await ownerContext.route("**/02_CORE/shared/shared-core-v1.js", route =>
    route.fulfill({
      status:200,
      contentType:"application/javascript",
      body:`(() => {
        const profile={id:"qa-owner",username:"qa-owner",full_name:"Owner QA",role:"OWNER",status:"ACTIVE"};
        const client={from(){return {async select(){return {data:[],error:null}}}}};
        globalThis.MAGASIN_CORE={
          supabase:{
            async requireActive(){return profile},
            get(){return client},
            async rpc(){return {data:[],error:null}}
          },
          roles:{hasRole(p,roles){return p?.status==="ACTIVE"&&roles.includes(String(p?.role||"").toUpperCase())}},
          date:{dateKey(){return "2026-09-18"},monday(){return "2026-09-14"}},
          stores:{async accessible(){return []}},
          security:{escapeHtml(v){return String(v??"")}},
          ui:{toast(){}}
        };
      })();`
    })
  );
  const owner = await ownerContext.newPage();
  attach(owner);
  const or = await owner.goto(`${BASE}/04_OWNER/ControlTower/`, { waitUntil:"domcontentloaded" });
  assert.equal(or?.status(), 200);
  await owner.locator('#app:not(.hidden)').waitFor({ state:"visible", timeout:10000 });
  const quality = owner.locator('#taskQuality[data-quality="NOT_CONNECTED"]');
  await quality.waitFor({ state:"visible", timeout:5000 });
  assert.equal((await quality.innerText()).trim(), "NOT CONNECTED");
  assert.equal((await owner.locator("#taskOverdue").innerText()).trim(), "—");
  assert.equal((await owner.locator("#taskOpen").innerText()).trim(), "—");
  const meta = (await owner.locator("#taskMeta").innerText()).trim();
  assert.match(meta, /chưa được kết nối/i);
  await owner.screenshot({ path:path.join(OUT,"owner-task-fail-closed.png"), fullPage:true });
  await ownerContext.close();

  assert.deepEqual(diagnostics.pageErrors, [], "unexpected page errors");
  assert.deepEqual(diagnostics.http5xx, [], "unexpected HTTP 5xx");

  fs.writeFileSync(path.join(OUT,"task-fail-closed-browser.json"), JSON.stringify({status:"PASS",diagnostics}, null, 2));
  console.log("PASS SOP/Task Employee + Owner fail-closed browser regression");
} finally {
  await browser.close();
}
