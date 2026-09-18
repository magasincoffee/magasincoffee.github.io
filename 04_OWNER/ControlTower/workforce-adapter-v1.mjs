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
    unresolvedCount: pendingTransfers + unpublishedGenerations,
    pendingTransfers,
    unpublishedGenerations
  };
}

export function summarizeStaffingGapSections(
  sections = [],
  expectedStoreCount = sections.length
) {
  if (
    !Array.isArray(sections) ||
    sections.length !== expectedStoreCount
  ) {
    return {
      complete: false,
      staffingGapCount: null
    };
  }

  let staffingGapCount = 0;
  for (const section of sections) {
    if (
      section?.quality !== "ACTUAL" ||
      !Number.isFinite(section?.staffingGapCount)
    ) {
      return {
        complete: false,
        staffingGapCount: null
      };
    }
    staffingGapCount += section.staffingGapCount;
  }

  return {
    complete: true,
    staffingGapCount
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

  stores = Array.isArray(stores) ? stores : [];

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

  for (const store of stores) {
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

  const staffingGapSections = [];
  for (let index = 0; index < stores.length; index += 1) {
    const generationRows = generationsByStore[index];
    if (!Array.isArray(generationRows)) {
      staffingGapSections.push(null);
      continue;
    }
    staffingGapSections.push(
      await loadStoreStaffingGap(
        core,
        {
          storeId: stores[index].id,
          weekStart,
          generationRows,
          now
        }
      )
    );
  }

  const storeCount = stores.length;
  const generationsComplete = generationSuccesses === storeCount;
  const staffingGap = summarizeStaffingGapSections(
    staffingGapSections,
    storeCount
  );
  const anyGapSourceOk = staffingGapSections.some(
    (section) => section?.quality === "ACTUAL"
  );
  const anySourceOk =
    transferOk ||
    generationSuccesses > 0 ||
    anyGapSourceOk ||
    storeCount === 0;

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

  const complete =
    transferOk &&
    generationsComplete &&
    staffingGap.complete;

  return {
    quality: complete ? "ACTUAL" : "ESTIMATE",
    source: SOURCE_LABEL,
    asOf,
    staffingGapCount: staffingGap.staffingGapCount,
    unresolvedCount: summary.unresolvedCount,
    message: complete
      ? "Staffing gap = nhu cầu ACTIVE có phân công dưới minimum_headcount. Chưa xử lý = yêu cầu chuyển PENDING + lịch DRAFT/REVIEWED."
      : "Một phần nguồn Workforce chưa khả dụng; số chưa xử lý là tối thiểu từ nguồn đọc được và staffing gap chỉ hiển thị khi đủ nguồn kiểm chứng."
  };
}
