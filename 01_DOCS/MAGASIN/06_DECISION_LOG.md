# MAGASIN Decision Log

Ghi nhận các quyết định quản trị đã được Owner/MAGASIN chốt. Decision có thể trở thành nguồn của Business Rule khi nội dung đủ rõ.

| ID | Date | Decision | Scope | Reason | Impact | Approved by | Status |
|---|---|---|---|---|---|---|---|
| DEC-001 | 2026-09-04 | Enterprise Discovery là nguồn gốc; thứ tự chuẩn: Discovery → Business Rules → SOP → Data Model → System → Webapp | Enterprise | Chuẩn hóa toàn bộ Digital Transformation | Ảnh hưởng tất cả domain/system | Owner | APPROVED |
| DEC-002 | 2026-09-18 | Thực hiện MAGASIN Business OS V1 trong 21 ngày theo Five-Step Algorithm; dùng micro-task, test/fix/regression/E2E và Supervisor Robot để tự tiếp tục; Discovery vẫn gate theo từng vertical slice | Enterprise / Delivery / Automation | Rút cycle time nhưng không bỏ qua nghiệp vụ và approval boundary | Thay đổi execution model, task/state, QA và local automation | Owner | APPROVED |
| DEC-003 | 2026-09-18 | Tạm hoãn triển khai SOP/Công việc/Task; ưu tiên hoàn thiện Lịch làm dựa trên Lịch Đk Tuần, Lịch làm hàng tuần và Workforce hiện hữu: quản lý xem/chỉnh/phân bổ, robot xếp lịch nháp, nhân viên đăng ký/xem lịch, chấm công, cho/đổi ca, cập nhật và thông báo cho người liên quan | Workforce / Schedule / Attendance / Delivery | Hoàn thiện luồng lịch làm thực tế trước khi mở write-capable SOP/Task workflow | TASK-026 chuyển DEFERRED_BY_OWNER; mở TASK-027–TASK-035; DST-001..DST-006 vẫn chưa được chọn | Owner | APPROVED |
