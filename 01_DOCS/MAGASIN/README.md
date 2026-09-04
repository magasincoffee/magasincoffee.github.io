# MAGASIN — Enterprise Operating Source of Truth

Thư mục `MAGASIN/` là khu vực chuẩn để lưu kế hoạch, kết quả Discovery và các dữ liệu nghiệp vụ đã được chốt của MAGASIN Enterprise.

## Nguyên tắc

Toàn bộ quá trình chuyển đổi doanh nghiệp được thực hiện theo thứ tự:

**THỰC TẾ DOANH NGHIỆP → BUSINESS RULES → SOP → DATA MODEL → SYSTEM → WEBAPP**

Không lấy UI, database hoặc code hiện tại làm nguồn sự thật cho nghiệp vụ.

## Trạng thái thông tin

- **FACT** — đã xác nhận đang xảy ra trong MAGASIN.
- **ASSUMPTION** — giả định, chưa xác nhận.
- **RULE** — quy định doanh nghiệp đã được chốt.
- **DECISION** — quyết định quản trị đã được chốt để áp dụng.

## Quy tắc cập nhật

1. Discovery phải được ghi nhận trước khi chuyển thành Business Rule.
2. Business Rule phải được xác định trước khi thiết kế SOP.
3. SOP phải được xác định trước khi chốt Data Model.
4. Data Model phải được chốt trước khi thay đổi System/Webapp theo nghiệp vụ mới.
5. Mọi thay đổi sau khi chốt phải có nguồn gốc rõ ràng và cập nhật ngược các tầng bị ảnh hưởng.

## Tài liệu chuẩn

- `00_CURRENT_STATE.md` — trạng thái hiện tại và nhiệm vụ kế tiếp.
- `00_MASTER_PLAN.md` — bảng kế hoạch tổng thể và trạng thái thực hiện.
- `00_CHATGPT_CONTEXT.md` — context/handover chuẩn để nối tiếp công việc trong chat mới.
- `01_DISCOVERY/` — sự thật vận hành được khám phá và xác nhận.
- `02_BUSINESS_RULES/` — Business Rules đã chốt.
- `03_SOP/` — SOP đã chốt.
- `04_DATA_MODEL/` — Data Model và Data Dictionary đã chốt.
- `05_SYSTEM/` — yêu cầu và kiến trúc hệ thống phát sinh từ nghiệp vụ đã chốt.
- `06_DECISION_LOG.md` — quyết định quản trị quan trọng.
- `07_CHANGE_LOG.md` — lịch sử thay đổi của bộ nguồn sự thật.

## Trạng thái tổng quát

**Current phase: PHASE 0 — Enterprise Baseline / chuẩn bị Discovery**

**Current task: Enterprise Discovery #001 — MAGASIN Enterprise Baseline**

Khi mở chat mới, phải ưu tiên đọc `00_CURRENT_STATE.md`, `00_MASTER_PLAN.md`, `06_DECISION_LOG.md`, `07_CHANGE_LOG.md`, `00_CHATGPT_CONTEXT.md` rồi mới tiếp tục tài liệu/domain hiện tại.

Chưa chuyển sang thiết kế nghiệp vụ chi tiết cho đến khi Discovery có đủ bằng chứng và được xác nhận.
