import { loadProcurementPayables } from "./payables-adapter-v1.mjs";
import { loadWorkforceAttention } from "./workforce-adapter-v1.mjs";
import { loadReconciledRevenue } from "./revenue-adapter-v1.mjs";

const SOURCE_META = Object.freeze({
  revenue: {
    source: "reconciled daily revenue read model",
    message: "Nguồn Revenue gặp lỗi ngoài dự kiến; các nguồn khác vẫn tiếp tục tải."
  },
  payables: {
    source: "v_procurement_supplier_payables + v_procurement_order_summary",
    message: "Nguồn Payables gặp lỗi ngoài dự kiến; các nguồn khác vẫn tiếp tục tải."
  },
  workforce: {
    source: "get_manager_transfer_requests + list_schedule_generations",
    message: "Nguồn Workforce gặp lỗi ngoài dự kiến; các nguồn khác vẫn tiếp tục tải."
  }
});

function safeTimestamp(now) {
  try {
    const value = now();
    return value instanceof Date && Number.isFinite(value.getTime())
      ? value.toISOString()
      : null;
  } catch {
    return null;
  }
}

function gapFallback(meta, now) {
  return {
    quality: "GAP",
    source: meta.source,
    asOf: safeTimestamp(now),
    message: meta.message
  };
}

export async function loadSectionSafely(
  loader,
  { source, message, now = () => new Date() } = {}
) {
  const meta = {
    source: typeof source === "string" && source.trim()
      ? source.trim()
      : "Control Tower source",
    message: typeof message === "string" && message.trim()
      ? message.trim()
      : "Nguồn dữ liệu gặp lỗi ngoài dự kiến."
  };

  if (typeof loader !== "function") {
    return gapFallback(meta, now);
  }

  try {
    const section = await loader();
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      return gapFallback(meta, now);
    }
    return section;
  } catch {
    return gapFallback(meta, now);
  }
}

export async function loadControlTowerSources(
  {
    reportingDate,
    core,
    loaders = {},
    now = () => new Date()
  } = {}
) {
  const revenueLoader =
    loaders.revenue ||
    ((args) => loadReconciledRevenue(args));
  const payablesLoader =
    loaders.payables ||
    ((client) => loadProcurementPayables(client));
  const workforceLoader =
    loaders.workforce ||
    ((runtimeCore) => loadWorkforceAttention(runtimeCore));

  const [revenue, payables, workforce] = await Promise.all([
    loadSectionSafely(
      () => revenueLoader({ reportingDate }),
      { ...SOURCE_META.revenue, now }
    ),
    loadSectionSafely(
      () => payablesLoader(core?.supabase?.get?.()),
      { ...SOURCE_META.payables, now }
    ),
    loadSectionSafely(
      () => workforceLoader(core),
      { ...SOURCE_META.workforce, now }
    )
  ]);

  return { revenue, payables, workforce };
}
