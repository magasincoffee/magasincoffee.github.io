import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  CASH_COVERAGE_ROLES,
  CASH_COVERAGE_STATUSES,
  CASH_SOURCE_COVERAGE_SCHEMA_VERSION,
  CASH_SOURCE_COVERAGE_STATUSES,
  cashSourceCoverageForBridge,
  evaluateCashSourceCoverage
} from "../../02_CORE/shared/cash-source-coverage-v1.mjs";
import {
  mapInternalMonthlyCashOpening,
  mapInternalMonthlyCashRemainder,
  mapObservedCashPoint,
  mapUnavailableCashBalanceSource
} from "../../02_CORE/shared/cash-balance-source-mapper-v1.mjs";
import {
  cashBalanceTruthForBridge
} from "../../02_CORE/shared/cash-balance-truth-v1.mjs";
import {
  calculateCashBridge
} from "../../02_CORE/shared/cash-bridge-v1.mjs";

const PERIOD = Object.freeze({
  start: "2026-09-01",
  end: "2026-09-20",
  timezone: "Asia/Ho_Chi_Minh"
});

const HISTORICAL_PERIOD = Object.freeze({
  start: "2026-08-01",
  end: "2026-08-31",
  timezone: "Asia/Ho_Chi_Minh"
});

const CN1 = Object.freeze({
  branch: "CN1",
  channel: "DIRECT",
  aggregate_proven: false
});

const CN2 = Object.freeze({
  branch: "CN2",
  channel: "DIRECT",
  aggregate_proven: false
});

const ALL_DIRECT = Object.freeze({
  branch: "ALL",
  channel: "DIRECT",
  aggregate_proven: true
});

const START = Object.freeze({
  date: PERIOD.start,
  timezone: PERIOD.timezone,
  timestamp: "2026-09-01T00:00:00+07:00",
  boundary_proven: true
});

const END = Object.freeze({
  date: PERIOD.end,
  timezone: PERIOD.timezone,
  timestamp: "2026-09-20T23:59:59+07:00",
  boundary_proven: true
});

function account(className = "OTHER_EVIDENCED_CASH", label = "INTERNAL_CASH_POOL", aggregate = false) {
  return {
    class: className,
    label,
    aggregate_proven: aggregate
  };
}

function universeMember({
  sourceClass = "INTERNAL_CASH_MOVEMENT_ROWS",
  accountClass = "OTHER_EVIDENCED_CASH",
  label = "INTERNAL_CASH_POOL",
  scope = CN1,
  required = true,
  accountAggregate = false
} = {}) {
  return {
    source_class: sourceClass,
    account: account(accountClass, label, accountAggregate),
    scope: { ...scope },
    required
  };
}

function universe({
  proven = true,
  aggregate = false,
  empty = false,
  accounts = [universeMember()],
  lineage = ["SANITIZED_REQUIRED_SOURCE_UNIVERSE"]
} = {}) {
  return {
    universe_proven: proven,
    aggregate_proven: aggregate,
    empty_universe_proven: empty,
    accounts,
    lineage
  };
}

function movementEntry({
  sourceClass = "INTERNAL_CASH_MOVEMENT_ROWS",
  accountClass = "OTHER_EVIDENCED_CASH",
  label = "INTERNAL_CASH_POOL",
  scope = CN1,
  required = true,
  status = "COMPLETE",
  proven = true,
  intervals = [{
    start: PERIOD.start,
    end: PERIOD.end,
    timezone: PERIOD.timezone
  }],
  asOf = END.timestamp,
  lineage = ["SANITIZED_MOVEMENT_COVERAGE"],
  coverageHint
} = {}) {
  return {
    source_class: sourceClass,
    account: account(accountClass, label),
    scope: { ...scope },
    required,
    status,
    coverage_proven: proven,
    covered_intervals: intervals,
    as_of: asOf,
    lineage,
    coverage_hint: coverageHint
  };
}

function coverageInput({
  role = "MOVEMENT_EVENTS",
  period = PERIOD,
  scope = CN1,
  accountUniverse = universe(),
  sources = [movementEntry()],
  lineage = ["SANITIZED_CASH_COVERAGE"],
  asOf = END.timestamp
} = {}) {
  return {
    coverage_role: role,
    target_period: { ...period },
    scope: { ...scope },
    account_universe: accountUniverse,
    source_coverage: sources,
    as_of: asOf,
    lineage
  };
}

function observedFact({
  sourceClass = "PHYSICAL_STORE_TILL_COUNT",
  accountClass = "PHYSICAL_CASH",
  label = "CN1_TILL",
  role = "OPENING",
  point = START,
  scope = CN1,
  value = 100,
  quality = "ACTUAL",
  observedProven = true
} = {}) {
  return {
    source_class: sourceClass,
    balance_role: role,
    value,
    quality,
    point: { ...point },
    account: account(accountClass, label),
    scope: { ...scope },
    source: {
      class: "DIRECT_POINT_BALANCE",
      label: "SANITIZED_POINT_BALANCE"
    },
    as_of: point.timestamp,
    reconciliation_status: "NOT_APPLICABLE",
    evidence: ["DIRECT_POINT_BALANCE_EVIDENCE"],
    lineage: [`${sourceClass}:SANITIZED`],
    observed_proven: observedProven,
    coverage_hint: "COMPLETE"
  };
}

function mappedObserved(options = {}) {
  return mapObservedCashPoint(observedFact(options));
}

function currentComputedOpening() {
  return mapInternalMonthlyCashOpening({
    source_class: "INTERNAL_MONTHLY_CASH_WORKBOOK",
    fact_kind: "MONTHLY_CARRY_FORWARD",
    value: 100,
    quality: "ACTUAL",
    point: { ...START },
    account: account(),
    scope: { ...CN1 },
    source: {
      class: "INTERNAL_MONTHLY_CASH",
      label: "MONTHLY_CASH_WORKBOOK"
    },
    as_of: START.timestamp,
    reconciliation_status: "NOT_APPLICABLE",
    evidence: ["SANITIZED_MONTHLY_CARRY_FORWARD"],
    lineage: ["INTERNAL_MONTHLY_CASH:OPENING"],
    computation_proven: true,
    anchor_observed: false,
    movement_coverage: "PARTIAL",
    dependency_qualities: ["ACTUAL", "GAP"],
    computation_lineage: ["MOVEMENTS_VERIFIED_THROUGH_2026_09_16"],
    coverage_hint: "PARTIAL"
  });
}

function provenComputedOpening() {
  return mapInternalMonthlyCashOpening({
    source_class: "INTERNAL_MONTHLY_CASH_WORKBOOK",
    fact_kind: "MONTHLY_CARRY_FORWARD",
    value: 100,
    quality: "ACTUAL",
    point: { ...START },
    account: account(),
    scope: { ...CN1 },
    source: {
      class: "DERIVED_BALANCE_COMPUTATION",
      label: "SANITIZED_COMPUTED_OPENING"
    },
    as_of: START.timestamp,
    reconciliation_status: "NOT_APPLICABLE",
    evidence: ["OBSERVED_ANCHOR_PLUS_COMPLETE_MOVEMENTS"],
    lineage: ["INTERNAL_MONTHLY_CASH:OPENING"],
    computation_proven: true,
    anchor_observed: true,
    movement_coverage: "COMPLETE",
    dependency_qualities: ["ACTUAL", "ACTUAL"],
    computation_lineage: ["OBSERVED_ANCHOR", "COMPLETE_MOVEMENT_SEGMENT"],
    coverage_hint: "COMPLETE"
  });
}

function pointEntry({
  sourceClass = "PHYSICAL_STORE_TILL_COUNT",
  accountClass = "PHYSICAL_CASH",
  label = "CN1_TILL",
  scope = CN1,
  required = true,
  status = "COMPLETE",
  proven = true,
  balance = mappedObserved(),
  asOf = END.timestamp,
  lineage = ["SANITIZED_POINT_COVERAGE"]
} = {}) {
  return {
    source_class: sourceClass,
    account: account(accountClass, label),
    scope: { ...scope },
    required,
    status,
    coverage_proven: proven,
    balance,
    as_of: asOf,
    lineage
  };
}

test("contract exposes exact coverage roles and statuses", async () => {
  const contract = JSON.parse(await fs.readFile(
    new URL("../../02_CORE/contracts/cash-source-coverage.v1.json", import.meta.url),
    "utf8"
  ));
  assert.equal(contract.schema_version, CASH_SOURCE_COVERAGE_SCHEMA_VERSION);
  assert.deepEqual(contract.coverage_roles, CASH_COVERAGE_ROLES);
  assert.deepEqual(contract.aggregate_statuses, CASH_COVERAGE_STATUSES);
  assert.deepEqual(contract.source_statuses, CASH_SOURCE_COVERAGE_STATUSES);
});

test("complete movement coverage requires proven universe and full required interval", () => {
  const result = evaluateCashSourceCoverage(coverageInput());
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.universe_proven, true);
  assert.equal(result.required_not_connected, false);
  assert.equal(result.source_coverage[0].status, "COMPLETE");
});

test("unknown required universe can never become COMPLETE", () => {
  const result = evaluateCashSourceCoverage(coverageInput({
    accountUniverse: universe({ proven: false })
  }));
  assert.equal(result.status, "PARTIAL");
  assert.ok(result.diagnostics.includes("REQUIRED_SOURCE_UNIVERSE_NOT_PROVEN"));
});

test("mapper coverage_hint COMPLETE alone cannot prove COMPLETE", () => {
  const result = evaluateCashSourceCoverage(coverageInput({
    sources: [movementEntry({
      proven: false,
      coverageHint: "COMPLETE"
    })]
  }));
  assert.equal(result.status, "MISSING");
  assert.equal(result.source_coverage[0].status, "MISSING");
  assert.ok(result.source_coverage[0].diagnostics.includes("COVERAGE_HINT_CANNOT_PROVE_COMPLETE"));
});

test("current September internal movement evidence through 2026-09-16 is PARTIAL", () => {
  const result = evaluateCashSourceCoverage(coverageInput({
    sources: [movementEntry({
      status: "PARTIAL",
      intervals: [{
        start: "2026-09-01",
        end: "2026-09-16",
        timezone: PERIOD.timezone
      }],
      asOf: "2026-09-16T23:59:59+07:00"
    })]
  }));
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.source_coverage[0].status, "PARTIAL");
  assert.deepEqual(result.source_coverage[0].covered_intervals, [{
    start: "2026-09-01",
    end: "2026-09-16",
    timezone: PERIOD.timezone
  }]);
});

test("gap between movement intervals prevents COMPLETE", () => {
  const result = evaluateCashSourceCoverage(coverageInput({
    sources: [movementEntry({
      intervals: [
        { start: "2026-09-01", end: "2026-09-10", timezone: PERIOD.timezone },
        { start: "2026-09-12", end: "2026-09-20", timezone: PERIOD.timezone }
      ]
    })]
  }));
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.source_coverage[0].status, "PARTIAL");
  assert.ok(result.source_coverage[0].diagnostics.includes("MOVEMENT_INTERVAL_GAP_PRESENT"));
});

test("overlapping and contiguous intervals merge deterministically to full coverage", () => {
  const result = evaluateCashSourceCoverage(coverageInput({
    sources: [movementEntry({
      intervals: [
        { start: "2026-09-16", end: "2026-09-20", timezone: PERIOD.timezone },
        { start: "2026-09-01", end: "2026-09-10", timezone: PERIOD.timezone },
        { start: "2026-09-08", end: "2026-09-15", timezone: PERIOD.timezone }
      ]
    })]
  }));
  assert.equal(result.status, "COMPLETE");
  assert.deepEqual(result.source_coverage[0].covered_intervals, [{
    start: PERIOD.start,
    end: PERIOD.end,
    timezone: PERIOD.timezone
  }]);
});

test("outside-target intervals are ignored and cannot prove coverage", () => {
  const result = evaluateCashSourceCoverage(coverageInput({
    sources: [movementEntry({
      intervals: [{
        start: "2026-08-01",
        end: "2026-08-31",
        timezone: PERIOD.timezone
      }]
    })]
  }));
  assert.equal(result.status, "MISSING");
  assert.equal(result.source_coverage[0].status, "MISSING");
});

test("required NOT_CONNECTED source sets flag and blocks COMPLETE", () => {
  const internal = movementEntry();
  const bank = movementEntry({
    sourceClass: "BANK_CASH_MOVEMENTS",
    accountClass: "BANK",
    label: "BUSINESS_BANK_LOGICAL",
    status: "NOT_CONNECTED",
    proven: false,
    intervals: [],
    lineage: ["BANK_MOVEMENTS_NOT_CONNECTED"]
  });
  const result = evaluateCashSourceCoverage(coverageInput({
    accountUniverse: universe({
      accounts: [
        universeMember(),
        universeMember({
          sourceClass: "BANK_CASH_MOVEMENTS",
          accountClass: "BANK",
          label: "BUSINESS_BANK_LOGICAL"
        })
      ]
    }),
    sources: [internal, bank]
  }));
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.required_not_connected, true);
});

test("optional NOT_CONNECTED source does not block otherwise COMPLETE required universe", () => {
  const optionalBank = movementEntry({
    sourceClass: "BANK_CASH_MOVEMENTS",
    accountClass: "BANK",
    label: "BUSINESS_BANK_LOGICAL",
    required: false,
    status: "NOT_CONNECTED",
    proven: false,
    intervals: [],
    lineage: ["OPTIONAL_BANK_SOURCE_NOT_CONNECTED"]
  });
  const result = evaluateCashSourceCoverage(coverageInput({
    sources: [movementEntry(), optionalBank]
  }));
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.required_not_connected, false);
});

test("one concrete source/account cannot prove enterprise ALL", () => {
  const result = evaluateCashSourceCoverage(coverageInput({
    scope: ALL_DIRECT,
    accountUniverse: universe({
      aggregate: true,
      accounts: [universeMember()]
    }),
    sources: [movementEntry()]
  }));
  assert.equal(result.status, "PARTIAL");
  assert.ok(result.diagnostics.includes("ONE_ACCOUNT_CANNOT_PROVE_ENTERPRISE_ALL"));
});

test("multiple required branch accounts can prove aggregate only with universe/scope aggregate proof", () => {
  const cn1Member = universeMember({ scope: CN1 });
  const cn2Member = universeMember({
    sourceClass: "CN2_CASH_MOVEMENTS",
    label: "CN2_CASH_POOL",
    scope: CN2
  });
  const cn2Entry = movementEntry({
    sourceClass: "CN2_CASH_MOVEMENTS",
    label: "CN2_CASH_POOL",
    scope: CN2
  });

  const proven = evaluateCashSourceCoverage(coverageInput({
    scope: ALL_DIRECT,
    accountUniverse: universe({
      aggregate: true,
      accounts: [cn1Member, cn2Member]
    }),
    sources: [movementEntry(), cn2Entry]
  }));
  assert.equal(proven.status, "COMPLETE");

  const unproven = evaluateCashSourceCoverage(coverageInput({
    scope: ALL_DIRECT,
    accountUniverse: universe({
      aggregate: false,
      accounts: [cn1Member, cn2Member]
    }),
    sources: [movementEntry(), cn2Entry]
  }));
  assert.equal(unproven.status, "PARTIAL");
});

test("unproven account ALL is rejected", () => {
  const badMember = universeMember({
    label: "ALL",
    scope: ALL_DIRECT,
    accountAggregate: false
  });
  const result = evaluateCashSourceCoverage(coverageInput({
    scope: ALL_DIRECT,
    accountUniverse: universe({
      aggregate: true,
      accounts: [badMember]
    }),
    sources: []
  }));
  assert.equal(result.status, "MISSING");
  assert.ok(result.diagnostics.includes("INVALID_ACCOUNT_UNIVERSE_MEMBER"));
});

test("opening exact point with direct observed balance passes", () => {
  const opening = mappedObserved();
  const result = evaluateCashSourceCoverage(coverageInput({
    role: "OPENING_BALANCE",
    accountUniverse: universe({
      accounts: [universeMember({
        sourceClass: "PHYSICAL_STORE_TILL_COUNT",
        accountClass: "PHYSICAL_CASH",
        label: "CN1_TILL"
      })]
    }),
    sources: [pointEntry({ balance: opening })]
  }));
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.source_coverage[0].balance_basis, "OBSERVED_BALANCE");
  assert.equal(result.source_coverage[0].balance_quality, "ACTUAL");
});

test("opening wrong date fails point coverage", () => {
  const wrong = mappedObserved({
    point: {
      date: "2026-08-31",
      timezone: PERIOD.timezone,
      timestamp: "2026-08-31T23:59:59+07:00",
      boundary_proven: true
    }
  });
  const result = evaluateCashSourceCoverage(coverageInput({
    role: "OPENING_BALANCE",
    accountUniverse: universe({
      accounts: [universeMember({
        sourceClass: "PHYSICAL_STORE_TILL_COUNT",
        accountClass: "PHYSICAL_CASH",
        label: "CN1_TILL"
      })]
    }),
    sources: [pointEntry({ balance: wrong })]
  }));
  assert.equal(result.status, "MISSING");
  assert.equal(result.source_coverage[0].status, "MISSING");
});

test("opening wrong timezone fails point coverage", () => {
  const wrong = mappedObserved({
    point: {
      date: PERIOD.start,
      timezone: "UTC",
      timestamp: "2026-09-01T00:00:00Z",
      boundary_proven: true
    }
  });
  const result = evaluateCashSourceCoverage(coverageInput({
    role: "OPENING_BALANCE",
    accountUniverse: universe({
      accounts: [universeMember({
        sourceClass: "PHYSICAL_STORE_TILL_COUNT",
        accountClass: "PHYSICAL_CASH",
        label: "CN1_TILL"
      })]
    }),
    sources: [pointEntry({ balance: wrong })]
  }));
  assert.equal(result.status, "MISSING");
});

test("fully proven computed opening can satisfy OPENING_BALANCE coverage without becoming observed", () => {
  const computed = provenComputedOpening();
  const result = evaluateCashSourceCoverage(coverageInput({
    role: "OPENING_BALANCE",
    accountUniverse: universe({
      accounts: [universeMember({
        sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK"
      })]
    }),
    sources: [pointEntry({
      sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK",
      accountClass: "OTHER_EVIDENCED_CASH",
      label: "INTERNAL_CASH_POOL",
      balance: computed
    })]
  }));
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.source_coverage[0].balance_basis, "COMPUTED_BALANCE");
  assert.equal(result.source_coverage[0].balance_quality, "ACTUAL");
});

test("computed opening without valid provenance remains incomplete", () => {
  const computed = currentComputedOpening();
  const result = evaluateCashSourceCoverage(coverageInput({
    role: "OPENING_BALANCE",
    accountUniverse: universe({
      accounts: [universeMember({
        sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK"
      })]
    }),
    sources: [pointEntry({
      sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK",
      accountClass: "OTHER_EVIDENCED_CASH",
      label: "INTERNAL_CASH_POOL",
      balance: computed
    })]
  }));
  assert.equal(result.status, "MISSING");
  assert.equal(result.source_coverage[0].balance_quality, "GAP");
});

test("observed ending exact point passes only with OBSERVED_BALANCE", () => {
  const ending = mappedObserved({
    role: "OBSERVED_ENDING",
    point: END
  });
  const result = evaluateCashSourceCoverage(coverageInput({
    role: "OBSERVED_ENDING_BALANCE",
    accountUniverse: universe({
      accounts: [universeMember({
        sourceClass: "PHYSICAL_STORE_TILL_COUNT",
        accountClass: "PHYSICAL_CASH",
        label: "CN1_TILL"
      })]
    }),
    sources: [pointEntry({
      balance: ending,
      asOf: END.timestamp
    })]
  }));
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.source_coverage[0].balance_basis, "OBSERVED_BALANCE");
});

test("computed remainder cannot satisfy OBSERVED_ENDING_BALANCE coverage", () => {
  const remainder = mapInternalMonthlyCashRemainder({
    source_class: "INTERNAL_MONTHLY_CASH_WORKBOOK",
    fact_kind: "CALCULATED_REMAINDER",
    value: 100,
    quality: "ACTUAL",
    point: { ...END },
    account: account(),
    scope: { ...CN1 },
    source: {
      class: "INTERNAL_MONTHLY_CASH",
      label: "MONTHLY_CASH_WORKBOOK"
    },
    as_of: END.timestamp,
    reconciliation_status: "NOT_APPLICABLE",
    evidence: ["SANITIZED_CALCULATED_REMAINDER"],
    lineage: ["INTERNAL_MONTHLY_CASH:REMAINDER"],
    computation_proven: true,
    anchor_observed: true,
    movement_coverage: "COMPLETE",
    dependency_qualities: ["ACTUAL"],
    computation_lineage: ["SANITIZED_COMPUTATION"]
  });
  const result = evaluateCashSourceCoverage(coverageInput({
    role: "OBSERVED_ENDING_BALANCE",
    accountUniverse: universe({
      accounts: [universeMember({
        sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK"
      })]
    }),
    sources: [pointEntry({
      sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK",
      balance: remainder,
      asOf: END.timestamp
    })]
  }));
  assert.equal(result.status, "MISSING");
  assert.notEqual(result.source_coverage[0].balance_basis, "OBSERVED_BALANCE");
});

test("current observed point cannot satisfy historical target", () => {
  const currentEnding = mappedObserved({
    role: "OBSERVED_ENDING",
    point: END
  });
  const result = evaluateCashSourceCoverage(coverageInput({
    role: "OBSERVED_ENDING_BALANCE",
    period: HISTORICAL_PERIOD,
    accountUniverse: universe({
      accounts: [universeMember({
        sourceClass: "PHYSICAL_STORE_TILL_COUNT",
        accountClass: "PHYSICAL_CASH",
        label: "CN1_TILL"
      })]
    }),
    sources: [pointEntry({
      balance: currentEnding,
      asOf: END.timestamp
    })]
  }));
  assert.equal(result.status, "MISSING");
});

test("empty required universe defaults to MISSING", () => {
  const result = evaluateCashSourceCoverage(coverageInput({
    accountUniverse: universe({
      accounts: [],
      empty: false
    }),
    sources: []
  }));
  assert.equal(result.status, "MISSING");
  assert.ok(result.diagnostics.includes("EMPTY_REQUIRED_UNIVERSE_NOT_PROVEN"));
});

test("explicit proven empty required universe can be COMPLETE", () => {
  const result = evaluateCashSourceCoverage(coverageInput({
    accountUniverse: universe({
      accounts: [],
      empty: true,
      lineage: ["EXPLICIT_EMPTY_REQUIRED_UNIVERSE_PROOF"]
    }),
    sources: []
  }));
  assert.equal(result.status, "COMPLETE");
});

test("identical stable source entries dedupe", () => {
  const entry = movementEntry();
  const result = evaluateCashSourceCoverage(coverageInput({
    sources: [entry, structuredClone(entry)]
  }));
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.source_coverage.length, 1);
});

test("conflicting duplicate coverage identity fails closed", () => {
  const full = movementEntry();
  const partial = movementEntry({
    status: "PARTIAL",
    intervals: [{
      start: "2026-09-01",
      end: "2026-09-16",
      timezone: PERIOD.timezone
    }]
  });
  const result = evaluateCashSourceCoverage(coverageInput({
    sources: [full, partial]
  }));
  assert.equal(result.status, "MISSING");
  assert.equal(result.source_coverage[0].status, "MISSING");
  assert.ok(result.diagnostics.includes("CONFLICTING_DUPLICATE_COVERAGE_IDENTITY"));
});

test("missing source status fails closed", () => {
  const entry = movementEntry();
  delete entry.status;
  const result = evaluateCashSourceCoverage(coverageInput({
    sources: [entry]
  }));
  assert.equal(result.status, "MISSING");
  assert.equal(result.source_coverage[0].status, "MISSING");
});

test("malformed target period and source scope fail closed", () => {
  const badPeriod = evaluateCashSourceCoverage(coverageInput({
    period: {
      start: "2026-09-20",
      end: "2026-09-01",
      timezone: PERIOD.timezone
    }
  }));
  assert.equal(badPeriod.status, "MISSING");

  const badScopeEntry = movementEntry({ scope: {} });
  const badScope = evaluateCashSourceCoverage(coverageInput({
    sources: [badScopeEntry]
  }));
  assert.equal(badScope.status, "MISSING");
});

test("privacy-unsafe source/account/lineage are rejected without leaking locator", () => {
  const unsafe = movementEntry({
    sourceClass: "https://drive.google.com/private",
    label: "1234567890123456",
    lineage: ["https://docs.google.com/private"]
  });
  const result = evaluateCashSourceCoverage(coverageInput({
    sources: [unsafe]
  }));
  assert.equal(result.status, "MISSING");
  assert.doesNotMatch(JSON.stringify(result), /drive\.google\.com|docs\.google\.com|1234567890123456/i);
});

test("coverage evaluator is deterministic and input-order independent", () => {
  const bankMember = universeMember({
    sourceClass: "BANK_CASH_MOVEMENTS",
    accountClass: "BANK",
    label: "BUSINESS_BANK_LOGICAL"
  });
  const bankEntry = movementEntry({
    sourceClass: "BANK_CASH_MOVEMENTS",
    accountClass: "BANK",
    label: "BUSINESS_BANK_LOGICAL"
  });
  const raw = coverageInput({
    accountUniverse: universe({
      accounts: [universeMember(), bankMember]
    }),
    sources: [movementEntry(), bankEntry]
  });
  const reversed = {
    ...raw,
    account_universe: {
      ...raw.account_universe,
      accounts: [...raw.account_universe.accounts].reverse()
    },
    source_coverage: [...raw.source_coverage].reverse()
  };
  assert.deepEqual(
    evaluateCashSourceCoverage(raw),
    evaluateCashSourceCoverage(reversed)
  );
});

test("coverage evaluator is idempotent", () => {
  const first = evaluateCashSourceCoverage(coverageInput());
  const second = evaluateCashSourceCoverage(first);
  assert.deepEqual(second, first);
});

test("coverage evaluation does not mutate mapped balance quality/value/classification", () => {
  const mapped = provenComputedOpening();
  const before = structuredClone(mapped);
  evaluateCashSourceCoverage(coverageInput({
    role: "OPENING_BALANCE",
    accountUniverse: universe({
      accounts: [universeMember({
        sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK"
      })]
    }),
    sources: [pointEntry({
      sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK",
      accountClass: "OTHER_EVIDENCED_CASH",
      label: "INTERNAL_CASH_POOL",
      balance: mapped
    })]
  }));
  assert.deepEqual(mapped, before);
  assert.equal(mapped.classification, "COMPUTED_BALANCE");
  assert.equal(mapped.balance.truth.quality, "ACTUAL");
  assert.equal(mapped.balance.truth.value, 100);
});

test("bridge adapter emits exact MOVEMENT_EVENTS coverage shape and preserves required/NOT_CONNECTED", () => {
  const bankMember = universeMember({
    sourceClass: "BANK_CASH_MOVEMENTS",
    accountClass: "BANK",
    label: "BUSINESS_BANK_LOGICAL"
  });
  const coverage = evaluateCashSourceCoverage(coverageInput({
    accountUniverse: universe({
      accounts: [universeMember(), bankMember]
    }),
    sources: [
      movementEntry(),
      movementEntry({
        sourceClass: "BANK_CASH_MOVEMENTS",
        accountClass: "BANK",
        label: "BUSINESS_BANK_LOGICAL",
        status: "NOT_CONNECTED",
        proven: false,
        intervals: [],
        lineage: ["BANK_MOVEMENT_SOURCE_NOT_CONNECTED"]
      })
    ]
  }));
  const bridgeCoverage = cashSourceCoverageForBridge(coverage);
  assert.deepEqual(Object.keys(bridgeCoverage).sort(), [
    "as_of",
    "lineage",
    "source_coverage",
    "status"
  ]);
  assert.equal(bridgeCoverage.status, "PARTIAL");
  assert.ok(bridgeCoverage.source_coverage.some(
    (entry) => entry.required && entry.status === "NOT_CONNECTED"
  ));
});

test("opening/ending coverage cannot be disguised as Cash Bridge event coverage", () => {
  const opening = evaluateCashSourceCoverage(coverageInput({
    role: "OPENING_BALANCE",
    accountUniverse: universe({
      accounts: [universeMember({
        sourceClass: "PHYSICAL_STORE_TILL_COUNT",
        accountClass: "PHYSICAL_CASH",
        label: "CN1_TILL"
      })]
    }),
    sources: [pointEntry()]
  }));
  assert.equal(cashSourceCoverageForBridge(opening), null);
});

test("current TASK-060/062 profile stays non-COMPLETE and Cash Bridge computed ending remains GAP", () => {
  const movementCoverage = evaluateCashSourceCoverage(coverageInput({
    accountUniverse: universe({ proven: false }),
    sources: [movementEntry({
      status: "PARTIAL",
      intervals: [{
        start: "2026-09-01",
        end: "2026-09-16",
        timezone: PERIOD.timezone
      }],
      asOf: "2026-09-16T23:59:59+07:00"
    })]
  }));
  assert.equal(movementCoverage.status, "PARTIAL");

  const openingMapped = currentComputedOpening();
  const openingCoverage = evaluateCashSourceCoverage(coverageInput({
    role: "OPENING_BALANCE",
    accountUniverse: universe({
      accounts: [universeMember({
        sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK"
      })]
    }),
    sources: [pointEntry({
      sourceClass: "INTERNAL_MONTHLY_CASH_WORKBOOK",
      accountClass: "OTHER_EVIDENCED_CASH",
      label: "INTERNAL_CASH_POOL",
      balance: openingMapped
    })]
  }));
  assert.notEqual(openingCoverage.status, "COMPLETE");

  const endingUnavailable = mapUnavailableCashBalanceSource({
    source_class: "PHYSICAL_STORE_TILL_COUNT",
    balance_role: "OBSERVED_ENDING",
    point: { ...END },
    account: account("PHYSICAL_CASH", "CN1_TILL"),
    scope: { ...CN1 },
    source: {
      class: "DIRECT_POINT_BALANCE",
      label: "TILL_SOURCE_NOT_CONNECTED"
    },
    as_of: END.timestamp,
    reconciliation_status: "NOT_APPLICABLE",
    lineage: ["PHYSICAL_TILL_NOT_CONNECTED"],
    connected: false
  });
  const endingCoverage = evaluateCashSourceCoverage(coverageInput({
    role: "OBSERVED_ENDING_BALANCE",
    accountUniverse: universe({
      accounts: [universeMember({
        sourceClass: "PHYSICAL_STORE_TILL_COUNT",
        accountClass: "PHYSICAL_CASH",
        label: "CN1_TILL"
      })]
    }),
    sources: [pointEntry({
      balance: endingUnavailable,
      status: "NOT_CONNECTED",
      proven: false,
      asOf: END.timestamp
    })]
  }));
  assert.notEqual(endingCoverage.status, "COMPLETE");

  const bridge = calculateCashBridge({
    targetPeriod: { ...PERIOD },
    scope: { ...CN1 },
    openingBalance: cashBalanceTruthForBridge(openingMapped.balance, "OPENING"),
    observedEndingBalance: null,
    events: [],
    coverage: cashSourceCoverageForBridge(movementCoverage)
  });
  assert.equal(bridge.computed_ending_balance.quality, "GAP");
  assert.equal(bridge.computed_ending_balance.value, null);
});

test("pure coverage helper has no write path or external API calls", async () => {
  const source = await fs.readFile(
    new URL("../../02_CORE/shared/cash-source-coverage-v1.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
    ".insert(",
    ".update(",
    ".delete(",
    ".upsert(",
    ".rpc(",
    ".from(",
    "fetch(",
    "googleapis",
    "Google_Drive",
    "supabase"
  ]) {
    assert.equal(source.includes(forbidden), false);
  }
});
