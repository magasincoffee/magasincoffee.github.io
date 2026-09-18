const SOURCE_LABEL =
  "get_manager_transfer_requests + list_schedule_generations";

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
  generationsByStore = []
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

  return {
    staffingGapCount: null,
    unresolvedCount: pendingTransfers + unpublishedGenerations,
    pendingTransfers,
    unpublishedGenerations
  };
}

async function readRpc(core, name, args) {
  const result = await core.supabase.rpc(name, args);
  if (result?.error) throw result.error;
  return Array.isArray(result?.data) ? result.data : [];
}

export async function loadWorkforceAttention(
  core,
  {
    weekStart = core?.date?.monday?.(),
    now = () => new Date()
  } = {}
) {
  const asOf = now().toISOString();

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
  let generationSuccesses = 0;

  for (const store of Array.isArray(stores) ? stores : []) {
    try {
      generationsByStore.push(
        await readRpc(
          core,
          "list_schedule_generations",
          {
            p_store_id: store.id,
            p_week_start: weekStart
          }
        )
      );
      generationSuccesses += 1;
    } catch {
      generationsByStore.push(null);
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
    generationsByStore
  });

  const complete = transferOk && generationsComplete;
  return {
    quality: complete ? "ACTUAL" : "ESTIMATE",
    source: SOURCE_LABEL,
    asOf,
    staffingGapCount: null,
    unresolvedCount: summary.unresolvedCount,
    message: complete
      ? "Staffing gap chưa có read model kiểm chứng; chưa hiển thị số. Chưa xử lý = yêu cầu chuyển PENDING + lịch DRAFT/REVIEWED."
      : "Một phần nguồn Workforce chưa khả dụng; số chưa xử lý là tối thiểu từ các nguồn đọc được. Staffing gap chưa có read model kiểm chứng."
  };
}
