# MAGASIN — TASK-034 Notification Event-Outbox Production V1

**Phase:** P1_SCHEDULE_FIRST_CORE_FLOW  
**Task:** TASK-034 — Notification event-outbox production  
**Date:** 2026-09-18  
**Owner rule:** SFB-002 approved  
**Status:** IMPLEMENTED_PENDING_GATE

## Five-Step

### QUESTION

Sau khi weekly schedule flow đã đúng, mọi thay đổi quan trọng có thể phát một notification event durable, không phụ thuộc email provider và không làm mutation chính thất bại khi email chưa sẵn sàng không?

Canonical chain:

```text
canonical business mutation
→ database AFTER trigger
→ notification_outbox
→ in-app reader now
→ email worker later (TASK-035)
```

### DELETE

- không tạo notification subsystem riêng cho Employee/Manager;
- không gửi email trực tiếp từ business mutation;
- không backfill lịch sử production;
- không commit provider credential;
- không bật external calendar;
- không tạo fake SENT state.

### SIMPLIFY

Một durable table:

- `public.notification_outbox`

Canonical read RPC:

- `list_my_notifications_v1`

Provider-neutral email queue RPCs:

- `claim_notification_email_batch_v1`
- `complete_notification_email_v1`

Internal enqueue primitive:

- `enqueue_notification_v1`

Trigger sources:

- `work_schedules`
- `attendance`
- `shift_swaps`
- `shift_gives`

Employee reuse:

- existing `view-notice` in `06_EMPLOYEE/app/employee-v40.html`;
- `06_EMPLOYEE/notification/engine-v1.js` is read-only and calls only `list_my_notifications_v1`.

### ACCELERATE

Event set is limited to schedule critical path:

- `SCHEDULE_PUBLISHED`
- `SCHEDULE_CHANGED`
- `SCHEDULE_CANCELLED`
- `SCHEDULE_TRANSFERRED_IN`
- `SCHEDULE_TRANSFERRED_OUT`
- `CLOCK_OUT_REMINDER`
- `ATTENDANCE_CLOCKED_IN`
- `ATTENDANCE_CLOCKED_OUT`
- Swap request / Manager review / resolution
- Give request / recipient consent / Manager review / resolution

### AUTOMATE

Automation is durable but fail-closed:

- email events start as `PENDING`;
- queue claim uses `FOR UPDATE SKIP LOCKED`;
- stuck `PROCESSING` rows can be reclaimed after 10 minutes;
- failed rows retry after 5 minutes;
- max queue attempts = 5;
- actual email provider is not active in TASK-034.

Clock-out reminder:

```text
APPROVED schedule
→ enqueue CLOCK_OUT_REMINDER with available_at = schedule end in Asia/Ho_Chi_Minh
→ attendance check-out before delivery
→ pending reminder becomes CANCELLED
```

## Production migrations

Applied:

- `20260918114654_notification_outbox_v1`
- `20260918114903_notification_outbox_trigger_privileges_v1`

Repository artifacts:

- `07_DATABASE/migrations/20260918114654_notification_outbox_v1.sql`
- `07_DATABASE/migrations/20260918114903_notification_outbox_trigger_privileges_v1.sql`

No historical backfill was performed.

## Production security verification

Verified after migration:

- RLS policy exists on `notification_outbox`;
- direct table grants are service-role only;
- anon/authenticated do not have direct table access;
- `list_my_notifications_v1`: authenticated only, with explicit auth/audience checks;
- enqueue/claim/complete email queue primitives: service-role only;
- four SECURITY DEFINER trigger functions are not executable by anon/authenticated;
- Security Advisor no longer reports those four trigger functions as exposed RPCs.

Unrelated pre-existing advisor findings remain outside TASK-034 scope.

## Rollback-only integration smoke

No QA row was persisted.

### Publish + clock-out reminder

A synthetic APPROVED schedule was created inside a transaction and rolled back.

Result:

- `SCHEDULE_PUBLISHED`: 1
- `CLOCK_OUT_REMINDER`: 1
- both linked to the synthetic schedule;
- email status initially `PENDING`.

### Attendance cancellation

A synthetic COMPLETED attendance row was created inside a transaction and rolled back.

Result:

- `ATTENDANCE_CLOCKED_IN`: 1
- `ATTENDANCE_CLOCKED_OUT`: 1
- matching `CLOCK_OUT_REMINDER`: `CANCELLED`
- attendance confirmation events: email `SKIPPED`.

### Email queue state machine

Executed under `service_role` inside a rollback-only transaction.

Result:

```text
PENDING → PROCESSING → SENT
email_attempts = 1
email_sent_at != null
```

No email provider was invoked.

## QA gate

Required before DONE:

1. migration/static security contract PASS;
2. Employee notification browser regression PASS;
3. existing Employee Swap/Give/availability/attendance regressions PASS;
4. Manager Workforce regression PASS;
5. People/Shift Day-10 + Control Tower regression PASS;
6. Business OS + Supervisor state gates PASS after state advance.

## Definition of Done

TASK-034 is DONE only after CI is green, notification contract is marked CONNECTED_V1, and source-of-truth advances to TASK-035.
