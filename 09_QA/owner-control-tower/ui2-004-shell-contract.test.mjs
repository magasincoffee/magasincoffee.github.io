import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(path, "utf8");

const shellCss = read("02_CORE/ui/magasin-ui-v2-shell.css");
const shellJs = read("02_CORE/ui/magasin-ui-v2-shell.js");
const managerRuntime = read("05_MANAGER/runtime/manager-runtime-v1.html");
const ownerWorkforce = read("04_OWNER/Workforce/runtime/owner-workforce-runtime.html");
const ownerHome = read("04_OWNER/index.html");
const ownerControlTower = read("04_OWNER/ControlTower/index.html");
const ownerAccess = read("04_OWNER/Access/index.html");
const ownerProcurement = read("04_OWNER/Procurement/index.html");

test("UI2-004 shell source parses and remains opt-in", () => {
  assert.doesNotThrow(() => new Function(shellJs));
  assert.match(shellCss, /@import url\("\.\/magasin-ui-v2-tokens\.css"\)/);
  assert.match(shellCss, /@import url\("\.\/magasin-ui-v2-primitives\.css"\)/);
  assert.match(shellCss, /body\[data-magasin-shell-v2\]/);
  assert.doesNotMatch(shellCss, /(^|\n)\s*:root\s*\{/m);
});

test("Manager nav contract is canonical and hidden legacy destinations stay hidden", () => {
  for (const fragment of [
    "['dashboard', '⌂', 'Hôm nay']",
    "['workforce', '▦', 'Xếp lịch']",
    "['swap', '⇄', 'Đổi / Cho ca']",
    "['attendance', '◷', 'Chấm công']",
    "['staff', '◎', 'Nhân viên']",
    "['payroll-self-check', '₫', 'Công / Lương']",
    "['schedule', '▤', 'Lịch đã phát hành']",
    "['tasks', '✓', 'Công việc']",
    "['settings', '⚙', 'Cài đặt']"
  ]) {
    assert.ok(shellJs.includes(fragment), fragment);
  }
  assert.ok(shellJs.includes("hidden: Object.freeze(['kpi', 'academy'])"));
});

test("Owner nav contains only traced active destinations", () => {
  const ownerBlock = shellJs.match(/const OWNER_NAV = Object\.freeze\(\{[\s\S]*?\n  \}\);/)?.[0] || "";
  assert.ok(ownerBlock);
  for (const route of [
    "/04_OWNER/",
    "/04_OWNER/ControlTower/",
    "/04_OWNER/Workforce/",
    "/nhap-hang/",
    "/04_OWNER/Access/"
  ]) {
    assert.ok(ownerBlock.includes(route), route);
  }
  assert.doesNotMatch(ownerBlock, /Finance|Tài chính|Settings|Cài đặt/);
});

test("shared shell exposes responsive drawer, PageHeader metadata, user area and StoreSwitcher slot", () => {
  assert.match(shellCss, /@media \(max-width: 1024px\)/);
  assert.match(shellCss, /@media \(max-width: 600px\)/);
  assert.ok(shellJs.includes("data-shell-page-title"));
  assert.ok(shellJs.includes("data-shell-page-subtitle"));
  assert.ok(shellJs.includes("data-shell-user-name"));
  assert.ok(shellJs.includes("data-shell-store-slot"));
  assert.ok(shellJs.includes("mountStoreSwitcher"));
  assert.ok(
    shellJs.includes("shellDrawerOpen") &&
    shellCss.includes('[data-shell-drawer-open="true"]')
  );
});

test("Manager runtime uses shared shell and keeps canonical route-state/Workforce engine", () => {
  assert.match(managerRuntime, /magasin-ui-v2-shell\.css/);
  assert.match(managerRuntime, /magasin-ui-v2-shell\.js/);
  assert.match(managerRuntime, /manager-route-state-v2\.js/);
  assert.match(managerRuntime, /05_MANAGER\/Workforce\/engine-v1\.js/);
  assert.doesNotMatch(managerRuntime, /manager-ui-shell-v2\.js/);
  assert.doesNotMatch(managerRuntime, /manager-drawer-fix\.css/);
});

test("Owner Workforce uses shared Owner shell without creating a parallel writer", () => {
  assert.match(ownerWorkforce, /magasin-ui-v2-shell\.css/);
  assert.match(ownerWorkforce, /magasin-ui-v2-shell\.js/);
  assert.match(ownerWorkforce, /role:'OWNER'/);
  assert.match(ownerWorkforce, /05_MANAGER\/Workforce\/draft-publish-v1\.js/);
  assert.match(ownerWorkforce, /One canonical writer/);
  assert.doesNotMatch(ownerWorkforce, /manager-ui-shell-v3\.js/);
});

test("standalone Owner hosts opt in to shared shell with traced current destinations", () => {
  const hosts = [
    [ownerHome, "overview"],
    [ownerControlTower, "attention"],
    [ownerAccess, "access"],
    [ownerProcurement, "procurement"]
  ];
  for (const [source, current] of hosts) {
    assert.match(source, /magasin-ui-v2-shell\.css/);
    assert.match(source, /magasin-ui-v2-shell\.js/);
    assert.match(source, /data-magasin-shell-v2/);
    assert.ok(source.includes('data-magasin-shell-current="' + current + '"'));
  }
});
