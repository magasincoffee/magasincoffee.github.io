function cleanText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function loadControlTowerSection(
  loader,
  {
    source = "Control Tower source",
    errorMessage = "Nguồn dữ liệu tạm thời không khả dụng.",
    now = () => new Date()
  } = {}
) {
  const fallback = () => ({
    quality: "GAP",
    source: cleanText(source) || "Control Tower source",
    asOf: now().toISOString(),
    message: cleanText(errorMessage) || "Nguồn dữ liệu tạm thời không khả dụng."
  });

  if (typeof loader !== "function") return fallback();

  try {
    const section = await loader();
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      return fallback();
    }
    return section;
  } catch {
    return fallback();
  }
}
