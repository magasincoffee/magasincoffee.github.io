# MAGASIN — TASK-033 Give Shift Production Primitive V1

**Phase:** P1_SCHEDULE_FIRST_CORE_FLOW  
**Task:** TASK-033 — Give Shift production primitive  
**Date:** 2026-09-18  
**Owner rule:** SFB-001 = `RECIPIENT_ACCEPTS_THEN_MANAGER_APPROVES`  
**Status:** VERIFIED

## Five-Step

### QUESTION

Một ca APPROVED có thể được chuyển một chiều cho người khác mà không giả lập bằng Swap và không vượt business rule đã duyệt không?

Canonical lifecycle:

```text
Giver selects APPROVED schedule
→ server returns valid recipients
→ giver submits Give request
→ PENDING_RECIPIENT
→ recipient accepts/rejects
→ if accepted: PENDING_MANAGER
→ Manager approves/rejects
→ server revalidates
→ work_schedule.user_id transfers atomically
→ official schedule refreshes
```

### DELETE

- xóa fake Give-as-Swap;
- không dùng direct table write từ browser;
- không cho Manager duyệt trước recipient consent;
- không cho một schedule cùng lúc pending Give và pending Swap;
- không tạo dữ liệu nhân viên production giả để E2E.

### SIMPLIFY

Một table mới duy nhất:

- `public.shift_gives`

Một RPC set:

- `validate_shift_give_v1`
- `list_shift_give_candidates_v1`
- `submit_shift_give_request`
- `respond_shift_give_request`
- `list_my_shift_gives_v1`
- `list_shift_give_requests_v1`
- `approve_shift_give`
- `reject_shift_give`

UI reuse:

- Employee: `06_EMPLOYEE/swap/engine-v1.js` cho cả Swap/Give surface;
- Manager: `05_MANAGER/Workforce/swap-approval-v1.js` cho cả Swap/Give approval;
- Official schedule: existing Manager projection refreshes after Give resolution.

### ACCELERATE

Reuse các rule đã có từ Swap/work schedule:

- schedule phải APPROVED;
- recipient phải ACTIVE;
- recipient phải AVAILABLE/PREFERRED toàn bộ interval;
- UNAVAILABLE chặn;
- resulting overlap chặn;
- attendance đã tồn tại chặn;
- daily/weekly hours cap chặn;
- server revalidation ở recipient-accept và Manager-approve.

### AUTOMATE

Không có auto-transfer.

Server chỉ chuyển `work_schedules.user_id` sau khi:

1. recipient đã accept;
2. Manager/Owner đã approve;
3. server revalidation vẫn valid.

Notification không nằm trong TASK-033; TASK-034 mới tạo durable outbox.

## Production migration

Applied migration:

- Supabase project: `menvbzlsncmpuvnaifxa`
- migration version: `20260918112940`
- migration name: `shift_give_v1`
- repository artifact: `07_DATABASE/migrations/20260918112940_shift_give_v1.sql`

Production verification:

- `shift_gives.relrowsecurity = true`;
- anon table SELECT = false;
- authenticated direct table SELECT = false;
- service_role table access = true;
- public/anon EXECUTE revoked from Give write/read RPCs;
- authenticated EXECUTE granted only to permissioned Give RPCs;
- partial unique index prevents >1 pending Give per schedule;
- Swap validation now rejects schedules with pending Give.

Read-only production smoke found no current future schedule/recipient pair safe for a real transfer test, so no synthetic/private production data was inserted. Lifecycle verification uses sanitized browser fixtures instead.

## Security model

Table RLS lets authenticated users see a row only if:

- they are giver;
- they are recipient;
- they are Owner;
- or they are Store Manager with access to the row store.

Browser code does not write `shift_gives` or `work_schedules` directly.

SECURITY DEFINER RPCs enforce:

- auth;
- ownership;
- recipient identity;
- role;
- store access;
- lifecycle status;
- schedule validity.

## QA gate

Required before DONE:

1. static migration/RPC contract PASS;
2. giver submit browser PASS;
3. recipient accept/reject browser PASS;
4. Manager approval browser PASS;
5. official schedule refresh PASS;
6. existing Swap regression PASS;
7. Employee availability/attendance regressions PASS;
8. Day-10 + Control Tower regressions PASS;
9. Business OS + Supervisor state gates PASS after source-of-truth advance.

## Definition of Done

TASK-033 is DONE only after all QA gates pass and source-of-truth advances to TASK-034.
