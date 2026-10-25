import fs from "node:fs";
import assert from "node:assert/strict";

const route = fs.readFileSync(new URL("../../05_MANAGER/Cong-viec/index.html", import.meta.url), "utf8");
const runtime = fs.readFileSync(new URL("../../05_MANAGER/runtime/manager-runtime-v1.html", import.meta.url), "utf8");
const bridge = fs.readFileSync(new URL("../../05_MANAGER/runtime/compat/router/manager-route-bridge-v1.js", import.meta.url), "utf8");
const routeState = fs.readFileSync(new URL("../../05_MANAGER/runtime/compat/router/manager-route-state-v2.js", import.meta.url), "utf8");

assert.match(route, /\/manager\/#tasks/);
assert.match(route, /location\.replace\('\/manager\/#tasks'\)/);
assert.match(route, /http-equiv="refresh"/);
assert.doesNotMatch(route, /manager-runtime-v1\.html|<iframe|shared-core-v1\.js/);


for (const forbidden of [".insert(", ".update(", ".upsert(", ".delete(", ".rpc("]) {
  assert.equal(route.includes(forbidden), false, `Task route must not perform write/business RPC: ${forbidden}`);
}

assert.match(runtime, /manager-route-bridge-v1\.js/);
assert.match(runtime, /allowedRouteHash=new Set\(\['dashboard','staff','workforce','availability','schedule','tasks','kpi','swap','attendance','academy','settings','reports','payroll-self-check'\]\)/);
assert.match(fs.readFileSync(new URL("../../manager/index.html", import.meta.url),"utf8"),/data-route-key="manager-root"/);
assert.match(bridge, /const PREFIX='\/05_MANAGER'/);
assert.match(bridge, /tasks:'Cong-viec'/);
assert.match(bridge, /return '\/manager\/#'\+key/);
assert.match(bridge, /syncFromLocation\(true\)/);
assert.match(bridge, /routeBridgeObserverBound/);
assert.match(bridge, /active&&active!==wanted/);
assert.match(routeState, /const LEGACY_PREFIX='\/05_MANAGER'/);
assert.match(routeState, /ancestorBridgeOwnsUrl/);
assert.match(routeState, /MAGASIN_MANAGER_ROUTE_BRIDGE_V1/);
assert.match(routeState, /function setRoute\(view,replace\)\{if\(ancestorBridgeOwnsUrl\(\)\)return;/);
assert.match(routeState, /tasks:'Cong-viec'/);
assert.match(routeState, /'\/manager\/scheduling\/'/);
assert.match(routeState, /'\/manager\/schedule\/'/);
assert.match(routeState, /'\/manager\/#'/);

console.log("PASS Manager Task deep-link canonical route contract");
