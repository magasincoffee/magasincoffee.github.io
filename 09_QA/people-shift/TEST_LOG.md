# People / Shift QA Test Log

## 2026-09-18 — TASK-022 People/Shift browser E2E + Day-10 usability gate

- Branch: `test/task-022-people-shift-e2e`
- Pull request: `#77`
- Workflow: `People Shift Day-10 Tests`
- Verified same-week regression run: `35319816359`
- Result: **PASS**
- People/Shift acceptance contract: PASS.
- Owner Control Tower unit/regression: 56 passed, 0 failed.
- Canonical engines loaded in browser: Owner Publish + Employee Availability + Employee Schedule.
- Sanitized Employee availability registration for next week (`2026-09-21`): PASS.
- Owner navigates to the same next week; generation is `DRAFT`, one assignment dated `2026-09-21`: PASS.
- Owner review: `REVIEWED`: PASS.
- Owner publish: `PUBLISHED`, one official schedule row: PASS.
- `BUG-PS-001` reproduced during gate hardening: Employee Schedule was fixed to the current week and had no way to inspect the already-published next-week schedule before week rollover.
- Fix: reuse the existing Employee Schedule engine and add previous/current/next week navigation; no new scheduling policy or backend RPC was introduced.
- Regression: Employee clicks `Tuần sau` and sees the same-week approved `06:00–12:00 · CN-QA` schedule after publish: PASS.
- Required RPC sequence: `save_my_availability → auto_generate_schedule_generation → review_schedule_generation → publish_schedule_generation → list_my_approved_schedules_v2`: PASS.
- QA browser traffic stayed on the local test origin; no production endpoint or private data was used.
- Unexpected console errors: 0.
- Page errors: 0.
- Request failures: 0.
- HTTP 5xx: 0.
- Existing Owner Control Tower browser E2E: PASS, including staffing gap `1`, unresolved attention `2`, partial-source isolation and 390px responsive gate.
- Production migration/backfill/admin calls: none.
- Reproducible product defects: `BUG-PS-001` found and fixed within TASK-022; unresolved defects: none.
- Day-10 People/Shift usability gate: **PASS**.
- Gate: TASK-022 **DONE**. Approved Blueprint evidence advances execution to TASK-023, the Day 11–13 SOP/Task discovery gate.
