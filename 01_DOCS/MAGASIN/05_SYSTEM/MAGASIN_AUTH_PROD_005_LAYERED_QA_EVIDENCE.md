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
