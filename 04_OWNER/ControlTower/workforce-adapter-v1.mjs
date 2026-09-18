import { loadStoreStaffingGap } from "./staffing-gap-adapter-v1.mjs";

const SOURCE_LABEL =
  "get_manager_transfer_requests + list_schedule_generations + get_workforce_staffing_requirements + get_schedule_generation_assignments";

const UNPUBLISHED_GENERATION_STATUSES = new Set(["DRAFT", "REVIEWED"]);

function isPendingTransfer(row) {
  return String(row?.status || "").toUpperCase() === "PENDING";
}

function isUnpublishedGeneration(row) {
  return UNPUBLISHED_GENERATION_STATUSES.has(
    String(row?.status || "").toUpperCase()
  );
}

export function summarizeWorkforceAttention({
  transferRows = [],
  generationsByStore = [],
  staffingGapByStore = []
} = {}) {
  const pendingTransfers = transferRows.filter(isPendingTransfer).length;
  const unpublishedGenerations = generationsByStore.reduce(
    (sum, rows) =>
      sum +
      (Array.isArray(rows)
        ? rows.filter(isUnpublishedGeneration).length
        : 0),
    0
  );

  const scopedStoreCount = Array.isArray(generationsByStore)
    ? generationsByStore.length
    : 0;
  const gapRows = Array.isArray(staffingGapByStore)
    ? staffingGapByStore
    : [];
  const staffingGapComplete =
    scopedStoreCount === 0 ||
    (gapRows.length === scopedStoreCount &&
      gapRows.every(
        (row) =>
          row?.quality === "ACTUAL" &&
          Number.isFinite(row?.staffingGapCount)
      ));

  const staffingGapCount =
    scopedStoreCount === 0
      ? null
      : staffingGapComplete
        ? gapRows.reduce((sum, row) => sum + row.staffingGapCount, 0)
        : null;

  return {
    staffingGapCount,
    staffingGapComplete,
    unresolvedCount: pendingTransfers + unpublishedGenerations,
    pendingTransfers,
    unpublishedGenerations
  };
}

async function readRpc(core, name, args) {
  const result = await core.supabase.rpc(name, args);
  if (result?.error) throw result.error;
  if (!Array.isArray(result?.data)) {
    throw new Error(`MALFORMED_RPC_RESULT:${name}`);
  }
  return result.data;
}

export async function loadWorkforceAttention(
  core,
  {
    weekStart = core?.date?.monday?.(),
    now = () => new Date()
  } = {}
) {
  const nowValue = now();
  const asOf = nowValue.toISOString();

  if (
    !core?.supabase?.rpc ||
    !core?.stores?.accessible ||
    !weekStart
  ) {
    return {
      quality: "GAP",
      source: SOURCE_LABEL,
      asOf,
      message: "Không thể kết nối nguồn Workforce read-only."
    };
  }

  let stores;
  try {
    stores = await core.stores.accessible();
  } catch {
    return {
      quality: "GAP",
      source: SOURCE_LABEL,
      asOf,
      message: "Không thể xác định phạm vi cửa hàng Workforce."
    };
  }

  let transferRows = [];
  let transferOk = false;
  try {
    transferRows = await readRpc(
      core,
      "get_manager_transfer_requests",
      { p_week_start: weekStart }
    );
    transferOk = true;
  } catch {}

  const generationsByStore = [];
  const staffingGapByStore = [];
  let generationSuccesses = 0;

  for (const store of Array.isArray(stores) ? stores : []) {
    try {
      const generationRows = await readRpc(
        core,
        "list_schedule_generations",
        {
          p_store_id: store.id,
          p_week_start: weekStart
        }
      );
      generationsByStore.push(generationRows);
      generationSuccesses += 1;

      staffingGapByStore.push(
        await loadStoreStaffingGap(core, {
          storeId: store.id,
          weekStart,
          generationRows,
          now: () => nowValue
        })
      );
    } catch {
      generationsByStore.push(null);
      staffingGapByStore.push(null);
    }
  }

  const storeCount = Array.isArray(stores) ? stores.length : 0;
  const generationsComplete = generationSuccesses === storeCount;
  const anySourceOk =
    transferOk || generationSuccesses > 0 || storeCount === 0;

  if (!anySourceOk) {
    return {
      quality: "GAP",
      source: SOURCE_LABEL,
      asOf,
      message: "Nguồn Workforce tạm thời không khả dụng."
    };
  }

  const summary = summarizeWorkforceAttention({
    transferRows: transferOk ? transferRows : [],
    generationsByStore,
    staffingGapByStore
  });

  const complete =
    transferOk &&
    generationsComplete &&
    summary.staffingGapComplete;

  return {
    quality: complete ? "ACTUAL" : "ESTIMATE",
    source: SOURCE_LABEL,
    asOf,
    staffingGapCount: summary.staffingGapCount,
    unresolvedCount: summary.unresolvedCount,
    message: complete
      ? "Staffing gap = số nhu cầu ACTIVE có phân công thấp hơn minimum_headcount. Chưa xử lý = yêu cầu chuyển PENDING + lịch DRAFT/REVIEWED."
      : "Một phần nguồn Workforce chưa khả dụng; số chưa xử lý là tối thiểu từ các nguồn đọc được. Staffing gap chỉ hiển thị khi đủ read model cho toàn bộ cửa hàng."
  };
}
