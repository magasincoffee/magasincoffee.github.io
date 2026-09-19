import {
  CASH_BALANCE_ACCOUNT_CLASSES,
  CASH_BALANCE_TRUTH_SCHEMA_VERSION,
  normalizeCashBalanceTruth
} from "./cash-balance-truth-v1.mjs";

export const CASH_SOURCE_COVERAGE_SCHEMA_VERSION = "cash-source-coverage.v1";

export const CASH_COVERAGE_ROLES = Object.freeze([
  "OPENING_BALANCE",
  "MOVEMENT_EVENTS",
  "OBSERVED_ENDING_BALANCE"
]);

export const CASH_COVERAGE_STATUSES = Object.freeze([
  "COMPLETE",
  "PARTIAL",
  "MISSING"
]);

export const CASH_SOURCE_COVERAGE_STATUSES = Object.freeze([
  "COMPLETE",
  "PARTIAL",
  "MISSING",
  "NOT_CONNECTED"
]);

const PRIVACY_TOKEN = /^[A-Z][A-Z0-9_]{1,79}$/;

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function enumValue(value, allowed) {
  const normalized = text(value)?.toUpperCase() || null;
  return allowed.includes(normalized) ? normalized : null;
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isIsoTimestampWithZone(value) {
  const normalized = text(value);
  if (!normalized || !/T/.test(normalized) || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)) {
    return false;
  }
  return Number.isFinite(Date.parse(normalized));
}

function nextIsoDate(value) {
  if (!isIsoDate(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function unsafeText(value) {
  const normalized = text(value);
  if (!normalized) return false;
  return (
    /https?:\/\//i.test(normalized) ||
    /\b(?:drive|docs)\.google\.com\b/i.test(normalized) ||
    /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password)\s*[:=]/i.test(normalized)
  );
}

function safeLineage(raw) {
  if (!Array.isArray(raw)) return { valid: true, values: [] };
  const values = [];
  for (const entry of raw) {
    const normalized = text(entry);
    if (!normalized || unsafeText(normalized)) {
      return { valid: false, values: [] };
    }
    values.push(normalized);
  }
  return {
    valid: true,
    values: [...new Set(values)].sort()
  };
}

function validLogicalToken(value) {
  const normalized = text(value)?.toUpperCase() || null;
  return normalized && PRIVACY_TOKEN.test(normalized) ? normalized : null;
}

function normalizeTargetPeriod(raw = {}) {
  const start = isIsoDate(raw?.start) ? raw.start : null;
  const end = isIsoDate(raw?.end) ? raw.end : null;
  const timezone = text(raw?.timezone);
  return {
    start,
    end,
    timezone,
    valid: Boolean(start && end && timezone && start <= end)
  };
}

function normalizeScope(raw = {}) {
  const aggregateProven = raw?.aggregate_proven === true || raw?.aggregateProven === true;
  const normalizeDimension = (value) => {
    const normalized = text(value);
    if (!normalized || unsafeText(normalized)) return null;
    if (normalized.toUpperCase() === "ALL") {
      return aggregateProven ? "ALL" : null;
    }
    return normalized;
  };

  const branch = normalizeDimension(raw?.branch ?? raw?.branchScope);
  const channel = normalizeDimension(raw?.channel ?? raw?.channelScope);

  return {
    branch,
    channel,
    aggregate_proven: aggregateProven,
    valid: Boolean(branch && channel)
  };
}

function sameScope(left = {}, right = {}) {
  return (
    left?.branch === right?.branch &&
    left?.channel === right?.channel &&
    left?.aggregate_proven === right?.aggregate_proven
  );
}

function normalizeAccount(raw = {}) {
  const accountClass = enumValue(
    raw?.class ?? raw?.account_class ?? raw?.accountClass,
    CASH_BALANCE_ACCOUNT_CLASSES
  );
  const label = text(raw?.label ?? raw?.account_label ?? raw?.accountLabel);
  const aggregateProven = raw?.aggregate_proven === true || raw?.aggregateProven === true;
  const unsafeLabel = Boolean(
    !label ||
    unsafeText(label) ||
    /\b\d{8,}\b/.test(label)
  );
  const all = label?.toUpperCase() === "ALL";

  return {
    class: accountClass,
    label: unsafeLabel ? null : label,
    aggregate_proven: aggregateProven,
    valid: Boolean(accountClass && !unsafeLabel && (!all || aggregateProven))
  };
}

function coverageIdentity({ sourceClass, account, scope }) {
  if (!sourceClass || !account?.valid || !scope?.valid) return null;
  return [
    sourceClass,
    account.class,
    account.label,
    scope.branch,
    scope.channel
  ].join("|");
}

function normalizeUniverseMember(raw = {}) {
  const sourceClass = validLogicalToken(raw.source_class ?? raw.sourceClass);
  const account = normalizeAccount(raw.account ?? {});
  const scope = normalizeScope(raw.scope ?? {});
  const required = raw.required !== false;
  const coverageId = coverageIdentity({ sourceClass, account, scope });

  return {
    coverage_id: coverageId,
    source_class: sourceClass,
    account: {
      class: account.class,
      label: account.label,
      aggregate_proven: account.aggregate_proven
    },
    scope: {
      branch: scope.branch,
      channel: scope.channel,
      aggregate_proven: scope.aggregate_proven
    },
    required,
    valid: Boolean(coverageId && account.valid && scope.valid)
  };
}

function normalizeAccountUniverse(raw = {}) {
  const universeProven = raw?.universe_proven === true || raw?.universeProven === true;
  const aggregateProven = raw?.aggregate_proven === true || raw?.aggregateProven === true;
  const emptyUniverseProven = raw?.empty_universe_proven === true || raw?.emptyUniverseProven === true;
  const lineage = safeLineage(raw?.lineage);

  const accountsRaw = Array.isArray(raw?.accounts) ? raw.accounts : [];
  const accounts = [];
  const diagnostics = [];

  for (const candidate of accountsRaw) {
    const member = normalizeUniverseMember(candidate);
    if (!member.valid) {
      diagnostics.push("INVALID_ACCOUNT_UNIVERSE_MEMBER");
      continue;
    }
    accounts.push(member);
  }

  accounts.sort((a, b) => a.coverage_id.localeCompare(b.coverage_id));

  const deduped = [];
  let previous = null;
  for (const member of accounts) {
    if (previous && previous.coverage_id === member.coverage_id) {
      if (JSON.stringify(previous) !== JSON.stringify(member)) {
        diagnostics.push("CONFLICTING_ACCOUNT_UNIVERSE_MEMBER");
      }
      continue;
    }
    deduped.push(member);
    previous = member;
  }

  if (!lineage.valid) diagnostics.push("PRIVACY_UNSAFE_UNIVERSE_LINEAGE");
  if (universeProven && !lineage.values.length) {
    diagnostics.push("UNIVERSE_PROOF_REQUIRES_LINEAGE");
  }
  if (emptyUniverseProven && (!universeProven || deduped.length > 0 || !lineage.values.length)) {
    diagnostics.push("INVALID_EMPTY_UNIVERSE_PROOF");
  }

  return {
    universe_proven: Boolean(
      universeProven &&
      lineage.valid &&
      lineage.values.length > 0 &&
      !diagnostics.includes("CONFLICTING_ACCOUNT_UNIVERSE_MEMBER")
    ),
    aggregate_proven: aggregateProven,
    empty_universe_proven: Boolean(
      emptyUniverseProven &&
      universeProven &&
      deduped.length === 0 &&
      lineage.valid &&
      lineage.values.length > 0
    ),
    accounts: deduped,
    lineage: lineage.values,
    diagnostics: [...new Set(diagnostics)].sort()
  };
}

function normalizeInterval(raw = {}, targetPeriod) {
  const start = isIsoDate(raw?.start) ? raw.start : null;
  const end = isIsoDate(raw?.end) ? raw.end : null;
  const timezone = text(raw?.timezone);

  if (!start || !end || start > end || !timezone || timezone !== targetPeriod.timezone) {
    return null;
  }

  if (end < targetPeriod.start || start > targetPeriod.end) {
    return null;
  }

  return {
    start: start < targetPeriod.start ? targetPeriod.start : start,
    end: end > targetPeriod.end ? targetPeriod.end : end,
    timezone
  };
}

function mergeIntervals(intervals = []) {
  const sorted = [...intervals].sort(
    (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end)
  );
  const merged = [];

  for (const interval of sorted) {
    const last = merged.at(-1);
    if (!last) {
      merged.push({ ...interval });
      continue;
    }

    if (interval.start <= nextIsoDate(last.end)) {
      if (interval.end > last.end) last.end = interval.end;
      continue;
    }

    merged.push({ ...interval });
  }

  return merged;
}

function movementProofStatus(entry, targetPeriod) {
  if (entry.declared_status === "NOT_CONNECTED") {
    return {
      status: "NOT_CONNECTED",
      intervals: [],
      diagnostics: []
    };
  }

  if (!entry.declared_status) {
    return {
      status: "MISSING",
      intervals: [],
      diagnostics: ["MISSING_SOURCE_COVERAGE_STATUS"]
    };
  }

  if (!entry.coverage_proven) {
    return {
      status: "MISSING",
      intervals: [],
      diagnostics: ["MOVEMENT_COVERAGE_NOT_PROVEN"]
    };
  }

  const intervals = mergeIntervals(
    (entry.raw_intervals || [])
      .map((interval) => normalizeInterval(interval, targetPeriod))
      .filter(Boolean)
  );

  if (!intervals.length) {
    return {
      status: "MISSING",
      intervals: [],
      diagnostics: ["NO_TARGET_INTERVAL_COVERAGE"]
    };
  }

  const fullyCovered = (
    intervals.length === 1 &&
    intervals[0].start === targetPeriod.start &&
    intervals[0].end === targetPeriod.end
  );

  const proofStatus = fullyCovered ? "COMPLETE" : "PARTIAL";
  const declaredRank = { MISSING: 0, PARTIAL: 1, COMPLETE: 2 };
  const proofRank = declaredRank[proofStatus];
  const declaredValue = declaredRank[entry.declared_status];

  const status = declaredValue < proofRank
    ? entry.declared_status
    : proofStatus;

  const diagnostics = [];
  if (entry.declared_status === "COMPLETE" && proofStatus !== "COMPLETE") {
    diagnostics.push("DECLARED_COMPLETE_NOT_PROVEN_BY_INTERVALS");
  }
  if (intervals.length > 1) diagnostics.push("MOVEMENT_INTERVAL_GAP_PRESENT");

  return {
    status,
    intervals,
    diagnostics
  };
}

function normalizeMappedBalance(raw, targetPeriod, targetScope, coverageRole) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const balance = raw.mapper_version && raw.balance
    ? raw.balance
    : raw.balance ?? raw;

  if (
    !balance ||
    balance.schema_version !== CASH_BALANCE_TRUTH_SCHEMA_VERSION
  ) {
    return null;
  }

  const targetDate = coverageRole === "OPENING_BALANCE"
    ? targetPeriod.start
    : targetPeriod.end;

  return normalizeCashBalanceTruth(balance, {
    targetPoint: {
      date: targetDate,
      timezone: targetPeriod.timezone
    },
    targetScope
  });
}

function pointProofStatus(entry, {
  targetPeriod,
  targetScope,
  coverageRole
}) {
  if (entry.declared_status === "NOT_CONNECTED") {
    return {
      status: "NOT_CONNECTED",
      point: null,
      balance: entry.balance ?? null,
      diagnostics: []
    };
  }

  if (!entry.declared_status) {
    return {
      status: "MISSING",
      point: null,
      balance: entry.balance ?? null,
      diagnostics: ["MISSING_SOURCE_COVERAGE_STATUS"]
    };
  }

  if (!entry.coverage_proven) {
    return {
      status: "MISSING",
      point: null,
      balance: entry.balance ?? null,
      diagnostics: ["POINT_COVERAGE_NOT_PROVEN"]
    };
  }

  const normalizedBalance = normalizeMappedBalance(
    entry.balance,
    targetPeriod,
    targetScope,
    coverageRole
  );

  if (!normalizedBalance) {
    return {
      status: "MISSING",
      point: null,
      balance: null,
      diagnostics: ["MISSING_CANONICAL_BALANCE"]
    };
  }

  const truth = normalizedBalance.truth;
  const numeric = (
    (truth?.quality === "ACTUAL" || truth?.quality === "ESTIMATE") &&
    typeof truth?.value === "number" &&
    Number.isFinite(truth.value)
  );

  if (!numeric) {
    return {
      status: "MISSING",
      point: normalizedBalance.point ?? null,
      balance: normalizedBalance,
      diagnostics: ["BALANCE_POINT_TRUTH_INCOMPLETE"]
    };
  }

  if (coverageRole === "OPENING_BALANCE") {
    if (
      normalizedBalance.balance_role !== "OPENING" ||
      !["OBSERVED_BALANCE", "COMPUTED_BALANCE"].includes(normalizedBalance.balance_basis)
    ) {
      return {
        status: "MISSING",
        point: normalizedBalance.point ?? null,
        balance: normalizedBalance,
        diagnostics: ["INVALID_OPENING_BALANCE_COVERAGE"]
      };
    }
  }

  if (coverageRole === "OBSERVED_ENDING_BALANCE") {
    if (
      normalizedBalance.balance_role !== "OBSERVED_ENDING" ||
      normalizedBalance.balance_basis !== "OBSERVED_BALANCE"
    ) {
      return {
        status: "MISSING",
        point: normalizedBalance.point ?? null,
        balance: normalizedBalance,
        diagnostics: ["OBSERVED_ENDING_REQUIRES_OBSERVED_BALANCE"]
      };
    }
  }

  const declaredRank = { MISSING: 0, PARTIAL: 1, COMPLETE: 2 };
  const status = declaredRank[entry.declared_status] < declaredRank.COMPLETE
    ? entry.declared_status
    : "COMPLETE";

  return {
    status,
    point: normalizedBalance.point,
    balance: normalizedBalance,
    diagnostics: []
  };
}

function rawEntryFingerprint(entry) {
  return JSON.stringify({
    source_class: entry.source_class,
    account: entry.account,
    scope: entry.scope,
    required: entry.required,
    declared_status: entry.declared_status,
    coverage_proven: entry.coverage_proven,
    as_of: entry.as_of,
    lineage: entry.lineage,
    raw_intervals: entry.raw_intervals,
    balance: entry.balance
  });
}

function normalizeSourceEntry(raw = {}, {
  targetPeriod,
  targetScope,
  coverageRole
}) {
  const sourceClass = validLogicalToken(raw.source_class ?? raw.sourceClass);
  const account = normalizeAccount(raw.account ?? {});
  const scope = normalizeScope(raw.scope ?? {});
  const coverageId = coverageIdentity({ sourceClass, account, scope });
  const required = raw.required !== false;
  const declaredStatus = enumValue(
    raw.status,
    CASH_SOURCE_COVERAGE_STATUSES
  );
  const coverageProven = raw.coverage_proven === true || raw.coverageProven === true;
  const asOfRaw = raw.as_of ?? raw.asOf;
  const asOf = isIsoTimestampWithZone(asOfRaw) ? asOfRaw : null;
  const lineage = safeLineage(raw.lineage);
  const diagnostics = [];

  if (!sourceClass) diagnostics.push("INVALID_OR_PRIVACY_UNSAFE_SOURCE_CLASS");
  if (!account.valid) diagnostics.push("INVALID_OR_PRIVACY_UNSAFE_COVERAGE_ACCOUNT");
  if (!scope.valid) diagnostics.push("INVALID_COVERAGE_SCOPE");
  if (!coverageId) diagnostics.push("INVALID_COVERAGE_IDENTITY");
  if (!declaredStatus) diagnostics.push("MISSING_SOURCE_COVERAGE_STATUS");
  if (!asOf) diagnostics.push("INVALID_COVERAGE_AS_OF");
  if (!lineage.valid || !lineage.values.length) diagnostics.push("INVALID_OR_PRIVACY_UNSAFE_COVERAGE_LINEAGE");

  const base = {
    coverage_id: coverageId,
    source_class: sourceClass,
    account: {
      class: account.class,
      label: account.label,
      aggregate_proven: account.aggregate_proven
    },
    scope: {
      branch: scope.branch,
      channel: scope.channel,
      aggregate_proven: scope.aggregate_proven
    },
    required,
    declared_status: declaredStatus,
    coverage_proven: coverageProven,
    as_of: asOf,
    lineage: lineage.values,
    raw_intervals: Array.isArray(raw.covered_intervals ?? raw.coveredIntervals)
      ? (raw.covered_intervals ?? raw.coveredIntervals)
      : [],
    balance: raw.balance ?? null,
    coverage_hint: enumValue(raw.coverage_hint ?? raw.coverageHint, CASH_SOURCE_COVERAGE_STATUSES),
    diagnostics
  };

  if (diagnostics.length) {
    return {
      ...base,
      status: declaredStatus === "NOT_CONNECTED" ? "NOT_CONNECTED" : "MISSING",
      covered_intervals: [],
      covered_point: null,
      balance: base.balance,
      diagnostics: [...new Set(diagnostics)].sort(),
      valid_identity: Boolean(coverageId)
    };
  }

  const evaluated = coverageRole === "MOVEMENT_EVENTS"
    ? movementProofStatus(base, targetPeriod)
    : pointProofStatus(base, {
        targetPeriod,
        targetScope,
        coverageRole
      });

  return {
    ...base,
    status: evaluated.status,
    covered_intervals: evaluated.intervals ?? [],
    covered_point: evaluated.point ?? null,
    balance: evaluated.balance ?? base.balance,
    diagnostics: [...new Set([
      ...diagnostics,
      ...(evaluated.diagnostics || []),
      ...(base.coverage_hint === "COMPLETE" && evaluated.status !== "COMPLETE"
        ? ["COVERAGE_HINT_CANNOT_PROVE_COMPLETE"]
        : [])
    ])].sort(),
    valid_identity: Boolean(coverageId)
  };
}

function dedupeSourceEntries(entries) {
  const sorted = [...entries].sort((a, b) => {
    const left = a.coverage_id ?? "~";
    const right = b.coverage_id ?? "~";
    return left.localeCompare(right) || rawEntryFingerprint(a).localeCompare(rawEntryFingerprint(b));
  });

  const result = [];
  const diagnostics = [];
  let index = 0;

  while (index < sorted.length) {
    const first = sorted[index];
    const same = [first];
    let cursor = index + 1;
    while (
      cursor < sorted.length &&
      sorted[cursor].coverage_id &&
      sorted[cursor].coverage_id === first.coverage_id
    ) {
      same.push(sorted[cursor]);
      cursor += 1;
    }

    if (!first.coverage_id) {
      diagnostics.push(...first.diagnostics);
      index += 1;
      continue;
    }

    const fingerprints = [...new Set(same.map(rawEntryFingerprint))];
    if (fingerprints.length === 1) {
      result.push(first);
    } else {
      result.push({
        ...first,
        status: "MISSING",
        coverage_proven: false,
        covered_intervals: [],
        covered_point: null,
        diagnostics: [...new Set([
          ...same.flatMap((entry) => entry.diagnostics || []),
          "CONFLICTING_DUPLICATE_COVERAGE_IDENTITY"
        ])].sort()
      });
      diagnostics.push("CONFLICTING_DUPLICATE_COVERAGE_IDENTITY");
    }

    index = cursor;
  }

  return {
    entries: result.sort((a, b) => a.coverage_id.localeCompare(b.coverage_id)),
    diagnostics: [...new Set(diagnostics)].sort()
  };
}

function sourceEntryPublic(entry) {
  return {
    coverage_id: entry.coverage_id,
    source_class: entry.source_class,
    account: entry.account,
    scope: entry.scope,
    required: entry.required,
    status: entry.status,
    coverage_proven: entry.coverage_proven,
    covered_intervals: entry.covered_intervals,
    covered_point: entry.covered_point,
    balance_basis: entry.balance?.balance_basis ?? null,
    balance_quality: entry.balance?.truth?.quality ?? null,
    as_of: entry.as_of,
    lineage: entry.lineage,
    diagnostics: entry.diagnostics
  };
}

function isTargetAggregate(scope) {
  return scope.branch === "ALL" || scope.channel === "ALL";
}

function aggregateUniverseGuard({
  targetScope,
  universe,
  sourceEntries
}) {
  const diagnostics = [];

  if (!universe.universe_proven) {
    diagnostics.push("REQUIRED_SOURCE_UNIVERSE_NOT_PROVEN");
    return { completeEligible: false, diagnostics };
  }

  if (isTargetAggregate(targetScope) && !universe.aggregate_proven) {
    diagnostics.push("AGGREGATE_ACCOUNT_UNIVERSE_NOT_PROVEN");
    return { completeEligible: false, diagnostics };
  }

  const requiredMembers = universe.accounts.filter((member) => member.required);

  if (requiredMembers.length === 0) {
    if (!universe.empty_universe_proven) {
      diagnostics.push("EMPTY_REQUIRED_UNIVERSE_NOT_PROVEN");
      return { completeEligible: false, diagnostics };
    }
    return { completeEligible: true, diagnostics };
  }

  if (isTargetAggregate(targetScope)) {
    const explicitAggregateMember = requiredMembers.some((member) => (
      (member.scope.branch === "ALL" || member.scope.channel === "ALL") &&
      member.scope.aggregate_proven &&
      member.account.label === "ALL" &&
      member.account.aggregate_proven
    ));
    const distinctConcreteMembers = new Set(
      requiredMembers.map((member) => [
        member.account.class,
        member.account.label,
        member.scope.branch,
        member.scope.channel
      ].join("|"))
    );

    if (!explicitAggregateMember && distinctConcreteMembers.size < 2) {
      diagnostics.push("ONE_ACCOUNT_CANNOT_PROVE_ENTERPRISE_ALL");
      return { completeEligible: false, diagnostics };
    }
  }

  const entryById = new Map(sourceEntries.map((entry) => [entry.coverage_id, entry]));
  for (const member of requiredMembers) {
    const entry = entryById.get(member.coverage_id);
    if (!entry) {
      diagnostics.push("REQUIRED_UNIVERSE_MEMBER_MISSING");
      continue;
    }
    if (!entry.required) {
      diagnostics.push("REQUIRED_UNIVERSE_MEMBER_MARKED_OPTIONAL");
    }
  }

  const memberIds = new Set(requiredMembers.map((member) => member.coverage_id));
  for (const entry of sourceEntries) {
    if (entry.required && !memberIds.has(entry.coverage_id)) {
      diagnostics.push("REQUIRED_SOURCE_OUTSIDE_PROVEN_UNIVERSE");
    }
  }

  return {
    completeEligible: diagnostics.length === 0,
    diagnostics: [...new Set(diagnostics)].sort()
  };
}

function deriveAggregateStatus({
  universe,
  sourceEntries,
  targetScope
}) {
  const diagnostics = [];
  const requiredNotConnected = sourceEntries.some(
    (entry) => entry.required && entry.status === "NOT_CONNECTED"
  );
  if (requiredNotConnected) diagnostics.push("REQUIRED_SOURCE_NOT_CONNECTED");

  const requiredEntries = sourceEntries.filter((entry) => entry.required);
  const usefulRequired = requiredEntries.filter(
    (entry) => entry.status === "COMPLETE" || entry.status === "PARTIAL"
  );
  const usefulAny = sourceEntries.some(
    (entry) => entry.status === "COMPLETE" || entry.status === "PARTIAL"
  );

  const universeGuard = aggregateUniverseGuard({
    targetScope,
    universe,
    sourceEntries
  });
  diagnostics.push(...universeGuard.diagnostics);

  if (
    universe.empty_universe_proven &&
    universe.universe_proven &&
    universe.accounts.filter((member) => member.required).length === 0 &&
    universeGuard.completeEligible
  ) {
    return {
      status: "COMPLETE",
      required_not_connected: false,
      diagnostics: [...new Set(diagnostics)].sort()
    };
  }

  const requiredMembers = universe.accounts.filter((member) => member.required);
  const entryById = new Map(sourceEntries.map((entry) => [entry.coverage_id, entry]));
  const allMembersComplete = (
    requiredMembers.length > 0 &&
    requiredMembers.every((member) => {
      const entry = entryById.get(member.coverage_id);
      return entry?.required && entry.status === "COMPLETE";
    })
  );

  if (
    universeGuard.completeEligible &&
    allMembersComplete &&
    !requiredNotConnected
  ) {
    return {
      status: "COMPLETE",
      required_not_connected: false,
      diagnostics: [...new Set(diagnostics)].sort()
    };
  }

  if (usefulRequired.length > 0 || usefulAny) {
    return {
      status: "PARTIAL",
      required_not_connected: requiredNotConnected,
      diagnostics: [...new Set(diagnostics)].sort()
    };
  }

  return {
    status: "MISSING",
    required_not_connected: requiredNotConnected,
    diagnostics: [...new Set(diagnostics)].sort()
  };
}

function maxAsOf(values) {
  let selected = null;
  let selectedTime = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!isIsoTimestampWithZone(value)) continue;
    const timestamp = Date.parse(value);
    if (timestamp > selectedTime) {
      selected = value;
      selectedTime = timestamp;
    }
  }
  return selected;
}

function canonicalizeInput(raw = {}) {
  if (
    raw?.schema_version === CASH_SOURCE_COVERAGE_SCHEMA_VERSION &&
    raw?.coverage_role &&
    raw?.target_period &&
    raw?.account_universe &&
    Array.isArray(raw?.source_coverage)
  ) {
    return {
      coverage_role: raw.coverage_role,
      target_period: raw.target_period,
      scope: raw.scope,
      account_universe: raw.account_universe,
      source_coverage: raw.source_coverage.map((entry) => ({
        source_class: entry.source_class,
        account: entry.account,
        scope: entry.scope,
        required: entry.required,
        status: entry.status,
        coverage_proven: entry.coverage_proven,
        covered_intervals: entry.covered_intervals,
        balance: entry.balance ?? (
          entry.balance_basis || entry.balance_quality
            ? null
            : undefined
        ),
        as_of: entry.as_of,
        lineage: entry.lineage
      })),
      as_of: raw.as_of,
      lineage: raw.lineage
    };
  }
  return raw;
}

export function evaluateCashSourceCoverage(raw = {}) {
  const input = canonicalizeInput(raw);
  const coverageRole = enumValue(input.coverage_role ?? input.coverageRole, CASH_COVERAGE_ROLES);
  const targetPeriod = normalizeTargetPeriod(input.target_period ?? input.targetPeriod ?? {});
  const targetScope = normalizeScope(input.scope ?? {});
  const universe = normalizeAccountUniverse(input.account_universe ?? input.accountUniverse ?? {});
  const topLineage = safeLineage(input.lineage);
  const diagnostics = [];

  if (!coverageRole) diagnostics.push("INVALID_COVERAGE_ROLE");
  if (!targetPeriod.valid) diagnostics.push("INVALID_TARGET_PERIOD");
  if (!targetScope.valid) diagnostics.push("INVALID_TARGET_SCOPE");
  if (!topLineage.valid) diagnostics.push("PRIVACY_UNSAFE_COVERAGE_LINEAGE");
  diagnostics.push(...universe.diagnostics);

  const sourceRaw = Array.isArray(input.source_coverage ?? input.sourceCoverage)
    ? (input.source_coverage ?? input.sourceCoverage)
    : [];

  let sourceEntries = [];
  if (coverageRole && targetPeriod.valid && targetScope.valid) {
    sourceEntries = sourceRaw.map((entry) => normalizeSourceEntry(entry, {
      targetPeriod,
      targetScope,
      coverageRole
    }));
  }

  const deduped = dedupeSourceEntries(sourceEntries);
  diagnostics.push(...deduped.diagnostics);
  sourceEntries = deduped.entries;

  const aggregate = (
    coverageRole &&
    targetPeriod.valid &&
    targetScope.valid &&
    topLineage.valid
  )
    ? deriveAggregateStatus({
        universe,
        sourceEntries,
        targetScope
      })
    : {
        status: "MISSING",
        required_not_connected: sourceEntries.some(
          (entry) => entry.required && entry.status === "NOT_CONNECTED"
        ),
        diagnostics: ["INVALID_COVERAGE_INPUT"]
      };

  diagnostics.push(...aggregate.diagnostics);
  diagnostics.push(...sourceEntries.flatMap((entry) => entry.diagnostics || []));

  const asOf = maxAsOf([
    input.as_of ?? input.asOf,
    ...sourceEntries.map((entry) => entry.as_of)
  ]);

  const lineage = [...new Set([
    ...(topLineage.valid ? topLineage.values : []),
    ...universe.lineage,
    ...sourceEntries.flatMap((entry) => entry.lineage || [])
  ])].sort();

  return {
    schema_version: CASH_SOURCE_COVERAGE_SCHEMA_VERSION,
    coverage_role: coverageRole,
    target_period: {
      start: targetPeriod.start,
      end: targetPeriod.end,
      timezone: targetPeriod.timezone
    },
    scope: {
      branch: targetScope.branch,
      channel: targetScope.channel,
      aggregate_proven: targetScope.aggregate_proven
    },
    account_universe: {
      universe_proven: universe.universe_proven,
      aggregate_proven: universe.aggregate_proven,
      empty_universe_proven: universe.empty_universe_proven,
      accounts: universe.accounts.map((member) => ({
        coverage_id: member.coverage_id,
        source_class: member.source_class,
        account: member.account,
        scope: member.scope,
        required: member.required
      })),
      lineage: universe.lineage
    },
    source_coverage: sourceEntries.map(sourceEntryPublic),
    status: enumValue(aggregate.status, CASH_COVERAGE_STATUSES) ?? "MISSING",
    required_not_connected: aggregate.required_not_connected === true,
    universe_proven: universe.universe_proven,
    as_of: asOf,
    lineage,
    diagnostics: [...new Set(diagnostics.filter(Boolean))].sort()
  };
}

export function cashSourceCoverageForBridge(coverage) {
  if (
    !coverage ||
    coverage.schema_version !== CASH_SOURCE_COVERAGE_SCHEMA_VERSION ||
    coverage.coverage_role !== "MOVEMENT_EVENTS"
  ) {
    return null;
  }

  return {
    status: enumValue(coverage.status, CASH_COVERAGE_STATUSES) ?? "MISSING",
    source_coverage: Array.isArray(coverage.source_coverage)
      ? coverage.source_coverage.map((entry) => ({
          source: entry.coverage_id,
          status: enumValue(entry.status, CASH_SOURCE_COVERAGE_STATUSES) ?? "MISSING",
          required: entry.required !== false,
          as_of: isIsoTimestampWithZone(entry.as_of) ? entry.as_of : null,
          lineage: safeLineage(entry.lineage).values
        }))
      : [],
    as_of: isIsoTimestampWithZone(coverage.as_of) ? coverage.as_of : null,
    lineage: safeLineage(coverage.lineage).values
  };
}
