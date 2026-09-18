import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateRevenueRecord,
  loadRevenueStatus
} from "../../04_OWNER/ControlTower/revenue-adapter-v1.mjs";
import { normalizeControlTowerSnapshot } from "../../04_OWNER/ControlTower/snapshot-v1.mjs";

const reportingDate = "2026-09-18";

test("reconciled revenue for the reporting date is ACTUAL", () => {
  const result = evaluateRevenueRecord(
    {
      reportingDate,
      amount: 0,
      reconciliationStatus: "RECONCILED",
      reconciledAt: "2026-09-18T22:15:00+07:00",
      source: "SANITIZED_RECONCILED_DAILY_REVENUE"
    },
    { reportingDate }
  );

  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.amount, 0);
  assert.equal(result.source, "SANITIZED_RECONCILED_DAILY_REVENUE");
});

test("closed revenue is accepted only when the record carries close evidence", () => {
  const result = evaluateRevenueRecord(
    {
      reporting_date: reportingDate,
      amount: 1234500,
      close_status: "CLOSED",
      closedAt: "2026-09-18T23:00:00+07:00"
    },
    { reportingDate }
  );

  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.amount, 1234500);
});

test("pending gross revenue fails closed and does not expose the amount", () => {
  const result = evaluateRevenueRecord(
    {
      reportingDate,
      amount: 9999999,
      reconciliationStatus: "PENDING",
      asOf: "2026-09-18T20:00:00+07:00",
      source: "SAPO_GROSS_SANITIZED"
    },
    { reportingDate }
  );

  assert.equal(result.quality, "GAP");
  assert.equal("amount" in result, false);

  const snapshot = normalizeControlTowerSnapshot({ revenue: result });
  assert.equal(snapshot.revenue.amount, null);
});

test("date mismatch cannot be promoted to ACTUAL", () => {
  const result = evaluateRevenueRecord(
    {
      reportingDate: "2026-09-17",
      amount: 500000,
      reconciliationStatus: "RECONCILED",
      reconciledAt: "2026-09-17T22:00:00+07:00"
    },
    { reportingDate }
  );

  assert.equal(result.quality, "GAP");
  assert.equal("amount" in result, false);
});

test("missing close timestamp fails the ACTUAL gate", () => {
  const result = evaluateRevenueRecord(
    {
      reportingDate,
      amount: 500000,
      reconciliationStatus: "RECONCILED"
    },
    { reportingDate }
  );

  assert.equal(result.quality, "GAP");
  assert.equal("amount" in result, false);
});

test("missing reader returns NOT_CONNECTED without querying an invented source", async () => {
  const result = await loadRevenueStatus(
    { date: { dateKey: () => reportingDate } },
    { now: () => new Date("2026-09-18T06:00:00Z") }
  );

  assert.equal(result.quality, "NOT_CONNECTED");
  assert.match(result.message, /không dùng Sapo\/marketplace gross/i);
});

test("registered read contract can return reconciled ACTUAL revenue", async () => {
  const calls = [];
  const core = {
    date: { dateKey: () => reportingDate },
    revenue: {
      async getDailyReconciliation(args) {
        calls.push(args);
        return {
          reportingDate,
          amount: 7654321,
          reconciliationStatus: "RECONCILED",
          reconciledAt: "2026-09-18T22:30:00+07:00",
          source: "SANITIZED_REVENUE_READER"
        };
      }
    }
  };

  const result = await loadRevenueStatus(core);
  assert.deepEqual(calls, [{ reportingDate }]);
  assert.equal(result.quality, "ACTUAL");
  assert.equal(result.amount, 7654321);
});

test("reader failure is section-local GAP and keeps revenue hidden", async () => {
  const core = {
    date: { dateKey: () => reportingDate },
    revenue: {
      async getDailyReconciliation() {
        throw new Error("source unavailable");
      }
    }
  };

  const result = await loadRevenueStatus(core);
  assert.equal(result.quality, "GAP");

  const snapshot = normalizeControlTowerSnapshot({ revenue: result });
  assert.equal(snapshot.revenue.amount, null);
});
