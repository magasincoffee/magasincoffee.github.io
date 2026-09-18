import test from "node:test";
import assert from "node:assert/strict";

import {
  loadRevenueStatus,
  normalizeRevenueReadResult
} from "../../04_OWNER/ControlTower/revenue-adapter-v1.mjs";
import { normalizeControlTowerSnapshot } from "../../04_OWNER/ControlTower/snapshot-v1.mjs";

test("RECONCILED revenue is the only default ACTUAL path", () => {
  const section = normalizeRevenueReadResult({
    status: "RECONCILED",
    amount: 6_750_000,
    source: "SANITIZED_TEST_RECONCILED_REVENUE",
    reportingDate: "2026-09-18",
    reconciledAt: "2026-09-18T05:00:00Z"
  });

  assert.equal(section.quality, "ACTUAL");
  assert.equal(section.amount, 6_750_000);
  assert.equal(section.reportingDate, "2026-09-18");
  assert.equal(section.asOf, "2026-09-18T05:00:00Z");
});

test("explicit ESTIMATE is visible only as ESTIMATE", () => {
  const section = normalizeRevenueReadResult({
    status: "ESTIMATE",
    amount: 5_000_000,
    source: "SANITIZED_TEST_ESTIMATE"
  });

  assert.equal(section.quality, "ESTIMATE");
  assert.equal(section.amount, 5_000_000);
  assert.match(section.message, /ước tính/i);
});

for (const status of [
  "PENDING",
  "UNRECONCILED",
  "GROSS",
  "RAW",
  "REVIEW_REQUIRED"
]) {
  test(`${status} revenue fails closed and hides amount`, () => {
    const section = normalizeRevenueReadResult({
      status,
      amount: 99_999_999,
      source: "SANITIZED_TEST_GROSS_SOURCE"
    });

    assert.equal(section.quality, "GAP");
    assert.equal(section.amount, null);
    assert.match(section.message, /chưa đối chiếu/i);
  });
}

test("unknown or malformed source state becomes GAP with no amount", () => {
  const section = normalizeRevenueReadResult({
    status: "TRUST_ME",
    amount: 123
  });
  const snapshot = normalizeControlTowerSnapshot({ revenue: section });

  assert.equal(snapshot.revenue.quality, "GAP");
  assert.equal(snapshot.revenue.amount, null);
});

test("missing production provider remains NOT_CONNECTED", async () => {
  const section = await loadRevenueStatus(null, {
    reportingDate: "2026-09-18",
    now: () => new Date("2026-09-18T05:50:00Z")
  });

  assert.equal(section.quality, "NOT_CONNECTED");
  assert.equal(section.amount, null);
  assert.equal(section.source, "REVENUE_PROVIDER_NOT_CONNECTED");
});

test("provider failure is section-local GAP with no number", async () => {
  const section = await loadRevenueStatus(
    async () => {
      throw new Error("fixture provider failed");
    },
    {
      reportingDate: "2026-09-18",
      now: () => new Date("2026-09-18T05:51:00Z")
    }
  );

  assert.equal(section.quality, "GAP");
  assert.equal(section.amount, null);
  assert.equal(section.source, "REVENUE_PROVIDER_ERROR");
});

test("provider receives only requested reporting date", async () => {
  const calls = [];
  const section = await loadRevenueStatus(
    async (args) => {
      calls.push(args);
      return {
        status: "RECONCILED",
        amount: 0,
        source: "SANITIZED_TEST_RECONCILED_REVENUE"
      };
    },
    { reportingDate: "2026-09-18" }
  );

  assert.deepEqual(calls, [{ reportingDate: "2026-09-18" }]);
  assert.equal(section.quality, "ACTUAL");
  assert.equal(section.amount, 0);
});
