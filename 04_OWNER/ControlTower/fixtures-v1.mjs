export const healthyFixture = {
  context: {
    reportingDate: "2026-09-18",
    branchScope: "ALL",
    refreshedAt: "2026-09-18T05:00:00Z"
  },
  revenue: {
    quality: "ACTUAL",
    source: "SANITIZED_TEST_RECONCILED_REVENUE",
    asOf: "2026-09-18T05:00:00Z",
    amount: 1234500
  },
  payables: {
    quality: "ACTUAL",
    source: "SANITIZED_TEST_PROCUREMENT",
    asOf: "2026-09-18T05:00:00Z",
    totalDue: 850000,
    overdueAmount: 120000,
    openOrders: 4,
    overdueOrders: 1
  },
  workforce: {
    quality: "ACTUAL",
    source: "SANITIZED_TEST_WORKFORCE",
    asOf: "2026-09-18T05:00:00Z",
    staffingGapCount: 2,
    unresolvedCount: 1
  },
  inventory: {
    quality: "NOT_CONNECTED"
  },
  tasks: {
    quality: "NOT_CONNECTED"
  }
};

export const partialFixture = {
  context: {
    reportingDate: "2026-09-18",
    branchScope: "ALL"
  },
  revenue: {
    quality: "GAP",
    source: "SANITIZED_TEST_REVENUE",
    message: "Chưa hoàn tất đối chiếu."
  },
  payables: {
    quality: "ACTUAL",
    source: "SANITIZED_TEST_PROCUREMENT",
    totalDue: 250000,
    overdueAmount: 0,
    openOrders: 2,
    overdueOrders: 0
  }
};

export const errorFixture = {
  context: {
    reportingDate: "2026-09-18"
  },
  revenue: {
    quality: "GAP",
    message: "Nguồn doanh thu tạm thời không truy cập được."
  },
  payables: {
    quality: "NOT_CONNECTED"
  },
  workforce: {
    quality: "GAP",
    message: "Nguồn workforce tạm thời lỗi."
  }
};

export const emptyFixture = {
  context: {
    reportingDate: "2026-09-18",
    branchScope: "ALL"
  },
  revenue: {
    quality: "ACTUAL",
    source: "SANITIZED_TEST_RECONCILED_REVENUE",
    amount: 0
  },
  payables: {
    quality: "ACTUAL",
    source: "SANITIZED_TEST_PROCUREMENT",
    totalDue: 0,
    overdueAmount: 0,
    openOrders: 0,
    overdueOrders: 0
  },
  workforce: {
    quality: "ACTUAL",
    source: "SANITIZED_TEST_WORKFORCE",
    staffingGapCount: 0,
    unresolvedCount: 0
  }
};
