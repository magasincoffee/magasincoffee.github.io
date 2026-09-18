function safeIso(now) {
  try {
    return now().toISOString();
  } catch {
    return null;
  }
}

export async function loadControlTowerSection(
  {
    sectionName,
    loader,
    source = null,
    failureMessage = null,
    now = () => new Date()
  } = {}
) {
  const label =
    typeof sectionName === "string" && sectionName.trim()
      ? sectionName.trim()
      : "Control Tower";

  if (typeof loader !== "function") {
    return {
      quality: "GAP",
      source,
      asOf: safeIso(now),
      message:
        failureMessage ||
        `Nguồn ${label} chưa có loader đọc dữ liệu hợp lệ.`
    };
  }

  try {
    return await loader();
  } catch {
    return {
      quality: "GAP",
      source,
      asOf: safeIso(now),
      message:
        failureMessage ||
        `Nguồn ${label} tạm thời không khả dụng; các khu vực khác vẫn tiếp tục tải.`
    };
  }
}
