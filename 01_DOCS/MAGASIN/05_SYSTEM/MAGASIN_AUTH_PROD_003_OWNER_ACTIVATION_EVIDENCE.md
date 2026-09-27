# AUTH-PROD-003 — Owner Activation Separation Evidence

**Track:** `AUTH-PROD / MAGASIN_AUTH_PRODUCTION_READINESS_V1`  
**Task:** `AUTH-PROD-003 — Decouple Owner role assignment from activation`  
**Status:** `EXECUTOR CANDIDATE / AWAITING CI + PLANNER VERIFY`  
**Base:** `main @ 1152c6bb86dc746cf1981a95d45af7db9e23431d`  
**Branch:** `auth-prod/auth-prod-003-owner-activation`

## 1. Defect closed

AUTH-PROD D2 proved that activation was coupled to one special case:

```text
if role becomes ACCOUNTANT and account is not ACTIVE
→ payload.status = ACTIVE
```

That made ACCOUNTANT a hidden activation bridge and left normal STAFF/PENDING users without a direct Owner activation path.

## 2. Implementation

Owner Access now treats these as separate explicit controls:

- **Role** — canonical allowed non-OWNER role;
- **Account status** — `PENDING`, `ACTIVE`, `INACTIVE`.

For non-OWNER rows:

- Owner may leave role unchanged and set `ACTIVE` to activate;
- Owner may change role and status in the same explicit save;
- deactivation occurs only when Owner explicitly selects `INACTIVE`;
- save writes one bounded existing `profiles.update({ role, status })`.

For OWNER rows:

- role remains disabled;
- status control is not exposed;
- save writer is not exposed.

The ACCOUNTANT-specific activation branch is deleted.

## 3. Regression contract progression

Expected desired-state contract after AUTH-PROD-003:

```text
PASS  D1 pending escape / access recheck
FAIL  signup returned-session cleanup           → AUTH-PROD-004
PASS  D2 Owner activation independence
FAIL  D3 explicit Auth boot state machine       → AUTH-PROD-004
PASS  username/email resolution + role routes
PASS  D4 credential/authorization separation

TOTAL = 6 tests / 4 pass / 2 expected fail
```

## 4. Browser regression

`09_QA/auth/auth-prod-003-owner-activation-browser.mjs` verifies:

- STAFF/PENDING → STAFF/ACTIVE directly;
- STORE_MANAGER/PENDING → STORE_MANAGER/ACTIVE directly;
- ACCOUNTANT/PENDING → ACCOUNTANT/ACTIVE through the same generic status control;
- exact update payload contains explicit role + status;
- OWNER row exposes no status writer or save action;
- STAFF actor is denied before any profile writer can run.

## 5. Authority boundary

AUTH-PROD-003 reuses existing Owner-only `profiles` writer authority and RLS.

It does not:

- add a new RPC;
- widen RLS;
- grant activation to non-OWNER users;
- add a browser service-role key;
- modify Auth credentials;
- change schema, trigger or migration;
- mutate production data during implementation/QA.

## 6. Stop boundary

This task does not implement registration/session cleanup or Auth boot hardening. Those remain AUTH-PROD-004.
