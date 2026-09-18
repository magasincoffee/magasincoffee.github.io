# MAGASIN — TASK-032 Published Schedule Feedback Loop V1

**Phase:** P1_SCHEDULE_FIRST_CORE_FLOW  
**Task:** TASK-032 — Published schedule → attendance/swap/notification integration gate  
**Date:** 2026-09-18  
**Status:** VERIFIED_DECISIONS_COMPLETE

## Five-Step

### QUESTION

Sau khi Manager publish lịch APPROVED, employee feedback loop phải chạy thật:

```text
APPROVED schedule
→ Employee sees schedule
→ Attendance executes that schedule
→ Swap uses verified server workflow
→ Manager resolves Swap
→ affected official schedule refreshes
→ Give / notifications only when real primitive + approved rule exist
```

### DELETE

TASK-032 loại khỏi active flow:

- fake “Cho ca” dùng Swap RPC;
- UI nói lý do Swap không bắt buộc trong khi backend yêu cầu;
- auto-attendance tự tạo COMPLETED attendance từ lịch mà không cần clock-in/out;
- fake notification/email/calendar delivery;
- browser direct table write.

### SIMPLIFY

Reuse canonical assets:

- `06_EMPLOYEE/schedule/engine-v1.js`
- `06_EMPLOYEE/attendance/engine-v1.js`
- `06_EMPLOYEE/swap/engine-v1.js`
- `05_MANAGER/Workforce/swap-approval-v1.js`
- `05_MANAGER/Workforce/official-v1.js`

Verified server primitives:

- `list_my_approved_schedules_v2`
- `get_my_today_schedules`
- `clock_in_for_schedule`
- `clock_out_attendance`
- `manual_attendance_from_schedule`
- `list_shift_swap_candidates_v1`
- `submit_shift_swap_request`
- `list_my_shift_swaps_v2`
- `list_shift_swap_requests_v1`
- `approve_shift_swap`
- `reject_shift_swap`

### ACCELERATE

Run `35337154491` PASS toàn bộ:

- Employee Swap/Give integrity;
- Employee availability;
- Employee attendance schedule-linked;
- Manager Workforce + Swap approval + official schedule refresh;
- People/Shift Day-10 E2E;
- Control Tower browser regression.

### AUTOMATE

Automation chỉ bật khi evidence và primitive phù hợp.

`auto_attendance_from_approved_schedules` đã bị loại khỏi active Employee UI vì nó có thể tạo attendance `COMPLETED` theo planned time mà không có actual clock-in/out.

Notification/email/calendar không được giả lập vì live public schema/routine inventory chưa có notification/outbox/calendar/email primitive.

## Verified core

### Published schedule visibility — VERIFIED

Employee chỉ đọc schedule APPROVED qua canonical schedule reader.

### Attendance — VERIFIED

```text
APPROVED schedule
→ get_my_today_schedules
→ clock_in_for_schedule(schedule_id)
→ clock_out_attendance(attendance_id)
→ get_my_attendance_v2
```

Manual attendance vẫn phải match một schedule APPROVED qua `manual_attendance_from_schedule`.

### Swap — VERIFIED

Employee:

- chọn schedule của mình;
- chọn candidate từ server;
- bắt buộc nhập lý do;
- submit `submit_shift_swap_request`.

Manager:

- đọc PENDING bằng `list_shift_swap_requests_v1`;
- duyệt/từ chối qua `approve_shift_swap` / `reject_shift_swap`;
- approval cập nhật ownership của hai `work_schedules` atomically ở server;
- official schedule refresh sau resolution.

## Fail-closed boundaries

### Give — NOT_CONNECTED

Live public routine inventory không có Give/one-way shift-transfer primitive.

UI trước đây ẩn field nhưng vẫn gọi Swap RPC. Hành vi này đã bị xóa. “Cho ca” hiện fail-closed và không ghi dữ liệu giả.

### Notification / email / calendar — NOT_CONNECTED

Live public table/routine inventory không có notification, email, calendar, reminder hay outbox primitive.

Không commit credentials và không hiển thị trạng thái “đã gửi” giả.

## Owner decisions còn thiếu

### SFB-001 — Give lifecycle — APPROVED

Owner chốt ngày 2026-09-18:

`RECIPIENT_ACCEPTS_THEN_MANAGER_APPROVES`

Canonical flow:

```text
Người cho chọn ca + người nhận
→ Người nhận đồng ý
→ Manager duyệt
→ Server validate
→ Chuyển ownership ca
→ Refresh lịch các bên liên quan
```

Không auto-transfer trước khi người nhận đồng ý và Manager duyệt.

### SFB-002 — Notification production activation — APPROVED

Owner chốt ngày 2026-09-18:

- event-outbox production: **CHO PHÉP**;
- email source: **email MAGASIN**;
- external calendar: **CHƯA CẦN / DISABLED**;
- external credentials: **CHO PHÉP lưu trong secret store ngoài public Git**.

Implementation rule:

1. event-outbox được phép apply production;
2. notification core phải provider-neutral;
3. email adapter chỉ được bật khi account/provider MAGASIN cụ thể được cấu hình bằng secret store;
4. external calendar không nằm trong active scope;
5. tuyệt đối không commit credential vào repository public.

## Current gate result

Safe core của TASK-032 đã VERIFIED. SFB-001 và SFB-002 đều đã được Owner phê duyệt. Decision gate đóng; implementation được chia thành TASK-033 Give primitive, TASK-034 notification outbox production và TASK-035 email adapter/config.

Production schema/data/provider mutation trong TASK-032 đến thời điểm này: **none**.
