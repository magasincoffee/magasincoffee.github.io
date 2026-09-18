# MAGASIN — Schedule-first Canonical Flow Contract V1

**Task:** TASK-029  
**Phase:** P1_SCHEDULE_FIRST_CORE_FLOW  
**Decision:** DEC-003  
**Date:** 2026-09-18  
**Status:** VERIFIED_CONTRACT

## Five-Step gate

### QUESTION

Weekly scheduling chỉ được xem là đúng khi chứng minh được một chuỗi vận hành duy nhất:

```text
Employee availability
→ Manager review/edit
→ Staffing demand / constraints
→ Robot DRAFT proposal
→ Manager allocation / adjustment
→ Server validation
→ Manager review
→ Manager publish
→ Official work_schedules
→ Employee schedule visibility
→ Attendance / give-shift / swap
→ affected-person notification
```

- Employee: khai báo khả năng làm và thực thi lịch đã publish.
- Manager: operating owner hằng ngày cho review, phân bổ, chỉnh draft và publish.
- Owner: policy / exception / attention; không phải daily scheduler.
- Robot: chỉ đề xuất trong rule đã có; không tự review/publish và không invent rule.

### DELETE

Loại khỏi **canonical ownership** ngay ở TASK-029:

- `04_OWNER/Workforce` không còn là canonical daily-scheduling business owner.
- Không cho nhiều Manager compatibility renderer cùng sở hữu một capability.
- Không coi `99_LEGACY/**` là active architecture.
- Không coi browser direct-write vào business table là canonical khi đã có permissioned RPC.
- Không mở dashboard/module ngoài schedule critical path.
- Không merge execution branch cũ đi trước Five-Step contract.

TASK-029 không xóa vật lý runtime đang phục vụ user. Physical consolidation diễn ra trong TASK-030/TASK-031 sau regression/E2E.

### SIMPLIFY

Một server-owned schedule chain, nhiều role projection:

| Stage | Canonical data |
|---|---|
| Availability | `employee_availability` |
| Staffing demand | `staffing_requirements` |
| Robot run | `schedule_generation_runs` |
| Draft allocation | `schedule_generation_assignments` |
| Official schedule | `work_schedules` |
| Shift change | `shift_swaps` |
| Execution evidence | `attendance` |

Role UI chỉ project/call capability; không sở hữu business truth riêng.

### ACCELERATE

- TASK-030: Employee weekly availability canonical slice.
- TASK-031: Manager allocation + Robot proposal + publish slice.
- TASK-032: Published schedule → attendance/swap/notification integration gate.

### AUTOMATE

Robot chỉ được tạo DRAFT/proposal, shortage/warning và hỗ trợ Manager chỉnh nhanh. Review/publish vẫn là explicit Manager action. Notification đứng downstream của mutation canonical đã commit.

## Canonical RPC boundaries — verified live 2026-09-18

### Employee availability
- `get_my_availability(p_week_start)`
- `save_my_availability(...)`
- `delete_my_availability(p_availability_id)`

### Manager availability review/edit
- `get_manager_weekly_availability(p_store_id,p_week_start)`
- `manager_update_employee_availability(...)`

### Staffing demand
- `get_workforce_staffing_requirements(p_store_id,p_week_start)`
- `upsert_workforce_staffing_requirement(...)`
- `delete_workforce_staffing_requirement(p_requirement_id)`

### Robot proposal / allocation
- `auto_generate_schedule_generation(...)`
- `list_schedule_generations(...)`
- `get_schedule_generation_assignments(p_generation_id)`
- `replace_schedule_generation_assignments(p_generation_id,p_assignments)`
- `validate_schedule_generation_v1(p_generation_id)`

### Review / publish / official schedule
- `review_schedule_generation(p_generation_id,p_decision)`
- `publish_schedule_generation(p_generation_id)`
- `get_manager_weekly_schedule(p_store_id,p_week_start)`
- `list_my_approved_schedules_v2(p_week_start)`

### Post-publish execution
- `submit_shift_swap_request(...)`
- `list_my_shift_swaps_v2()`
- `approve_shift_swap(p_swap_id)`
- `reject_shift_swap(p_swap_id,p_note)`
- `clock_in_for_schedule(p_schedule_id)`
- `clock_out_attendance(p_attendance_id)`

TASK-029 performs no production write, migration, backfill or permission change.

## Canonical module ownership

| Layer | Canonical ownership |
|---|---|
| Contract | `02_CORE/contracts/schedule-first-flow.v1.json` |
| Employee availability projection | `06_EMPLOYEE/availability/engine-v1.js` |
| Employee official schedule projection | `06_EMPLOYEE/schedule/engine-v1.js` |
| Manager daily scheduling projection | `05_MANAGER/Workforce/` target surface; current runtime compatibility stack is transitional until TASK-031 |
| Owner Workforce | policy / exception / attention projection only |
| Server truth | Supabase tables + permissioned RPCs above |

## Transitional debt to delete/consolidate in implementation slices

| Debt | Evidence | Task |
|---|---|---|
| Owner documented as canonical Workforce home | `04_OWNER/Workforce/README.md` | TASK-029 doc correction |
| Duplicate Manager review renderers | runtime loads `manager-workforce-live.js` and `manager-workforce-review-v2.js` | TASK-031 |
| Manager direct availability table update | `manager-workforce-review-v2.js` | TASK-031 |
| Multiple Manager demand compatibility files | `manager-workforce-demand-v*.js` | TASK-031 |
| Separate Manager robot helper without full publish ownership | `manager-workforce-auto.js` | TASK-031 |
| Owner demand/review/publish used as daily scheduler | `04_OWNER/Workforce/01-03` | TASK-031 replacement then attention-only |
| Legacy Workforce assets | `99_LEGACY/**` | excluded now; cleanup is non-critical |

## Invariants

1. One schedule truth lives in server data/RPCs, not role UI.
2. Manager is daily scheduler.
3. Owner is policy/exception/attention, not duplicate scheduler.
4. Availability is input; approved `work_schedules` is published output.
5. Robot output remains DRAFT until explicit Manager review/publish.
6. Browser writes use verified permissioned RPCs when available.
7. Registration and published schedule are distinct states.
8. Role UIs can share a capability but cannot implement separate business truth.
9. Public repo contains sanitized contracts/tests only.
10. Production schema/backfill remains Owner-gated.

## Definition of Done

- flow and role boundary documented;
- canonical tables and live RPC boundaries inventoried;
- duplicate ownership classified transitional/deferred;
- stale pre-reset implementation PR closed rather than merged;
- machine-readable contract + regression exist;
- source-of-truth can advance to TASK-030 without production mutation.
