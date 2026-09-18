# MAGASIN — TASK-035 Email Adapter / Activation Boundary V1

**Phase:** P1_SCHEDULE_FIRST_CORE_FLOW  
**Task:** TASK-035 — MAGASIN email adapter/config  
**Date:** 2026-09-18  
**Status:** OWNER_BOUNDARY_AFTER_PROVIDER_NEUTRAL_CORE

## Five-Step

### QUESTION

Outbox đã có. Câu hỏi còn lại là: **MAGASIN sẽ gửi email bằng provider nào và từ địa chỉ gửi chính xác nào?**

Owner đã duyệt:

- dùng email MAGASIN;
- credential được lưu trong secret store ngoài public Git;
- external calendar chưa cần.

Owner **chưa chọn** provider hoặc địa chỉ sender cụ thể.

### DELETE

Không:

- tự chọn Gmail / SMTP / Resend / SendGrid / Mailgun;
- dùng Gmail connector của ChatGPT như production mailer;
- nhúng email/password/API key vào repo;
- claim outbox khi mailer chưa cấu hình;
- deploy worker giả có thể báo SENT khi chưa gửi;
- bật external calendar.

### SIMPLIFY

Provider-neutral worker contract:

```text
request authorized by Supabase server secret
→ validate MAGASIN_EMAIL_PROVIDER + MAGASIN_EMAIL_FROM
→ initialize selected provider adapter
→ only then claim notification email batch
→ resolve recipient email server-side
→ send
→ complete_notification_email_v1(success/failure)
```

Files:

- `supabase/functions/notification-email-worker/index.ts`
- `supabase/functions/notification-email-worker/email-worker-core.mjs`
- `02_CORE/contracts/notification-email-adapter.v1.json`

The worker is intentionally **not deployed** until a provider adapter exists.

### ACCELERATE

Recipient source is already canonical:

- USER → `profiles.id = recipient_user_id`;
- OWNER → active `profiles.role = OWNER`;
- STORE_MANAGERS → active Store Managers whose `access_scope` contains the outbox store code.

Email comes from `public.profiles.email`; email addresses do not need to be copied into outbox payload.

Current Supabase docs confirm production Edge Function secrets belong in the function secret store, and server/secret keys must remain outside browser/public source.

### AUTOMATE

Automation remains fail-closed.

Missing provider/sender:

```text
CONFIG_REQUIRED
→ claim count = 0
→ outbox rows remain PENDING
```

Unknown/unimplemented provider:

```text
PROVIDER_NOT_REGISTERED
→ claim count = 0
→ outbox rows remain PENDING
```

Only after adapter initialization succeeds may the worker claim rows.

## Discovery evidence

Repository search found no:

- Resend config;
- SendGrid config;
- Mailgun config;
- SMTP config;
- Gmail mailer config;
- existing email worker/provider implementation.

Supabase Edge Functions inventory: **0 functions**.

Database metadata found no mail/provider primitive beyond TASK-034 notification outbox functions.

The available connector does not expose production secret values, so this review does **not** claim that no secret exists. It only establishes that no concrete provider/account configuration is evidenced by repository, Edge Functions, or database primitives.

## Current boundary

Owner input required:

1. **Concrete email provider** to use for system mail.
2. **Exact MAGASIN sender email address**.

Optional:

- reply-to address, if different from sender.

After those are supplied:

1. implement exactly that provider adapter;
2. store required credentials in Supabase Edge Function Secrets, never Git;
3. deploy worker with appropriate server-only authorization;
4. send a bounded test email;
5. verify outbox `PENDING → PROCESSING → SENT`;
6. regression and close TASK-035.

External calendar remains disabled.
