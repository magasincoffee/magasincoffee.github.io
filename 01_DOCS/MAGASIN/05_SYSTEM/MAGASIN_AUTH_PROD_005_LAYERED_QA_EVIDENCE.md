# AUTH-PROD-005 — Layered Real Auth QA Evidence

**Track:** `AUTH-PROD / MAGASIN_AUTH_PRODUCTION_READINESS_V1`  
**Task:** `AUTH-PROD-005 — Expand real Auth workflow QA`  
**Status:** `DONE / D3 CLOSED`  
**Exact main verified:** `d60fbf19601b853d8273cd718934cb06462132e5`  
**Production project:** `menvbzlsncmpuvnaifxa` (`MAGASIN-NOIBO`)  
**Evidence date:** `2026-09-28`

## 1. Layer A — deterministic/browser regression

Exact-main workflow evidence:

```text
AUTH-PROD Regression Contract = run 36375123319 = SUCCESS
Auth Password Reset Hotfix     = run 36375123332 = SUCCESS
UI2 Cross Role Acceptance      = run 36375123307 = SUCCESS
GitHub Pages validation        = run 36375123339 = SUCCESS
pages build and deployment     = run 36375122854 = SUCCESS
```

The exact-main AUTH-PROD gate includes deterministic/browser coverage for:

- signup returned-session cleanup;
- PENDING/INACTIVE escape and account switching;
- stale-session switch handoff;
- Owner logout;
- Owner role/status separation;
- ACTIVE/PENDING/INACTIVE/profile-error Auth boot;
- username/email login routing;
- email verification callbacks;
- password recovery;
- invalid-credential retry in the same form/browser.

The invalid-credential retry regression explicitly proves:

```text
wrong credential -> visible error -> form enabled again -> correct credential -> ACTIVE route = PASS
```

## 2. Layer B — fresh production read-only reconciliation

Fresh reconciliation after the manual production lifecycle:

```text
project_status         = ACTIVE_HEALTHY
auth_users             = 9
confirmed_auth_users   = 6
profiles               = 9
auth_without_profile   = 0
profile_without_auth   = 0
ACTIVE                 = 8
PENDING                = 0
INACTIVE               = 1
OWNER                  = 1
```

The role/status counts changed during authorized manual lifecycle testing. Earlier counts in historical evidence are dated snapshots, not invariants.

Authority verification remains:

- `public.profiles` RLS enabled;
- `profiles_select` unchanged;
- `profiles_update_owner` remains Owner-only with matching `USING` / `WITH CHECK`;
- `trg_auth_user_profile` remains the new-user projection trigger;
- `resolve_login_email(text)` remains the username-login resolver;
- Auth/profile one-to-one consistency remains intact.

## 3. Bounded authority correction found during Layer C

Manual Owner activation exposed:

`permission denied for table profiles`

Root cause: the Owner-only RLS UPDATE policy existed, but PostgreSQL table/column privilege did not permit the authenticated role to reach that policy.

Reviewed correction:

```text
authenticated UPDATE(role)   = true
authenticated UPDATE(status) = true
authenticated UPDATE(email)  = false
anon UPDATE(role)            = false
profiles RLS                 = true
```

The repository records this as migration:

`07_DATABASE/migrations/20260928094000_auth_prod_005_owner_profile_update_grant.sql`

This is a bounded column-level grant, not an RLS widening. No INSERT/DELETE privilege was added.

## 4. Layer C — production lifecycle smoke

Manual Owner production smoke now reports:

```text
B2  ACTIVE email login                    = PASS
B3  reload/cold boot                      = PASS
B4  logout                                = PASS
B5  ACTIVE username login                 = PASS
B6  PENDING login                         = PASS
B7  Check access                          = PASS
B8  PENDING -> switch -> ACTIVE           = PASS
B9  Owner activation/save                 = PASS
B10 activated account login               = PASS
B11 password recovery                     = PASS
invalid credential -> immediate retry     = PASS
```

Secret-backed exact-main CI independently confirms:

- ACTIVE username login = PASS;
- ACTIVE email login = PASS;
- ACTIVE logout = PASS;
- recovery request = PASS.

The CI environment does not hold a PENDING password; therefore B8 is intentionally supported by explicit manual Owner production smoke plus deterministic stale-session handoff coverage rather than a manufactured CI credential.

No password, session token, refresh token, cookie, private production identity export, or service-role key is committed in this evidence.

## 5. Defects closed by AUTH-PROD-005 execution

The production smoke surfaced and closed additional defects while preserving the canonical authority model:

1. Owner shared-shell logout could be inert — corrected in PR #330.
2. same-browser PENDING -> ACTIVE handoff could retain stale state — corrected in PR #331.
3. Owner Access lacked the bounded SQL privilege needed to reach Owner-only RLS — corrected in PR #332.
4. an invalid credential could leave the Auth form stuck in `Đang đăng nhập…` — corrected in PR #334.

## 6. Security-advisor observation

Supabase Security Advisor reports `anon_security_definer_function_executable` for public SECURITY DEFINER RPCs including `resolve_login_email`.

AUTH-PROD does not silently change that username-login authority contract. This remains a separately reviewable security-hardening observation and is not evidence of an Auth production-readiness failure in the proven lifecycle.

## 7. Task decision

```text
Layer A deterministic/browser       = PASS
Layer B production reconciliation   = PASS
Layer C credentialed ACTIVE smoke   = PASS
Layer C manual lifecycle smoke      = PASS
AUTH-PROD-D3                        = CLOSED
AUTH-PROD-005                       = DONE
```

Known unrelated gaps outside the Auth lifecycle are not folded into this task.

