# MAGASIN — Employee Registration Production Hardening — TEMP SOURCE OF TRUTH

**Search key:** `EMPREG-HARDENING`  
**Track ID:** `MAGASIN_EMPLOYEE_REGISTRATION_PRODUCTION_HARDENING_V1`  
**Status:** `ACTIVE / TEMPORARY EXECUTION AUTHORITY`  
**Created:** 2026-09-30  
**Repository:** `magasincoffee/magasincoffee.github.io`  
**Production Supabase:** `MAGASIN-NOIBO / menvbzlsncmpuvnaifxa`  
**Planning baseline:** `main @ eb0e1361c0e00238037a451cf5e2b638ffad5168`  
**TEMP lifecycle rule:** **DELETE THIS FILE after EMPREG-009 closes.**

> This file is intentionally temporary. It is the sole execution authority for this hardening generation while the work is open. It must not be treated as a permanent architectural document after closure.

## 1. Scope boundary

This track does **not** reopen `AUTH-PROD`.

Canonical Auth/onboarding remains:

```text
MAGASIN_AUTH_PRODUCTION_READINESS_V1
= CLOSED / PRODUCTION READY — AUTH & ONBOARDING SCOPE
```

This new generation exists only to harden the employee-registration path for broad real-world rollout after the production review on 2026-09-30.

In scope:

- registration security hardening;
- verified-email activation enforcement;
- username-login privacy;
- bounded SECURITY DEFINER privilege cleanup related to registration/login;
- anti-abuse / password protection;
- Owner pending-account workflow;
- registration UX polish;
- exact-main + live acceptance.

Out of scope unless a task below explicitly says otherwise:

- Workforce scheduling;
- payroll;
- procurement;
- unrelated SECURITY DEFINER functions;
- operational notification-email worker;
- replacing Gmail SMTP with a transactional provider in this generation.

## 2. Owner-confirmed email state

The Owner confirmed on 2026-09-30 that the previously pending hosted Supabase email-template work has been completed.

Record this as:

```text
Reset password template in hosted Supabase = OWNER_CONFIRMED_DONE
Confirm sign up template in hosted Supabase = OWNER_CONFIRMED_DONE
Custom SMTP                              = ENABLED
Current SMTP strategy                    = Gmail SMTP / TEMPORARILY_ACCEPTED_BY_OWNER
Sender name                              = MAGASIN
Transactional SMTP migration             = DEFERRED / NOT A BLOCKER FOR THIS TRACK
```

This confirmation removes the earlier “template not yet applied” item from the employee-registration hardening blocker list.

Do not reopen template redesign unless a new defect is demonstrated.

## 3. Verified baseline facts

Read-only production review before this plan established:

```text
auth.users                    = 9
public.profiles               = 9
auth_without_profile          = 0
profile_without_auth          = 0
ACTIVE profiles               = 8
INACTIVE profiles             = 1
PENDING profiles              = 0
email-confirmed auth users    = 7
```

Important inconsistency:

- at least one `ACTIVE` profile currently has an unconfirmed Auth email;
- Owner Access currently allows role/status updates without exposing email-confirmation state;
- `handle_new_auth_user()` creates all new application profiles as `STAFF / PENDING`;
- profile RLS permits Owner update and otherwise fails closed for role/status mutation;
- `resolve_login_email(username)` currently exposes the resolved Auth email to an anonymous browser caller;
- Supabase Security Advisor currently reports anonymous execution of relevant SECURITY DEFINER functions;
- Supabase leaked-password protection is currently disabled.

Exact-main regression at planning baseline:

```text
AUTH-PROD Regression Contract run 36686400825 = SUCCESS
ACTIVE production smoke                         = SUCCESS
UI2 Cross Role Acceptance                      = SUCCESS
Auth Password Reset Hotfix                     = SUCCESS
GitHub Pages validation/deploy                  = SUCCESS
```

## 4. Target lifecycle

The hardened production lifecycle must become:

```text
REGISTER
  ↓
Auth user created
  ↓
profile = STAFF / PENDING
  ↓
EMAIL CONFIRMED
  ↓
Owner sees verified PENDING account
  ↓
Owner selects role + ACTIVE
  ↓
database enforces email-confirmed-before-ACTIVE
  ↓
employee login
  ↓
authoritative profile check
  ↓
correct role route
```

Hard rule:

```text
UNCONFIRMED EMAIL → ACTIVE
= REJECTED BY DATABASE AUTHORITY
```

The UI must explain the rule, but UI validation alone is insufficient.

## 5. Security architecture decisions

### 5.1 Activation authority

Enforce verified-email-before-activation at the database boundary.

Preferred implementation:

- add a narrowly scoped trigger/function for `profiles.status` transition;
- reject `PENDING/INACTIVE → ACTIVE` when the matching `auth.users.email_confirmed_at` is null;
- do not block unrelated edits to an already-ACTIVE legacy account;
- keep Owner as the only application authority allowed to change role/status;
- never infer confirmation from user metadata.

Owner Access must also display email verification state and disable/clarify invalid activation attempts.

### 5.2 SECURITY DEFINER privilege hardening

Registration/login-related functions must use least privilege.

Required review set:

- `handle_new_auth_user()`;
- `current_user_role()`;
- `current_user_access_scope()` if used by the registration/login authorization path;
- `resolve_login_email(text)`.

Intent:

- trigger-only functions must not remain directly RPC-callable by `PUBLIC`, `anon`, or ordinary authenticated users when direct execution is unnecessary;
- RLS helper functions may retain only the grants required by authenticated policy evaluation;
- anonymous execution must be removed where it is not an intentional public API;
- do not perform a broad unrelated database-function cleanup under this track.

### 5.3 Username login privacy

The browser must stop receiving the private email behind a username.

Target architecture:

```text
browser username + password
  ↓ HTTPS
bounded Supabase Edge Function
  ↓
server-side username → Auth email lookup
  ↓
Supabase Auth password grant
  ↓
generic success/failure
  ↓
session returned to browser
```

Rules:

- underlying email is never returned merely because a username exists;
- invalid username and invalid password use the same external failure semantics;
- no password/session/token is logged;
- service-role material stays server-side only;
- direct public `resolve_login_email` access is removed after cutover;
- email login may remain direct Supabase Auth unless implementation evidence shows a need to unify both paths.

Signup username availability, if preserved, must use a bounded availability-only surface and must never return the matching email/profile.

### 5.4 Anti-abuse and password hardening

Required production security settings:

- enable Supabase leaked-password protection;
- enable CAPTCHA / Attack Protection for signup and relevant recovery/login abuse surfaces;
- preserve email confirmation;
- review Auth email/password rate limits after CAPTCHA is enabled;
- do not reduce security controls merely to make testing easier.

CAPTCHA provider secrets are an Owner credential boundary and must not be committed.

## 6. Execution plan

### EMPREG-001 — Baseline and scope lock

**Status:** `DONE`

Completed by the 2026-09-30 review and this TEMP Source of Truth.

Acceptance:

- exact-main baseline recorded;
- production Auth/profile consistency recorded without private identities;
- email-template hosted apply recorded as Owner-confirmed complete;
- AUTH-PROD remains closed and independent.

### EMPREG-002 — Enforce verified email before ACTIVE

**Status:** `TODO / NEXT`

Work:

1. implement database-side activation guard;
2. update Owner Access query to read a safe email-confirmation indicator;
3. display `Đã xác nhận email / Chưa xác nhận email`;
4. prevent Owner UI from presenting an invalid activation as successful;
5. preserve Owner self-protection and role/status separation;
6. add regression coverage for unconfirmed → ACTIVE rejection and confirmed → ACTIVE success.

Acceptance:

- unconfirmed account cannot transition into ACTIVE through normal Owner UI;
- direct allowed application update path is also rejected by DB authority;
- confirmed account can be activated normally;
- no broad RLS widening.

### EMPREG-003 — Registration/Auth SECURITY DEFINER least privilege

**Status:** `TODO`

Work:

1. remove unnecessary direct execution rights from `handle_new_auth_user()`;
2. remove anonymous access to role/scope helpers where not required;
3. document the exact grants retained for RLS evaluation;
4. keep trigger behavior intact;
5. prove signup still creates `STAFF / PENDING`.

Acceptance:

- trigger projection still works;
- anon cannot directly execute trigger-only authority functions;
- RLS continues to route/authorize correctly;
- no unrelated database authority changes.

### EMPREG-004 — Replace public username → email resolver

**Status:** `TODO`

Work:

1. introduce bounded server-side username password-login adapter;
2. remove browser dependency on `resolve_login_email`;
3. migrate username login;
4. preserve direct email login;
5. implement generic invalid-credential behavior;
6. remove/revoke public resolver access after exact-main cutover;
7. replace signup username preflight with a non-PII availability contract or another bounded duplicate-handling path.

Acceptance:

- username login succeeds without exposing the backing email;
- invalid username/password cannot be distinguished by returned PII;
- email login still works;
- duplicate username path remains bounded;
- no service-role key appears in frontend/Git/log evidence.

### EMPREG-005 — Password and anti-abuse controls

**Status:** `TODO / OWNER_CONFIG_BOUNDARY`

Work:

1. enable leaked-password protection;
2. configure CAPTCHA / Attack Protection;
3. wire frontend CAPTCHA token handling where required;
4. review signup/recovery rate limits;
5. preserve email-confirmation requirement.

Acceptance:

- leaked-password protection = ON;
- CAPTCHA/Attack Protection = ON for the agreed Auth surfaces;
- real signup and recovery still succeed;
- bot/abuse controls fail closed;
- secrets remain outside Git.

### EMPREG-006 — Professional Owner pending-account workflow

**Status:** `TODO`

Work:

1. add clear Pending/Active/Inactive filtering;
2. show email-verification state;
3. show a pending-account count in the Owner experience;
4. provide clear activation guidance;
5. ensure account role and account status remain separate decisions;
6. do not make operational email notifications a dependency.

Acceptance:

- Owner can immediately see what accounts require action;
- Owner can understand why an unconfirmed account cannot be activated;
- no hidden ACCOUNTANT or other role workaround exists;
- mobile/desktop usability remains acceptable.

### EMPREG-007 — Registration UX polish

**Status:** `TODO`

Work:

1. add confirm-password field;
2. show concise password requirements / strength feedback;
3. validate/normalize phone input when provided;
4. improve field-level validation messages;
5. replace ambiguous post-registration copy with explicit steps:
   - xác nhận email;
   - chờ quản lý kích hoạt;
   - đăng nhập;
6. preserve anti-enumeration behavior for unrelated email addresses;
7. verify mobile/responsive/accessibility behavior.

Acceptance:

- registration errors are actionable and do not leak unrelated account existence;
- password mismatch is caught before submit;
- user always knows the next step;
- no stale pending-session trap returns.

### EMPREG-008 — Exact-main QA + real employee lifecycle acceptance

**Status:** `TODO`

Required deterministic/browser coverage:

- register → STAFF/PENDING;
- duplicate username;
- email confirmation callback;
- unconfirmed activation rejection;
- confirmed Owner activation;
- pending check-access/switch-account;
- ACTIVE username login through the new private adapter;
- ACTIVE email login;
- correct employee route;
- logout and second-account login;
- recovery;
- invalid credentials;
- cold/reload/back;
- no unexpected Auth HTTP5xx.

Required live acceptance:

- one bounded real/test employee lifecycle on production;
- no real credentials or private identities committed as evidence.

Acceptance:

- required workflows GREEN on exact main;
- production Auth/profile reconciliation remains consistent;
- no unresolved Sev-1/Sev-2 registration defect.

### EMPREG-009 — Canonical closure and TEMP cleanup

**Status:** `TODO / MUST_BE_LAST`

Only after EMPREG-002→008 are accepted:

1. create concise permanent closure evidence:
   `MAGASIN_EMPLOYEE_REGISTRATION_PRODUCTION_HARDENING_CLOSURE_EVIDENCE.md`;
2. record exact executable main SHA, production reconciliation, security controls, and accepted deferrals;
3. reconcile any canonical docs that became stale;
4. verify no future task depends on this TEMP document;
5. **delete this file**:
   `EMPLOYEE_REGISTRATION_PRODUCTION_HARDENING_TEMP_SOURCE_OF_TRUTH.md`.

Closure rule:

```text
EMPREG-009 is NOT COMPLETE
until this TEMP Source of Truth is deleted from main.
```

## 7. Dependency order

Authoritative execution order:

```text
EMPREG-001 DONE
  ↓
EMPREG-002
  ↓
EMPREG-003
  ↓
EMPREG-004
  ↓
EMPREG-005
  ↓
EMPREG-006
  ↓
EMPREG-007
  ↓
EMPREG-008
  ↓
EMPREG-009 + DELETE TEMP
```

EMPREG-003 and EMPREG-004 may be implemented in one technical branch if required to avoid a broken intermediate username-login state, but their acceptance evidence must remain separately identifiable.

## 8. Safety / mutation rules

- Do not alter real employee credentials.
- Do not activate/deactivate a real user merely to make a test pass.
- Do not expose service-role, CAPTCHA secret, SMTP password, OAuth token, session token, or refresh token.
- Do not commit screenshots containing private identities.
- Database hardening must use migrations / reproducible source, not undocumented one-off production SQL.
- Production mutations must be bounded and have a rollback path.
- Existing ACTIVE legacy inconsistency must be reviewed explicitly; do not silently deactivate a real account.
- Gmail SMTP is accepted temporarily by Owner and is not a blocker for EMPREG closure unless delivery fails during required smoke.

## 9. Current cursor

```text
TRACK       = EMPREG-HARDENING
CURRENT     = EMPREG-002
NEXT        = Enforce verified email before ACTIVE
EMAIL UI    = OWNER_CONFIRMED_DONE
SMTP        = GMAIL / TEMPORARILY_ACCEPTED
TEMP FILE   = MUST DELETE AT EMPREG-009
```
