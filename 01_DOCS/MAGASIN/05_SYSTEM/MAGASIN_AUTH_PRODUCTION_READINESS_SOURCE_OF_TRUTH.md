# MAGASIN AUTH-PROD — Production Auth & Onboarding Readiness — SOURCE OF TRUTH

**Search key:** `AUTH-PROD`  
**Canonical track ID:** `MAGASIN_AUTH_PRODUCTION_READINESS_V1`  
**Status:** `CLOSED / PRODUCTION READY — AUTH & ONBOARDING SCOPE`  
**Closed:** 2026-09-28  
**Created:** 2026-09-27  
**Repository:** `magasincoffee/magasincoffee.github.io`  
**Production baseline at creation:** `main @ 63ed0c6712493c608b4c7c869bb28cf939241536`  
**Execution plan:** `01_DOCS/MAGASIN/05_SYSTEM/MAGASIN_AUTH_PRODUCTION_READINESS_EXECUTION_PLAN.md`

> New-chat bootstrap: search the repository for **AUTH-PROD**, read this Source of Truth first, then read the execution plan. Do not infer production readiness from UI2 closure alone.

## 1. Why this track exists

MAGASIN UI/UX V2 (`UI2-001 → UI2-017`) is CLOSED for presentation/responsive/accessibility scope, but the real production authentication/onboarding lifecycle is not yet release-ready.

A production review on 2026-09-27 found workflow defects that were not covered by the UI2 mock-heavy Auth gates:

1. a `PENDING` user can become trapped in a persistent-session redirect loop;
2. Owner Access does not provide a normal independent activation action for a new `STAFF / PENDING` user;
3. existing Auth QA proves presentation/reset behavior but does not prove the full live lifecycle `register → verify → pending → approve → active login → role redirect → logout/switch account`;
4. at least one real production password login attempt returned Supabase `invalid_credentials`, so credential-path diagnosis must be separated from UI/session-state defects.

Therefore:

```text
UI2_PRESENTATION = CLOSED
AUTH_PROD        = CLOSED
PRODUCTION_READY = YES / AUTH_AND_ONBOARDING_SCOPE
```

No deployment or project-level “production ready” declaration is valid until this track is CLOSED.

## 2. Verified production facts at track creation

Read-only production verification established:

- Supabase project `menvbzlsncmpuvnaifxa` is `ACTIVE_HEALTHY`;
- 8 Auth users and 8 matching `public.profiles` rows;
- 0 Auth users without a profile;
- 4 profiles are `ACTIVE`;
- 4 profiles are `PENDING`;
- among PENDING profiles: 2 emails confirmed, 2 unconfirmed;
- exactly 1 OWNER profile exists and is `ACTIVE`;
- OWNER Auth identity is email-confirmed, not banned, not deleted;
- OWNER username → Auth email resolution is consistent;
- `resolve_login_email(text)` is callable by `anon` and `authenticated`;
- new Auth users are projected by `trg_auth_user_profile` / `handle_new_auth_user()` into `public.profiles` as `STAFF / PENDING`;
- profile RLS allows an authenticated user to read their own profile and OWNER to update profiles;
- no service-role key is present in browser Auth code; the browser uses a publishable key.

These facts are a dated evidence snapshot, not permission to expose identities or credentials in Git.

## 3. Confirmed defects

### AUTH-PROD-D1 — PENDING session trap

Current Auth boot behavior:

1. browser has a valid Supabase session;
2. Auth boot loads `profiles.role,status`;
3. non-`ACTIVE` profile redirects to `pending-access.html`;
4. pending page only links back to the Auth page;
5. the link does not sign out;
6. Auth boot sees the same persisted session and redirects to pending again.

This is a deterministic loop. A pending user cannot reliably switch to another account.

### AUTH-PROD-D2 — activation is incorrectly coupled to ACCOUNTANT

New users are created as `STAFF / PENDING`.

Current Owner Access behavior updates `status='ACTIVE'` automatically only when the selected role becomes `ACCOUNTANT`.

Consequences:

- a normal new STAFF user has no direct activation path in the Owner UI;
- role assignment and account activation are conflated;
- a user may remain PENDING indefinitely even after Owner review;
- using ACCOUNTANT as an activation workaround is unacceptable because it mutates authority semantics.

### AUTH-PROD-D3 — existing Auth QA does not prove production lifecycle

Current Auth coverage includes visual/responsive checks and mocked Supabase behavior for password-reset flows.

It does not prove, against the real production authority boundaries:

- successful registration state transition;
- confirmed vs unconfirmed email behavior;
- pending account escape / switch-account;
- Owner activation of STAFF / Manager roles;
- activation becoming effective on the next access check;
- valid ACTIVE login by username and email;
- exact role redirect;
- logout and clean re-login as a different account;
- cold/reload behavior with real persisted sessions.

### AUTH-PROD-D4 — credential failure must remain a separate diagnosis

Production logs contain a real website password grant that returned HTTP 400 `invalid_credentials`.

Do not “fix” this by changing role/status/RLS or bypassing Auth.

A credential failure can only be resolved through the normal credential lifecycle: correct credential, password recovery, or an explicitly authorized account-recovery operation.

## 4. Canonical authority model

### 4.1 Authentication authority

Supabase Auth is the only password/session authority.

Browser code may:

- sign up;
- sign in;
- sign out;
- request password recovery;
- exchange/verify valid Auth callbacks;
- read its authenticated session.

Browser code must never:

- compare/store passwords itself;
- expose a service-role/secret key;
- infer authorization from mutable `user_metadata`;
- manufacture Auth sessions.

### 4.2 Authorization authority

`public.profiles.role` + `public.profiles.status`, protected by RLS and canonical Owner authority, determine application access.

User-supplied Auth metadata may seed profile display data at signup, but it is not an authorization source.

### 4.3 Role routing

For `status=ACTIVE` only:

- `OWNER` → `/04_OWNER/`
- `ACCOUNTANT` → `/nhap-hang/`
- `STAFF` / employee-equivalent → `/06_EMPLOYEE/`
- Manager-family roles → `/05_MANAGER/`

Unknown/invalid authorization state must fail closed.

## 5. Canonical account lifecycle

```text
REGISTER
  ↓
AUTH USER CREATED
  ↓
PROFILE CREATED: STAFF / PENDING
  ↓
EMAIL CONFIRMATION (when required)
  ↓
PENDING APPROVAL
  ├─ user may CHECK ACCESS
  ├─ user may SIGN OUT / USE ANOTHER ACCOUNT
  └─ Owner selects role + explicitly ACTIVATES
        ↓
ACTIVE
  ↓
LOGIN
  ↓
PROFILE CHECK
  ↓
ROLE ROUTE
  ↓
LOGOUT / SWITCH ACCOUNT
```

`INACTIVE` remains a fail-closed access state and must not silently reactivate itself.

## 6. Required workflow behavior

### 6.1 Registration

After successful signup:

- always give the user an unambiguous next step;
- never leave the browser in a state that captures all subsequent visits as the new pending account;
- if Supabase returns a session for a newly-created PENDING account, clear the local session before returning to the login/success surface unless a bounded pending-session flow explicitly needs it;
- if email confirmation is required, say so without leaking whether unrelated emails exist;
- registration never grants `ACTIVE` or elevated role authority.

### 6.2 Pending access

Pending UI must provide:

1. **Check access** — re-read authoritative profile state and route only if it is now ACTIVE;
2. **Sign out / Use another account** — call Supabase sign-out for the local browser session, clear relevant local recovery/auth markers, then navigate to Auth login;
3. clear display of `PENDING` / `INACTIVE` without implying approval already happened.

Returning to login without clearing a pending session is prohibited.

### 6.3 Owner activation

Owner Access must separate:

- **Role**
- **Account status**

Required bounded actions:

- assign an allowed non-OWNER role;
- activate a PENDING/INACTIVE non-OWNER account;
- deactivate an ACTIVE non-OWNER account when explicitly chosen;
- preserve OWNER self-protection;
- never require ACCOUNTANT as an activation bridge.

A role/status update may be written atomically when the Owner explicitly chooses both values.

### 6.4 Login

Login sequence:

1. resolve username → email when input is not an email;
2. Supabase `signInWithPassword`;
3. fetch own authoritative profile;
4. if ACTIVE: route by role;
5. if PENDING/INACTIVE: present bounded access-state UI with a real sign-out/switch path;
6. if profile cannot be resolved: fail closed with actionable error, not an infinite silent loop.

### 6.5 Password recovery

Password recovery remains the only normal mechanism for unknown/invalid credentials.

Recovery must not change role/status.

### 6.6 Logout / account switching

Logout must clear the local Auth session before returning to login.

A browser must be able to move from one account to another without deleting site data or opening Incognito.

## 7. Security and privacy guardrails

- Never commit passwords, session tokens, refresh tokens, cookies, private email addresses, or private production user exports.
- Never put a service-role/secret key in frontend code or Git.
- Do not use `raw_user_meta_data` / `user_metadata` as authorization truth.
- Do not loosen RLS to make Auth tests pass.
- OWNER activation remains OWNER-authorized.
- Destructive account deletion, credential reset on behalf of a real user, disabling MFA/CAPTCHA, or rotating secrets is an Owner boundary.
- Test identities/credentials, if introduced, must be secret-backed and must not create a hidden privileged production backdoor.

## 8. Production test contract

Mock tests remain useful but are insufficient.

A production-readiness closure must prove all of the following:

| Flow | Required result |
|---|---|
| Auth page cold load | login usable, no stale redirect |
| New signup | profile created as STAFF/PENDING, no elevated authority |
| Email-confirmation branch | correct message/state for confirmed vs unconfirmed |
| PENDING login | pending state visible, no infinite loop |
| PENDING → sign out | session removed, login screen usable |
| PENDING → switch account | second account can log in without clearing browser storage manually |
| Owner Access | PENDING STAFF can be activated directly |
| Owner Access | role and status are independently understandable |
| ACTIVE username login | resolves username then authenticates |
| ACTIVE email login | authenticates directly |
| ACTIVE role routing | correct Employee/Manager/Owner/Accountant destination |
| logout | session removed |
| reload/back/cold | no stale authorization presentation |
| recovery | password lifecycle works without role/status mutation |
| diagnostics | no unexpected page/console/request/HTTP5xx errors |

Credentialed production E2E must use secret-backed test credentials or an explicit manual Owner smoke. Absence of credentials means `BLOCKED/OWNER_REQUIRED`, never a manufactured PASS.

## 9. Definition of Done

`AUTH-PROD` is CLOSED only when:

1. D1 pending-session loop is removed;
2. D2 Owner can activate a normal STAFF/PENDING account directly;
3. role and activation semantics are no longer conflated;
4. signup cannot capture the browser in an inescapable pending session;
5. an ACTIVE user can authenticate with valid credentials and route correctly;
6. username and email login paths are both verified;
7. logout/switch-account works without clearing site data manually;
8. password recovery remains functional;
9. Auth/profile/RLS authority boundaries are unchanged except for explicitly reviewed bounded fixes;
10. deterministic tests + browser tests + production-readiness smoke are GREEN on exact main;
11. production Supabase read-only reconciliation shows expected profile/Auth consistency;
12. no credentials/secrets/private user data are committed;
13. canonical evidence is recorded and Planner/Owner explicitly accepts production Auth closure.

## 10. Closure semantics

Closing UI2 did not close AUTH-PROD. AUTH-PROD closed independently on 2026-09-28 after the exact-main production cutover gate and canonical reconciliation completed.

Canonical closure evidence:

- `MAGASIN_AUTH_PRODUCTION_READINESS_CLOSURE_EVIDENCE.md`;
- exact executable cutover: `main @ 8c2080614837d1638f8c983796817aa143f5c7c2`;
- closure-doc base: `main @ c76ad69ea23f33cd364c34e16021ff329e70f0c4`;
- compare between those SHAs contains AUTH-PROD documentation/evidence only, with no Auth runtime drift.

Final state:

```text
AUTH_PROD         = CLOSED
PRODUCTION_READY  = YES / AUTH_AND_ONBOARDING_SCOPE
AUTH-PROD-001→008 = DONE
```

Profitability & Cash, Workforce Operations and other independent tracks retain their own state. Any later Auth incident must open a new explicitly named generation rather than silently reopening this closed track.
