# AUTH-PROD-002 — Pending Escape & Account Switching Evidence

**Track:** `AUTH-PROD / MAGASIN_AUTH_PRODUCTION_READINESS_V1`  
**Task:** `AUTH-PROD-002 — Fix pending escape and account switching`  
**Status:** `PLANNER-ACCEPTED / MERGED PR #326`  
**Base lineage:** AUTH-PROD-001 merged through PR #325  
**Branch:** `auth-prod/auth-prod-002-pending-escape`

## 1. Defect closed by this task

AUTH-PROD D1 identified a deterministic persisted-session loop:

`PENDING session → pending-access.html → plain login link → Auth boot sees same session → pending-access.html`

The pending surface had no authenticated session escape and no bounded access recheck.

## 2. Implementation

`03_PLATFORM/01_AUTH/pending-access.html` now:

- loads the canonical Supabase browser SDK plus `shared-core-v1.js`;
- reuses the publishable-key client through `MAGASIN_CORE.supabase.get()`;
- exposes `Check access`;
- re-reads authenticated `profiles.role,status`;
- routes only when authoritative status is `ACTIVE`;
- distinguishes `INACTIVE` from still-`PENDING` messaging;
- exposes `Sign out / Use another account`;
- executes `sb.auth.signOut({ scope: 'local' })`;
- clears the local recovery-session marker;
- returns to Auth with no persisted account session.

No role/status mutation occurs on the pending surface.

## 3. Regression coverage

### Desired-state contract progression

The shared AUTH-PROD contract remains intentionally RED for later tasks.

Expected state after AUTH-PROD-002:

```text
PASS  D1 pending escape / access recheck
FAIL  D1/D3 signup returned-session cleanup       → AUTH-PROD-004
FAIL  D2 Owner activation independence            → AUTH-PROD-003
FAIL  D3 explicit boot state machine               → AUTH-PROD-004
PASS  username/email resolution + canonical routes
PASS  D4 credential/authorization separation

TOTAL = 6 tests / 3 pass / 3 expected fail
```

### Browser regression

`09_QA/auth/auth-prod-002-pending-browser.mjs` verifies in one browser model:

- PENDING → Check access → remains pending with clear status;
- INACTIVE → Check access → remains fail-closed with explicit status;
- ACTIVE OWNER → Check access → canonical Owner route;
- PENDING → Sign out / Use another account → local session removed → Auth login usable in the same browser context;
- no page/console errors in the bounded pending/switch paths.

## 4. Post-UI2 workflow reconciliation

The old UI2 workflow contained an immutable git-diff assertion against the historical UI2-017 executable baseline. That assertion was correct only for UI2 closure and would reject every later authorized executable track.

AUTH-PROD-002 replaces that obsolete immutable-drift step with an explicit historical-baseline marker while retaining the full cross-role static/browser regression suite.

This does not reopen UI2 and does not loosen Auth behavior assertions.

## 5. Authority boundary

This task does not:

- activate/deactivate any profile;
- change role authority;
- change Owner Access writer semantics;
- change Supabase Auth schema/config;
- change RLS, grants, RPCs, triggers or migrations;
- mutate production data;
- use or commit real credentials.

The only production behavior change is local session escape/recheck on the pending access surface.

## 6. Stop boundary

AUTH-PROD-002 stops after final-head regression evidence and Planner verification.

It does not implement AUTH-PROD-003 Owner activation or AUTH-PROD-004 registration/boot hardening.
