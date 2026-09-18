import fs from "node:fs";
import assert from "node:assert/strict";

const route = fs.readFileSync(new URL("../../05_MANAGER/Cong-viec/index.html", import.meta.url), "utf8");
const runtime = fs.readFileSync(new URL("../../05_MANAGER/runtime/manager-runtime-v1.html", import.meta.url), "utf8");
const bridge = fs.readFileSync(new URL("../../05_MANAGER/runtime/compat/router/manager-route-bridge-v1.js", import.meta.url), "utf8");
const routeState = fs.readFileSync(new URL("../../05_MANAGER/runtime/compat/router/manager-route-state-v2.js", import.meta.url), "utf8");

assert.match(route, /\/02_CORE\/shared\/shared-core-v1\.js/);
assert.match(route, /C\.supabase\.requireActive\(\)/);
assert.match(route, /\['STAFF','EMPLOYEE'\]\.includes\(role\)/);
assert.match(route, /location\.replace\('\/06_EMPLOYEE\/'\)/);
assert.match(route, /\/05_MANAGER\/runtime\/manager-runtime-v1\.html/);
assert.doesNotMatch(route, /manager-v13-runtime\.html/);

for (const forbidden of [".insert(", ".update(", ".upsert(", ".delete(", ".rpc("]) {
  assert.equal(route.includes(forbidden), false, `Task route must not perform write/business RPC: ${forbidden}`);
}

assert.match(runtime, /manager-route-bridge-v1\.js/);
assert.match(bridge, /const PREFIX='\/05_MANAGER'/);
assert.match(bridge, /tasks:'Cong-viec'/);
assert.match(bridge, /clickView\(routeView\(\)\)/);
assert.match(routeState, /const PREFIX='\/05_MANAGER'/);
assert.match(routeState, /tasks: 'Cong-viec'/);
assert.doesNotMatch(routeState, /`\/manager\//);
assert.doesNotMatch(routeState, /'\/manager\//);

console.log("PASS Manager Task deep-link canonical route contract");
