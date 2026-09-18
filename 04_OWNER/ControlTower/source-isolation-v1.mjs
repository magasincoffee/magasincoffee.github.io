function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function fallbackSection({ source, message, now }) {
  return {
    quality: "GAP",
    source: cleanText(source) || null,
    asOf: now().toISOString(),
    message: cleanText(message) || "Nguồn dữ liệu tạm thời không khả dụng."
  };
}

export async function loadSectionSafely(
  loader,
  {
    source = null,
    message = "Nguồn dữ liệu tạm thời không khả dụng.",
    now = () => new Date()
  } = {}
) {
  if (typeof loader !== "function") {
    return fallbackSection({ source, message, now });
  }

  try {
    const section = await loader();
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      return fallbackSection({ source, message, now });
    }
    return section;
  } catch {
    return fallbackSection({ source, message, now });
  }
}
