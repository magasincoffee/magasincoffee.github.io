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
| §3: weekly override only changes that week, never template | **CODED + STAGED/RELEASED** PR #497: separate server-owned override table and scoped RPC, effective demand projection, CAS, 3-week browser E2E; production authenticated Manager read/save **NOT VERIFIED** because QA profile expired | 3-week/zero/stale/forbidden-store fixture PASS; live authenticated Manager smoke still blocked |
| §3/§4: 30-minute shortage/adequacy/excess displayed alongside weekly schedule | Existing separate weekly schedule/demand; full unified coverage matrix still outstanding | 05:00–22:00 interval-slot E2E, overlap and boundary cases |
| §4: FULL_TIME priority before PART_TIME | Implemented draft-only candidate rank using authorized RPC in this PR | FT vs PT competing for identical eligible time, PT marked preferred |
| §4: earlier availability registration within same FT/PT group | **NOT VERIFIED**: existing Manager RPC lacks submission timestamp; current suggestion displays caution | Permissioned timestamp source and stable server-side tie order |
| §4: draft before Sunday lock; Manager publish only | Existing draft/review/publish modules retained; robot not granted publish | E2E preview/no-write, explicit draft confirm, no auto-publish |
| §5: SHIFT_SWAP >=24 hours | **NEEDS SERVER VERIFICATION/IMPLEMENTATION**; do not infer from availability validation | 23:59:59 reject / exactly 24h allow; earliest of both shifts, overnight, owner/employee |
| §6: SHIFT_GIVE_AWAY without 24h | Existing specialized Give RPCs; consent procedure **OPEN** | No 24h rejection; manager approval changes one official assignee atomically; denial changes none |
| §7: Scheduled attendance without Manager approval; out-of-schedule requires Manager approval | Existing attendance RPCs; comprehensive cross-role verification pending | Two paths, overlap, attendance vs official schedule, approval/RLS |
| §10: Manager opens next week, Monday–Sunday, one shell, 05:00–22:00/30m | Existing Weekly V2 with unified Manager shell and week controls | Browser E2E at desktop/mobile and after cold reload |

## Release evidence and scope

- PR #495: FULL_TIME-before-PART_TIME priority in Manager's draft proposal, plus three recurring weeks and DRAFT-only browser QA. Squash-merged into `main` at `15e2f0e`; 3/3 workflow CI passed.
- PR #497: week-scoped staffing override with separate canonical RPC/table, explicit 0-demand, 30-minute rows, stale fingerprint protection and store permission. Migrated database **before** frontend merge, preserving all **103** recurring template rows and starting with **0** weekly override rows. Squash-merged into `main` at `ff1c97c`; 3/3 workflow CI passed.
- Database validation: table present, RLS enabled, authenticated direct INSERT denied, three role-scoped RPC functions present. This does **not** by itself prove the authenticated UI can read/write.
- Playwright E2E: isolated in-memory RPC fixture for three weeks, week 2 modified only, 0 override, stale concurrent edit rejection and unauthorized store denial; no production staffing data writes.
- Post-release TinyFish read-only test: https://agent.tinyfish.ai/runs/03ca68d0-65ce-4644-9df2-64935c63fd5f — **blocked** by expired Supabase session before Manager shell. Therefore actual production UI data read/save remains **NOT ACCEPTED**.
- Read-only server audit uncovered two **CONFIRMED unmet backend checks**: employee `save_my_availability` lacks Sunday 12:00 Asia/Ho_Chi_Minh registration cutoff, and `submit_shift_swap_request` / `validate_shift_swap_v1` contain no explicit >=24h guard. Fix and test server-side; do not settle them with UI-only validation.
- One user-policy question remains OPEN: whether the receiver must confirm Give within the app. Existing backend requires receiver confirmation; it must not be described as a newly agreed policy.

**Do not mark complete:** live authenticated weekly override, same-category earliest-registration priority, registration cutoff, 24h swap validation, 30-minute coverage gap matrix, Give/Swap and attendance live three-role E2E, or OPEN consent/attendance detail decisions. See [issue #498](https://github.com/magasincoffee/magasincoffee.github.io/issues/498).
