# Procurement V2/V3 — QA iteration log

Ngày: 2026-09-16

## Mục tiêu V2 — nghiệp vụ nhập hàng

Hoàn thiện luồng Nhập hàng cho kế toán, dùng `*ĐỊNH GIÁ` làm nguồn giá/quy cách tham chiếu; đơn vị tồn chuẩn chỉ dùng `g`, `ml`, hoặc `cái` khi là hàng đếm chiếc không có hệ số quy đổi phù hợp.

### Iteration 1 — baseline V2

- Branch: `feat/procurement-accounting-ux-v2`.
- GitHub Actions run `35109770984` / run #8.
- Static audit: PASS.
- Local branch HTTP smoke: PASS.
- Playwright + database smoke: PASS.
- Console errors: 0.
- Page errors: 0.
- HTTP 5xx: 0.

### Data audit — quy cách sai gây khó dùng

Phát hiện hai quy cách placeholder không khớp `*ĐỊNH GIÁ`:

- `BB016 Bọc 1 Ly` — `Bao 30kg`.
- `BB017 Bọc 2 Ly` — `Bao 30kg`.

Cả hai chưa từng được sử dụng trong dòng đơn nhập (`item_count = 0`), nên đã chuyển `INACTIVE`; lịch sử giao dịch không bị thay đổi. Migration: `20260916152000_procurement_package_cleanup_v3.sql`.

GitHub Actions run `35110212835` / run #9: PASS.

### Iteration 2 — tăng độ phủ test nguồn định giá

Bổ sung gate cho:

- 55 hàng hóa hiển thị.
- 51/55 hàng có nguồn tham chiếu.
- 4 hàng chưa có nguồn đúng tập: `BB004`, `BTP003`, `NL012`, `NL025`.
- Chọn hàng có nguồn phải tự chọn mode `__REFERENCE__`.
- Giá và số lượng quy cách tự điền.
- Quy đổi tồn chuẩn hiển thị đúng.
- `BB015`, `BB007`, `BB008` phải là `g`.
- Không còn active package `Bao 30kg` sai cho `BB016/BB017`.
- Không có overpaid order, số dư âm, đơn rỗng hay lệch allocation thanh toán.

GitHub Actions run `35110333087` / run #10: **FAIL 1 gate**.

Lỗi:

`reference_source_visible` — dòng hàng hiển thị giá/quy cách nhưng chưa ghi rõ nguồn tham chiếu ngay dưới mặt hàng.

Ảnh hưởng: không sai tính toán, nhưng kế toán khó phân biệt đâu là giá tham chiếu và đâu là giá hóa đơn thực tế.

### Fix V2

Commit `b20c290a5ca935603ea1ba45a76b11a9e90655a5` bổ sung nhãn nguồn rõ ràng tại thời điểm đó.

### Iteration 3 — retest sau fix V2

GitHub Actions run `35110676494` / run #11: **PASS**.

- Static audit: PASS, 0 errors, 0 warnings.
- E2E: PASS toàn bộ gate.
- Canonical units: PASS — 55 sản phẩm chỉ dùng `g/ml/cái`.
- Reference count: PASS — 51.
- Missing reference set: PASS — 4 mặt hàng đúng danh sách.
- Placeholder packages retired: PASS.
- Console errors: 0.
- Page errors: 0.
- HTTP 5xx: 0.

### Database gate V2

- Products: 55.
- Active reference rows: 51.
- `g`: 31 sản phẩm.
- `ml`: 10 sản phẩm.
- `cái`: 14 sản phẩm.
- Invalid reference rows: 0.
- Duplicate references: 0.
- Invalid base units: 0.
- Invalid active package factors: 0.
- Misleading active `Bao 30kg` packages for BB016/BB017: 0.

V2 được merge vào `main` qua PR #31. Production QA run `35111189564` / run #13: PASS.

---

## Mục tiêu V3 — UI/UX kế toán ổn định và thuần tiếng Việt

Branch: `feat/procurement-ui-polish-v3`.

Yêu cầu đã chốt với người dùng:

- Giao diện business app sạch, ít nhiễu, dùng **Be Vietnam Pro**.
- Form tạo đơn là workspace rộng, không còn cảm giác popup chật.
- Không đưa tên sheet `*ĐỊNH GIÁ` hoặc thuật ngữ kỹ thuật của nguồn dữ liệu ra giao diện người dùng.
- Hiển thị bằng ngôn ngữ nghiệp vụ: `Giá tham khảo`, `Quy cách mua`, `Số lượng`, `Giá hóa đơn`, `Quy đổi kho`, `Tạm tính`, `Chênh lệch giá`, `Tổng tiền nhập`.
- Mã hàng vẫn giữ để tra cứu nhưng đóng vai trò phụ.
- Cột nhập và vùng helper phải có kích thước ổn định; thay đổi số lượng/giá không được làm các ô nhảy qua lại.
- Giá tham khảo chỉ hỗ trợ đối chiếu; giá thực tế luôn lấy từ hóa đơn kế toán nhập.

### V3 Iteration 1 — visual redesign

Thay đổi:

- Font stack ưu tiên `Be Vietnam Pro`.
- Palette navy/xám nhạt, border và shadow nhẹ.
- Input/button/card/table giảm độ nặng thị giác.
- Workspace đơn nhập rộng 1500px trên desktop.
- Grid dòng hàng có cột cố định và helper area cố định.
- Việt hóa lớp hiển thị giá/quy cách nguồn thành `Giá tham khảo`.
- Quy đổi số lượng thân thiện: ví dụ `1000 g` → `1 kg`, `1000 ml` → `1 lít` ở lớp hiển thị; dữ liệu chuẩn trong DB không đổi.
- Form luôn mở ở đầu nội dung (`scrollTop = 0`).

GitHub Actions run `35113511034` / run #14: **FAIL**.

Lỗi ghi nhận:

1. `reference_missing_badges` — test cũ còn đòi text `Chưa có nguồn`, trong khi UI mới đã đổi thành `Chưa có giá tham khảo`.
2. `reference_source_visible` — test cũ còn đòi literal `*ĐỊNH GIÁ`, trái với yêu cầu V3 là không lộ tên sheet kỹ thuật.

Phân loại: **stale QA expectation**, không phải lỗi tính toán/DB.

### V3 Fix 1 — đồng bộ QA với UX mới

- Sửa E2E để xác nhận `Giá tham khảo:` và đồng thời cấm literal `*ĐỊNH GIÁ` trên màn hình.
- Sửa gate 4 mặt hàng thiếu nguồn theo nhãn `Chưa có giá tham khảo`.
- Thêm robot riêng `ui-polish-smoke.mjs` để kiểm tra typography, raw source leakage, layout shift và nội dung tiếng Việt.

GitHub Actions run `35113735569` / run #15: **PASS**.

Gate UI quan trọng:

- `typography_be_vietnam_pro`: PASS.
- `no_raw_source_name`: PASS.
- `dialog_opens_at_top`: PASS.
- `entry_layout_stable`: PASS — delta vị trí/kích thước của product/package/qty/price/base/total đều bằng `0` khi đổi số lượng và giá.
- `line_height_stable`: PASS — 112px.
- `human_reference_copy`: PASS.
- `catalog_vietnamese_copy`: PASS.
- Console errors: 0.
- Page errors: 0.

### Visual review sau run #15

Ảnh QA cho thấy còn các điểm có thể cải thiện:

- Dialog cao 900px tạo khoảng trống không cần thiết khi đơn ít dòng.
- Header dòng hàng còn nhãn kỹ thuật cũ: `QUY CÁCH NHẬP`, `SL`, `ĐƠN GIÁ`, `QUY ĐỔI TỒN`, `THÀNH TIỀN`.
- Label tìm kiếm còn dài.
- Tổng kết còn `Cảnh báo giá` / `Tổng đơn nhập` thay vì từ ngữ kế toán thân thiện hơn.
- Với dữ liệu test cực đoan, badge chênh lệch có thể hiện phần trăm rất dài như hàng triệu %, gây xấu giao diện.

### V3 Fix 2 — polish cuối

Đã sửa:

- Workspace desktop cao cố định hợp lý hơn: 790px ở viewport test 1600×1000; vẫn chuyển full-height ở màn hình hẹp.
- Header dòng hàng đổi thành:
  - `Hàng hóa`
  - `Quy cách mua`
  - `Số lượng`
  - `Giá hóa đơn`
  - `Quy đổi kho`
  - `Tạm tính`
- `Lọc danh sách hàng trong các dòng` → `Tìm nhanh hàng hóa`.
- `Cảnh báo giá` → `Chênh lệch giá`.
- `Tổng đơn nhập` → `Tổng tiền nhập`.
- Trạng thái giá chuyển thành badge nhỏ, màu dịu và không làm thay đổi kích thước dòng.
- Chênh lệch cực đoan không còn hiển thị phần trăm dài; thay bằng `Chênh lệch rất lớn`.

### V3 Iteration 2 — final branch gate

GitHub Actions run `35114436267` / run #18: **PASS toàn bộ**.

Business/E2E gates:

- App/tabs/report: PASS.
- 55 product rows: PASS.
- 4 missing-reference products: PASS.
- Reference prefill and conversion: PASS.
- Order total calculation: PASS.
- DB overpayment/negative balance/empty order/payment allocation: PASS.
- Canonical units: PASS.
- Reference rows: 51, đúng missing set: PASS.
- Console errors: 0.
- Page errors: 0.
- HTTP 5xx: 0.

UI polish gates:

- `typography_be_vietnam_pro`: PASS.
- `no_raw_source_name`: PASS.
- `dialog_opens_at_top`: PASS.
- `desktop_workspace_size`: PASS — `{x:50,y:105,width:1500,height:790}`.
- `accounting_column_labels`: PASS.
- `quick_search_label`: PASS.
- `human_reference_copy`: PASS.
- `human_package_copy`: PASS.
- `entry_layout_stable`: PASS — tất cả layout delta bằng `0`.
- `line_height_stable`: PASS — 112px.
- `extreme_price_message`: PASS — `Chênh lệch rất lớn`.
- `summary_vietnamese_copy`: PASS.
- `catalog_vietnamese_copy`: PASS.
- Console/page errors: 0.

## Kết luận trước merge V3

Branch đạt các gate nghiệp vụ, dữ liệu, layout stability và visual-copy đã thống nhất. Không thay đổi lịch sử đơn nhập hay logic công nợ; V3 chỉ cải thiện lớp giao diện/UX và tăng QA chống regression.
