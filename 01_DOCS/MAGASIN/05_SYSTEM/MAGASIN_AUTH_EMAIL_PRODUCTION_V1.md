# MAGASIN — Auth Email Production V1

**Track:** `MAGASIN_AUTH_EMAIL_PRODUCTION_V1`  
**Created:** 2026-09-30  
**Repository:** `magasincoffee/magasincoffee.github.io`  
**Production Supabase:** `MAGASIN-NOIBO / menvbzlsncmpuvnaifxa`  
**Status:** `SOURCE_READY / PRODUCTION_DASHBOARD_APPLY_REQUIRED`

## 1. Why this track exists

The Auth lifecycle itself is already production-ready, but the user-facing transactional email presentation has a separate production-quality issue.

Observed Recovery email behavior:

- visually heavy / inconsistent with the current repository template;
- raw Supabase recovery URL is rendered as visible text;
- the long URL exposes implementation detail and breaks the layout;
- production Dashboard template and source-controlled template are not demonstrably synchronized;
- hosted Supabase email-template settings are not represented by Git alone.

This track does not reopen `AUTH-PROD`. It is a new bounded email presentation/delivery generation.

## 2. Boundary: Auth mail vs operational mail

Two different email systems exist and must not be confused.

### Supabase Auth mail

Used for:

- email confirmation;
- password recovery;
- password-change security notification.

Authority:

```text
Supabase Auth
→ Auth email template
→ Supabase SMTP configuration
→ recipient
```

### MAGASIN operational notification mail

Used for schedule/workforce/application notifications.

Authority:

```text
notification_outbox
→ notification-email-worker
→ Gmail / Google Workspace adapter
→ recipient
```

Canonical operational adapter remains:
`MAGASIN_EMAIL_ADAPTER_CONFIG_V1.md`.

The Auth email templates in this track do not send through that worker.

## 3. Source-controlled Auth templates

Canonical template files:

- `03_PLATFORM/01_AUTH/recovery-email-template.html`
- `03_PLATFORM/01_AUTH/recovery-email-subject.txt`
- `03_PLATFORM/01_AUTH/confirmation-email-template.html`
- `03_PLATFORM/01_AUTH/confirmation-email-subject.txt`
- `03_PLATFORM/01_AUTH/password-changed-email-template.html`

Local/dev mapping is recorded in `supabase/config.toml`.

Hosted production still requires applying the same HTML/subject values in Supabase Dashboard because hosted Supabase does not deploy Dashboard email templates from the repository config automatically.

## 4. Production email design rules

Auth email must:

- use one MAGASIN visual system;
- use one primary CTA;
- keep content short and transactional;
- never print a raw recovery/verification URL as visible text;
- use `{{ .ConfirmationURL }}` only as an anchor target;
- avoid exposing tokens, hashes, credentials or implementation details in screenshots/evidence;
- include a short security note;
- avoid marketing copy;
- avoid unnecessary personalization from user-supplied metadata;
- work with image blocking by using text-based branding.

Recovery fallback is an anchor with human-readable text, not the raw URL.

## 5. Recovery flow compatibility

Frontend currently calls:

```js
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: location.origin + location.pathname + '?auth=reset'
})
```

The Auth runtime supports the production recovery callback and verifies the recovery session before allowing password update.

The template continues using the canonical Supabase variable:

```text
{{ .ConfirmationURL }}
```

Therefore this redesign does not change password/session authority.

## 6. Production delivery requirement

Supabase's built-in SMTP is not intended for normal production delivery.

Before external rollout, production Auth mail should use a custom SMTP transport configured under Supabase Authentication email settings.

Required production properties:

- explicit sender address;
- sender display name `MAGASIN`;
- authenticated SMTP transport;
- delivery to non-team user addresses;
- appropriate Auth email rate limit;
- SPF/DKIM/DMARC when a MAGASIN-controlled sending domain is used;
- link tracking disabled for Auth mail when the SMTP provider supports it.

No SMTP password/API credential belongs in Git.

## 7. Current execution state

Completed in source:

```text
AUTH-EMAIL-001 recovery visual cleanup            = DONE
AUTH-EMAIL-002 remove visible raw recovery URL    = DONE
AUTH-EMAIL-003 confirmation template parity       = DONE
AUTH-EMAIL-004 password-change security template  = DONE
AUTH-EMAIL-005 local/source mapping                = DONE
```

Remaining production actions:

```text
AUTH-EMAIL-006 apply Recovery template in hosted Supabase       = WAIT_SUPABASE_DASHBOARD_SESSION
AUTH-EMAIL-007 apply Confirmation/security templates            = WAIT_SUPABASE_DASHBOARD_SESSION
AUTH-EMAIL-008 inspect/configure production SMTP sender         = WAIT_SUPABASE_DASHBOARD_SESSION / CREDENTIAL_BOUNDARY
AUTH-EMAIL-009 send bounded real recovery + confirmation smoke  = AFTER_006_008
AUTH-EMAIL-010 record live evidence and close                   = AFTER_SMOKE
```

The browser automation session attempted on 2026-09-30 reached the Supabase sign-in page; no authenticated Dashboard session was available. No Supabase configuration was changed.

## 8. Acceptance contract

Production closure requires:

1. Recovery subject/body match the canonical repository version.
2. Confirmation subject/body match the canonical repository version.
3. Password-changed notification is enabled and uses the canonical design.
4. No raw token/recovery URL is displayed to the recipient.
5. Recovery button opens the MAGASIN recovery flow and allows a valid password update.
6. Confirmation button completes email confirmation and preserves PENDING/ACTIVE authority rules.
7. Auth mail is delivered through production-capable custom SMTP.
8. Sender identity appears as MAGASIN with the approved From address.
9. No Auth HTTP5xx or unexpected redirect loop occurs in the smoke.
10. No credential/token/private email content is committed as evidence.

## 9. Current cursor

```text
SOURCE TEMPLATE WORK = DONE
PRODUCTION APPLY      = WAIT_AUTHENTICATED_SUPABASE_DASHBOARD
SMTP ACTIVATION       = OWNER CREDENTIAL BOUNDARY
LIVE SMOKE            = PENDING
```
