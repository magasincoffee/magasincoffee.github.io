# Business OS QA Bug Log

## BUG-BOS-001 — Contract workflow only executes the first foundation test

- Date: 2026-09-18
- Component: `.github/workflows/business-os-contract-tests.yml`
- Reproduction: add `database-baseline-plan.test.mjs` under `09_QA/business-os/`; workflow triggers but only runs `store-product-foundation.test.mjs`.
- Impact: new Business OS contract tests can appear covered by CI while not actually executing.
- Root cause: workflow command hard-coded one test file.
- Fix: execute every `09_QA/business-os/*.test.mjs` file in deterministic filename order.
- Status: VERIFIED — all Business OS contract tests executed in run `35309647967`

## BUG-BOS-002 — Manager Workforce direct route references removed legacy paths

- Date: 2026-09-18
- Component: `05_MANAGER/Workforce/index.html`
- Reproduction: open `/05_MANAGER/Workforce/` after the numbered-architecture migration.
- Observed: the route attempts to load removed `/manager-v13-runtime.html` and redirects STAFF/EMPLOYEE to removed `/employee/`.
- Impact: direct Workforce navigation can fail even though the canonical Manager/Employee runtimes exist.
- Root cause: route entry was not migrated with the canonical numbered runtime paths.
- Fix: reuse Shared Core authentication, load `/05_MANAGER/runtime/manager-runtime-v1.html`, and redirect employee roles to `/06_EMPLOYEE/`.
- Regression: `people-shift-plan.test.mjs` rejects both removed paths and requires the canonical paths.
- Status: FIXED / CI verification pending

