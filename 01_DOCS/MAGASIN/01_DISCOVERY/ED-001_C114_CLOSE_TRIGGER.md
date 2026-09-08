# ED-001 — C114 Close Trigger

## Purpose
Ghi nhận evidence C114 về điều kiện chuyển dữ liệu từ `CHƯA CHỐT` → `ĐÃ CHỐT`.

## Owner-confirmed evidence

| Data domain | Close trigger | Classification |
|---|---|---|
| Doanh thu | Owner chốt | TARGET / DECISION |
| Tiền mặt | GM hoặc Owner chốt | TARGET / DECISION |
| Tồn kho | GM kiểm tra rồi chốt | TARGET / DECISION |
| Chấm công | GM kiểm tra rồi chốt | TARGET / DECISION |
| Lương | GM kiểm tra rồi chốt | TARGET / DECISION |
| Chi phí | GM hoặc Owner chốt | TARGET / DECISION |
| Công nợ nhà cung cấp | GM kiểm tra rồi chốt | TARGET / DECISION |

## Common prerequisite

Trước khi chốt một kỳ dữ liệu, phải hoàn tất kiểm tra/đối soát cần thiết.

Classification: `TARGET / DECISION`.

## Important distinction

C114 mô tả **target-state governance**. Đây không phải bằng chứng rằng hệ thống hiện tại đã thực thi các close trigger này. Hiện trạng trước đó ghi nhận chưa có cơ chế khóa dữ liệu sau chốt.

C114 phải được đọc cùng C111–C113:

- C111: xác định kỳ chốt của từng nhóm dữ liệu.
- C112: sau chốt Owner sửa trực tiếp bản ghi cũ và Audit lưu thay đổi.
- C113: sau chốt chỉ Owner được sửa.
- C114: xác định actor/điều kiện làm dữ liệu chuyển sang trạng thái `ĐÃ CHỐT`.

## Discovery status

C114 là evidence đã được Owner xác nhận. Không tự động biến thành Business Rule cho đến Phase P2.
