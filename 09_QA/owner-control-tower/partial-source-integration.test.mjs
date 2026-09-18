import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  loadControlTowerSources,
  loadSectionSafely
} from "../../04_OWNER/ControlTower/source-integration-v1.mjs";

const fixedNow = () => new Date("2026-09-18T07:00:00Z");

const actualRevenue = {
  quality: "ACTUAL",
  source: "SANITIZED_RECONCILED_REVENUE",
  asOf: "2026-09-18T06:55:00Z",
  amount: 1000
};

const actualPayables = {
  quality: "ACTUAL",
  source: "SANITIZED_PAYABLES",
  asOf: "2026-09-18T06:56:00Z",
  totalDue: 2000,
  overdueAmount: 0,
  openOrders: 1,
  overdueOrders: 0
};

const actualWorkforce = {
  quality: "ACTUAL",
  source: "SANITIZED_WORKFORCE",
  asOf: "2026-09-18T06:57:00Z",
  staffingGapCount: null,
  unresolvedCount: 2
};

test("one rejected source becomes local GAP while healthy sources survive", async () => {
  const calls = [];
  const sections = await loadControlTowerSources({
    reportingDate: "2026-09-18",
    core: { supabase: { get: () => ({}) } },
    now: fixedNow,
    loaders: {
      revenue: async () => {
        calls.push("revenue");
        return actualRevenue;
      },
      payables: async () => {
        calls.push("payables");
        throw new Error("unexpected payables failure");
      },
      workforce: async () => {
        calls.push("workforce");
        return actualWorkforce;
      }
    }
  });

  assert.deepEqual(new Set(calls), new Set(["revenue", "payables", "workforce"]));
  assert.equal(sections.revenue.quality, "ACTUAL");
  assert.equal(sections.revenue.amount, 1000);
  assert.equal(sections.payables.quality, "GAP");
  assert.equal(sections.payables.totalDue, undefined);
  assert.match(sections.payables.message, /các nguồn khác vẫn tiếp tục tải/i);
  assert.equal(sections.workforce.quality, "ACTUAL");
  assert.equal(sections.workforce.unresolvedCount, 2);
});

test("synchronous client acquisition failure is isolated to Payables", async () => {
  const sections = await loadControlTowerSources({
    reportingDate: "2026-09-18",
    core: {
      supabase: {
        get() {
          throw new Error("client unavailable");
        }
      }
    },
    now: fixedNow,
    loaders: {
      revenue: async () => actualRevenue,
      payables: async () => actualPayables,
      workforce: async () => actualWorkforce
    }
  });

  assert.equal(sections.revenue.quality, "ACTUAL");
  assert.equal(sections.payables.quality, "GAP");
  assert.equal(sections.workforce.quality, "ACTUAL");
});

test("adapter-declared GAP or NOT_CONNECTED is preserved instead of overwritten", async () => {
  const declared = {
    quality: "NOT_CONNECTED",
    source: "SANITIZED_SOURCE",
    asOf: "2026-09-18T06:58:00Z",
    message: "Chưa kết nối."
  };

  const result = await loadSectionSafely(
    async () => declared,
    {
      source: "fallback",
      message: "fallback message",
      now: fixedNow
    }
  );

  assert.deepEqual(result, declared);
});

test("invalid adapter return fails closed to section-local GAP", async () => {
  const result = await loadSectionSafely(
    async () => null,
    {
      source: "SANITIZED_SOURCE",
      message: "Nguồn lỗi.",
      now: fixedNow
    }
  );

  assert.equal(result.quality, "GAP");
  assert.equal(result.source, "SANITIZED_SOURCE");
  assert.equal(result.asOf, "2026-09-18T07:00:00.000Z");
});

test("all source failures remain renderable as three explicit GAP sections", async () => {
  const fail = async () => {
    throw new Error("offline");
  };

  const sections = await loadControlTowerSources({
    reportingDate: "2026-09-18",
    core: { supabase: { get: () => ({}) } },
    now: fixedNow,
    loaders: {
      revenue: fail,
      payables: fail,
      workforce: fail
    }
  });

  assert.deepEqual(
    Object.fromEntries(
      Object.entries(sections).map(([key, section]) => [key, section.quality])
    ),
    {
      revenue: "GAP",
      payables: "GAP",
      workforce: "GAP"
    }
  );
});

test("Control Tower keeps source loading outside the Owner auth boundary", async () => {
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  const sessionAt = source.indexOf("async function requireOwnerSession");
  const bootAt = source.indexOf("async function boot");
  const sessionBlock = source.slice(sessionAt, bootAt);
  const authAt = source.indexOf("await requireOwnerSession", bootAt);
  const guardAt = source.indexOf("if (!profile) return", authAt);
  const sourcesAt = source.indexOf("await loadControlTowerSources", bootAt);

  assert.ok(sessionAt >= 0);
  assert.ok(bootAt > sessionAt);
  assert.match(sessionBlock, /await requireOwnerAccess/);
  assert.doesNotMatch(sessionBlock, /loadControlTowerSources/);
  assert.ok(authAt >= 0);
  assert.ok(guardAt > authAt);
  assert.ok(sourcesAt > guardAt);
  assert.doesNotMatch(source.slice(sourcesAt), /denied\.classList\.remove/);
});
