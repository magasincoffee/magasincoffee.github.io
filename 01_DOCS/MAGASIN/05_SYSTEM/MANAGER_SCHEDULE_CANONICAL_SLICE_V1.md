# MAGASIN — TASK-031 Manager Schedule Canonical Slice V1

**Phase:** P1_SCHEDULE_FIRST_CORE_FLOW  
**Task:** TASK-031 — Manager allocation + robot proposal + publish slice  
**Date:** 2026-09-18  
**Status:** IMPLEMENTED_PENDING_E2E_GATE

## Five-Step

### QUESTION

Manager có thể hoàn thành daily scheduling loop bằng một active module duy nhất không:

```text
availability review/edit
→ staffing demand visibility
→ Robot DRAFT
→ Manager allocation adjustment
→ server validation
→ explicit review
→ explicit publish
→ official APPROVED schedule
```

### DELETE

TASK-031 loại khỏi active runtime:

- `manager-workforce-live.js`
- `manager-workforce-review-v2.js`
- `manager-workforce-demand-v4.js`
- `manager-workforce-auto.js`
- `manager-workforce-tabs-v1.js`
- `manager-workforce-day-header-fix-v2.js`

Các file compatibility vẫn có thể tồn tại làm reference nhưng không được runtime load.

Deep-link `/05_MANAGER/Workforce/` và `/05_MANAGER/Lich-lam/` không còn dùng `manager-v13-runtime.html`.

### SIMPLIFY

Active ownership nằm dưới một module:

```text
05_MANAGER/Workforce/
  engine-v1.js
  demand-v1.js
  review-v1.js
  draft-publish-v1.js
  official-v1.js
```

- demand: server-backed read projection;
- review: `get_manager_weekly_availability` + `manager_update_employee_availability`;
- robot/allocation: generation RPCs + DRAFT replacement + validation;
- publish: explicit Manager review/publish;
- official: `get_manager_weekly_schedule`.

Không direct-write business table từ browser.

### ACCELERATE

Reuse các component review/draft/official đã từng qua browser regression, chuyển ownership về canonical Manager module thay vì viết lại scheduler.

### AUTOMATE

Robot được phép gọi `auto_generate_schedule_generation` để tạo proposal DRAFT.

Robot không được tự gọi:

- `review_schedule_generation`;
- `publish_schedule_generation`.

Hai bước này chỉ chạy từ thao tác Manager explicit.

## Staffing demand permission boundary

Live inspection ngày 2026-09-18 xác nhận:

- `get_workforce_staffing_requirements`: dùng được để đọc;
- `upsert_workforce_staffing_requirement`: server function hiện enforce `OWNER_ONLY`;
- `delete_workforce_staffing_requirement`: server function hiện enforce `OWNER_ONLY`.

Do đó TASK-031 **không direct-write table và không sửa production permission** để giả vờ Manager có quyền.

Trong slice hiện tại:

- Manager nhìn thấy demand làm input cho scheduling;
- demand mutation fail-closed/read-only;
- thay đổi quyền production, nếu Owner muốn Manager trực tiếp sửa staffing demand, là boundary riêng và phải được phê duyệt trước khi apply.

Điều này không chặn allocation: Manager vẫn chỉnh assignment DRAFT bằng `replace_schedule_generation_assignments`.

## Canonical RPC set

### Review
- `get_manager_accessible_stores`
- `get_manager_weekly_availability`
- `manager_update_employee_availability`

### Demand
- `get_workforce_staffing_requirements` — read-only in Manager slice

### Robot / allocation
- `auto_generate_schedule_generation`
- `get_schedule_generation_assignments`
- `replace_schedule_generation_assignments`
- `validate_schedule_generation_v1`

### Review / publish
- `review_schedule_generation`
- `publish_schedule_generation`

### Official schedule
- `get_manager_weekly_schedule`

## Definition of Done

1. Manager runtime loads only canonical Workforce module for schedule capability.
2. Old compat Workforce scripts are not active.
3. Workforce and Lịch làm deep-links use canonical Manager runtime.
4. Availability edit uses server RPC.
5. Demand is server-backed and fail-closed read-only under current permissions.
6. Robot creates DRAFT without review/publish.
7. Manager can add/remove/edit DRAFT assignments and save through replacement RPC.
8. Server validation runs before/within review/publish lifecycle.
9. Explicit Manager actions drive REVIEWED then PUBLISHED.
10. Official schedule refreshes from server and shows APPROVED output.
11. Static + browser + existing People/Shift regressions pass.
12. No production schema/data/permission mutation in TASK-031.
