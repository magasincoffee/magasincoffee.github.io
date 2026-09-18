import test from "node:test";
import assert from "node:assert/strict";

import {
  formatCount,
  formatMoney,
  normalizeControlTowerSnapshot
} from "../../04_OWNER/ControlTower/snapshot-v1.mjs";
import {
  healthyFixture,
  partialFixture,
  errorFixture,
  emptyFixture
} from "../../04_OWNER/ControlTower/fixtures-v1.mjs";

test("healthy fixture preserves actual values and quality metadata", () => {
  const s = normalizeControlTowerSnapshot(healthyFixture);
  assert.equal(s.revenue.quality, "ACTUAL");
  assert.equal(s.revenue.amount, 1234500);
  assert.equal(s.payables.openOrders, 4);
  assert.equal(s.workforce.staffingGapCount, 2);
  assert.equal(s.inventory.quality, "NOT_CONNECTED");
});

test("partial fixture never fabricates missing metric values", () => {
  const s = normalizeControlTowerSnapshot(partialFixture);
  assert.equal(s.revenue.quality, "GAP");
  assert.equal(s.revenue.amount, null);
  assert.equal(s.workforce.quality, "NOT_CONNECTED");
  assert.equal(s.workforce.staffingGapCount, null);
  assert.equal(s.inventory.quality, "NOT_CONNECTED");
  assert.equal(s.inventory.warningCount, null);
});

test("error fixture remains renderable with section-local failures", () => {
  const s = normalizeControlTowerSnapshot(errorFixture);
  assert.equal(s.revenue.quality, "GAP");
  assert.match(s.revenue.message, /không truy cập/i);
  assert.equal(s.payables.quality, "NOT_CONNECTED");
  assert.equal(s.tasks.quality, "NOT_CONNECTED");
});

test("empty actual data is different from unavailable data", () => {
  const s = normalizeControlTowerSnapshot(emptyFixture);
  assert.equal(s.revenue.quality, "ACTUAL");
  assert.equal(s.revenue.amount, 0);
  assert.equal(s.payables.totalDue, 0);
  assert.equal(s.workforce.staffingGapCount, 0);
});

test("invalid quality fails closed to GAP", () => {
  const s = normalizeControlTowerSnapshot({
    revenue: { quality: "TRUST_ME", amount: 99 }
  });
  assert.equal(s.revenue.quality, "GAP");
  assert.equal(s.revenue.amount, null);
});

test("formatters show dash for unavailable values", () => {
  assert.equal(formatCount(null), "—");
  assert.equal(formatMoney(null), "—");
  assert.notEqual(formatCount(0), "—");
  assert.notEqual(formatMoney(0), "—");
});

test("GAP and NOT_CONNECTED sections redact supplied numeric values", () => {
  const s = normalizeControlTowerSnapshot({
    revenue: { quality: "GAP", amount: 999999 },
    payables: { quality: "NOT_CONNECTED", totalDue: 777777 }
  });
  assert.equal(s.revenue.amount, null);
  assert.equal(s.payables.totalDue, null);
});

test("missing quality defaults to NOT_CONNECTED", () => {
  const s = normalizeControlTowerSnapshot({
    workforce: { staffingGapCount: 9 }
  });
  assert.equal(s.workforce.quality, "NOT_CONNECTED");
  assert.equal(s.workforce.staffingGapCount, null);
});
