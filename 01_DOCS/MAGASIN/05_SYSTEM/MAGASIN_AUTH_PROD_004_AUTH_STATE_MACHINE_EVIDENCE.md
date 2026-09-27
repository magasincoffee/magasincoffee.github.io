# AUTH-PROD-004 — Registration & Auth State Machine Evidence

**Track:** `AUTH-PROD / MAGASIN_AUTH_PRODUCTION_READINESS_V1`  
**Task:** `AUTH-PROD-004 — Harden registration and Auth boot state machine`  
**Status:** `PLANNER-ACCEPTED / MERGED PR #328`  
**Base:** `main @ 99ce61b9d3de77c5c6e2705aa189f262075ca87f`  
**Branch:** `auth-prod/auth-prod-004-auth-state-machine`

## 1. Outcomes

This task closes the remaining deterministic desired-state Auth contract from AUTH-PROD-001.

### Registration

If `signUp` returns a browser session:

- the local session is explicitly signed out;
- the recovery marker is cleared;
- the browser returns to the login surface;
- the user is told the account is waiting for Owner activation.

If signup returns no session:

- the user is told to confirm email before login.

Registration never grants ACTIVE or elevated role authority.

### Login and cold boot

Authenticated profile status is explicit:

- `ACTIVE` → canonical role route;
- `PENDING` → bounded pending-access surface;
- `INACTIVE` → local sign-out + visible fail-closed login message;
- unknown status → local sign-out + visible fail-closed error;
- profile read failure → local sign-out + visible actionable error;
- no session → normal login surface.

### Email verification callback

`?auth=verify` is now an explicit callback path.

The handler supports:

- a session already established by browser/implicit URL handling;
- PKCE-style `code` fallback via `exchangeCodeForSession`;
- token-hash `signup/email` verification fallback.

After verification:

- ACTIVE → canonical role route;
- PENDING → local sign-out + verified/pending message;
- INACTIVE/unknown → local sign-out + fail-closed message;
- invalid/expired callback → local sign-out + friendly error.

This prevents an email-confirmation session from silently capturing the browser.

## 2. Desired-state contract

AUTH-PROD deterministic contract target after this task:

```text
D1 pending escape / access recheck                   PASS
signup returned-session cleanup                      PASS
D2 Owner activation independence                     PASS
D3 ACTIVE/PENDING/INACTIVE explicit state machine    PASS
username/email resolution + canonical routes         PASS
D4 credential/authorization separation               PASS

TOTAL = 6 tests / 6 pass / 0 fail
```

## 3. Browser matrix

`09_QA/auth/auth-prod-004-auth-state-machine-browser.mjs` covers:

- signup returning a session → local sign-out;
- signup requiring email confirmation;
- ACTIVE cold boot;
- PENDING cold boot;
- INACTIVE cold boot + reload after sign-out;
- profile read failure;
- implicit/session-backed email verification;
- PKCE code exchange verification.

Existing password-reset browser regression remains required and unchanged.

## 4. Authority boundary

AUTH-PROD-004 does not:

- change role/status rows;
- change Owner writer authority;
- add service-role credentials;
- change RLS, grants, RPCs, schema, triggers or migrations;
- mutate production data;
- bypass Supabase password/session authority.

## 5. Stop boundary

Credentialed production lifecycle proof remains AUTH-PROD-005.

Existing OWNER credential diagnosis remains AUTH-PROD-006.
