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
- `supabase/config.toml`
- `02_CORE/contracts/notification-email-adapter.v1.json`

### ACCELERATE

Gmail adapter performs provider initialization **before** queue claim:

```text
validate provider + sender
→ validate OAuth secret presence
→ exchange refresh token for access token
→ only then claim_notification_email_batch_v1 with normalized limit 1..25
→ resolve recipients
→ build RFC 2822 message + base64url
→ POST Gmail API users/me/messages/send
→ complete_notification_email_v1(success/failure)
```

Google documents `users.messages.send` as the Gmail API send endpoint and supports the `gmail.send` OAuth scope. Offline/server-side use requires a stored refresh token.

Supabase Edge Function secrets remain outside Git and are read through environment variables.

The worker is service-to-service. It accepts the Supabase secret key in the `apikey` header and authorizes that key inside the handler. Therefore the platform JWT gate is disabled only for this function:

```toml
[functions.notification-email-worker]
verify_jwt = false
```

This does **not** make the function public: the handler still returns `UNAUTHORIZED` unless the supplied `apikey` matches an allowed project secret key.

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

Queue claim is bounded by an authenticated request field:

```json
{"limit": 1}
```

- default normal-worker limit: `25`;
- hard maximum: `25`;
- activation verification limit: `1`;
- invalid/missing limit falls back to the normal default; values are clamped to `1..25`.

This prevents the first production activation from unintentionally claiming the normal 25-row batch.

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
3. invoke one bounded test with request body `{"limit":1}`;
4. verify outbox `PENDING → PROCESSING → SENT`;
5. run regression;
6. close TASK-035 and continue the schedule-first critical path.

Supabase production Edge Functions inventory remains **0** at this boundary; no email has been sent.

External calendar remains disabled.

## Owner activation runbook — one-time OAuth setup

This runbook exists only to cross the credential boundary safely. It does not change the approved provider or business rules.

### A. Google Cloud / Gmail API

1. Create or select the Google Cloud project that will own the MAGASIN mailer.
2. Enable the **Gmail API**.
3. Configure the Google OAuth app/audience.
4. Create an **OAuth 2.0 Client ID** of type **Web application**.
5. Add this authorized redirect URI exactly:

```text
https://developers.google.com/oauthplayground
```

6. Request only the least-privilege scope required by this worker:

```text
https://www.googleapis.com/auth/gmail.send
```

For durable production use, do not rely on an External OAuth app left in **Testing**: Google documents that refresh tokens for External/Testing projects normally expire after 7 days when non-basic scopes such as Gmail are requested. Move the app to the appropriate production/published state and follow any Google verification requirements shown for that configuration.

### B. Generate the refresh token

Open Google OAuth 2.0 Playground and configure:

- OAuth flow: **Server-side**;
- Access type: **Offline**;
- Force prompt: **Consent Screen**;
- **Use your own OAuth credentials**;
- Client ID / Client secret: use the values created for the MAGASIN Google Cloud project;
- Scope: `https://www.googleapis.com/auth/gmail.send`.

Authorize while signed into the exact sender account:

```text
bachvanti1994@gmail.com
```

Then exchange the authorization code for tokens and retain the returned refresh token.

Do not paste the client secret or refresh token into Git, project documentation, issue/PR text, or ChatGPT.

### C. Store production configuration in Supabase

Project:

```text
menvbzlsncmpuvnaifxa
```

Set these values directly in **Supabase Edge Function Secrets**:

```text
MAGASIN_EMAIL_PROVIDER=GMAIL_GOOGLE_WORKSPACE
MAGASIN_EMAIL_FROM=bachvanti1994@gmail.com
GMAIL_OAUTH_CLIENT_ID=<secret>
GMAIL_OAUTH_CLIENT_SECRET=<secret>
GMAIL_OAUTH_REFRESH_TOKEN=<secret>
```

Optional:

```text
MAGASIN_EMAIL_REPLY_TO=<address>
```

Supabase supports setting production function secrets in the Dashboard or with `supabase secrets set`; secrets become available to Edge Functions without committing an env file.

### D. Handoff back to automation

After the five required values above are present in Supabase, the safe continuation is:

```text
deploy notification-email-worker with verify_jwt=false
→ bounded service-key invocation
→ OAuth initialization
→ claim at most one controlled email event for activation verification
→ Gmail send
→ verify outbox terminal state SENT
→ run TASK-035 + schedule-first regression
→ update Current State / Task Queue / Change Log
→ close TASK-035
```

Until that setup is complete, project state remains `WAIT_USER`; no queue row should be claimed and no email should be sent.
