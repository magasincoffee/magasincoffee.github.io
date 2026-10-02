# 05_SYSTEM

Khu vực lưu System Specification phát sinh từ Business Rules, SOP và Data Model đã chốt.

Bao gồm khi cần:

- Permission / Authorization
- Workflow
- RPC / API contract
- Domain Engine specification
- Integration specification
- Acceptance criteria

System không được trở thành nguồn quyết định nghiệp vụ thay cho Discovery/Rules/SOP.

## Current authority index — 2026-10-02

Khi mở một cuộc trò chuyện mới hoặc robot đọc dự án, **không chọn Source of Truth chỉ theo tên file hoặc ngày tạo**. Đọc status/lifecycle của đúng track trước.

### Active temporary execution authorities

Hiện chỉ có hai TEMP Source of Truth còn hoạt động trong thư mục này:

1. `EMPLOYEE_REGISTRATION_PRODUCTION_HARDENING_TEMP_SOURCE_OF_TRUTH.md`
   - Track: `MAGASIN_EMPLOYEE_REGISTRATION_PRODUCTION_HARDENING_V1`
   - Status: `ACTIVE / TEMPORARY EXECUTION AUTHORITY`
   - Chỉ dùng cho employee-registration hardening.

2. `WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md`
   - Track: `WORKFORCE_CROSS_STORE_SCHEDULING_V1`
   - Status: `XSTORE-011 BLOCKED / OWNER INPUT REQUIRED`
   - Là authority cho cross-store scheduling cho đến khi XSTORE-011 được hoàn tất và TEMP file được xóa theo lifecycle của chính track.

Không coi evidence/plan/acceptance của track đã đóng là task queue đang chạy.

### Closed / canonical references

Các track sau đã đóng hoặc là canonical reference và **không phải TEMP task queue mới**:

- `MAGASIN_AUTH_PRODUCTION_READINESS_SOURCE_OF_TRUTH.md` — AUTH-PROD closed / production-ready trong scope Auth & Onboarding;
- `MAGASIN_UI_UX_V2_SOURCE_OF_TRUTH.md` — UI/UX V2 architecture locked;
- `WORKFORCE_SCHEDULING_PRODUCTION_READINESS_V1_SOURCE_OF_TRUTH.md` — scheduling production-readiness canonical closed;
- `WORKFORCE_UI_UX_UNIFICATION_ACCEPTANCE_2026_10_01.md` — permanent acceptance cho UI/UX correction đã hoàn tất.

Các file `*_EVIDENCE.md`, `*_ACCEPTANCE.md`, task contract và migration history được giữ để truy vết, không được tự suy diễn thành task đang mở.

### Repository cleanup state

Cleanup audit hiện hành:

`REPOSITORY_CLEANUP_AUDIT_2026_10_02.md`

Audit này chỉ ghi nhận vệ sinh repository; nó **không thay thế authority của các project SOT**.
