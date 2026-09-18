import test from "node:test";
import assert from "node:assert/strict";

import {
  assessRevenueCandidate,
  loadReconciledRevenue
} from "../../04_OWNER/ControlTower/revenue-adapter-v1.mjs";
import { normalizeControlTowerSnapshot } from "../../04_OWNER/ControlTower/snapshot-v1.mjs";

const fixedNow = () => new Date("2026-09-18T06:40:00Z");

test("trusted reconciled revenue for the reporting date returns ACTUAL", () => {
  const result = assessRevenueCandidate(
    {
      reportingDate: "2026-09-18",
      reconciliationStatus: "RECONCILED",
      trusted: true,
      source: "SANITIZED_RECONCILED_REVENUE",
      asOf: "2026-09-18T06:30:00Z",
      amount: 1234500
    },
    { reportingDate: "2026-09-18", now: fixedNow }
  );

  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.amount, 1234500);
  assert.equal(result.source, "SANITIZED_RECONCILED_REVENUE");
});

test("zero is valid only when the record is trusted and reconciled", () => {
  const result = assessRevenueCandidate(
    {
      reportingDate: "2026-09-18",
      reconciliationStatus: "RECONCILED",
      trusted: true,
      source: "SANITIZED_RECONCILED_REVENUE",
      amount: 0
    },
    { reportingDate: "2026-09-18", now: fixedNow }
  );

  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.amount, 0);
});

test("unreconciled gross revenue fails closed and cannot expose a number", () => {
  const section = assessRevenueCandidate(
    {
      reportingDate: "2026-09-18",
      reconciliationStatus: "PENDING",
      trusted: false,
      source: "SANITIZED_MARKETPLACE_GROSS",
      amount: 9999999
    },
    { reportingDate: "2026-09-18", now: fixedNow }
  );
  const snapshot = normalizeControlTowerSnapshot({ revenue: section });

  assert.equal(section.quality, "GAP");
  assert.equal(section.amount, undefined);
  assert.equal(snapshot.revenue.amount, null);
});

test("reconciled but untrusted source is still GAP", () => {
  const result = assessRevenueCandidate(
    {
      reportingDate: "2026-09-18",
      reconciliationStatus: "RECONCILED",
      trusted: false,
      source: "SANITIZED_UNVERIFIED_SOURCE",
      amount: 1000
    },
    { reportingDate: "2026-09-18", now: fixedNow }
  );

  assert.equal(result.quality, "GAP");
  assert.equal(result.amount, undefined);
});

test("record from a different day is rejected", () => {
  const result = assessRevenueCandidate(
    {
      reportingDate: "2026-09-17",
      reconciliationStatus: "RECONCILED",
      trusted: true,
      source: "SANITIZED_RECONCILED_REVENUE",
      amount: 1000
    },
    { reportingDate: "2026-09-18", now: fixedNow }
  );

  assert.equal(result.quality, "GAP");
  assert.match(result.message, /không khớp ngày/i);
});

test("missing verified reader is NOT_CONNECTED instead of inventing a source", async () => {
  const result = await loadReconciledRevenue({
    reportingDate: "2026-09-18",
    now: fixedNow
  });

  assert.equal(result.quality, "NOT_CONNECTED");
  assert.equal(result.amount, undefined);
  assert.match(result.message, /không dùng số gross\/ước tính/i);
});

test("reader failure is section-local GAP", async () => {
  const result = await loadReconciledRevenue({
    reportingDate: "2026-09-18",
    now: fixedNow,
    reader: async () => {
      throw new Error("source unavailable");
    }
  });

  assert.equal(result.quality, "GAP");
  assert.equal(result.amount, undefined);
});

test("reader receives only the selected reporting date", async () => {
  const calls = [];
  const result = await loadReconciledRevenue({
    reportingDate: "2026-09-18",
    now: fixedNow,
    reader: async (args) => {
      calls.push(args);
      return {
        reportingDate: args.reportingDate,
        reconciliationStatus: "RECONCILED",
        trusted: true,
        source: "SANITIZED_RECONCILED_REVENUE",
        amount: 2500
      };
    }
  });

  assert.deepEqual(calls, [{ reportingDate: "2026-09-18" }]);
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.amount, 2500);
});
