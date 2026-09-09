# MAGASIN — Financial Baseline

## Status

`OPEN — DISCOVERY`

## Purpose

Thiết lập baseline tài chính thực tế trước khi kết luận về giá bán, lợi nhuận hoặc nguyên nhân thiếu tiền cuối tháng.

## First objective

Xây dựng được một cầu nối rõ ràng:

`Opening Cash → Cash Inflows → Cash Outflows → Ending Cash`

và song song:

`Revenue → COGS → Operating Costs → Profit`

Sau đó reconcile hai mô hình để tìm khoảng cách giữa **profit** và **cash**.

## Existing evidence

Các discovery hiện có cho thấy MAGASIN đã có dữ liệu về doanh thu, COGS, lương, thuê, utilities, platform/delivery, marketing, AP và cash/bank/MoMo nhưng một số khoản chưa được ghi nhận đầy đủ hoặc chưa có close/reconciliation hoàn chỉnh.

Đặc biệt:

- COGS hiện còn dựa đáng kể trên purchase-based estimate thay vì actual consumption.
- Waste/variance chưa có ledger có cấu trúc.
- Một số operating costs chưa được ghi nhận chính thức.
- MAGASIN chưa tách hoàn toàn tiền doanh nghiệp và giao dịch Owner.
- Chưa có month-end financial close đầy đủ.

## Baseline work packages

### FB-01 — Monthly revenue

Cần lấy actual revenue theo tháng, sau reconciliation, không lấy gross marketplace number một cách mù quáng.

### FB-02 — Cash bridge

Cần xác định opening cash, từng nhóm inflow/outflow và ending cash thực tế.

### FB-03 — Cost structure

Cần lập complete cost taxonomy và actual paid/recognized amount theo tháng.

### FB-04 — COGS reliability

Cần xác định consumption, recipe, purchase price, conversion, waste và inventory variance đủ để tính COGS đáng tin cậy.

### FB-05 — Unit economics

Sau FB-01–04 mới tính product/channel/branch contribution.

### FB-06 — Break-even

Sau khi contribution và fixed cost đủ tin cậy mới tính break-even.

### FB-07 — Pricing diagnosis

Chỉ sau khi unit economics + break-even + market context đủ dữ liệu mới đánh giá giá hiện tại.

## Required output

```text
MONTHLY FINANCIAL BASELINE
├── Revenue
├── COGS
├── Contribution
├── Operating Costs
├── Profit
├── Cash Inflows
├── Cash Outflows
├── AP / Debt
├── Owner Contributions / Withdrawals
├── Ending Cash
└── Profit ↔ Cash Reconciliation
```

## Rule of evidence

Không điền số giả định vào actual financial baseline. Số chưa có phải đánh dấu `GAP`; số do ước tính phải đánh dấu `ESTIMATE`.

## Next action

Bắt đầu từ **FB-01 + FB-02**, vì đây là hai dữ liệu tối thiểu để xác định tại sao cuối tháng không còn tiền:

1. Doanh thu thực tế theo tháng.
2. Tiền đầu kỳ và tiền cuối kỳ theo tháng.
3. Các dòng tiền ra lớn trong tháng.

Sau đó mới đi sâu vào COGS, pricing và profitability.
