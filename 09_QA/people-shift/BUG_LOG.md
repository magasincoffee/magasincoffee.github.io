# People / Shift Bug Log

## BUG-PS-002 — Employee Shift Swap runtime uses Document-only APIs on an Element

- Date found: 2026-09-18
- Found during: canonical Employee runtime browser regression while closing the People/Shift gate.
- Reproduction evidence: GitHub Actions run `35319830798` emitted `TypeError: x.getElementById is not a function` from `06_EMPLOYEE/swap/engine-v1.js`.
- Root cause: `panel()` returns the `#view-swap` Element, but `renderForm()`/control creation called `getElementById()` and `createElement()` as if that Element were a Document.
- Fix: use Element-scoped `querySelector()` for existing controls and `x.ownerDocument.createElement()` for new controls.
- Regression protection:
  - `09_QA/people-shift/employee-swap-regression.test.mjs`
  - `09_QA/people-shift/employee-swap-fixture.html`
  - `09_QA/people-shift/employee-swap-browser-regression.mjs`
- Verification run: `35320689975`.
- Browser result: PASS; swap controls initialize, page errors 0, console errors 0, request failures 0, HTTP 5xx 0.
- Existing People/Shift Day-10 E2E: PASS.
- Existing Owner Control Tower browser regression: PASS.
- Production data/schema changes: none.
- Status: FIXED / VERIFIED.
