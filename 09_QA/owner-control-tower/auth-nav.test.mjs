import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  classifyOwnerAccess,
  isOwnerProfile
} from "../../04_OWNER/ControlTower/auth-policy-v1.mjs";

test("active OWNER is allowed", () => {
  const profile = { role: "OWNER", status: "ACTIVE" };
  assert.equal(isOwnerProfile(profile), true);
  assert.deepEqual(classifyOwnerAccess({ profile }), {
    allowed: true,
    state: "ALLOWED",
    message: ""
  });
});

test("non-owner and inactive profiles fail closed", () => {
  const manager = classifyOwnerAccess({
    profile: { role: "STORE_MANAGER", status: "ACTIVE" }
  });
  assert.equal(manager.allowed, false);
  assert.equal(manager.state, "ROLE_DENIED");

  const inactive = classifyOwnerAccess({
    profile: { role: "OWNER", status: "INACTIVE" }
  });
  assert.equal(inactive.allowed, false);
  assert.equal(inactive.state, "INACTIVE");
});

test("missing profile and auth errors are explicit", () => {
  assert.equal(classifyOwnerAccess({}).state, "AUTH_REQUIRED");
  assert.equal(
    classifyOwnerAccess({ error: new Error("network") }).state,
    "ERROR"
  );
});

test("Owner home exposes Control Tower route", async () => {
  const html = await fs.readFile(
    new URL("../../04_OWNER/index.html", import.meta.url),
    "utf8"
  );
  assert.match(html, /href="\/04_OWNER\/ControlTower\/"/);
  assert.match(html, /Owner Control Tower/);
});

test("Control Tower route loads shared auth core and explicit gate states", async () => {
  const html = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/index.html", import.meta.url),
    "utf8"
  );
  const app = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  assert.match(html, /id="authLoading"/);
  assert.match(html, /id="authDenied"/);
  assert.match(html, /id="app"[^>]*hidden/);
  assert.match(html, /shared-core-v1\.js/);
  assert.match(html, /@supabase\/supabase-js@2/);
  assert.match(app, /requireActive/);
  assert.match(app, /classifyOwnerAccess/);
  assert.doesNotMatch(app, /insert|update|delete\(/i);
});
