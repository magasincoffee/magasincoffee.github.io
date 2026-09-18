import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  classifyOwnerProfile,
  requireOwnerAccess
} from "../../04_OWNER/ControlTower/access-v1.mjs";

test("owner profile classifier accepts only active OWNER", () => {
  assert.deepEqual(
    classifyOwnerProfile({ role: "OWNER", status: "ACTIVE" }),
    { allowed: true, reason: "OWNER" }
  );
  assert.equal(classifyOwnerProfile(null).allowed, false);
  assert.equal(classifyOwnerProfile({ role: "OWNER", status: "INACTIVE" }).reason, "INACTIVE");
  assert.equal(classifyOwnerProfile({ role: "ACCOUNTANT", status: "ACTIVE" }).reason, "ROLE_DENIED");
});

test("requireOwnerAccess reuses shared-core active-session and role conventions", async () => {
  const profile = { id: "fixture-owner", role: "OWNER", status: "ACTIVE" };
  const core = {
    supabase: {
      async requireActive() { return profile; }
    },
    roles: {
      hasRole(value, roles) {
        return value === profile && roles.includes("OWNER");
      }
    }
  };

  assert.equal(await requireOwnerAccess(core), profile);

  await assert.rejects(
    () => requireOwnerAccess({
      supabase: { async requireActive() { return { role: "ACCOUNTANT", status: "ACTIVE" }; } },
      roles: { hasRole() { return false; } }
    }),
    /Chỉ Owner/
  );
});

test("Owner home exposes canonical Control Tower route", async () => {
  const html = await fs.readFile(
    new URL("../../04_OWNER/index.html", import.meta.url),
    "utf8"
  );
  assert.match(html, /href="\/04_OWNER\/ControlTower\/"/);
  assert.match(html, /Owner Control Tower/);
});

test("Control Tower route loads shared auth conventions and explicit UI states", async () => {
  const html = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/index.html", import.meta.url),
    "utf8"
  );

  assert.match(html, /@supabase\/supabase-js@2/);
  assert.match(html, /\/02_CORE\/shared\/shared-core-v1\.js/);
  assert.match(html, /id="loading"/);
  assert.match(html, /id="denied"/);
  assert.match(html, /id="app"/);
  assert.match(html, /href="\/03_PLATFORM\/01_AUTH\/"/);
});

test("Control Tower app authorizes before rendering dashboard state", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );
  const bootAt = source.indexOf("async function boot()");
  const authAt = source.indexOf("await requireOwnerAccess", bootAt);
  const renderAt = source.indexOf("render(", authAt);
  assert.ok(bootAt >= 0);
  assert.ok(authAt > bootAt);
  assert.ok(renderAt > authAt);
});
