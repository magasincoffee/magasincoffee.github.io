const SOURCE_LABEL =
  "v_procurement_supplier_payables + v_procurement_order_summary";

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function summarizePayablesRows(payableRows = [], orderRows = []) {
  const totalDue = payableRows.reduce(
    (sum, row) => sum + finiteNumber(row?.balance_due),
    0
  );
  const overdueAmount = payableRows.reduce(
    (sum, row) => sum + finiteNumber(row?.overdue_balance),
    0
  );

  const activeOrders = orderRows.filter(
    (row) => String(row?.status || "").toUpperCase() !== "CANCELLED"
  );
  const openOrders = activeOrders.filter(
    (row) => finiteNumber(row?.balance_due) > 0
  ).length;
  const overdueOrders = activeOrders.filter(
    (row) => row?.is_overdue === true && finiteNumber(row?.balance_due) > 0
  ).length;

  return {
    totalDue,
    overdueAmount,
    openOrders,
    overdueOrders
  };
}

export async function loadProcurementPayables(
  client,
  { now = () => new Date() } = {}
) {
  if (!client?.from) {
    return {
      quality: "GAP",
      source: SOURCE_LABEL,
      asOf: now().toISOString(),
      message: "Không thể kết nối nguồn công nợ mua hàng."
    };
  }

  try {
    const [payablesResult, ordersResult] = await Promise.all([
      client
        .from("v_procurement_supplier_payables")
        .select("balance_due,overdue_balance"),
      client
        .from("v_procurement_order_summary")
        .select("balance_due,status,is_overdue")
    ]);

    if (payablesResult?.error) throw payablesResult.error;
    if (ordersResult?.error) throw ordersResult.error;

    return {
      quality: "ACTUAL",
      source: SOURCE_LABEL,
      asOf: now().toISOString(),
      ...summarizePayablesRows(
        Array.isArray(payablesResult?.data) ? payablesResult.data : [],
        Array.isArray(ordersResult?.data) ? ordersResult.data : []
      )
    };
  } catch {
    return {
      quality: "GAP",
      source: SOURCE_LABEL,
      asOf: now().toISOString(),
      message: "Nguồn công nợ mua hàng tạm thời không khả dụng."
    };
  }
}
