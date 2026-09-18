# MAGASIN — TASK-035 Email Adapter / Config V1

**Phase:** P1_SCHEDULE_FIRST_CORE_FLOW  
**Task:** TASK-035 — MAGASIN email adapter/config  
**Date:** 2026-09-18  
**Status:** PROVIDER-INDEPENDENT VERIFIED / WAIT_USER AT ACTIVATION BOUNDARY

## Five-Step

### QUESTION

Có thể nối email vào notification outbox đã verified mà:

- business mutation không phụ thuộc email provider;
- thiếu provider/account/credential thì không claim queue;
- secret không đi vào public Git;
- một event chỉ được đánh `SENT` sau khi transport thật báo thành công;
- không có email target thì dừng vĩnh viễn thay vì retry vô ích?

### DELETE

Không triển khai:

- email trực tiếp trong schedule / attendance / Swap / Give mutation;
- notification pipeline thứ hai;
- marketing email;
- external calendar — Owner đã tắt;
- provider giả định như Resend/SMTP/SendGrid khi chưa có nguồn MAGASIN cụ thể;
- Edge Function / cron scheduler chết chỉ để “có sẵn”;
- credential trong source code, docs hoặc GitHub Actions plaintext.

### SIMPLIFY

Giữ một chain duy nhất:

```text
canonical mutation
→ notification_outbox
→ service-role claim
→ service-role target resolver
→ provider-neutral worker core
→ provider adapter (chưa kích hoạt)
→ complete SENT / FAILED
```

No-target path:

```text
claimed event
→ no ACTIVE profile email target
→ SKIPPED / NO_ACTIVE_EMAIL_TARGET
```

### ACCELERATE

Provider-independent primitives hoàn tất trước:

- `resolve_notification_email_targets_v1(uuid)`;
- `skip_notification_email_v1(uuid,text)`;
- `02_CORE/notification/email-delivery-core-v1.mjs`;
- deterministic Node tests;
- rollback-only production smoke;
- service-role-only permission verification.

### AUTOMATE

Chỉ bật transport/scheduler sau khi Owner cung cấp provider + sender account và credential đã nằm trong secret store.

Worker core fail-closed: nếu thiếu bất kỳ `provider`, `sender` hoặc credential readiness thì trả `CONFIG_PENDING` **trước khi claim queue**.

## Live configuration evidence

Verified on production Supabase project on 2026-09-18:

- Supabase Vault: installed;
- deployed Edge Functions: 0;
- email-provider secret names found in Vault: 0;
- `pg_cron`: not installed;
- `pg_net`: not installed;
- notification outbox currently exists and is RLS-protected;
- provider-neutral queue RPCs from TASK-034 exist.

Therefore repository evidence does **not** identify a concrete MAGASIN email provider, sender account or provider credential.

## Production migration

Applied:

- `20260918120917_notification_email_target_resolution_v1`

Repository artifact:

- `07_DATABASE/migrations/20260918120917_notification_email_target_resolution_v1.sql`

### Target resolution

`resolve_notification_email_targets_v1` resolves only ACTIVE profiles with non-empty email:

- `USER` → the notification recipient;
- `STORE_MANAGERS` → active store managers whose access scope covers the notification store;
- `OWNER` → active Owner profiles.

The function exposes profile email only to `service_role`.

### Permanent skip

`skip_notification_email_v1` accepts only a claimed `PROCESSING` row and transitions it to `SKIPPED`, recording a bounded reason. This prevents repeated retry when there is no active email target.

## Provider-neutral worker contract

`02_CORE/notification/email-delivery-core-v1.mjs`:

1. validates activation config before claiming;
2. claims a bounded queue batch only when config is ready;
3. resolves targets through the service-role resolver;
4. requires blind-recipient semantics for multi-recipient audiences;
5. uses `event_key` as the logical idempotency key passed to the provider adapter;
6. marks no-target rows `SKIPPED`;
7. marks transport failure `FAILED` through the existing retry RPC;
8. marks `SENT` only after the injected transport succeeds.

The core contains no provider SDK and no credential.

## Verification

Production rollback-only smoke:

- synthetic USER notification created inside a transaction;
- target resolver returned exactly one active email target;
- skip RPC transitioned `PROCESSING → SKIPPED`;
- transaction rolled back;
- persisted QA rows: none.

Permissions:

- anon resolve: denied;
- authenticated resolve: denied;
- service_role resolve: allowed;
- anon skip: denied;
- authenticated skip: denied;
- service_role skip: allowed.

Security Advisor did not add a finding for the two TASK-035 SECURITY DEFINER RPCs. Pre-existing unrelated advisor findings remain outside this micro-task.

## Exact Owner activation boundary

Provider-independent work is complete. Real email delivery remains fail-closed until these inputs exist:

| ID | Required Owner input | Current |
|---|---|---|
| EMAIL-001 | Concrete MAGASIN email provider / service | REQUIRED |
| EMAIL-002 | Verified sender identity / account to send from | REQUIRED |
| EMAIL-003 | Provider credential created in Supabase secret store after provider selection | REQUIRED |

Do **not** paste the credential into chat or commit it to Git.

After EMAIL-001..003 are resolved, the next activation slice may:

- implement the provider-specific adapter;
- deploy the Edge Function/runtime worker;
- add the minimum scheduler/invocation mechanism required;
- perform a bounded real-delivery smoke;
- keep calendar disabled.

## Gate

TASK-035 is now **WAIT_USER** at the provider/account activation boundary. It is not DONE and no provider send has been invoked.
