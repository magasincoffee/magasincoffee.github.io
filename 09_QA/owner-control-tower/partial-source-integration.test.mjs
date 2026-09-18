import test from "node:test";
import assert from "node:assert/strict";

import { loadControlTowerSection } from "../../04_OWNER/ControlTower/section-loader-v1.mjs";
import { normalizeControlTowerSnapshot } from "../../04_OWNER/ControlTower/snapshot-v1.mjs";

const fixedNow = () => new Date("2026-09-18T07:00:00Z");

test("healthy section result passes through unchanged", async () => {
  const expected = {
    quality: "ACTUAL",
    source: "SANITIZED_SOURCE",
    asOf: "2026-09-18T06:59:00Z",
    totalDue: 123
  };

  const result = await loadControlTowerSection({
    sectionName: "Payables",
    loader: async () => expected,
    now: fixedNow
  });

  assert.equal(result, expected);
});

test("unexpected source exception becomes section-local GAP instead of escaping", async () => {
  const result = await loadControlTowerSection({
    sectionName: "Payables",
    source: "procurement read adapter",
    loader: async () => {
      throw new Error("private backend detail must not leak");
    },
    now: fixedNow
  });

  assert.deepEqual(result, {
    quality: "GAP",
    source: "procurement read adapter",
    asOf: "2026-09-18T07:00:00.000Z",
    message:
      "Nguồn Payables tạm thời không khả dụng; các khu vực khác vẫn tiếp tục tải."
  });
  assert.doesNotMatch(result.message, /private backend detail/i);
});

test("one thrown source does not prevent later healthy and partial sections", async () => {
  const raw = {
    revenue: await loadControlTowerSection({
      sectionName: "Revenue",
      loader: async () => {
        throw new Error("revenue failed");
      },
      now: fixedNow
    }),
    payables: await loadControlTowerSection({
      sectionName: "Payables",
      loader: async () => ({
        quality: "ACTUAL",
        source: "SANITIZED_PAYABLES",
        totalDue: 250000,
        overdueAmount: 0,
        openOrders: 2,
        overdueOrders: 0
      }),
      now: fixedNow
    }),
    workforce: await loadControlTowerSection({
      sectionName: "Workforce",
      loader: async () => ({
        quality: "ESTIMATE",
        source: "SANITIZED_WORKFORCE_PARTIAL",
        staffingGapCount: null,
        unresolvedCount: 3,
        message: "Một phần nguồn Workforce chưa khả dụng."
      }),
      now: fixedNow
    })
  };

  const snapshot = normalizeControlTowerSnapshot(raw);

  assert.equal(snapshot.revenue.quality, "GAP");
  assert.equal(snapshot.revenue.amount, null);
  assert.equal(snapshot.payables.quality, "ACTUAL");
  assert.equal(snapshot.payables.totalDue, 250000);
  assert.equal(snapshot.workforce.quality, "ESTIMATE");
  assert.equal(snapshot.workforce.unresolvedCount, 3);
});

test("missing loader is explicit GAP and cannot fabricate values", async () => {
  const result = await loadControlTowerSection({
    sectionName: "Inventory",
    now: fixedNow
  });
  const snapshot = normalizeControlTowerSnapshot({ inventory: result });

  assert.equal(result.quality, "GAP");
  assert.equal(snapshot.inventory.warningCount, null);
  assert.match(result.message, /chưa có loader/i);
});


test("source loading starts after the auth-only denial boundary", async () => {
  const fs = await import("node:fs/promises");
  const source = await fs.readFile(
    new URL("../../04_OWNER/ControlTower/control-tower-v1.js", import.meta.url),
    "utf8"
  );

  const bootAt = source.indexOf("async function boot()");
  const authAt = source.indexOf("await requireOwnerAccess", bootAt);
  const authErrorAt = source.indexOf("[CONTROL_TOWER_AUTH]", authAt);
  const revenueAt = source.indexOf("await loadReconciledRevenue", authAt);
  const payablesAt = source.indexOf("await loadProcurementPayables", authAt);
  const workforceAt = source.indexOf("await loadWorkforceAttention", authAt);

  assert.ok(bootAt >= 0);
  assert.ok(authAt > bootAt);
  assert.ok(authErrorAt > authAt);
  assert.ok(revenueAt > authErrorAt);
  assert.ok(payablesAt > authErrorAt);
  assert.ok(workforceAt > authErrorAt);
  assert.match(source, /loadControlTowerSection/);
});
