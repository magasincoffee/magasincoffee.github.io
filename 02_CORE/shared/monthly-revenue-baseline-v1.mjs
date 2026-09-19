import { normalizeFinancialTruth } from "./financial-truth-v1.mjs";

export const MONTHLY_REVENUE_BASELINE_SCHEMA_VERSION = "monthly-revenue-baseline.v1";

const OUTPUT_SOURCE = Object.freeze({
  class: "DERIVED_AGGREGATION",
  label: "MONTHLY_REVENUE_BASELINE_V1"
});

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeText(value) {
  const normalized = text(value);
  if (!normalized) return null;
  if (/https?:\/\//i.test(normalized)) return null;
  if (/\b(?:drive|docs)\.google\.com\b/i.test(normalized)) return null;
  return normalized;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function enumerateDates(start, end) {
  const result = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    result.push(cursor);
  }
  return result;
}

function normalizeTargetPeriod(raw = {}) {
  const start = isIsoDate(raw.start) ? raw.start : null;
  const end = isIsoDate(raw.end) ? raw.end : null;
  const timezone = text(raw.timezone);
  return {
    start,
    end,
    timezone,
    valid: Boolean(start && end && timezone && start <= end)
  };
}

function normalizeTargetScope(raw = {}) {
  const aggregateProven = raw.aggregate_proven === true || raw.aggregateProven === true;
  const normalizeDimension = (value) => {
    const normalized = text(value);
    if (!normalized) return null;
    if (normalized.toUpperCase() === "ALL") return aggregateProven ? "ALL" : null;
    return normalized;
  };
  const branch = normalizeDimension(raw.branch ?? raw.branchScope);
  const channel = normalizeDimension(raw.channel ?? raw.channelScope);
  return {
    branch,
    channel,
    aggregate_proven: aggregateProven,
    valid: Boolean(branch && channel)
  };
}

function normalizeCoverage(raw = {}) {
  const mode = text(raw.mode)?.toUpperCase() || null;
  const expectedDates = Array.isArray(raw.expected_dates ?? raw.expectedDates)
    ? uniqueSorted((raw.expected_dates ?? raw.expectedDates).filter(isIsoDate))
    : [];
  return { mode, expected_dates: expectedDates };
}

function stableFactId(raw) {
  const candidate = raw?.fact_id ?? raw?.factId ?? raw?.identity;
  return safeText(candidate);
}

function candidateToFinancialTruth(raw) {
  const reportingDate = text(raw?.reportingDate);
  const reconciliationStatus = text(raw?.reconciliationStatus)?.toUpperCase() || "UNKNOWN";
  const trusted = raw?.trusted === true;
  const metric = text(raw?.metric) || "reconciled_revenue";
  const sourceClass = safeText(raw?.sourceClass ?? raw?.source_class);
  const sourceLabel = safeText(raw?.source);
  const timezone = text(raw?.timezone);

  return normalizeFinancialTruth(
    {
      period: {
        start: reportingDate,
        end: reportingDate,
        timezone
      },
      scope: raw?.scope,
      group: "REVENUE",
      metric,
      value: raw?.amount,
      quality: trusted && reconciliationStatus === "RECONCILED" ? "ACTUAL" : "GAP",
      source: { class: sourceClass, label: sourceLabel },
      as_of: raw?.asOf,
      reconciliation_status: reconciliationStatus,
      evidence: raw?.evidence,
      lineage: raw?.lineage,
      message: raw?.message,
      reason: trusted ? null : "UNTRUSTED_REVENUE_SOURCE"
    },
    {
      allowNegative: false,
      requiredReconciliationStatuses: ["RECONCILED"]
    }
  );
}

function normalizeRevenueFact(raw) {
  const isCandidate = !raw?.quality && Object.hasOwn(raw || {}, "amount");
  const truth = isCandidate
    ? candidateToFinancialTruth(raw)
    : normalizeFinancialTruth(
        {
          ...raw,
          group: raw?.group ?? "REVENUE"
        },
        {
          allowNegative: false,
          requiredReconciliationStatuses: ["RECONCILED"]
        }
      );

  return {
    truth,
    fact_id: stableFactId(raw),
    candidate: isCandidate,
    trusted: isCandidate ? raw?.trusted === true : true
  };
}

function truthFingerprint(truth) {
  return JSON.stringify({
    period: truth.period,
    scope: truth.scope,
    group: truth.group,
    metric: truth.metric,
    value: truth.value,
    quality: truth.quality,
    source: truth.source,
    as_of: truth.as_of,
    reconciliation_status: truth.reconciliation_status,
    evidence: truth.evidence,
    lineage: truth.lineage
  });
}

function maxAsOf(records) {
  let selected = null;
  let selectedTime = Number.NEGATIVE_INFINITY;
  for (const record of records) {
    const time = Date.parse(record.truth.as_of);
    if (Number.isFinite(time) && time > selectedTime) {
      selected = record.truth.as_of;
      selectedTime = time;
    }
  }
  return selected;
}

function outputLineage(records) {
  return uniqueSorted([
    ...records.flatMap((record) => record.truth.lineage || []),
    "MONTHLY_REVENUE_BASELINE_V1"
  ]);
}

function outputEvidence(records) {
  return uniqueSorted([
    ...records.flatMap((record) => record.truth.evidence || []),
    "REVENUE_RECONCILED_ONLY",
    "COVERAGE_COMPLETE"
  ]);
}

function makeCoverage({ status, mode, targetPeriod, expected = [], covered = [], missing = [], reason }) {
  return {
    status,
    mode: mode || null,
    target_start: targetPeriod.start || null,
    target_end: targetPeriod.end || null,
    expected_count: expected.length,
    covered_count: covered.length,
    expected_units: expected,
    covered_units: covered,
    missing_units: missing,
    reason: reason || null
  };
}

function failResult({
  quality = "GAP",
  reason,
  message,
  targetPeriod,
  targetScope,
  coverage,
  diagnostics = [],
  metric = "reconciled_revenue"
}) {
  const truth = normalizeFinancialTruth({
    period: {
      start: targetPeriod.start,
      end: targetPeriod.end,
      timezone: targetPeriod.timezone
    },
    scope: {
      branch: targetScope.branch,
      channel: targetScope.channel,
      aggregate_proven: targetScope.aggregate_proven
    },
    group: "REVENUE",
    metric,
    value: null,
    quality,
    source: OUTPUT_SOURCE,
    as_of: null,
    reconciliation_status: "UNKNOWN",
    evidence: [],
    lineage: ["MONTHLY_REVENUE_BASELINE_V1"],
    message,
    reason
  });

  return {
    ...truth,
    baseline_schema_version: MONTHLY_REVENUE_BASELINE_SCHEMA_VERSION,
    coverage,
    diagnostics: uniqueSorted(diagnostics)
  };
}

function validateDailyCoverage(targetPeriod, coverage, records) {
  const expectedTarget = enumerateDates(targetPeriod.start, targetPeriod.end);
  const expected = coverage.expected_dates;

  if (expected.length === 0 || JSON.stringify(expected) !== JSON.stringify(expectedTarget)) {
    return {
      ok: false,
      coverage: makeCoverage({
        status: "MISSING",
        mode: "DAILY",
        targetPeriod,
        expected,
        covered: [],
        missing: expectedTarget.filter((date) => !expected.includes(date)),
        reason: "EXPECTED_COVERAGE_NOT_EXPLICIT_FOR_FULL_TARGET"
      }),
      diagnostics: ["EXPECTED_COVERAGE_NOT_EXPLICIT_FOR_FULL_TARGET"]
    };
  }

  const dailyUnits = records.map((record) => {
    const period = record.truth.period;
    return period.start === period.end ? period.start : null;
  });
  const covered = uniqueSorted(dailyUnits);
  if (dailyUnits.some((date) => !date)) {
    return {
      ok: false,
      coverage: makeCoverage({
        status: "PARTIAL",
        mode: "DAILY",
        targetPeriod,
        expected,
        covered,
        missing: expected.filter((date) => !covered.includes(date)),
        reason: "NON_DAILY_FACT_IN_DAILY_COVERAGE"
      }),
      diagnostics: ["NON_DAILY_FACT_IN_DAILY_COVERAGE"]
    };
  }
  if (covered.length !== records.length) {
    return {
      ok: false,
      coverage: makeCoverage({
        status: "PARTIAL",
        mode: "DAILY",
        targetPeriod,
        expected,
        covered,
        missing: expected.filter((date) => !covered.includes(date)),
        reason: "DUPLICATE_OR_OVERLAPPING_DAILY_FACTS"
      }),
      diagnostics: ["DUPLICATE_OR_OVERLAPPING_DAILY_FACTS"]
    };
  }

  const missing = expected.filter((date) => !covered.includes(date));
  const extra = covered.filter((date) => !expected.includes(date));
  if (missing.length || extra.length) {
    return {
      ok: false,
      coverage: makeCoverage({
        status: "PARTIAL",
        mode: "DAILY",
        targetPeriod,
        expected,
        covered,
        missing,
        reason: extra.length ? "UNEXPECTED_COVERAGE_UNIT" : "MISSING_REQUIRED_COVERAGE"
      }),
      diagnostics: [
        ...(missing.length ? ["MISSING_REQUIRED_COVERAGE"] : []),
        ...(extra.length ? ["UNEXPECTED_COVERAGE_UNIT"] : [])
      ]
    };
  }

  return {
    ok: true,
    coverage: makeCoverage({
      status: "COMPLETE",
      mode: "DAILY",
      targetPeriod,
      expected,
      covered,
      missing: []
    }),
    diagnostics: []
  };
}

function validatePeriodCoverage(targetPeriod, records) {
  const intervals = records
    .map((record) => ({ start: record.truth.period.start, end: record.truth.period.end }))
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));

  if (intervals.length === 0) {
    return {
      ok: false,
      coverage: makeCoverage({
        status: "MISSING",
        mode: "PERIODS",
        targetPeriod,
        expected: [`${targetPeriod.start}..${targetPeriod.end}`],
        covered: [],
        missing: [`${targetPeriod.start}..${targetPeriod.end}`],
        reason: "NO_REVENUE_FACTS"
      }),
      diagnostics: ["NO_REVENUE_FACTS"]
    };
  }

  const covered = intervals.map((item) => `${item.start}..${item.end}`);
  let cursor = targetPeriod.start;
  for (const interval of intervals) {
    if (interval.start < cursor) {
      return {
        ok: false,
        coverage: makeCoverage({
          status: "PARTIAL",
          mode: "PERIODS",
          targetPeriod,
          expected: [`${targetPeriod.start}..${targetPeriod.end}`],
          covered,
          missing: [],
          reason: "OVERLAPPING_PERIODS"
        }),
        diagnostics: ["OVERLAPPING_PERIODS"]
      };
    }
    if (interval.start > cursor) {
      return {
        ok: false,
        coverage: makeCoverage({
          status: "PARTIAL",
          mode: "PERIODS",
          targetPeriod,
          expected: [`${targetPeriod.start}..${targetPeriod.end}`],
          covered,
          missing: [`${cursor}..${addDays(interval.start, -1)}`],
          reason: "MISSING_REQUIRED_COVERAGE"
        }),
        diagnostics: ["MISSING_REQUIRED_COVERAGE"]
      };
    }
    cursor = addDays(interval.end, 1);
  }

  if (cursor <= targetPeriod.end) {
    return {
      ok: false,
      coverage: makeCoverage({
        status: "PARTIAL",
        mode: "PERIODS",
        targetPeriod,
        expected: [`${targetPeriod.start}..${targetPeriod.end}`],
        covered,
        missing: [`${cursor}..${targetPeriod.end}`],
        reason: "MISSING_REQUIRED_COVERAGE"
      }),
      diagnostics: ["MISSING_REQUIRED_COVERAGE"]
    };
  }

  return {
    ok: true,
    coverage: makeCoverage({
      status: "COMPLETE",
      mode: "PERIODS",
      targetPeriod,
      expected: [`${targetPeriod.start}..${targetPeriod.end}`],
      covered,
      missing: []
    }),
    diagnostics: []
  };
}

export function aggregateMonthlyRevenueBaseline({
  targetPeriod: rawTargetPeriod,
  scope: rawScope,
  records,
  coverage: rawCoverage
} = {}) {
  const targetPeriod = normalizeTargetPeriod(rawTargetPeriod);
  const targetScope = normalizeTargetScope(rawScope);
  const coverage = normalizeCoverage(rawCoverage);

  if (!targetPeriod.valid) {
    return failResult({
      reason: "INVALID_TARGET_PERIOD",
      message: "Target revenue period is invalid or missing timezone.",
      targetPeriod,
      targetScope,
      coverage: makeCoverage({ status: "MISSING", mode: coverage.mode, targetPeriod, reason: "INVALID_TARGET_PERIOD" }),
      diagnostics: ["INVALID_TARGET_PERIOD"]
    });
  }

  if (!targetScope.valid) {
    return failResult({
      reason: "INVALID_TARGET_SCOPE",
      message: "Target revenue scope is explicit and cannot infer ALL from unknown scope.",
      targetPeriod,
      targetScope,
      coverage: makeCoverage({ status: "MISSING", mode: coverage.mode, targetPeriod, reason: "INVALID_TARGET_SCOPE" }),
      diagnostics: ["INVALID_TARGET_SCOPE"]
    });
  }

  if (!Array.isArray(records) || records.length === 0) {
    return failResult({
      reason: "NO_REVENUE_FACTS",
      message: "No trusted reconciled revenue facts are available for the target period.",
      targetPeriod,
      targetScope,
      coverage: makeCoverage({
        status: "MISSING",
        mode: coverage.mode,
        targetPeriod,
        expected: coverage.expected_dates,
        missing: coverage.expected_dates,
        reason: "NO_REVENUE_FACTS"
      }),
      diagnostics: ["NO_REVENUE_FACTS"]
    });
  }

  const normalized = records.map(normalizeRevenueFact);
  const diagnostics = [];

  for (const record of normalized) {
    const truth = record.truth;
    if (record.candidate && !record.trusted) diagnostics.push("UNTRUSTED_REVENUE_SOURCE");
    if (truth.group !== "REVENUE") diagnostics.push("NON_REVENUE_FACT");
    if (/gross/i.test(truth.metric || "")) diagnostics.push("GROSS_REVENUE_FORBIDDEN");
    if (truth.quality !== "ACTUAL") diagnostics.push("INPUT_NOT_ACTUAL");
    if (truth.reconciliation_status !== "RECONCILED") diagnostics.push("INPUT_NOT_RECONCILED");
    if (typeof truth.value !== "number" || !Number.isFinite(truth.value)) diagnostics.push("INVALID_REVENUE_VALUE");
    if (typeof truth.value === "number" && truth.value < 0) diagnostics.push("NEGATIVE_REVENUE_FORBIDDEN");
    if (truth.period.timezone !== targetPeriod.timezone) diagnostics.push("TIMEZONE_MISMATCH");
    if (truth.period.start < targetPeriod.start || truth.period.end > targetPeriod.end) diagnostics.push("OUTSIDE_TARGET_PERIOD");
    if (
      truth.scope.branch !== targetScope.branch ||
      truth.scope.channel !== targetScope.channel ||
      truth.scope.aggregate_proven !== targetScope.aggregate_proven
    ) {
      diagnostics.push("SCOPE_MISMATCH");
    }
  }

  const metrics = uniqueSorted(normalized.map((record) => record.truth.metric));
  if (metrics.length !== 1) diagnostics.push("MIXED_REVENUE_METRICS");

  const ids = new Map();
  const deduped = [];
  for (const record of normalized) {
    if (!record.fact_id) {
      deduped.push(record);
      continue;
    }
    const fingerprint = truthFingerprint(record.truth);
    if (!ids.has(record.fact_id)) {
      ids.set(record.fact_id, fingerprint);
      deduped.push(record);
      continue;
    }
    if (ids.get(record.fact_id) !== fingerprint) diagnostics.push("DUPLICATE_FACT_ID_CONFLICT");
  }

  if (diagnostics.length) {
    return failResult({
      reason: uniqueSorted(diagnostics)[0],
      message: "Revenue aggregation failed closed because one or more input facts are not trusted compatible ACTUAL revenue.",
      targetPeriod,
      targetScope,
      coverage: makeCoverage({
        status: "PARTIAL",
        mode: coverage.mode,
        targetPeriod,
        expected: coverage.expected_dates,
        covered: uniqueSorted(deduped.map((record) => `${record.truth.period.start}..${record.truth.period.end}`)),
        reason: uniqueSorted(diagnostics)[0]
      }),
      diagnostics,
      metric: metrics[0] || "reconciled_revenue"
    });
  }

  const coverageResult = coverage.mode === "DAILY"
    ? validateDailyCoverage(targetPeriod, coverage, deduped)
    : coverage.mode === "PERIODS"
      ? validatePeriodCoverage(targetPeriod, deduped)
      : {
          ok: false,
          coverage: makeCoverage({
            status: "MISSING",
            mode: coverage.mode,
            targetPeriod,
            reason: "MISSING_COVERAGE_MODE"
          }),
          diagnostics: ["MISSING_COVERAGE_MODE"]
        };

  if (!coverageResult.ok) {
    return failResult({
      reason: coverageResult.coverage.reason,
      message: "Revenue coverage is not complete for the requested period.",
      targetPeriod,
      targetScope,
      coverage: coverageResult.coverage,
      diagnostics: coverageResult.diagnostics,
      metric: metrics[0]
    });
  }

  const total = deduped.reduce((sum, record) => sum + record.truth.value, 0);
  const truth = normalizeFinancialTruth(
    {
      period: {
        start: targetPeriod.start,
        end: targetPeriod.end,
        timezone: targetPeriod.timezone
      },
      scope: {
        branch: targetScope.branch,
        channel: targetScope.channel,
        aggregate_proven: targetScope.aggregate_proven
      },
      group: "REVENUE",
      metric: metrics[0],
      value: total,
      quality: "ACTUAL",
      source: OUTPUT_SOURCE,
      as_of: maxAsOf(deduped),
      reconciliation_status: "RECONCILED",
      evidence: outputEvidence(deduped),
      lineage: outputLineage(deduped),
      message: "Revenue baseline is complete for the requested period and scope.",
      reason: "COMPLETE_RECONCILED_COVERAGE"
    },
    {
      allowNegative: false,
      requiredReconciliationStatuses: ["RECONCILED"]
    }
  );

  return {
    ...truth,
    baseline_schema_version: MONTHLY_REVENUE_BASELINE_SCHEMA_VERSION,
    coverage: coverageResult.coverage,
    diagnostics: []
  };
}

export async function loadMonthlyRevenueBaseline({ reader, ...args } = {}) {
  const targetPeriod = normalizeTargetPeriod(args.targetPeriod);
  const targetScope = normalizeTargetScope(args.scope);
  const coverage = normalizeCoverage(args.coverage);

  if (typeof reader !== "function") {
    return failResult({
      quality: "NOT_CONNECTED",
      reason: "RECONCILED_REVENUE_READER_NOT_CONNECTED",
      message: "Reconciled revenue reader is not connected; gross or raw revenue is not used as fallback.",
      targetPeriod,
      targetScope,
      coverage: makeCoverage({
        status: "MISSING",
        mode: coverage.mode,
        targetPeriod,
        expected: coverage.expected_dates,
        missing: coverage.expected_dates,
        reason: "RECONCILED_REVENUE_READER_NOT_CONNECTED"
      }),
      diagnostics: ["RECONCILED_REVENUE_READER_NOT_CONNECTED"]
    });
  }

  try {
    const result = await reader({
      targetPeriod: args.targetPeriod,
      scope: args.scope,
      coverage: args.coverage
    });
    const records = Array.isArray(result) ? result : result?.records;
    return aggregateMonthlyRevenueBaseline({ ...args, records });
  } catch {
    return failResult({
      reason: "RECONCILED_REVENUE_READER_FAILED",
      message: "Reconciled revenue reader failed; no fallback revenue is used.",
      targetPeriod,
      targetScope,
      coverage: makeCoverage({
        status: "MISSING",
        mode: coverage.mode,
        targetPeriod,
        expected: coverage.expected_dates,
        missing: coverage.expected_dates,
        reason: "RECONCILED_REVENUE_READER_FAILED"
      }),
      diagnostics: ["RECONCILED_REVENUE_READER_FAILED"]
    });
  }
}
