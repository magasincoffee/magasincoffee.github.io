# AUTH-PROD-007 — Exact-Main Production Cutover Evidence

**Track:** `AUTH-PROD / MAGASIN_AUTH_PRODUCTION_READINESS_V1`  
**Task:** `AUTH-PROD-007 — Exact-main production cutover gate`  
**Status:** `DONE / GREEN`  
**Exact main:** `8c2080614837d1638f8c983796817aa143f5c7c2`  
**Evidence date:** `2026-09-28`

## 1. Exact-main workflow gate

All required Auth/runtime workflows are GREEN on the exact main SHA:

```text
AUTH-PROD Regression Contract
  run 36376588679
  job 108783582881 auth-prod-red-contract = SUCCESS
  job 108783582772 auth-prod-active-production-smoke = SUCCESS

UI2 Cross Role Acceptance
  run 36376588689
  job 108783582776 cross-role-browser-gate = SUCCESS

Auth Password Reset Hotfix
  run 36376588677
  job 108783582771 auth-password-reset = SUCCESS

Validate MAGASIN GitHub Pages source
  run 36376588658
  job 108783582928 validate = SUCCESS

pages build and deployment
  run 36376587929
  job 108783583431 build = SUCCESS
  job 108783731657 deploy = SUCCESS
```

The exact-main AUTH-PROD job includes:

- Owner logout regression;
- PENDING escape/switch regression;
- stale-session handoff regression;
- invalid-credential retry regression;
- duplicate-username signup guard regression;
- Owner activation regression;
- Auth registration/boot state-machine regression.

## 2. Browser artifact

Exact-main cross-role artifact:

```text
run      = 36376588689
artifact = 10951640305
name     = ui2-016-cross-role-36376588689
digest   = sha256:8d396afacf3bae0a553c6c4c5974dd349504276107c10549bfe8b5a965dfecde
head_sha = 8c2080614837d1638f8c983796817aa143f5c7c2
```

The artifact contains the browser acceptance output produced by the exact-main workflow.

## 3. Production lifecycle matrix

Production/manual evidence plus exact-main automated coverage establishes:

```text
register                         = PASS
confirmation-required branch     = PASS
verification callback            = PASS
PENDING state                    = PASS
PENDING check access             = PASS
PENDING sign-out/switch          = PASS
Owner activate/save              = PASS
activated-account login          = PASS
ACTIVE username login            = PASS
ACTIVE email login               = PASS
ACTIVE role redirect             = PASS
logout                           = PASS
cold/reload/back                 = PASS
password recovery                = PASS
invalid credential retry         = PASS
duplicate username bounded error = PASS
```

Production Auth logs include a successful `POST /signup` with `user_confirmation_requested` and successful `/verify` callbacks. A historical duplicate-username signup generated a 500 and was corrected by PR #337; exact-main regression now rejects the duplicate before `signUp`.

## 4. Diagnostics

For the exact-main post-deployment Auth-log observation window:

```text
Auth HTTP5xx = 0
```

The previously observed duplicate-username signup 500 is historical and addressed by the exact-main code.

## 5. Fresh production reconciliation

```text
auth_users             = 9
profiles               = 9
confirmed_auth_users   = 6
ACTIVE                 = 8
PENDING                = 0
INACTIVE               = 1
OWNER                  = 1
auth_without_profile   = 0
profile_without_auth   = 0
```

Authority boundaries remain:

- profiles RLS enabled;
- Owner-only profile UPDATE policy preserved;
- authenticated UPDATE is bounded to `role,status`;
- authenticated cannot UPDATE email;
- anon cannot UPDATE role;
- Supabase Auth remains the password/session authority.

## 6. Review and privacy gate

Unresolved review threads:

```text
PR #330 = 0
PR #331 = 0
PR #332 = 0
PR #334 = 0
PR #335 = 0
PR #336 = 0
PR #337 = 0
```

The AUTH-PROD evidence and QA changes commit no real password, access token, refresh token, cookie, service-role key, private production export, IP address or private identity list.

Manual screenshots containing production identities/credentials were intentionally not committed.

## 7. Runtime drift check

The manual production matrix was completed on the AUTH runtime introduced through the final AUTH-PROD fixes. Subsequent documentation-only task transitions were separately verified not to change Auth runtime.

PR #337 then changed only the bounded duplicate-username preflight plus its QA/workflow coverage; all exact-main Auth/browser gates were rerun after that change.

## 8. Known unrelated items

Independent Procurement/data-quality issues are outside AUTH-PROD and do not alter the Auth cutover decision.

The Supabase Security Advisor observation concerning anonymous execution of SECURITY DEFINER RPCs remains separately reviewable and was not silently changed during cutover.

## 9. Task decision

```text
exact-main Auth gate        = GREEN
exact-main production smoke = GREEN
exact-main browser gate     = GREEN
exact-main Pages deployment = GREEN
production reconciliation   = GREEN
review-thread gate          = GREEN
privacy/secret gate         = GREEN
AUTH-PROD-007               = DONE
```
