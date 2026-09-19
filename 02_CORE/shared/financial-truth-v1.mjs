export const FINANCIAL_TRUTH_SCHEMA_VERSION = "financial-truth.v1";

export const FINANCIAL_QUALITY_STATES = Object.freeze([
  "ACTUAL",
  "ESTIMATE",
  "GAP",
  "NOT_CONNECTED"
]);

export const FINANCIAL_RECONCILIATION_STATES = Object.freeze([
  "RECONCILED",
  "PARTIAL",
  "UNRECONCILED",
  "NOT_APPLICABLE",
  "UNKNOWN"
]);

const DEFAULT_MESSAGE = Object.freeze({
  ACTUAL: "",
  ESTIMATE: "Financial value is an estimate.",
  GAP: "Financial source evidence is incomplete.",
  NOT_CONNECTED: "Financial source is not connected."
});

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function privacySafeText(value) {
  const normalized = text(value);
  if (!normalized) return null;
  if (/https?:\/\//i.test(normalized)) return null;
  if (/\b(?:drive|docs)\.google\.com\b/i.test(normalized)) return null;
  return normalized;
}

function normalizePrivacyList(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const entry of value) {
    const normalized = privacySafeText(entry);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isIsoTimestampWithZone(value) {
  if (!text(value)) return false;
  if (!/T/.test(value) || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

function normalizeQuality(value) {
  const normalized = text(value)?.toUpperCase() || null;
  if (!normalized) return { quality: "NOT_CONNECTED", valid: false, reason: "MISSING_QUALITY" };
  if (!FINANCIAL_QUALITY_STATES.includes(normalized)) {
    return { quality: "GAP", valid: false, reason: "INVALID_QUALITY" };
  }
  return { quality: normalized, valid: true, reason: null };
}

function normalizeReconciliation(value) {
  const normalized = text(value)?.toUpperCase() || "UNKNOWN";
  return FINANCIAL_RECONCILIATION_STATES.includes(normalized)
    ? normalized
    : "UNKNOWN";
}

function normalizePeriod(raw = {}) {
  const start = isIsoDate(raw.start) ? raw.start : null;
  const end = isIsoDate(raw.end) ? raw.end : null;
  const timezone = text(raw.timezone);
  const ordered = start && end ? start <= end : false;
  return { start, end, timezone, valid: Boolean(start && end && timezone && ordered) };
}

function normalizeScope(raw = {}) {
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

function normalizeSource(raw) {
  if (typeof raw === "string") {
    return { class: null, label: privacySafeText(raw) };
  }
  return {
    class: privacySafeText(raw?.class ?? raw?.source_class ?? raw?.sourceClass),
    label: privacySafeText(raw?.label ?? raw?.source_label ?? raw?.sourceLabel)
  };
}

function failClosed(record, reason) {
  return {
    ...record,
    value: null,
    quality: "GAP",
    message: `Financial truth record failed closed: ${reason}.`,
    reason
  };
}

export function normalizeFinancialTruth(raw = {}, policy = {}) {
  const qualityState = normalizeQuality(raw.quality);
  const period = normalizePeriod(raw.period ?? raw.reporting_period ?? raw.reportingPeriod ?? {});
  const scope = normalizeScope(raw.scope ?? {});
  const source = normalizeSource(raw.source);
  const asOfRaw = raw.as_of ?? raw.asOf;
  const asOf = isIsoTimestampWithZone(asOfRaw) ? asOfRaw : null;
  const reconciliationStatus = normalizeReconciliation(
    raw.reconciliation_status ?? raw.reconciliationStatus
  );
  const evidence = normalizePrivacyList(raw.evidence);
  const lineage = normalizePrivacyList(raw.lineage);
  const group = text(raw.group)?.toUpperCase() || null;
  const metric = text(raw.metric);
  const message = privacySafeText(raw.message) || DEFAULT_MESSAGE[qualityState.quality];
  const reason = privacySafeText(raw.reason);

  const record = {
    schema_version: FINANCIAL_TRUTH_SCHEMA_VERSION,
    period: {
      start: period.start,
      end: period.end,
      timezone: period.timezone
    },
    scope: {
      branch: scope.branch,
      channel: scope.channel,
      aggregate_proven: scope.aggregate_proven
    },
    group,
    metric,
    value: null,
    quality: qualityState.quality,
    source,
    as_of: asOf,
    reconciliation_status: reconciliationStatus,
    evidence,
    lineage,
    message,
    reason
  };

  if (!qualityState.valid) {
    return qualityState.quality === "NOT_CONNECTED"
      ? { ...record, value: null, reason: qualityState.reason }
      : failClosed(record, qualityState.reason);
  }

  if (record.quality === "GAP" || record.quality === "NOT_CONNECTED") {
    return { ...record, value: null };
  }

  if (!group || !metric) return failClosed(record, "MISSING_METRIC_IDENTITY");
  if (!period.valid) return failClosed(record, "INVALID_REPORTING_PERIOD");
  if (!scope.valid) return failClosed(record, "INVALID_SCOPE");
  if (!source.class || !source.label) return failClosed(record, "INVALID_SOURCE");
  if (!asOf) return failClosed(record, "INVALID_AS_OF");
  if (reconciliationStatus === "UNKNOWN") return failClosed(record, "INVALID_RECONCILIATION_STATUS");
  if (lineage.length === 0) return failClosed(record, "MISSING_LINEAGE");

  if (typeof raw.value !== "number" || !Number.isFinite(raw.value)) {
    return failClosed(record, "INVALID_NUMERIC_VALUE");
  }

  const value = Object.is(raw.value, -0) ? 0 : raw.value;
  if (policy.allowNegative === false && value < 0) {
    return failClosed(record, "NEGATIVE_VALUE_NOT_ALLOWED");
  }

  const requiredStatuses = Array.isArray(policy.requiredReconciliationStatuses)
    ? policy.requiredReconciliationStatuses.map((item) => text(item)?.toUpperCase()).filter(Boolean)
    : [];
  if (requiredStatuses.length > 0 && !requiredStatuses.includes(reconciliationStatus)) {
    return failClosed(record, "RECONCILIATION_POLICY_NOT_MET");
  }

  return { ...record, value };
}
