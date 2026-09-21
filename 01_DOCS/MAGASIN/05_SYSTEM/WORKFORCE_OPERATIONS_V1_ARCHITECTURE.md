# MAGASIN — Workforce Operations V1 Architecture

**Date:** 2026-09-21  
**Status:** OWNER APPROVED / ARCHITECTURE LOCKED / IMPLEMENTATION NOT YET RELEASED  
**Purpose:** giảm tải quản lý nhân sự hằng ngày bằng một Workforce core tối giản, bám đúng cách MAGASIN vận hành thật.

## 1. North Star

```text
NHÂN VIÊN ĐĂNG KÝ KHẢ NĂNG LÀM TUẦN SAU
→ CHỦ NHẬT MANAGER XẾP LỊCH + PUBLISH
→ THỨ HAI NHÂN VIÊN LÀM THEO LỊCH
→ ĐỔI CA / CHO CA NẾU CẦN
→ NHÂN VIÊN TỰ KHAI GIỜ CHẤM CÔNG
→ HỆ THỐNG SO SÁNH VỚI LỊCH
→ MANAGER CHỈ XỬ LÝ NGOẠI LỆ
→ CONFIRMED WORK TIME
→ PAYROLL
→ NHÂN VIÊN TỰ KIỂM TRA LƯƠNG
```

Owner đứng ngoài luồng bình thường. Owner chỉ can thiệp khi có ngoại lệ vượt quyền Manager.

## 2. Five-Step re-application

### QUESTION
Workforce V1 tồn tại để giảm thời gian Owner/Manager dành cho đăng ký lịch, xếp lịch, đổi/cho ca, chấm công, kiểm tra thông tin nhân viên và giải đáp lương.

### DELETE
Không mở rộng HRM chung. Loại/defer khỏi V1:
- staffing-demand / “thiếu ca - đủ ca” làm trung tâm;
- AI tự quyết người nào phải làm ca nào;
- realtime check-in/check-out;
- GPS/geofence;
- tuyển dụng;
- Academy;
- performance/KPI phức tạp;
- disciplinary automation;
- dashboard không dẫn đến hành động;
- duplicate Owner/Manager/Employee business logic;
- auto payroll finalization;
- auto penalty/deduction.

Existing staffing-gap/demand code có thể giữ vì backward compatibility nhưng không còn là canonical Workforce V1 flow.

### SIMPLIFY
Workforce V1 chỉ có 6 capability:
1. Xếp lịch tuần;
2. Đổi ca;
3. Cho ca;
4. Chấm công bằng chọn giờ;
5. Thông tin nhân viên;
6. Payroll/self-check.

### ACCELERATE
Reuse tối đa implementation hiện có:
- Employee availability;
- Manager schedule/review/publish;
- Employee published schedule;
- Swap;
- Give;
- notifications/outbox;
- schedule-linked attendance primitives;
- existing Manager/Employee surfaces.

Không rebuild nếu capability hiện có đúng.

### AUTOMATE
Chỉ automate phần đã ổn định:
- reminder đăng ký availability;
- validation overlap / >2 ca/ngày / availability mismatch;
- publish notification;
- swap/give validation;
- attendance anomaly detection;
- payroll draft from confirmed work time;
- employee self-service read.

Không automate quyền quyết định của Manager/Owner trước khi rule được chứng minh.

## 3. Weekly scheduling lifecycle

Timezone canonical: **Asia/Ho_Chi_Minh**.

```text
MONDAY → SATURDAY
Employee registers next-week availability

SUNDAY
Registration closes
→ Manager builds next-week schedule
→ System validates
→ Manager reviews
→ Manager publishes

NEXT MONDAY
Published schedule becomes active
```

Không có business concept “ca chính thức” ở bước Employee registration. Employee chỉ khai availability. Manager mới tạo schedule assignment chính thức.

Trước publish, V1 dùng:
- REGISTERED / NOT_REGISTERED;
- SCHEDULED / NOT_SCHEDULED.

Không dùng “thiếu ca / đủ ca” trừ khi sau này Owner chốt staffing-demand rule riêng.

## 4. Canonical scheduling model

```text
EMPLOYEE
→ AVAILABILITY
→ SCHEDULE
→ SCHEDULE_ASSIGNMENT
→ PUBLISH
→ EMPLOYEE WEEKLY SCHEDULE
```

Manager owns scheduling decision. System owns validation.

Validation tối thiểu:
- assignment nằm trong availability nếu rule yêu cầu;
- không overlap;
- không quá 2 ca/ngày;
- không cùng giờ ở hai cửa hàng;
- employee ACTIVE;
- schedule ownership/audit rõ;
- published schedule không bị sửa im lặng.

## 5. Swap — Đổi ca

```text
A has assignment X
B has assignment Y
→ request swap
→ peer accepts
→ server validates both resulting assignments
→ Manager approves when required
→ assignments swap atomically
→ official schedules refresh
```

Canonical statuses:
- REQUESTED
- PEER_ACCEPTED
- APPROVED
- APPLIED
- REJECTED
- CANCELLED
- EXPIRED

Swap là two-way exchange.

## 6. Give — Cho ca

```text
A has assignment X
→ A offers X
→ eligible B claims/accepts
→ server validates B
→ Manager approves
→ assignment transfers A → B atomically
→ official schedules refresh
```

Canonical lifecycle keeps existing Owner-approved rule:

`RECIPIENT_ACCEPTS_THEN_MANAGER_APPROVES`

Statuses:
- OPEN / PENDING_RECIPIENT
- CLAIMED / PENDING_MANAGER
- APPROVED
- APPLIED
- REJECTED
- CANCELLED
- EXPIRED

Give là one-way transfer.

## 7. Attendance — no check-in/check-out

**Workforce V1 không dùng realtime check-in/check-out.**

Employee chọn actual working time trên app:

```text
Published schedule assignment
→ Employee selects actual_start
→ Employee selects actual_end
→ Submit
→ System compares with scheduled_start/end
→ NORMAL or NEEDS_REVIEW
→ confirmed_work_time
```

Attendance canonical fields:
- employee_id
- schedule_assignment_id
- work_date
- scheduled_start
- scheduled_end
- actual_start
- actual_end
- submitted_at
- status
- note
- reviewed_by
- reviewed_at
- confirmed_start
- confirmed_end
- confirmed_minutes

Statuses:
- DRAFT
- SUBMITTED
- NORMAL
- NEEDS_REVIEW
- APPROVED
- ADJUSTED
- REJECTED

Existing realtime clock-in/out code must not remain the active Employee V1 flow after migration. It may remain only as backward-compatible/deprecated code until safely retired.

Attendance must bind to the **current assignment owner**. After Swap/Give APPLIED, old employee cannot submit attendance for that assignment; new owner can.

## 8. Attendance review rule

System compares scheduled vs submitted actual time.

- normal entry → can flow through configured safe validation;
- abnormal entry → Manager review;
- Manager may approve/adjust/reject;
- payroll must consume **confirmed work time**, never raw submitted time.

Deviation thresholds are configuration/business-rule data, not hard-coded assumptions in architecture.

## 9. Employee profile

V1 only stores/uses fields required for operation:
- name;
- phone;
- join date;
- primary store;
- level/role;
- active status;
- pay rule reference where permitted;
- payment-related operational fields only where required and protected.

Employee sees own profile. Manager sees scoped employees. Owner sees enterprise scope.

## 10. Payroll / employee self-check

```text
CONFIRMED WORK TIME
→ PAY RULE
→ PAYROLL PERIOD
→ PAYROLL ENTRY
→ Employee self-check
```

Employee may see:
- confirmed shifts/hours;
- adjustments;
- allowances;
- bonuses;
- deductions;
- estimated pay;
- finalized pay;
- paid amount;
- remaining amount.

Payroll lifecycle:
- ESTIMATED
- REVIEWED
- FINALIZED
- PAID

ESTIMATED must never be presented as FINALIZED. Raw submitted attendance must never directly become final pay.

## 11. Employee App V1

Canonical navigation:
- HÔM NAY
- LỊCH LÀM
  - lịch tuần này
  - đăng ký tuần sau
  - đổi ca
  - cho ca
- CHẤM CÔNG
- LƯƠNG
- CÁ NHÂN

## 12. Manager App V1

Canonical navigation:
- HÔM NAY
- XẾP LỊCH
  - availability
  - weekly schedule board
  - review
  - publish
  - swap/give queue
- CHẤM CÔNG
  - normal summary
  - needs review
- NHÂN VIÊN
- CÔNG / LƯƠNG

Manager “Hôm nay” is exception-first, not dashboard-first.

## 13. Canonical core objects

Minimal core:
- EMPLOYEE
- AVAILABILITY
- SCHEDULE
- SCHEDULE_ASSIGNMENT
- SHIFT_CHANGE_REQUEST or existing Swap/Give canonical stores
- ATTENDANCE
- PAYROLL_PERIOD
- PAYROLL_ENTRY
- NOTIFICATION / OUTBOX
- AUDIT LOG

Do not duplicate canonical ownership across role UIs.

## 14. End-to-end operating loop

```text
EMPLOYEE PROFILE
      ↓
AVAILABILITY
      ↓
MANAGER SUNDAY SCHEDULE
      ↓
VALIDATE
      ↓
PUBLISH
      ↓
EMPLOYEE WEEKLY SCHEDULE
      ↓
SWAP / GIVE if required
      ↓
FINAL ASSIGNMENT OWNER
      ↓
EMPLOYEE MANUAL-TIME ATTENDANCE
      ↓
NORMAL / NEEDS_REVIEW
      ↓
CONFIRMED WORK TIME
      ↓
PAYROLL
      ↓
EMPLOYEE SELF-CHECK
```

## 15. Stability requirement

Architecture is not accepted as production-ready merely because individual features pass.

Final delivery requires:
1. unit/contract gates;
2. integration regressions;
3. full cross-role browser E2E;
4. failure/recovery E2E;
5. exact post-merge E2E recheck;
6. cold/reload E2E recheck;
7. relevant legacy Workforce regression remains green.

Canonical E2E contract:
`WORKFORCE_OPERATIONS_V1_E2E_ACCEPTANCE_CONTRACT.md`.

## 16. Release policy

Architecture is **OWNER APPROVED / LOCKED**.

Implementation plan is staged at:
`WORKFORCE_OPERATIONS_V1_EXECUTION_PLAN.md`.

This architecture lock does **not** by itself authorize Robot execution of TASK-090 onward. Existing PFC queue/cursor remains unchanged until Owner explicitly releases the Workforce plan.
