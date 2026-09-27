import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const shellJs=read("02_CORE/ui/magasin-ui-v2-shell.js");
const adapterJs=read("02_CORE/ui/magasin-owner-drilldown-v1.js");
const adapterCss=read("02_CORE/ui/magasin-owner-drilldown-v1.css");
const workforceIndex=read("04_OWNER/Workforce/index.html");
const workforceRuntime=read("04_OWNER/Workforce/runtime/owner-workforce-runtime.html");
const access=read("04_OWNER/Access/index.html");
const accessNav=read("04_OWNER/Access/owner-access-nav-v1.js");
const procurement=read("04_OWNER/Procurement/index.html");
const procurementCss=read("04_OWNER/Procurement/procurement-v2.css");
const procurementCore=read("04_OWNER/Procurement/procurement-v2-core.js");
const friendly=read("nhap-hang/index.html");

test("UI2-015 keeps Owner shared route inventory limited to accepted runtime destinations",()=>{
  const ownerBlock=shellJs.match(/const OWNER_NAV = Object\.freeze\(\{[\s\S]*?\n  \}\);/)?.[0]||"";
  assert.ok(ownerBlock);
  for(const route of ["/04_OWNER/","/04_OWNER/ControlTower/","/04_OWNER/Workforce/","/nhap-hang/","/04_OWNER/Access/"])assert.ok(ownerBlock.includes(route),route);
  assert.doesNotMatch(ownerBlock,/Finance|Tài chính|\/04_OWNER\/Finance/i);
  assert.equal(fs.existsSync("04_OWNER/Finance"),false);
});

test("UI2-015 Finance is explicit reserved presentation with no route or fabricated reader",()=>{
  assert.match(adapterJs,/Tài chính/);
  assert.match(adapterJs,/Chưa có runtime được chấp nhận/);
  assert.match(adapterJs,/NOT CONNECTED/);
  assert.match(adapterJs,/data-owner-finance-reserved/);
  assert.doesNotMatch(adapterJs,/href=.*Finance|\/04_OWNER\/Finance/i);
  assert.doesNotMatch(adapterJs,/\.rpc\s*\(|\.from\s*\(|\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(/);
  assert.doesNotMatch(adapterJs,/finance_(?:cash|profit|revenue)|cashFlow|profitMargin|revenueAmount/i);
});

test("UI2-015 Workforce keeps canonical scheduling writer and adds only Owner presentation context",()=>{
  assert.match(workforceIndex,/owner-workforce-runtime\.html\?v=20260927-ui2-016/);
  assert.match(workforceIndex,/id="loading"/);
  assert.match(workforceIndex,/id="denied"/);
  assert.match(workforceIndex,/requireActive/);
  assert.match(workforceIndex,/hasRole\(p,\['OWNER'\]\)/);
  assert.match(workforceRuntime,/magasin-owner-drilldown-v1\.css\?v=20260927-ui2-015/);
  assert.match(workforceRuntime,/magasin-owner-drilldown-v1\.js\?v=20260927-ui2-015/);
  assert.match(workforceRuntime,/ownerModuleContext='workforce'/);
  assert.match(workforceRuntime,/\/05_MANAGER\/Workforce\/draft-publish-v1\.js\?v=20260924-sched05/);
  assert.match(workforceRuntime,/One canonical writer/);
  assert.doesNotMatch(workforceRuntime,/auto_generate_schedule_generation|upsert_workforce_staffing_requirement|manager_update_employee_availability/);
});

test("UI2-015 Access has one shared global shell and preserves Owner-only role writer authority",()=>{
  assert.match(access,/data-magasin-shell-current="access"/);
  assert.match(access,/data-owner-module-context="access"/);
  assert.match(access,/magasin-owner-drilldown-v1\.css\?v=20260927-ui2-015/);
  assert.match(access,/magasin-owner-drilldown-v1\.js\?v=20260927-ui2-015/);
  assert.match(access,/hasRole\(owner,\['OWNER'\]\)/);
  assert.match(access,/sb\.from\('profiles'\)\.update\(payload\)/);
  assert.match(access,/id="logoutBtn"[^>]*hidden/);
  assert.doesNotMatch(access,/Nhập hàng & Công nợ<\/a><a[^>]+Workforce/);
  assert.match(accessNav,/data-magasin-shell-v2/);
  assert.match(accessNav,/magasinUiV2Shell/);
});

test("UI2-015 Procurement keeps domain tabs and accounting authority while removing competing global header",()=>{
  assert.match(procurement,/data-magasin-shell-current="procurement"/);
  assert.match(procurement,/data-owner-module-context="procurement"/);
  assert.match(procurement,/class="nav owner-module-tabs" id="nav"/);
  for(const tab of ["orders","products","suppliers","payables","reports"])assert.ok(procurement.includes('data-tab="'+tab+'"'),tab);
  assert.match(procurement,/procurement-v2\.css\?v=20260927-ui2-015/);
  assert.match(procurement,/magasin-owner-drilldown-v1\.css\?v=20260927-ui2-015/);
  assert.match(procurement,/magasin-owner-drilldown-v1\.js\?v=20260927-ui2-015/);
  assert.doesNotMatch(procurement,/class="topbar"/);
  assert.doesNotMatch(procurement,/class="brand"/);
  assert.match(procurementCore,/hasRole\(state\.profile,\['OWNER','ACCOUNTANT'\]\)/);
  for(const runtime of ["./procurement-v2-core.js","./procurement-v2-orders.js","./procurement-v2-boot.js"])assert.ok(procurement.includes(runtime),runtime);
});

test("UI2-015 friendly Procurement route remains canonical and reload-safe",()=>{
  assert.match(friendly,/const friendlyPath = '\/nhap-hang\/'/);
  assert.match(friendly,/const sourcePath = '\/04_OWNER\/Procurement\/'/);
  assert.match(friendly,/fetch\(sourcePath \+ 'index\.html'/);
  assert.match(friendly,/<base href="\/04_OWNER\/Procurement\/"/);
  assert.match(friendly,/history\.replaceState/);
});

test("UI2-015 containment accessibility and touch rules are presentation-only",()=>{
  assert.match(adapterCss,/@media\(max-width:800px\)/);
  assert.match(adapterCss,/min-height:44px/);
  assert.match(adapterCss,/:focus-visible/);
  assert.match(adapterCss,/\.table-wrap/);
  assert.match(adapterCss,/overflow:auto/);
  assert.match(adapterCss,/dialog/);
  assert.match(procurementCss,/overflow-x:hidden/);
  assert.match(procurementCss,/top:var\(--m-shell-topbar-height,64px\)/);
});

test("UI2-015 adapter contains no business authority or data-source implementation",()=>{
  for(const forbidden of [
    "create_schedule_generation","publish_schedule_generation","replace_schedule_generation_assignments",
    "procurement_save_order","procurement_record_payment","profiles').update",
    "supabase","MAGASIN_CORE"
  ])assert.equal(adapterJs.includes(forbidden),false,forbidden);
});

console.log("UI2_015_OWNER_DRILLDOWN_CONTRACT=PASS");
