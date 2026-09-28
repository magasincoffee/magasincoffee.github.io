# AUTH-PROD-005 — Layered Real Auth QA Evidence

**Track:** `AUTH-PROD / MAGASIN_AUTH_PRODUCTION_READINESS_V1`  
**Task:** `AUTH-PROD-005 — Expand real Auth workflow QA`  
**Status:** `PARTIAL / OWNER_REQUIRED`  
**Exact base inspected:** `main @ 43e7f678e578b4480e87bf7e1201beed161437aa`  
**Production project:** `menvbzlsncmpuvnaifxa` (`MAGASIN-NOIBO`)  
**Evidence date:** `2026-09-27`

## 1. Layer A — deterministic local/browser regression

The existing merged AUTH-PROD deterministic suite is GREEN at the AUTH-PROD-004 final head:

- AUTH-PROD Regression Contract — workflow run `36329086787` — SUCCESS;
- Auth Password Reset Hotfix — workflow run `36329086766` — SUCCESS;
- UI2 Cross Role Acceptance — workflow run `36329086764` — SUCCESS.

Coverage already proves with mocks/local browser control:

- pending access recheck and local sign-out/switch;
- signup returned-session cleanup;
- Owner role/status separation and bounded activation UI;
- ACTIVE/PENDING/INACTIVE/profile-error Auth boot semantics;
- username/email resolution and canonical role routes;
- email verification callbacks;
- password-recovery regression behavior.

AUTH-PROD-005 adds a credentialed production runner that is deliberately unusable without secret-backed credentials. Missing secrets return `AUTH_PROD_005_CREDENTIAL_SMOKE=OWNER_REQUIRED` with a non-zero exit status; they never produce PASS.

## 2. Layer B — live production read-only reconciliation

Fresh read-only reconciliation against production returned:

```text
project_status         = ACTIVE_HEALTHY
auth_users             = 8
confirmed_auth_users   = 6
profiles               = 8
auth_without_profile   = 0
profile_without_auth   = 0
ACTIVE                 = 4
PENDING                = 4
INACTIVE               = 0
OWNER                  = 1
```

Aggregate role/status distribution:

```text
ACCOUNTANT / ACTIVE = 2
OWNER      / ACTIVE = 1
STAFF      / ACTIVE = 1
STAFF      / PENDING = 4
```

No emails, usernames, UUIDs, tokens, cookies or credentials are recorded in this evidence.

### Authority contract

Production inspection confirms:

- `public.profiles` has RLS enabled;
- `profiles_select` allows own-row read or Owner read;
- `profiles_update_owner` remains Owner-only with matching `USING` and `WITH CHECK`;
- `trg_auth_user_profile` remains enabled on `auth.users` and calls `handle_new_auth_user`;
- `resolve_login_email(p_username text)` remains callable by `anon` and `authenticated`, matching the current username-login contract.

The canonical reusable reconciliation query is recorded at `09_QA/auth/auth-prod-005-production-readonly.sql` and contains read-only SELECT statements only.

## 3. Security-advisor observation — not silently changed in this task

Supabase Security Advisor currently reports `anon_security_definer_function_executable` warnings, including `public.resolve_login_email(p_username text)`, because it is a `SECURITY DEFINER` function executable by `anon`.

This is a real security finding and must not be hidden. AUTH-PROD-005 does **not** revoke or widen grants, change the function, change RLS, or change the username-login authority contract. Any remediation requires a separately reviewed authority/security change rather than being smuggled into a QA task.

Reference: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

## 4. Layer C — credentialed production smoke

Current status: `OWNER_REQUIRED`.

No production password or secret-backed QA credential is available to this executor context. Therefore the following are **not claimed as PASS**:

- ACTIVE email login against production;
- ACTIVE username login against production;
- PENDING credential login → sign-out/switch → second-account login;
- Owner activation of a dedicated PENDING QA account;
- active-role logout through the production UI;
- password-recovery send/open/complete smoke.

The new credentialed runner covers the first three items without printing credentials. It expects repository/environment secrets and runs only from explicit manual workflow dispatch.

The remaining Owner activation, active-role logout and recovery lifecycle remain explicit manual Owner smoke unless dedicated disposable QA identities are provisioned and authorized for automated production mutation.

## 4.1 Manual production defect: Owner logout

Manual exact-production smoke on 2026-09-28 confirmed an ACTIVE OWNER session can reach `/04_OWNER/`, but the visible shared-shell `Đăng xuất` button did not sign out.

Root cause on exact main `0898df204010d2989a56b65de0499c92a9fa53fa`:

- the shared shell generated a visible logout control;
- its handler delegated exclusively to page-local `#logoutBtn`;
- Owner Overview has no dependable source `#logoutBtn` handler;
- therefore the shared control could become inert and leave the persisted Supabase session intact.

Correction contract:

- preserve source-button delegation when a page already owns a canonical logout handler;
- otherwise call `sb.auth.signOut({ scope: 'local' })` directly;
- clear `magasin.auth.recovery.session.v1`;
- redirect to Auth with `?switch=1` only after sign-out succeeds;
- if sign-out fails, remain on the authenticated page and expose a retry state;
- bump the Owner Overview shell script cache token;
- gate with `auth-prod-005-owner-logout-browser.mjs`.

Authority impact: session cleanup only. No role/status, Auth user, password, RLS, grant, function, trigger or schema mutation.

## 4.2 Manual production matrix — same-browser switch

Manual Owner smoke against exact main `58def7b6c1102dc5c89bc3849b1db50fe15cd016` reported:

```text
B2  ACTIVE email login          = PASS
B3  reload/cold boot            = PASS
B4  logout                      = PASS
B5  ACTIVE username login       = PASS
B6  PENDING login               = PASS
B7  Check access                = PASS
B8  PENDING -> switch -> ACTIVE = FAIL
B9  Owner activation            = PASS
B10 activated account login     = PASS
B11 recovery                    = PASS
```

The evidence screenshot is intentionally not committed because it contains production identities. The result matrix alone is recorded.

The B8 failure exposed a test gap: AUTH-PROD-002 proved that the PENDING page called local sign-out and returned to Auth, but did not prove that a second ACTIVE account could immediately authenticate in the same browser after a stale-session handoff.

Correction contract:

- Auth boot recognizes `?switch=1`;
- performs a second canonical `signOut({ scope: 'local' })` before accepting the next account;
- clears stale recovery markers;
- removes the transient switch query after cleanup;
- remains on Login and focuses the username field;
- does not auto-route any stale PENDING session;
- deterministic browser coverage simulates a first sign-out that reports success while deliberately leaving stale local session state, then proves the Auth handoff clears it and ACTIVE login succeeds.

Authority impact: session cleanup only. No role/status, password, Auth-user, RLS, grant, function, trigger or schema mutation.

## 5. Authority boundary

This task execution so far:

- performed production reads only;
- made no profile/Auth mutations;
- did not reset any password;
- did not create/delete users;
- did not change RLS, grants, functions, triggers or schema;
- did not expose service-role/secret credentials;
- did not infer a credentialed PASS from mock tests.

## 6. Task decision

```text
Layer A deterministic/local          = PASS
Layer B production read-only         = PASS
Layer C credentialed production E2E  = OWNER_REQUIRED
AUTH-PROD-005 DoD                    = NOT CLOSED
D3                                   = NOT CLOSED
```

AUTH-PROD-006 must not start until AUTH-PROD-005 receives the required credentialed/manual production evidence or Planner explicitly reclassifies the dependency.
