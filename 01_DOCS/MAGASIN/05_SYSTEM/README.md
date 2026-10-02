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

### Production release authority

Cross-project production delivery authority:

`PRODUCTION_RELEASE_GOVERNANCE_V1_SOURCE_OF_TRUTH.md`

Status: `ACTIVE / MANDATORY FOR ALL FUTURE PRODUCTION RELEASES`

This file governs how every production-impacting change reaches the live WebApp:

`Development branch → Preview/Staging → QA → Owner review → frozen exact RC → 00:00 Asia/Ho_Chi_Minh release → production smoke / rollback`

Important:

- production-impacting work must not be developed directly on `main`;
- Owner-visible changes must be reviewable before production;
- required QA must be green;
- Owner approval applies to an exact RC SHA;
- production release normally occurs at 00:00 Asia/Ho_Chi_Minh;
- rollback SHA must be recorded before release;
- failed production smoke must trigger rollback/recovery rather than improvised live patching;
- domain SOTs keep their business/task authority but may not weaken this production-release policy.

Future chats/robots that upgrade, repair, merge or deploy production must read this release SOT together with the relevant domain SOT.

### Active temporary execution authorities

Hiện có ba TEMP Source of Truth còn hoạt động trong thư mục này:

1. `EMPLOYEE_REGISTRATION_PRODUCTION_HARDENING_TEMP_SOURCE_OF_TRUTH.md`
   - Track: `MAGASIN_EMPLOYEE_REGISTRATION_PRODUCTION_HARDENING_V1`
   - Status: `ACTIVE / TEMPORARY EXECUTION AUTHORITY`
   - Chỉ dùng cho employee-registration hardening.

2. `WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md`
   - Track: `WORKFORCE_CROSS_STORE_SCHEDULING_V1`
   - Status: `XSTORE-011 BLOCKED / OWNER INPUT REQUIRED`
   - Là authority cho cross-store scheduling cho đến khi XSTORE-011 được hoàn tất và TEMP file được xóa theo lifecycle của chính track.

3. `WORKFORCE_SCHEDULING_UX_V2_TEMP_SOURCE_OF_TRUTH.md`
   - Track: `WORKFORCE_SCHEDULING_UX_V2`
   - Status: `SCHED-UI-000 DONE / SCHED-UI-001 READY / OWNER REVIEW DEFERRED TO SCHED-UI-016`
   - Design lock: `WORKFORCE_SCHEDULING_UX_V2_DESIGN_LOCK.md` — Owner approved 2026-10-02.
   - Chỉ sở hữu Scheduling UX V2: recurring staffing readability, guided Auto Schedule UX, cross-role time-band presentation, Employee availability CTA, professional role URLs và Owner scheduling parity.
   - Robot có thể chạy chuỗi kỹ thuật SCHED-UI-001→015 liên tục; Owner Preview gate được dời tới SCHED-UI-016.
   - Không thay thế XSTORE business authority và phải tuân `PRODUCTION_RELEASE_GOVERNANCE_V1_SOURCE_OF_TRUTH.md`.

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
