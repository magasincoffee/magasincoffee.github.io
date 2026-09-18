# People / Shift QA Test Log

## 2026-09-18 — TASK-022 People/Shift browser E2E + Day-10 usability gate

- Branch: `test/task-022-people-shift-e2e`
- Pull request: `#77`
- Workflow: `People Shift Day-10 Tests`
- PR run: `35319588926`
- Result: **PASS**
- People/Shift acceptance contract: PASS.
- Owner Control Tower unit/regression: 56 passed, 0 failed.
- Canonical engines loaded in browser: Owner Publish + Employee Availability + Employee Schedule.
- Sanitized Employee availability registration: PASS.
- Owner generation after availability: `DRAFT`, one assignment: PASS.
- Owner review: `REVIEWED`: PASS.
- Owner publish: `PUBLISHED`, one official schedule row: PASS.
- Employee approved schedule visibility after publish: PASS.
- Required RPC sequence: `save_my_availability → auto_generate_schedule_generation → review_schedule_generation → publish_schedule_generation → list_my_approved_schedules_v2`: PASS.
- QA browser traffic stayed on the local test origin; no production endpoint or private data was used.
- Unexpected console errors: 0.
- Page errors: 0.
- Request failures: 0.
- HTTP 5xx: 0.
- Existing Owner Control Tower browser E2E: PASS, including staffing gap `1`, unresolved attention `2`, partial-source isolation and 390px responsive gate.
- Production migration/backfill/admin calls: none.
- Reproducible product defects found: none.
- Day-10 People/Shift usability gate: **PASS**.
- Gate: TASK-022 **DONE**. Day 8–10 queue exhausted; no new task opened without new repository evidence / approved slice.
