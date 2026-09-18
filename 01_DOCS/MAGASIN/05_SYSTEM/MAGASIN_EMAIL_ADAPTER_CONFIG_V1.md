# MAGASIN — TASK-035 Email Adapter / Activation Boundary V1

**Phase:** P1_SCHEDULE_FIRST_CORE_FLOW  
**Task:** TASK-035 — MAGASIN email adapter/config  
**Date:** 2026-09-18  
**Status:** GMAIL_ADAPTER_IMPLEMENTED_AWAITING_OAUTH_CREDENTIALS

## Five-Step

### QUESTION

Owner đã chốt đầy đủ business boundary:

- provider: **Gmail / Google Workspace**;
- sender: `bachvanti1994@gmail.com`;
- credential phải nằm ngoài public Git;
- external calendar vẫn disabled.

Không còn provider decision nào cần suy đoán.

### DELETE

Không:

- tạo thêm Resend / SendGrid / Mailgun / SMTP adapter;
- dùng ChatGPT Gmail connector làm production mailer;
- dùng password Gmail thường;
- commit OAuth client secret / refresh token;
- claim notification queue khi Gmail OAuth chưa initialize thành công;
- deploy worker chỉ để có một endpoint chưa thể gửi.

### SIMPLIFY

Canonical provider code:

```text
GMAIL_GOOGLE_WORKSPACE
```

Transport:

```text
Supabase Edge Function
→ Gmail OAuth refresh token
→ Google access token
→ Gmail API users.messages.send
```

Required runtime config:

- `MAGASIN_EMAIL_PROVIDER=GMAIL_GOOGLE_WORKSPACE`
- `MAGASIN_EMAIL_FROM=bachvanti1994@gmail.com`

Required runtime secrets:

- `GMAIL_OAUTH_CLIENT_ID`
- `GMAIL_OAUTH_CLIENT_SECRET`
- `GMAIL_OAUTH_REFRESH_TOKEN`

Optional:

- `MAGASIN_EMAIL_REPLY_TO`

Implementation files:

- `supabase/functions/notification-email-worker/index.ts`
- `supabase/functions/notification-email-worker/email-worker-core.mjs`
- `supabase/functions/notification-email-worker/gmail-provider.mjs`
- `02_CORE/contracts/notification-email-adapter.v1.json`

### ACCELERATE

Gmail adapter performs provider initialization **before** queue claim:

```text
validate provider + sender
→ validate OAuth secret presence
→ exchange refresh token for access token
→ only then claim_notification_email_batch_v1
→ resolve recipients
→ build RFC 2822 message + base64url
→ POST Gmail API users/me/messages/send
→ complete_notification_email_v1(success/failure)
```

Google documents `users.messages.send` as the Gmail API send endpoint and supports the `gmail.send` OAuth scope. Offline/server-side use requires a stored refresh token.

Supabase Edge Function secrets remain outside Git and are read through environment variables.

### AUTOMATE

Fail-closed boundaries:

Missing provider/sender:

```text
CONFIG_REQUIRED
→ claim count = 0
```

Missing Gmail OAuth secrets:

```text
PROVIDER_CONFIG_REQUIRED
→ claim count = 0
```

Invalid/expired/revoked OAuth initialization:

```text
PROVIDER_INITIALIZATION_FAILED
→ claim count = 0
```

Unknown provider:

```text
PROVIDER_NOT_REGISTERED
→ claim count = 0
```

Only after Gmail OAuth initialization succeeds can rows move from `PENDING` to `PROCESSING`.

## Current boundary

Owner business decisions are resolved.

Remaining activation input is operational credential setup for the selected Gmail account:

1. `GMAIL_OAUTH_CLIENT_ID`;
2. `GMAIL_OAUTH_CLIENT_SECRET`;
3. `GMAIL_OAUTH_REFRESH_TOKEN` authorized for Gmail send.

These values must be stored in Supabase Edge Function Secrets, never in Git or chat documentation.

After credentials are available:

1. set runtime config/secrets;
2. deploy `notification-email-worker`;
3. invoke one bounded test;
4. verify outbox `PENDING → PROCESSING → SENT`;
5. run regression;
6. close TASK-035 and continue the schedule-first critical path.

Supabase production Edge Functions inventory was still **0** immediately before this implementation branch; no email was sent during provider selection/reconciliation.

External calendar remains disabled.
