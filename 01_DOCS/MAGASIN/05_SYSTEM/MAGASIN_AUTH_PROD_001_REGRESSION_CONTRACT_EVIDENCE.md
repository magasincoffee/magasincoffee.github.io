# AUTH-PROD-001 — Incident Regression Contract Evidence

**Track:** `AUTH-PROD / MAGASIN_AUTH_PRODUCTION_READINESS_V1`  
**Task:** `AUTH-PROD-001 — Lock incident regression contract`  
**Status:** `EXECUTOR RED-CONTRACT CANDIDATE / AWAITING CI EVIDENCE`  
**Base:** `main @ 722c70045d3f86d187099d0a07451b0e4bec99ea`  
**Branch:** `auth-prod/auth-prod-001-regression-contract`  
**Production mutation:** NONE  
**Executable production changes:** NONE

## 1. Purpose

This task is the TDD **RED** phase for the production Auth incident.

The new contract asserts the required post-fix behavior. It is intentionally expected to fail against the current production implementation. The task does not repair the defects and does not manufacture a green result by asserting that the bugs exist.

## 2. Locked defects

### D1 — PENDING session trap

Desired-state assertions require:

- canonical Supabase browser client on the pending surface;
- explicit `Check access`;
- explicit `Sign out / Use another account`;
- local Supabase sign-out before returning to login;
- authoritative `profiles.role,status` recheck.

Current production pending surface has only a normal link back to Auth, so these assertions must fail before AUTH-PROD-002.

### D2 — activation coupled to ACCOUNTANT

Desired-state assertions reject the current special case that sets `ACTIVE` only when role becomes `ACCOUNTANT`, and require a separate status/activation control.

These assertions must fail before AUTH-PROD-003.

### D3 — lifecycle/boot coverage gap

Desired-state assertions require explicit ACTIVE/PENDING/INACTIVE boot semantics instead of collapsing every non-ACTIVE state into one pending redirect.

The contract also preserves the canonical username/email resolution and role-route baseline.

The broader credentialed lifecycle gate remains a later task under AUTH-PROD-005; AUTH-PROD-001 only locks the deterministic incident contract.

### D4 — credential failure remains separate

The login block must authenticate through Supabase Auth and must not update profile role/status in response to invalid credentials.

This baseline assertion is expected to remain GREEN while D1–D3 are RED.

## 3. Expected initial result

Command:

```bash
node --test 09_QA/auth/auth-prod-001-regression-contract.test.mjs
```

Expected task-phase result:

```text
OVERALL = FAIL (INTENTIONAL RED CONTRACT)
D1      = FAIL
D2      = FAIL
D3      = FAIL on missing explicit INACTIVE/non-collapsed state handling
baseline username/email/role routing = PASS
D4 credential/authorization separation = PASS
```

A failing run is the correct AUTH-PROD-001 result if failures correspond to the locked defects above.

## 4. Authority boundary

This task:

- does not modify `03_PLATFORM/01_AUTH/**`;
- does not modify `04_OWNER/Access/**`;
- does not change RPCs, RLS, grants, triggers, schema or Supabase data;
- does not use or store real credentials;
- does not reset any real user password;
- does not alter role/status for any production profile.

## 5. Next task boundary

AUTH-PROD-001 stops after reproducible RED evidence.

No fix belongs in this task.

After Planner ACCEPT, AUTH-PROD-002 may repair the pending escape/account-switching defect against this contract.
