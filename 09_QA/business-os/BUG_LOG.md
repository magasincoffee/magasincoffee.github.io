# Business OS QA Bug Log

## BUG-BOS-001 — Contract workflow only executes the first foundation test

- Date: 2026-09-18
- Component: `.github/workflows/business-os-contract-tests.yml`
- Reproduction: add `database-baseline-plan.test.mjs` under `09_QA/business-os/`; workflow triggers but only runs `store-product-foundation.test.mjs`.
- Impact: new Business OS contract tests can appear covered by CI while not actually executing.
- Root cause: workflow command hard-coded one test file.
- Fix: execute every `09_QA/business-os/*.test.mjs` file in deterministic filename order.
- Status: FIXING
