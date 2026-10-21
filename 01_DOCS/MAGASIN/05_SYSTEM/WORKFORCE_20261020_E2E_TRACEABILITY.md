# MAGASIN Workforce — implementation/E2E traceability (2026-10-21)

**Business authority:** [WORKFORCE_SCHEDULING_ATTENDANCE_2026_10_20.md](../02_BUSINESS_RULES/WORKFORCE_SCHEDULING_ATTENDANCE_2026_10_20.md). The business document is the requirement, not evidence that code is complete.

## Read-only source audit
- Existing canonical stages: employee availability, staffing requirement, draft generation, explicit manager review/publish, official `work_schedules`, shift changes, attendance.
- Real database read-only inspection, 2026-10-21: `workforce_recurring_staffing_requirements` = **103** rows, `staffing_requirement_templates` = **110** rows, and `staffing_requirements` with `authority_source='XSTORE_V1'` = **0** rows. These are **three different persistence contracts**. Do not blend their data or silently treat the XSTORE records as weekly overrides until a canonical server-owned policy and migration are accepted.
- `get_manager_weekly_availability` does not return registration timestamp. The earlier-registration tie breaker among FT or among PT therefore **cannot be proven**.
- `list_employee_employment_types_v1` exists, role-scoped, and returns `employee_id,employment_type`; confirmed `FULL_TIME` and `PART_TIME` types in production. It is used for the draft proposal rank.
- `validate_shift_swap_v1` and `submit_shift_swap_request`: explicitly verify the **>=24-hour before earliest affected shift** boundary in a future server-owned migration/negative E2E. No general 24-hour rule for Give.
- `submit_shift_give_request` creates `PENDING_RECIPIENT`, and `approve_shift_give` currently requires recipient consent. The confirmation-in-app question is `OPEN` in business doc §6: **do not call this policy accepted**; retain existing server behavior until clarified.
- Do not conflate `employee_availability`, DRAFT, `work_schedules` or `attendance`; no automation may publish.

## Rule-to-evidence matrix

| Business rule / scope | Current decision / result | Acceptance gate |
| --- | --- | --- |
| §2: next Mon–Sun availability until Sunday 12:00 VN | Existing flows; authenticated three-role E2E still to qualify against cutoff at -1s, exact time, +1s | Date/time boundary E2E, server denial + employee UX |
| §3: recurring template used for weeks 1/2/3 automatically | Planner already reads recurring board for each selected week; regression E2E fixture introduced | `workforce-rules-p1-browser.mjs` — 3 distinct weeks; no save on week navigation |
| §3: weekly override only changes that week, never template | **NOT IMPLEMENTED/NOT VERIFIED.** No endorsed persisted override contract for new recurring board; cannot count existing XSTORE dated records as new policy | Role/RLS-backed weekly mutation + 3-week isolation, zero override, concurrent edit, cross-store denial |
| §3/§4: 30-minute shortage/adequacy/excess displayed alongside weekly schedule | Existing separate weekly schedule/demand; full unified coverage matrix still outstanding | 05:00–22:00 interval-slot E2E, overlap and boundary cases |
| §4: FULL_TIME priority before PART_TIME | Implemented draft-only candidate rank using authorized RPC in this PR | FT vs PT competing for identical eligible time, PT marked preferred |
| §4: earlier availability registration within same FT/PT group | **NOT VERIFIED**: existing Manager RPC lacks submission timestamp; current suggestion displays caution | Permissioned timestamp source and stable server-side tie order |
| §4: draft before Sunday lock; Manager publish only | Existing draft/review/publish modules retained; robot not granted publish | E2E preview/no-write, explicit draft confirm, no auto-publish |
| §5: SHIFT_SWAP >=24 hours | **NEEDS SERVER VERIFICATION/IMPLEMENTATION**; do not infer from availability validation | 23:59:59 reject / exactly 24h allow; earliest of both shifts, overnight, owner/employee |
| §6: SHIFT_GIVE_AWAY without 24h | Existing specialized Give RPCs; consent procedure **OPEN** | No 24h rejection; manager approval changes one official assignee atomically; denial changes none |
| §7: Scheduled attendance without Manager approval; out-of-schedule requires Manager approval | Existing attendance RPCs; comprehensive cross-role verification pending | Two paths, overlap, attendance vs official schedule, approval/RLS |
| §10: Manager opens next week, Monday–Sunday, one shell, 05:00–22:00/30m | Existing Weekly V2 with unified Manager shell and week controls | Browser E2E at desktop/mobile and after cold reload |

## Release evidence and scope

This P1 change is **source/fixture-only until CI exact-head succeeds and merges**. Test: `09_QA/people-shift/workforce-rules-p1-fixture.html`, `workforce-rules-p1-browser.mjs`, imported into Day-10 E2E. Its in-memory RPC fixture is not proof of live authentication or DB write success. It tests 3 weeks, full-time priority and manual DRAFT creation with no publish RPC.

**Do not mark complete:** full weekly override; same-category earliest-registration tie; Manager/Employee live writes; Give/Swap and attendance policies whose E2E still lacks evidence; unspecified OPEN decisions.
