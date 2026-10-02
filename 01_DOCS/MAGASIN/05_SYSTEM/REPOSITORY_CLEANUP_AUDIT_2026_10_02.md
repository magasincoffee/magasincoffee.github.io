# MAGASIN WEBAPP — Repository Cleanup Audit 2026-10-02

**Repository:** `magasincoffee/magasincoffee.github.io`  
**Audit baseline:** `main @ 89520f9d4784d90da2500d53d31c1ed0e8047bff`  
**Purpose:** remove proven obsolete/quarantined source from the active tree without deleting current authority, migrations, QA evidence or active production routes.

## Baseline

Repository tree at audit start:

- total blobs: 618;
- `01_DOCS`: 159;
- `02_CORE`: 50;
- `03_PLATFORM`: 11;
- `04_OWNER`: 28;
- `05_MANAGER`: 63;
- `06_EMPLOYEE`: 13;
- `07_DATABASE`: 40;
- `09_QA`: 200;
- `99_LEGACY`: 35.

## Authority that must be preserved

### Active temporary authorities

Keep:

- `01_DOCS/MAGASIN/05_SYSTEM/EMPLOYEE_REGISTRATION_PRODUCTION_HARDENING_TEMP_SOURCE_OF_TRUTH.md`
  - status at audit: `ACTIVE / TEMPORARY EXECUTION AUTHORITY`;
- `01_DOCS/MAGASIN/05_SYSTEM/WORKFORCE_CROSS_STORE_SCHEDULING_TEMP_SOURCE_OF_TRUTH.md`
  - status at audit: `XSTORE-011 BLOCKED / OWNER INPUT REQUIRED`.

Do not delete these until their own lifecycle rules close.

### Closed/canonical evidence

Keep canonical/closed SOTs, acceptance evidence, migrations and active QA unless a separate proof shows they are redundant and removable.

Examples retained intentionally:

- AUTH-PROD canonical closure/SOT/evidence;
- UI/UX V2 canonical SOT/closure evidence;
- Workforce Scheduling Production Readiness SOT;
- Workforce UI/UX permanent acceptance;
- WUI-001→008 intermediate evidence;
- database migrations;
- active `.github/workflows` and `09_QA` suites.

## Wave 1 — proven obsolete source

### A. Remove `99_LEGACY`

`99_LEGACY/README.md` explicitly states that:

- the folder is historical/quarantine only;
- nothing under it should be loaded by canonical production runtime;
- obsolete migrated code may be moved there or deleted.

Git history already preserves the removed source. Keeping an additional legacy tree in active `main` increases ambiguity and duplicate-file noise.

Wave 1 therefore removes all 35 files under `99_LEGACY`.

Notable exact duplicates removed from the legacy copy only:

- `99_LEGACY/docs/WORKFORCE_COLOR_CONVENTION.md`
  duplicated the retained canonical `01_DOCS/WORKFORCE_COLOR_CONVENTION.md`;
- `99_LEGACY/owner/owner-workforce-demand-engine-v1.js`
  duplicated retained `04_OWNER/Workforce/01-demand/engine-v1.js`.

### B. Remove unused Manager compatibility layers

Current Manager runtime was inspected from:

- `05_MANAGER/index.html`;
- `05_MANAGER/runtime/manager-runtime-v1.html`;
- `05_MANAGER/runtime/manager-shell-v1.html`;
- `05_MANAGER/Workforce/engine-v1.js`;
- `05_MANAGER/Workforce/ui-consolidation-v1.js`;
- `05_MANAGER/Workforce/manager-scheduling-ui2-v1.js`.

The current Manager runtime still loads exactly these compatibility files:

- `05_MANAGER/runtime/compat/router/manager-route-bridge-v1.js`;
- `05_MANAGER/runtime/compat/router/manager-route-state-v2.js`;
- `05_MANAGER/runtime/compat/ui/manager-ui-shell-v2.js`.

Wave 1 preserves those three files.

The other 32 compatibility files are not loaded by the current runtime chain and represent superseded UI/router/workforce patches. They are removed from `main`.

## Explicitly not removed in Wave 1

- `03_PLATFORM/01_AUTH/auth-runtime-v2.js` — active Auth entrypoint;
- `03_PLATFORM/01_AUTH/auth-runtime-v1.js` — not removed in Wave 1 because a broader QA/history reference audit is still required before deletion;
- Manager/Employee/Owner active route files;
- migrations, even when old or superseded — migration history is immutable operational history;
- active TEMP SOTs;
- permanent acceptance evidence;
- QA fixtures/tests;
- placeholder routes such as Manager Academy/KPI/Settings even when byte-identical — route deletion requires a separate route/IA decision.

## Post-change gate

Wave 1 is accepted only if the cleanup PR receives green relevant repository gates and exact-main remains deployable.

If a test/runtime still depends on any removed compatibility path, restore or reconcile that dependency instead of weakening the gate.

## Follow-up cleanup waves

After Wave 1, continue with:

1. stale open PR inventory and closure;
2. stale branch inventory (delete only where tooling/permissions permit and after PR/history verification);
3. remaining active-tree version chains such as Auth runtime versions;
4. documentation consolidation where permanent acceptance already supersedes temporary planning;
5. orphan route/assets audit;
6. final repository tree + CI/deploy verification.

This audit is a cleanup record, not a new project authority. Existing project SOTs retain their own scope and precedence.
