# People / Shift QA Test Log

## 2026-09-18 — TASK-022 People/Shift browser E2E + Day-10 usability gate

- Branch: `test/task-022-people-shift-browser-e2e`
- PR: `#80`
- Workflow: `People Shift Day-10 Tests`
- Initial run: `35319953246` — **FAIL** on QA fixture rendering only; `BUG-PS-001` identified.
- Fixed regression/browser run: `35320081816` — **PASS**.
- People/Shift Day 8–10 acceptance contract: PASS.
- Existing Owner Control Tower unit regression: PASS.
- Employee Availability engine: sanitized next-week registration saved through deterministic mock: PASS.
- Existing Owner Publish engine: generation → review → publish contract: PASS.
- Published official schedule contains one approved shift: PASS.
- Existing Employee Schedule engine renders the published approved shift for the employee: PASS.
- RPC sequence assertion: availability save → auto generation → review → publish → approved-schedule read: PASS.
- Mock-only safety: all schedule write RPC names terminate inside the in-page deterministic mock; production Supabase is never connected: PASS.
- Desktop browser flow: PASS.
- Mobile 390px Owner + Employee surfaces: PASS; no page-level horizontal overflow.
- Unexpected console errors: 0.
- Page errors: 0.
- Request failures: 0.
- HTTP 5xx: 0.
- External network requests: 0.
- Existing Owner Control Tower browser regression: PASS.
- Production writes/migrations/schema changes: none.
- New scheduling/transfer/attendance/payroll/KPI business rules: none.
- Day-10 People/Shift usability gate: **PASS**.
- Gate: TASK-022 **DONE**; TASK-023 SOP/Task current-system gap review is next.
