# MAGASIN — TASK-032 Published Schedule Feedback Loop V1

**Phase:** P1_SCHEDULE_FIRST_CORE_FLOW  
**Task:** TASK-032 — Published schedule → attendance/swap/notification integration gate  
**Date:** 2026-09-18  
**Status:** OWNER_BOUNDARY_AFTER_VERIFIED_CORE

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

### SFB-001 — Give lifecycle

Chọn một:

- `RECIPIENT_ACCEPTS_THEN_MANAGER_APPROVES`: người cho chọn người nhận → người nhận đồng ý → Manager duyệt → server chuyển ca.
- `MANAGER_APPROVES_DIRECTLY`: người cho chọn người nhận → Manager duyệt → server chuyển ca.
- `RECIPIENT_ACCEPTS_AUTO_TRANSFER`: người cho chọn người nhận → người nhận đồng ý → server validate và tự chuyển ca.
- `OTHER:<rule>`.

Không có default.

### SFB-002 — Notification production activation

Owner đã yêu cầu thông báo cho người liên quan, email và calendar. Phần còn thiếu là authorization production:

1. cho phép tạo/apply event-outbox primitive dùng chung cho schedule events;
2. chọn/ủy quyền nguồn tài khoản hoặc provider email;
3. nếu external calendar được bật, chọn/ủy quyền provider/calendar target;
4. cho phép cấu hình credentials ở secret store ngoài public Git.

Provider-neutral contract có thể draft offline; **apply production và provider activation vẫn cần Owner approval**.

## Current gate result

Safe core của TASK-032 đã VERIFIED. Không còn safe write-capable implementation nào cho Give/notification trước SFB-001/SFB-002.

Production schema/data/provider mutation trong TASK-032 đến thời điểm này: **none**.
