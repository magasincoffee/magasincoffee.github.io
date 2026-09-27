# MAGASIN AUTH-PROD — Production Auth & Onboarding Readiness — EXECUTION PLAN

**Search key:** `AUTH-PROD`  
**Track ID:** `MAGASIN_AUTH_PRODUCTION_READINESS_V1`  
**Status:** `READY_TO_EXECUTE`  
**Priority:** `P0 PRODUCTION BLOCKER`  
**Source of Truth:** `01_DOCS/MAGASIN/05_SYSTEM/MAGASIN_AUTH_PRODUCTION_READINESS_SOURCE_OF_TRUTH.md`  
**Execution model:** PLAN → one bounded task → evidence → VERIFY → ACCEPT/REJECT → next task

## 1. Five-Step execution rule

Every implementation task applies the MAGASIN five-step method in this order:

1. **QUESTION** — verify the requirement/authority and reproduce the defect;
2. **DELETE** — remove redundant redirect/session behavior before adding code;
3. **SIMPLIFY** — use one canonical Auth state machine and existing profile authority;
4. **ACCELERATE** — add deterministic regression coverage around the fixed path;
5. **AUTOMATE** — automate production-readiness gates only after the workflow is proven.

No feature expansion is allowed inside AUTH-PROD.

## 2. Task order

### AUTH-PROD-001 — Lock incident regression contract

**Outcome:** convert the confirmed production defects into deterministic failing tests before implementation.

**Scope:**
- pending session loop reproducer;
- registration session persistence contract;
- Owner Access STAFF/PENDING activation gap;
- active/pending/inactive Auth boot behavior;
- username/email login routing contract.

**DoD:**
- tests fail against current broken behavior for the right reason;
- no production mutation;
- no authority change;
- evidence names D1–D4 explicitly.

**Stop boundary:** tests/evidence only.

---

### AUTH-PROD-002 — Fix pending escape and account switching

**Outcome:** a PENDING/INACTIVE user can always leave the account and sign in as another account.

**Implementation contract:**
- pending page loads canonical Supabase publishable client;
- add explicit `Check access`;
- add explicit `Sign out / Use another account`;
- sign-out clears local session before redirect to login;
- no auto-elevation and no role mutation;
- stale recovery/auth markers cleared where relevant.

**Required tests:**
- PENDING → login link cannot loop;
- PENDING → sign-out → Auth shows login with no session;
- switch-account path works in same browser context;
- reload/back does not resurrect pending session after sign-out.

**DoD:** D1 closed.

---

### AUTH-PROD-003 — Decouple Owner role assignment from activation

**Outcome:** Owner can approve a new normal employee without routing through ACCOUNTANT.

**Implementation contract:**
- display role and account status as separate concepts;
- explicit Owner activation action for non-OWNER PENDING/INACTIVE profiles;
- explicit deactivation only when chosen;
- OWNER row remains protected;
- allowed role list remains canonical;
- use existing `profiles` Owner writer/RLS unless evidence proves it insufficient;
- no new privileged browser API and no RLS widening.

**Required tests:**
- STAFF/PENDING → STAFF/ACTIVE;
- Manager-family PENDING → chosen role/ACTIVE;
- ACCOUNTANT activation still works without special-case authority coupling;
- OWNER cannot be downgraded/disabled from this UI;
- non-OWNER cannot activate another profile.

**DoD:** D2 closed.

---

### AUTH-PROD-004 — Harden registration and Auth boot state machine

**Outcome:** registration, confirmation, pending, active and invalid-profile states have one coherent session lifecycle.

**Implementation contract:**
- successful signup never leaves an inescapable pending session;
- if signup returns a session for a PENDING profile, clear local session before normal login/success continuation unless explicitly staying on bounded pending UI;
- email confirmation callback is handled intentionally;
- Auth boot distinguishes: no session / ACTIVE / PENDING / INACTIVE / unresolved profile;
- unresolved profile fails closed with visible actionable state;
- valid ACTIVE routing semantics stay unchanged.

**Required tests:**
- signup with session;
- signup without session / confirmation required;
- auth callback;
- ACTIVE boot;
- PENDING boot;
- INACTIVE boot;
- profile read failure;
- cold/reload/back.

**DoD:** signup and boot cannot trap the browser.

---

### AUTH-PROD-005 — Expand real Auth workflow QA

**Outcome:** replace mock-only confidence with a layered Auth release gate.

**Layer A — deterministic local tests**
- mocked network allowed for exhaustive state/error branches;
- verify exact session calls, status transitions and routes.

**Layer B — live production read-only reconciliation**
- project health;
- Auth/profile one-to-one consistency;
- role/status counts;
- trigger/function/RLS/grant contract;
- no secret exposure.

**Layer C — credentialed production smoke**
- secret-backed dedicated QA credentials if available;
- otherwise explicit manual Owner smoke;
- valid ACTIVE login;
- pending sign-out/switch;
- Owner activation;
- role redirect;
- logout;
- password recovery check.

**Hard rule:** no credential = no credentialed PASS. Report `OWNER_REQUIRED` instead.

**DoD:** D3 closed with evidence that clearly distinguishes mocked vs live verification.

---

### AUTH-PROD-006 — Diagnose existing OWNER login path

**Outcome:** determine whether the reported OWNER login failure is credential failure, stale-session interference, or another Auth regression.

**Order:**
1. prove pending-session escape first;
2. retry OWNER login in a clean same-browser workflow;
3. verify username resolution;
4. inspect Auth response/log status;
5. if `invalid_credentials`, use normal password recovery only with Owner action;
6. do not mutate OWNER role/status to solve a password problem.

**DoD:**
- root cause classified;
- valid credential login confirmed or Owner explicitly required for recovery;
- D4 remains separated from authorization changes.

---

### AUTH-PROD-007 — Exact-main production cutover gate

**Outcome:** prove the merged fix is deployable for real use.

**Required exact-main matrix:**
- register;
- confirmation branch;
- pending;
- sign-out/switch;
- Owner activate;
- ACTIVE username login;
- ACTIVE email login;
- role redirect;
- logout;
- recovery;
- cold/reload/back;
- diagnostics.

**Required evidence:**
- exact main SHA;
- fresh workflow run/job IDs;
- production deployment success;
- browser artifacts;
- production read-only reconciliation;
- no secrets/private data in diff;
- zero unresolved review threads for the final fix PR(s);
- known unrelated gaps explicitly separated.

**DoD:** exact-main gate GREEN or bounded OWNER_REQUIRED evidence only.

---

### AUTH-PROD-008 — Canonical closure

**Outcome:** reconcile the repository after production proof.

**Actions:**
- create `MAGASIN_AUTH_PRODUCTION_READINESS_CLOSURE_EVIDENCE.md`;
- mark AUTH-PROD Source of Truth CLOSED;
- mark this plan CLOSED;
- update `00_CURRENT_STATE.md` from `PRODUCTION_READY=NO` to the proven state;
- do not overwrite independent PFC/Workforce state;
- no later Auth task unless a new incident opens a new generation.

**DoD:** Planner/Owner accepts the production Auth closure evidence.

## 3. Current cursor

```text
AUTH-PROD-001 = DONE / MERGED PR #325
AUTH-PROD-002 = DONE / MERGED PR #326
AUTH-PROD-003 = READY
AUTH-PROD-004 = NOT_STARTED
AUTH-PROD-005 = NOT_STARTED
AUTH-PROD-006 = NOT_STARTED
AUTH-PROD-007 = NOT_STARTED
AUTH-PROD-008 = NOT_STARTED

AUTH_PROD        = ACTIVE
PRODUCTION_READY = NO
```

## 4. Dependencies and Owner boundaries

No Owner action is needed for AUTH-PROD-001 through bounded code/test fixes that do not mutate real account credentials.

Owner action is required when any of these are necessary:

- entering or changing a real user's password;
- password recovery for the real OWNER account;
- supplying credentialed production test secrets;
- deleting a real Auth user;
- disabling MFA/CAPTCHA;
- rotating Auth/API secrets;
- destructive production account changes.

Owner silence is not approval.

## 5. Required task-report format

Every Executor result must include:

- `task_id`;
- exact base/head SHA;
- changed files;
- defect(s) addressed;
- authority boundary statement;
- exact test commands/results;
- browser evidence where relevant;
- production read-only evidence where relevant;
- secret/private-data check;
- PR number and unresolved-thread count if a PR exists;
- known gaps;
- STOP after the assigned task.

No Executor may auto-advance to the next AUTH-PROD task.
