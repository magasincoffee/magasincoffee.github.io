const SOURCE_CONTRACT = "reconciled daily revenue read model";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function failClosed({ quality = "GAP", source = SOURCE_CONTRACT, asOf, message }) {
  return {
    quality,
    source: text(source) || SOURCE_CONTRACT,
    asOf,
    message
  };
}

export function assessRevenueCandidate(
  candidate,
  { reportingDate, now = () => new Date() } = {}
) {
  const fallbackAsOf = now().toISOString();
  const source = text(candidate?.source) || SOURCE_CONTRACT;
  const asOf = text(candidate?.asOf) || fallbackAsOf;

  if (!candidate || typeof candidate !== "object") {
    return failClosed({
      source,
      asOf,
      message: "Chưa có bản ghi doanh thu đã đối chiếu cho ngày báo cáo."
    });
  }

  if (!text(reportingDate)) {
    return failClosed({
      source,
      asOf,
      message: "Thiếu ngày báo cáo để kiểm tra doanh thu đã đối chiếu."
    });
  }

  if (text(candidate.reportingDate) !== text(reportingDate)) {
    return failClosed({
      source,
      asOf,
      message: "Bản ghi doanh thu không khớp ngày báo cáo."
    });
  }

  if (candidate.trusted !== true) {
    return failClosed({
      source,
      asOf,
      message: "Nguồn doanh thu chưa được xác nhận là nguồn chính thức."
    });
  }

  if (text(candidate.reconciliationStatus).toUpperCase() !== "RECONCILED") {
    return failClosed({
      source,
      asOf,
      message: "Doanh thu chưa hoàn tất đối chiếu; không hiển thị số chưa chốt."
    });
  }

  const rawAmount = candidate.amount;
  if (
    rawAmount === null ||
    rawAmount === undefined ||
    (typeof rawAmount === "string" && !rawAmount.trim())
  ) {
    return failClosed({
      source,
      asOf,
      message: "Giá trị doanh thu đã đối chiếu không hợp lệ."
    });
  }

  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount < 0) {
    return failClosed({
      source,
      asOf,
      message: "Giá trị doanh thu đã đối chiếu không hợp lệ."
    });
  }

  return {
    quality: "ACTUAL",
    source,
    asOf,
    amount,
    message: "Doanh thu chính thức sau đối chiếu cho ngày báo cáo."
  };
}

export async function loadReconciledRevenue(
  { reportingDate, reader, now = () => new Date() } = {}
) {
  const asOf = now().toISOString();

  if (typeof reader !== "function") {
    return failClosed({
      quality: "NOT_CONNECTED",
      asOf,
      message:
        "Chưa kết nối read model doanh thu đã đối chiếu; không dùng số gross/ước tính thay thế."
    });
  }

  try {
    const candidate = await reader({ reportingDate });
    return assessRevenueCandidate(candidate, { reportingDate, now });
  } catch {
    return failClosed({
      asOf,
      message: "Nguồn doanh thu đã đối chiếu tạm thời không khả dụng."
    });
  }
}
