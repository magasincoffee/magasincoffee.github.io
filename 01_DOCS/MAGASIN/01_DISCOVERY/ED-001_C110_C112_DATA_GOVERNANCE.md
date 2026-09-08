# ED-001 — C110–C112 Data Governance Evidence

## Purpose

Lưu riêng evidence của Discovery C110–C112 để tránh làm thay đổi các record discovery trước đó. Nội dung này chưa phải Business Rule hay System Specification.

## C110 — Data Audit

Owner xác nhận khi dữ liệu quan trọng bị sửa, hệ thống cần lưu:

- Người sửa
- Thời gian sửa
- Giá trị/dữ liệu trước khi sửa
- Giá trị/dữ liệu sau khi sửa
- Lý do sửa

Phạm vi áp dụng: nhân viên, chấm công, lương, tồn kho, doanh thu, chi phí, công nợ, khuyến mãi/voucher, khách hàng và các dữ liệu khác.

Classification: `TARGET / DECISION`

## C111 — Data Close / Lock

Mục tiêu close/lock được Owner xác nhận:

| Dữ liệu | Cấp chốt |
|---|---|
| Doanh thu | Ngày + tháng |
| Tiền mặt | Ngày |
| Tồn kho | Ngày + cuối tháng |
| Chấm công | Theo kỳ lương |
| Lương | Hai kỳ: 1–15 và 16–cuối tháng |
| Chi phí | Tháng |
| Công nợ nhà cung cấp | Tuần |

Sau khi dữ liệu đã chốt: **chỉ Owner được sửa**.

Quyền chốt dữ liệu: **Quản lý tổng + Chủ**.

Lưu ý: đây là target-state. Hiện trạng trước Discovery là dữ liệu chưa được khóa sau chốt.

Classification: `TARGET / DECISION`

## C112 — Post-close Correction

Khi dữ liệu đã chốt nhưng phát hiện sai:

- Owner sửa trực tiếp dữ liệu cũ.
- Hệ thống phải lưu Audit.
- Không yêu cầu tạo phiếu/yêu cầu điều chỉnh trước.
- Owner xác nhận `Giá trị sau` là thông tin bắt buộc của thao tác điều chỉnh.

C112 phải được đọc cùng C110. C110 vẫn yêu cầu audit đầy đủ gồm người sửa, thời gian, trước/sau và lý do; việc chọn `Giá trị sau` ở C112 không làm giảm phạm vi audit.

Classification: `TARGET / DECISION`

## Governance note

C111 và C112 mô tả mục tiêu quản trị dữ liệu tương lai. Chưa chuyển thành Business Rule hoặc Data Model cho đến khi P0/P1 discovery được đóng và các workflow liên quan được xác minh.
