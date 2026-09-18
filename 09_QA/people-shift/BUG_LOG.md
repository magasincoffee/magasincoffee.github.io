# People / Shift QA Bug Log

## BUG-PS-001 — Day-10 harness omits shared role-label contract

- Date: 2026-09-18
- Component: `09_QA/people-shift/harness.html`
- Initial run: `35319953246` — FAIL.
- Reproduction: complete mocked Employee Availability → Owner generate/review/publish, then refresh the existing Employee Schedule engine.
- Observed: approved schedule data was read after publish, but the Employee Schedule surface did not render a shift.
- Root cause: the deterministic harness supplied `MAGASIN_CORE` date/time/security/store/UI primitives but omitted `MAGASIN_CORE.roles.label`; the real Employee Schedule engine reads the role label while painting identity, so rendering exited through its caught refresh error path before painting the approved shift.
- Scope: QA fixture defect only; the generation/review/publish flow itself had already passed and no production endpoint was contacted.
- Fix: add the shared role-label mapping required by the existing Employee Schedule engine.
- Regression: run `35320081816` — PASS for People/Shift browser E2E and Control Tower browser regression.
- Status: VERIFIED
