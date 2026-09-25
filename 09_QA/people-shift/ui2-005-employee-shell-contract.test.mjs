import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL("../../" + path, import.meta.url), "utf8");

const css = read("02_CORE/ui/magasin-ui-v2-employee-shell.css");
const js = read("02_CORE/ui/magasin-ui-v2-employee-shell.js");
const entry = read("06_EMPLOYEE/index.html");
const runtime = read("06_EMPLOYEE/runtime/employee-runtime-v1.html");
const app = read("06_EMPLOYEE/app/employee-v40.html");
const schedule = read("06_EMPLOYEE/schedule/engine-v1.js");
const payroll = read("06_EMPLOYEE/payroll/engine-v1.js");

test("UI2-005 Employee shell source parses and stays presentation-only", () => {
  assert.doesNotThrow(() => new Function(js));
  assert.match(css, /@import url\("\.\/magasin-ui-v2-tokens\.css"\)/);
  assert.match(css, /@import url\("\.\/magasin-ui-v2-primitives\.css"\)/);
  assert.match(css, /body\[data-magasin-employee-shell-v2\]/);
  assert.doesNotMatch(js, /\.rpc\(|createClient\(|\.from\(|\.insert\(|\.update\(|\.delete\(/);
});

test("Employee phone primary navigation is exactly the canonical five items", () => {
  const block = js.match(/const PRIMARY = Object\.freeze\(\[[\s\S]*?\n  \]\);/)?.[0] || "";
  assert.ok(block);
  const expected = [
    ["dashboard", "Hôm nay"],
    ["schedule", "Lịch"],
    ["attendance", "Công"],
    ["payroll", "Lương"],
    ["profile", "Tôi"]
  ];
  for (const [route, label] of expected) {
    assert.ok(block.includes("'" + route + "'"), route);
    assert.ok(block.includes("'" + label + "'"), label);
  }
  assert.equal((block.match(/^\s*\['/gm) || []).length, 5);
  assert.doesNotMatch(block, /swap|inventory|settings/);
});

test("Employee app opts into shared V2 foundation and safe-area phone shell", () => {
  for (const token of [
    "/02_CORE/ui/magasin-ui-v2-tokens.css",
    "/02_CORE/ui/magasin-ui-v2-primitives.css",
    "/02_CORE/ui/magasin-ui-v2-employee-shell.css",
    "/02_CORE/ui/magasin-ui-v2-employee-shell.js",
    "data-magasin-ui-v2",
    'data-m-phone-primary="true"',
    "data-magasin-employee-shell-v2",
    "viewport-fit=cover"
  ]) assert.ok(app.includes(token), token);
  assert.ok(entry.includes("viewport-fit=cover"));
  assert.match(css, /var\(--m-safe-bottom\)/);
  assert.match(css, /min-height:\s*44px/);
});

test("canonical Employee deep-link allowlists remain unchanged", () => {
  const allow = "new Set(['dashboard','schedule','attendance','swap','payroll','profile'])";
  assert.ok(entry.includes(allow));
  assert.ok(runtime.includes(allow));
});

test("secondary functions remain reachable without becoming primary nav", () => {
  assert.ok(app.includes('data-view="inventory"'));
  assert.ok(app.includes('data-view="swap"'));
  assert.ok(app.includes('data-view="settings"'));
  assert.ok(app.includes('aria-label="Thông báo"'));
  assert.ok(js.includes("PRIMARY_PARENT"));
  assert.ok(js.includes("view === 'swap'"));
  assert.ok(js.includes("view === 'inventory'"));
  assert.ok(js.includes("view === 'settings'"));

  assert.ok(schedule.includes("data-schedule-availability"));
  assert.ok(schedule.includes('data-schedule-action="give"'));
  assert.ok(schedule.includes('data-schedule-action="swap"'));
});

test("Payroll remains engine-injected and shell delegates to its existing source nav", () => {
  assert.ok(payroll.includes('a.dataset.view=\'payroll\''));
  assert.ok(payroll.includes("get_my_payroll_self_check_v1"));
  assert.ok(js.includes("const sourceLink = view =>"));
  assert.ok(js.includes("activateSourceView"));
});

test("deep-link bootstrap preserves the initially requested canonical route", () => {
  assert.ok(js.includes("const initialRequestedRoute = canonicalFromHistory()"));
  assert.ok(js.includes("initialRequestedRoute !== 'dashboard' && key === 'dashboard'"));
  assert.ok(js.includes("setTimeout(() => applyCanonicalRoute(initialRequestedRoute), 0)"));
});

test("Employee shell supports responsive bottom nav, desktop expansion and accessible drawer", () => {
  assert.match(css, /grid-template-columns:\s*repeat\(5,/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /width:\s*44px !important/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.ok(js.includes("aria-expanded"));
  assert.ok(js.includes("employee-v2-drawer-close"));
  assert.ok(js.includes("popstate"));
  assert.ok(js.includes("hashchange"));
});
