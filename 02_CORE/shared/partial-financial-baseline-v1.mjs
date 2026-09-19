import { normalizeFinancialTruth } from "./financial-truth-v1.mjs";
import { calculateCashBridge } from "./cash-bridge-v1.mjs";

export const PARTIAL_FINANCIAL_BASELINE_SCHEMA_VERSION = "partial-financial-baseline.v1";
export const PARTIAL_FINANCIAL_BASELINE_STATUS = "PARTIAL_FINANCIAL_BASELINE";

export const BASELINE_QUALITY_PRECEDENCE = Object.freeze([
  "NOT_CONNECTED",
  "GAP",
  "ESTIMATE",
  "ACTUAL"
]);

const DERIVED_SOURCE = Object.freeze({
  class: "DERIVED_COMPOSITION",
  label: "PARTIAL_FINANCIAL_BASELINE_V1"
});

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isUnsafeText(value) {
  const normalized = text(value);
  if (!normalized) return false;
  return /https?:\/\//i.test(normalized) || /\b(?:drive|docs)\.google\.com\b/i.test(normalized);
}

function safeText(value) {
  const normalized = text(value);
  return normalized && !isUnsafeText(normalized) ? normalized : null;
}

function safeList(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(safeText).filter(Boolean))].sort();
}

function sanitizeTree(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeTree).filter((item) => item !== null && item !== undefined);
  }
  if (value && typeof value === "object") {
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      const sanitized = sanitizeTree(child);
      if (sanitized !== undefined) result[key] = sanitized;
    }
    return result;
  }
  if (typeof value === "string") return isUnsafeText(value) ? null : value;
  return value;
}

function containsUnsafeText(value) {
  if (typeof value === "string") return isUnsafeText(value);
  if (Array.isArray(value)) return value.some(containsUnsafeText);
  if (value && typeof value === "object") return Object.values(value).some(containsUnsafeText);
  return false;
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isIsoTimestampWithZone(value) {
  const normalized = text(value);
  if (!normalized || !/T/.test(normalized) || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)) return false;
  return Number.isFinite(Date.parse(normalized));
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

function normalizeTargetScope(raw = {}) {
  const aggregateProven = raw?.aggregate_proven === true || raw?.aggregateProven === true;
  const dimension = (value) => {
    const normalized = text(value);
    if (!normalized) return null;
    if (normalized.toUpperCase() === "ALL") return aggregateProven ? "ALL" : null;
    return normalized;
  };
  const branch = dimension(raw?.branch ?? raw?.branchScope);
  const channel = dimension(raw?.channel ?? raw?.channelScope);
  return {
    branch,
    channel,
    aggregate_proven: aggregateProven,
    valid: Boolean(branch && channel)
  };
}

function samePeriod(left = {}, right = {}) {
  return left?.start === right?.start &&
    left?.end === right?.end &&
    left?.timezone === right?.timezone;
}

function sameScope(left = {}, right = {}) {
  return left?.branch === right?.branch &&
    left?.channel === right?.channel &&
    left?.aggregate_proven === right?.aggregate_proven;
}

function worstQuality(values) {
  const normalized = values.map((value) => text(value)?.toUpperCase()).filter(Boolean);
  for (const quality of BASELINE_QUALITY_PRECEDENCE) {
    if (normalized.includes(quality)) return quality;
  }
  return "GAP";
}

function maxAsOf(values) {
  let selected = null;
  let selectedTime = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!isIsoTimestampWithZone(value)) continue;
    const time = Date.parse(value);
    if (time > selectedTime) {
      selected = value;
      selectedTime = time;
    }
  }
  return selected;
}

function targetShape(periodState, scopeState) {
  return {
    period: {
      start: periodState.start,
      end: periodState.end,
      timezone: periodState.timezone
    },
    scope: {
      branch: scopeState.branch,
      channel: scopeState.channel,
      aggregate_proven: scopeState.aggregate_proven
    }
  };
}

function missingTruth({
  group,
  metric,
  quality = "GAP",
  reason,
  periodState,
  scopeState
}) {
  const target = targetShape(periodState, scopeState);
  return normalizeFinancialTruth({
    period: target.period,
    scope: target.scope,
    group,
    metric,
    value: null,
    quality,
    source: DERIVED_SOURCE,
    as_of: null,
    reconciliation_status: "NOT_APPLICABLE",
    evidence: [],
    lineage: ["PARTIAL_FINANCIAL_BASELINE_V1"],
    reason,
    message: reason
  });
}

function normalizePeriodComponent(raw, {
  expectedGroup,
  defaultMetric,
  missingReason,
  periodState,
  scopeState,
  requireCompleteCoverage = false,
  allowNegative = false
}) {
  if (!raw) {
    return {
      truth: missingTruth({
        group: expectedGroup,
        metric: defaultMetric,
        reason: missingReason,
        periodState,
        scopeState
      }),
      diagnostics: [missingReason],
      coverage: null
    };
  }

  const unsafe = containsUnsafeText(raw?.source) ||
    containsUnsafeText(raw?.lineage) ||
    containsUnsafeText(raw?.evidence) ||
    containsUnsafeText(raw?.diagnostics);

  const truth = normalizeFinancialTruth({
    ...raw,
    group: raw?.group ?? expectedGroup,
    metric: raw?.metric ?? defaultMetric
  }, { allowNegative });

  const diagnostics = safeList(raw?.diagnostics);
  const coverage = sanitizeTree(raw?.coverage ?? null);

  if (unsafe && (truth.quality === "ACTUAL" || truth.quality === "ESTIMATE")) {
    return {
      truth: missingTruth({
        group: expectedGroup,
        metric: defaultMetric,
        reason: "PRIVACY_UNSAFE_COMPONENT_EVIDENCE",
        periodState,
        scopeState
      }),
      diagnostics: [...new Set([...diagnostics, "PRIVACY_UNSAFE_COMPONENT_EVIDENCE"])].sort(),
      coverage
    };
  }

  if (truth.group !== expectedGroup) {
    return {
      truth: missingTruth({
        group: expectedGroup,
        metric: defaultMetric,
        reason: "COMPONENT_GROUP_MISMATCH",
        periodState,
        scopeState
      }),
      diagnostics: [...new Set([...diagnostics, "COMPONENT_GROUP_MISMATCH"])].sort(),
      coverage
    };
  }

  if (!samePeriod(truth.period, targetShape(periodState, scopeState).period)) {
    return {
      truth: missingTruth({
        group: expectedGroup,
        metric: defaultMetric,
        reason: "COMPONENT_PERIOD_MISMATCH",
        periodState,
        scopeState
      }),
      diagnostics: [...new Set([...diagnostics, "COMPONENT_PERIOD_MISMATCH"])].sort(),
      coverage
    };
  }

  if (!sameScope(truth.scope, targetShape(periodState, scopeState).scope)) {
    return {
      truth: missingTruth({
        group: expectedGroup,
        metric: defaultMetric,
        reason: "COMPONENT_SCOPE_MISMATCH",
        periodState,
        scopeState
      }),
      diagnostics: [...new Set([...diagnostics, "COMPONENT_SCOPE_MISMATCH"])].sort(),
      coverage
    };
  }

  if (
    requireCompleteCoverage &&
    (truth.quality === "ACTUAL" || truth.quality === "ESTIMATE") &&
    coverage?.status !== "COMPLETE"
  ) {
    return {
      truth: missingTruth({
        group: expectedGroup,
        metric: defaultMetric,
        reason: "COMPONENT_COVERAGE_INCOMPLETE",
        periodState,
        scopeState
      }),
      diagnostics: [...new Set([...diagnostics, "COMPONENT_COVERAGE_INCOMPLETE"])].sort(),
      coverage
    };
  }

  return { truth, diagnostics, coverage };
}

function normalizeRevenue(raw, periodState, scopeState) {
  const normalized = normalizePeriodComponent(raw, {
    expectedGroup: "REVENUE",
    defaultMetric: "reconciled_revenue",
    missingReason: "REVENUE_TRUTH_NOT_AVAILABLE",
    periodState,
    scopeState,
    requireCompleteCoverage: true,
    allowNegative: false
  });
  return {
    ...normalized.truth,
    baseline_schema_version: safeText(raw?.baseline_schema_version) || null,
    coverage: normalized.coverage,
    diagnostics: normalized.diagnostics
  };
}

function cashFailure(reason, periodState, scopeState, quality = "GAP") {
  const make = (metric) => missingTruth({
    group: "CASH",
    metric,
    quality,
    reason,
    periodState,
    scopeState
  });
  return {
    schema_version: "cash-bridge.v1",
    target_period: targetShape(periodState, scopeState).period,
    scope: targetShape(periodState, scopeState).scope,
    opening_balance: make("cash_opening_balance"),
    events: [],
    categorized_known_inflows: [],
    categorized_known_outflows: [],
    transfers: {
      event_count: 0,
      consolidated_neutral: false,
      known_evidenced_amount: make("known_evidenced_internal_transfer"),
      events: []
    },
    total_known_inflows: make("known_evidenced_inflows"),
    total_known_outflows: make("known_evidenced_outflows"),
    computed_ending_balance: make("cash_computed_ending_balance"),
    observed_ending_balance: make("cash_observed_ending_balance"),
    cash_variance: make("cash_variance"),
    coverage: {
      status: "MISSING",
      source_coverage: [],
      diagnostics: [reason]
    },
    quality,
    diagnostics: [reason],
    lineage: ["PARTIAL_FINANCIAL_BASELINE_V1"]
  };
}

function resolveCashBridge({ cashBridge, cashInputs, periodState, scopeState }) {
  let bridge = cashBridge || null;
  if (!bridge && cashInputs) {
    bridge = calculateCashBridge({
      ...cashInputs,
      targetPeriod: targetShape(periodState, scopeState).period,
      scope: targetShape(periodState, scopeState).scope
    });
  }
  if (!bridge) return cashFailure("CASH_BRIDGE_TRUTH_NOT_AVAILABLE", periodState, scopeState);

  if (containsUnsafeText(bridge)) {
    return cashFailure("PRIVACY_UNSAFE_CASH_BRIDGE", periodState, scopeState);
  }

  if (!samePeriod(bridge.target_period, targetShape(periodState, scopeState).period)) {
    return cashFailure("CASH_BRIDGE_PERIOD_MISMATCH", periodState, scopeState);
  }
  if (!sameScope(bridge.scope, targetShape(periodState, scopeState).scope)) {
    return cashFailure("CASH_BRIDGE_SCOPE_MISMATCH", periodState, scopeState);
  }

  return {
    ...sanitizeTree(bridge),
    diagnostics: safeList(bridge.diagnostics),
    lineage: safeList(bridge.lineage)
  };
}

function normalizeApComponent(raw, periodState, scopeState) {
  if (!raw) {
    return {
      quality: "GAP",
      outstanding: null,
      overdue: null,
      coverage: null,
      diagnostics: ["AP_TRUTH_NOT_AVAILABLE"],
      temporal_relation: "NOT_AVAILABLE"
    };
  }

  if (containsUnsafeText(raw)) {
    return {
      quality: "GAP",
      outstanding: null,
      overdue: null,
      coverage: null,
      diagnostics: ["PRIVACY_UNSAFE_AP_COMPONENT"],
      temporal_relation: "NOT_AVAILABLE"
    };
  }

  const normalizeApTruth = (truth, metric) => {
    if (!truth) return null;
    const normalized = normalizeFinancialTruth({
      ...truth,
      group: truth?.group ?? "AP",
      metric: truth?.metric ?? metric
    }, { allowNegative: false });

    if (normalized.group !== "AP") {
      return missingTruth({
        group: "AP",
        metric,
        reason: "AP_GROUP_MISMATCH",
        periodState,
        scopeState
      });
    }
    if (!sameScope(normalized.scope, targetShape(periodState, scopeState).scope)) {
      return missingTruth({
        group: "AP",
        metric,
        reason: "AP_SCOPE_MISMATCH",
        periodState,
        scopeState
      });
    }
    return normalized;
  };

  const outstanding = normalizeApTruth(raw.outstanding, "procurement_supplier_ap_outstanding");
  const overdue = normalizeApTruth(raw.overdue, "procurement_supplier_ap_overdue");
  const pointDate = outstanding?.period?.end || overdue?.period?.end || null;
  const temporalRelation =
    pointDate && pointDate === periodState.end
      ? "MATCHES_TARGET_END"
      : pointDate
        ? "CURRENT_STATE_NOT_TARGET_END"
        : "NOT_AVAILABLE";

  const componentQuality = worstQuality([
    raw.quality,
    outstanding?.quality,
    overdue?.quality
  ]);

  return {
    ...sanitizeTree(raw),
    quality: componentQuality,
    outstanding,
    overdue,
    coverage: sanitizeTree(raw.coverage ?? null),
    diagnostics: safeList([
      ...(raw.diagnostics || []),
      ...(temporalRelation === "CURRENT_STATE_NOT_TARGET_END"
        ? ["AP_CURRENT_STATE_NOT_TARGET_PERIOD_END"]
        : [])
    ]),
    temporal_relation: temporalRelation
  };
}

function deriveProfit({
  revenue,
  cogs,
  operatingCosts,
  periodState,
  scopeState
}) {
  const dependencies = [revenue, cogs, operatingCosts];
  const quality = worstQuality(dependencies.map((item) => item?.quality));

  if (quality === "NOT_CONNECTED" || quality === "GAP") {
    return missingTruth({
      group: "PROFIT",
      metric: "management_operating_profit_baseline",
      quality,
      reason: quality === "NOT_CONNECTED"
        ? "PROFIT_DEPENDENCY_NOT_CONNECTED"
        : "PROFIT_DEPENDENCY_INCOMPLETE",
      periodState,
      scopeState
    });
  }

  if (
    dependencies.some(
      (item) => typeof item?.value !== "number" || !Number.isFinite(item.value)
    )
  ) {
    return missingTruth({
      group: "PROFIT",
      metric: "management_operating_profit_baseline",
      reason: "PROFIT_DEPENDENCY_NON_NUMERIC",
      periodState,
      scopeState
    });
  }

  const value = revenue.value - cogs.value - operatingCosts.value;
  return normalizeFinancialTruth({
    period: targetShape(periodState, scopeState).period,
    scope: targetShape(periodState, scopeState).scope,
    group: "PROFIT",
    metric: "management_operating_profit_baseline",
    value,
    quality,
    source: DERIVED_SOURCE,
    as_of: maxAsOf([revenue.as_of, cogs.as_of, operatingCosts.as_of]),
    reconciliation_status: "NOT_APPLICABLE",
    evidence: ["FORMULA:REVENUE-COGS-OPERATING_COSTS"],
    lineage: [
      ...safeList([
        ...(revenue.lineage || []),
        ...(cogs.lineage || []),
        ...(operatingCosts.lineage || []),
        "PARTIAL_FINANCIAL_BASELINE_V1"
      ])
    ],
    reason: "MANAGEMENT_BASELINE_PROFIT_FROM_COMPATIBLE_PERIOD_TRUTH",
    message: "Management baseline profit equals Revenue minus COGS minus Operating Costs."
  }, { allowNegative: true });
}

function componentGap(component, quality, reason) {
  const safeReason = safeText(reason);
  if (!safeReason) return null;
  return {
    component,
    quality,
    reason: safeReason
  };
}

function declaredGapItems(values) {
  if (!Array.isArray(values)) return [];
  const result = [];
  for (const entry of values) {
    if (typeof entry === "string") {
      const reason = safeText(entry);
      if (reason) result.push({ component: "DECLARED", quality: "GAP", reason });
      continue;
    }
    if (!entry || typeof entry !== "object" || containsUnsafeText(entry)) continue;
    const reason = safeText(entry.reason ?? entry.source ?? entry.label);
    const component = safeText(entry.component) || "DECLARED";
    const quality = text(entry.quality)?.toUpperCase();
    if (!reason) continue;
    result.push({
      component,
      quality: BASELINE_QUALITY_PRECEDENCE.includes(quality) ? quality : "GAP",
      reason
    });
  }
  return result;
}

function missingSources({ revenue, cashBridge, ap, cogs, operatingCosts, profit, declaredGaps }) {
  const result = declaredGapItems(declaredGaps);
  const add = (component, value, reasons) => {
    if (!value || !["GAP", "NOT_CONNECTED"].includes(value.quality)) return;
    const reason = safeText(value.reason) || safeList(reasons)[0] || `${component}_TRUTH_INCOMPLETE`;
    const item = componentGap(component, value.quality, reason);
    if (item) result.push(item);
  };

  add("REVENUE", revenue, revenue.diagnostics);
  if (["GAP", "NOT_CONNECTED"].includes(cashBridge?.quality)) {
    const reason = safeList(cashBridge.diagnostics)[0] || "CASH_BRIDGE_TRUTH_INCOMPLETE";
    result.push({ component: "CASH_BRIDGE", quality: cashBridge.quality, reason });
  }
  if (["GAP", "NOT_CONNECTED"].includes(ap?.quality)) {
    const reason = safeList(ap.diagnostics)[0] || "AP_TRUTH_INCOMPLETE";
    result.push({ component: "AP", quality: ap.quality, reason });
  }
  add("COGS", cogs, []);
  add("OPERATING_COSTS", operatingCosts, []);
  add("PROFIT", profit, []);

  const keyed = new Map();
  for (const item of result) {
    if (!item?.reason || containsUnsafeText(item)) continue;
    const key = JSON.stringify(item);
    keyed.set(key, item);
  }
  return [...keyed.values()].sort((a, b) =>
    [a.component, a.quality, a.reason].join("|").localeCompare(
      [b.component, b.quality, b.reason].join("|")
    )
  );
}

export function composePartialFinancialBaseline({
  targetPeriod,
  target_period,
  scope,
  asOf,
  as_of,
  revenue,
  cashBridge,
  cash_bridge,
  cashInputs,
  cash_inputs,
  ap,
  cogs,
  operatingCosts,
  operating_costs,
  declaredGaps,
  declared_gaps
} = {}) {
  const periodState = normalizeTargetPeriod(targetPeriod ?? target_period ?? {});
  const scopeState = normalizeTargetScope(scope ?? {});
  const target = targetShape(periodState, scopeState);
  const diagnostics = [];

  if (!periodState.valid) diagnostics.push("INVALID_TARGET_PERIOD");
  if (!scopeState.valid) diagnostics.push("INVALID_TARGET_SCOPE");

  const revenueComponent = periodState.valid && scopeState.valid
    ? normalizeRevenue(revenue, periodState, scopeState)
    : normalizeRevenue(null, periodState, scopeState);

  const cashComponent = periodState.valid && scopeState.valid
    ? resolveCashBridge({
        cashBridge: cashBridge ?? cash_bridge,
        cashInputs: cashInputs ?? cash_inputs,
        periodState,
        scopeState
      })
    : cashFailure("INVALID_BASELINE_TARGET", periodState, scopeState);

  const apComponent = periodState.valid && scopeState.valid
    ? normalizeApComponent(ap, periodState, scopeState)
    : normalizeApComponent(null, periodState, scopeState);

  const cogsComponent = normalizePeriodComponent(cogs, {
    expectedGroup: "COGS",
    defaultMetric: "cogs",
    missingReason: "COGS_CONSUMPTION_TRUTH_NOT_AVAILABLE",
    periodState,
    scopeState,
    allowNegative: false
  }).truth;

  const operatingCostComponent = normalizePeriodComponent(
    operatingCosts ?? operating_costs,
    {
      expectedGroup: "OPEX",
      defaultMetric: "operating_costs",
      missingReason: "OPERATING_COST_TRUTH_NOT_AVAILABLE",
      periodState,
      scopeState,
      allowNegative: false
    }
  ).truth;

  const profit = deriveProfit({
    revenue: revenueComponent,
    cogs: cogsComponent,
    operatingCosts: operatingCostComponent,
    periodState,
    scopeState
  });

  diagnostics.push(
    ...(revenueComponent.diagnostics || []),
    ...(cashComponent.diagnostics || []),
    ...(apComponent.diagnostics || [])
  );
  if (cogsComponent.quality === "GAP" && cogsComponent.reason) diagnostics.push(cogsComponent.reason);
  if (operatingCostComponent.quality === "GAP" && operatingCostComponent.reason) diagnostics.push(operatingCostComponent.reason);
  if ((profit.quality === "GAP" || profit.quality === "NOT_CONNECTED") && profit.reason) diagnostics.push(profit.reason);

  const callerAsOf = asOf ?? as_of;
  const snapshotAsOf = isIsoTimestampWithZone(callerAsOf)
    ? callerAsOf
    : maxAsOf([
        revenueComponent.as_of,
        cashComponent.opening_balance?.as_of,
        cashComponent.total_known_inflows?.as_of,
        cashComponent.total_known_outflows?.as_of,
        cashComponent.computed_ending_balance?.as_of,
        cashComponent.observed_ending_balance?.as_of,
        cashComponent.cash_variance?.as_of,
        apComponent.outstanding?.as_of,
        apComponent.overdue?.as_of,
        cogsComponent.as_of,
        operatingCostComponent.as_of,
        profit.as_of
      ]);

  const componentStates = {
    revenue: revenueComponent.quality,
    cash_bridge: cashComponent.quality,
    ap: apComponent.quality,
    cogs: cogsComponent.quality,
    operating_costs: operatingCostComponent.quality,
    profit: profit.quality
  };

  const dataQuality = {
    status: PARTIAL_FINANCIAL_BASELINE_STATUS,
    quality: worstQuality(Object.values(componentStates)),
    components: componentStates
  };

  const lineage = safeList([
    ...(revenueComponent.lineage || []),
    ...(cashComponent.lineage || []),
    ...(apComponent.outstanding?.lineage || []),
    ...(apComponent.overdue?.lineage || []),
    ...(cogsComponent.lineage || []),
    ...(operatingCostComponent.lineage || []),
    ...(profit.lineage || []),
    "PARTIAL_FINANCIAL_BASELINE_V1"
  ]);

  const missing = missingSources({
    revenue: revenueComponent,
    cashBridge: cashComponent,
    ap: apComponent,
    cogs: cogsComponent,
    operatingCosts: operatingCostComponent,
    profit,
    declaredGaps: declaredGaps ?? declared_gaps
  });

  return {
    schema_version: PARTIAL_FINANCIAL_BASELINE_SCHEMA_VERSION,
    target_period: target.period,
    scope: target.scope,
    as_of: snapshotAsOf,
    revenue: revenueComponent,
    cash_bridge: cashComponent,
    ap: apComponent,
    cogs: cogsComponent,
    operating_costs: operatingCostComponent,
    profit,
    data_quality: dataQuality,
    missing_sources: missing,
    diagnostics: safeList(diagnostics),
    lineage
  };
}
