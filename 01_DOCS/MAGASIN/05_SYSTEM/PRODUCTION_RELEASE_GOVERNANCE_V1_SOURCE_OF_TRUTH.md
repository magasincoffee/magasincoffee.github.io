# MAGASIN WEBAPP — PRODUCTION RELEASE GOVERNANCE V1

**Track:** PRODUCTION_RELEASE_GOVERNANCE_V1  
**Authority type:** CROSS-PROJECT / PERMANENT SOURCE OF TRUTH  
**Applies to:** production-impacting changes in `magasincoffee/magasincoffee.github.io`  
**Timezone:** Asia/Ho_Chi_Minh  
**Owner decision date:** 2026-10-02  
**Status:** ACTIVE / MANDATORY FOR ALL FUTURE PRODUCTION RELEASES

## 1. Purpose

The MAGASIN WebApp is now in real production use.

From this point forward, upgrades, bug fixes, UI changes, Auth changes, Manager/Employee/Owner changes, Workforce changes, database/RPC changes, configuration changes and other production-impacting work must not be treated as “edit production first, then repair”.

The required operating model is:

`Development branch → Preview/Staging → QA → Owner review → Release Candidate freeze → 00:00 production release → production smoke → close or rollback`

This document is the cross-project release authority. It does not replace domain/business Source of Truth files such as XSTORE, Auth or Employee Registration. Those SOTs continue to own their business/task scope; this SOT controls **how approved changes reach production**.

## 2. Core production invariants

### RELEASE-INV-01 — Production is live

`main` is treated as the live production source.

A production-impacting change must not be developed directly on `main`.

### RELEASE-INV-02 — Midnight release window

Normal production releases are performed at **00:00 Asia/Ho_Chi_Minh**.

Development, QA and Preview work may happen before that time on non-production branches/environments.

Do not merge a production-impacting Release Candidate to `main` before the approved midnight window.

A deviation from the midnight window requires an **explicit Owner instruction in that specific release conversation**. Do not infer an emergency exception.

### RELEASE-INV-03 — Release must be complete

A production Release Candidate must be complete within its declared scope before it can be released.

Do not deploy a release with:

- known unfinished implementation in the release scope;
- unresolved functional regression;
- unresolved critical/high-severity UI or runtime failure;
- required QA still running or failed;
- an unreviewed migration;
- an unknown rollback point;
- an unapproved Owner-facing UI change;
- a temporary production workaround presented as final completion.

If the release is incomplete, keep it in Preview/RC state and do not merge it to production.

### RELEASE-INV-04 — Preview before production

Owner-facing changes must be reviewable before production release.

Preferred proof order:

1. real Preview/Staging URL;
2. browser acceptance on the exact Release Candidate;
3. screenshots/recordings only as supplemental evidence.

Do not require the Owner to inspect a production deployment merely to discover whether an update is acceptable.

### RELEASE-INV-05 — Preview must not mutate production business truth

Preview/Staging must not create or alter real production business values merely for acceptance.

Examples include:

- Store Priority;
- staffing demand;
- schedule assignments;
- official schedules;
- attendance;
- payroll;
- procurement truth;
- role/status mutations;
- other Owner/Manager business decisions.

Use fixture/mock data, read-only production snapshots where appropriate, or a dedicated staging backend.

### RELEASE-INV-06 — Database/RPC changes require staging proof

Database, migration, RLS, RPC and other backend-authority changes must be validated before production.

Required where applicable:

- staging/Supabase branch or equivalent isolated environment;
- migration ordering check;
- rollback/recovery plan;
- compatibility test against the exact frontend Release Candidate;
- no fabricated production business data.

Do not use production as the first test environment for a new migration/RPC contract.

### RELEASE-INV-07 — Owner approval freezes the candidate

The Owner approves a specific Release Candidate commit SHA.

After Owner approval:

- freeze the RC SHA;
- do not add code changes to that RC silently;
- any code/config/migration change invalidates the previous approval;
- rerun affected QA and obtain Owner approval again when the visible/functional behavior changed.

### RELEASE-INV-08 — Exact SHA release

Production must receive the exact approved Release Candidate SHA/content.

Use an expected-head guard when merging the release PR where supported.

Do not merge “whatever is latest” if it differs from the reviewed candidate.

### RELEASE-INV-09 — Rollback first, live patch second

Before production release, record the current known-good production SHA as the rollback point.

If the new release produces a serious production regression:

1. stop further rollout;
2. prefer rollback to the previous known-good production SHA;
3. verify production recovery;
4. fix the problem on a new branch/RC;
5. repeat Preview → QA → Owner approval → release.

Do not keep production in a broken state while improvising multiple direct patches.

### RELEASE-INV-10 — Post-deploy verification is mandatory

A release is not complete merely because merge/deploy succeeded.

After production deployment, verify the exact new `main` SHA with relevant smoke/read-only checks.

At minimum where applicable:

- GitHub Pages source validation;
- Pages build/deployment;
- role entrypoints;
- Auth;
- Manager;
- Employee;
- Owner;
- affected domain workflow;
- console/page/request/5xx diagnostics;
- database/RPC health for backend releases.

## 3. Standard release lifecycle

Every production-impacting release follows these states:

| State | Meaning |
|---|---|
| `DEVELOPMENT` | Work is still being implemented on a non-production branch |
| `QA_RUNNING` | Automated/static/browser/backend checks are running |
| `PREVIEW_READY` | Candidate is available for pre-production inspection |
| `OWNER_REVIEW` | Owner is checking the Preview/Staging build |
| `CHANGES_REQUESTED` | Owner requested corrections; previous approval is invalid |
| `RC_READY` | Exact candidate passed required checks and is ready to freeze |
| `RC_APPROVED` | Owner approved the exact RC SHA |
| `WAITING_RELEASE_WINDOW` | Candidate is frozen and waiting for 00:00 Asia/Ho_Chi_Minh |
| `DEPLOYING` | Exact approved RC is being merged/deployed |
| `PRODUCTION_SMOKE` | Post-deploy verification on exact-main |
| `RELEASED` | Production smoke green and release closed |
| `ROLLED_BACK` | Release was reverted to the recorded known-good SHA |
| `BLOCKED` | Release cannot progress without required fix/input |

Do not mark `RELEASED` before production smoke is green.

## 4. Required Release Candidate packet

Before moving to `RC_APPROVED`, record:

- release ID;
- release scope;
- branch;
- PR;
- exact RC SHA;
- Preview/Staging URL or equivalent browser acceptance target;
- Owner approval;
- required QA workflows and conclusions;
- known limitations, which must not violate “release complete”;
- database/migration plan when applicable;
- rollback production SHA;
- planned release date/window;
- production smoke checklist.

Recommended release ID format:

`REL-YYYYMMDD-NN`

Example:

`REL-20261003-01`

## 5. Required pre-release gates

Relevant gates are path/scope aware. Do not invent a run for a workflow that legitimately does not trigger.

For changes touching the corresponding surfaces, use the repository’s established gates, including where applicable:

- Validate MAGASIN GitHub Pages source;
- UI2 Cross Role Acceptance;
- People Shift Day-10 Tests;
- SOP Task Tests;
- AUTH-PROD Regression Contract;
- Auth Password Reset Hotfix;
- Owner Control Tower Tests;
- Procurement QA Robot;
- Business OS Contract Tests;
- domain-specific migration/backend verification.

A required gate must be:

`completed / success`

before the exact candidate is eligible for production.

## 6. Owner Preview acceptance

For Owner-visible releases, the Owner must be able to inspect the candidate before production.

The review should cover as applicable:

- desktop/mobile layout;
- tables and forms;
- labels and Vietnamese copy;
- empty/loading/error states;
- create/edit/remove flows;
- role-specific behavior;
- responsive behavior;
- color/visual rules;
- business calculations/projections;
- any changed navigation;
- affected reports.

If the Owner requests a correction:

- return to `CHANGES_REQUESTED`;
- implement on the release branch;
- rerun affected checks;
- deploy a new Preview;
- approve the new exact SHA.

## 7. Midnight production procedure

At the approved release window:

1. confirm current production SHA still equals the recorded pre-release baseline or explicitly reconcile any intervening change;
2. confirm RC SHA is unchanged since Owner approval;
3. confirm required QA remains green;
4. record rollback SHA;
5. merge/deploy the exact RC;
6. wait for deployment conclusion;
7. run production smoke/read-only checks;
8. verify exact-main SHA;
9. mark `RELEASED` only if smoke is green.

Do not bundle unreviewed “small fixes” into the midnight merge.

## 8. Failure and rollback procedure

If production smoke fails materially:

- set release state to `BLOCKED` or `ROLLED_BACK`;
- preserve failure evidence/logs;
- rollback to the recorded known-good SHA where practical;
- verify restored production;
- create a new fix branch/RC;
- repeat the full pre-production acceptance path.

A rollback does not authorize bypassing Preview/QA for the subsequent fix.

## 9. Documentation-only changes

Documentation/evidence/governance-only updates that do **not** alter production runtime, deployable UI behavior, configuration, schema, RPC, migration or production business behavior may be merged outside the midnight release window.

Do not misuse this exception to disguise production-impacting changes.

If uncertain whether a change is production-impacting, treat it as production-impacting.

## 10. Future chat / robot execution rule

Whenever a future chat/robot is asked to:

- upgrade the WebApp;
- fix a production bug;
- change Manager/Employee/Owner/Auth UI;
- change production behavior;
- modify database/RPC/RLS/migration;
- merge a product PR;
- deploy production;

it must read this file before performing the production merge/deploy step.

Future execution must:

1. identify the relevant domain/project SOT;
2. identify this release-governance SOT as the production delivery authority;
3. work on a non-production branch;
4. create/verify Preview or equivalent pre-production acceptance;
5. obtain Owner approval for Owner-visible behavior;
6. freeze an exact RC SHA;
7. wait for the approved 00:00 Asia/Ho_Chi_Minh release window;
8. merge/deploy only the approved candidate;
9. verify production and retain rollback evidence.

A domain SOT may define stricter gates, but it must not weaken these release invariants.

## 11. Current production baseline at policy activation

Policy activation baseline:

`main @ 9d97b2eeacba98018907c6cafffc86c7c6404caa`

At activation:

- the WebApp is considered live production;
- future production-impacting changes follow this governance;
- existing active EMPREG and XSTORE SOTs retain their business/task authority;
- this file governs how their future production changes are released.

## Final rule

**No approved Preview + no green required QA + no frozen exact RC + no rollback SHA = no production release.**

Normal production release time:

**00:00 Asia/Ho_Chi_Minh.**
