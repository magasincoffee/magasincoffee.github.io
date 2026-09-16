# Procurement V2 — QA iteration log

Ngày: 2026-09-16
Branch: `feat/procurement-accounting-ux-v2`

## Mục tiêu

Hoàn thiện luồng Nhập hàng cho kế toán, dùng `*ĐỊNH GIÁ` làm nguồn giá/quy cách tham chiếu; đơn vị tồn chuẩn chỉ dùng `g`, `ml`, hoặc `cái` khi là hàng đếm chiếc không có hệ số quy đổi phù hợp.

## Vòng kiểm tra

### Iteration 1 — baseline V2

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

### Iteration 2 — tăng độ phủ test `*ĐỊNH GIÁ`

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

`reference_source_visible` — dòng hàng hiển thị giá/quy cách nhưng chưa ghi rõ nguồn `*ĐỊNH GIÁ` ngay dưới mặt hàng.

Ảnh hưởng: không sai tính toán, nhưng kế toán khó phân biệt đâu là giá tham chiếu và đâu là giá hóa đơn thực tế.

### Fix

Commit `b20c290a5ca935603ea1ba45a76b11a9e90655a5` bổ sung nhãn rõ ràng:

`*ĐỊNH GIÁ · <giá> / quy cách · <quy cách nguồn> → <lượng tồn chuẩn>`

### Iteration 3 — retest sau fix

GitHub Actions run `35110676494` / run #11: **PASS**.

- Static audit: PASS, 0 errors, 0 warnings.
- E2E: PASS toàn bộ gate.
- `reference_source_visible`: PASS.
- Canonical units: PASS — 55 sản phẩm chỉ dùng `g/ml/cái`.
- Reference count: PASS — 51.
- Missing reference set: PASS — 4 mặt hàng đúng danh sách.
- Placeholder packages retired: PASS.
- Console errors: 0.
- Page errors: 0.
- HTTP 5xx: 0.

## Database gate sau migration

- Products: 55.
- Active `*ĐỊNH GIÁ` references: 51.
- `g`: 31 sản phẩm.
- `ml`: 10 sản phẩm.
- `cái`: 14 sản phẩm.
- Invalid reference rows: 0.
- Duplicate references: 0.
- Invalid base units: 0.
- Invalid active package factors: 0.
- Misleading active `Bao 30kg` packages for BB016/BB017: 0.

## Kết luận trước merge

Branch đạt gate kỹ thuật và nghiệp vụ hiện tại. Bước tiếp theo: PR → merge `main` → chạy production HTTP + E2E trên GitHub Pages và chỉ kết thúc khi production gate PASS.
