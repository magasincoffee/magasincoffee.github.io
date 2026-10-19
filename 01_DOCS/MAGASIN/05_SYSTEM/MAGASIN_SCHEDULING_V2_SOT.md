# MAGASIN Scheduling V2 — Source of Truth
Status: APPROVED ARCHITECTURE; implementation phase 1 (isolated, read-only)
Date: 2026-10-19
Repository: magasincoffee/magasincoffee.github.io

## Decision
Build Scheduling V2 from scratch as a standalone UI and adapter. Do not extend manager-five-board-v4.js. Leave V1 accessible until V2 has passed regression, visual, role, and staging acceptance. No production schedule, employee, or demand writes during foundation.

## User experience
One store selector, one week selector, one weekly roster (employees x Mon–Sun), one shift editor, and one contextual action bar. Existing five-board journey and duplicated steppers must not be carried into V2. Separate demand configuration page; demand view in Scheduling is read-only.

## Domain rules (retain server authority)
- Understaffing is advisory; do not block publishing, including zero assignments when there is configured staffing demand. Do not publish an empty week without any configured demand.
- Reject overlapping assignments, inactive staff, disallowed stores, and violations of mandatory shift limits. Cross-store conflicts must be checked globally.
- Manager availability override only when explicitly authorized, with audit.
- Published shifts are amended through existing authorized RPCs with reason and audit, never by rewriting a published generation.
- Never overwrite a draft through automation without explicit confirmation; never overwrite a published schedule.
- Authoritative validation/review/publish RPCs decide correctness; local warnings are only presentation hints.

## Existing contract inventory
Read: get_manager_accessible_stores; get_manager_weekly_availability; get_cross_store_weekly_plan_v1; list_employee_workforce_profiles_v1; list_workforce_recurring_staffing_requirements_v1; get_manager_weekly_schedule; list_schedule_generations; get_schedule_generation_assignments.
Write (future stages only): create_schedule_generation; replace_schedule_generation_assignments; auto_generate_cross_store_schedule_v1; validate_schedule_generation_v1; review_schedule_generation; publish_schedule_generation; add_published_shift_v1; reassign_published_shift_v1; list_manager_post_publish_audit_v1.
Reuse existing employee FT/PT, priority stores, and lifecycle policies. Do not infer authorization from client-side fields.

## Delivery phases
1. Isolated V2 page with real read-only data adapter and weekly table; no production routing switch. Static quality tests.
2. One modal editor for manual draft changes, with save/discard and backend validation.
3. Scope-aware automatic scheduling; verify store-only vs all-store behavior, and retain manual edits.
4. Central review/publish action bar; separately label hard errors vs advisory shortages.
5. Post-publish add/reassign and audit.
6. Desktop/mobile/keyboard accessibility, E2E, stage acceptance, rollout via feature flag; rollback to V1.

## Release gates
Every phase must have CI tests and no regressions against existing scheduling flows; smoke test authenticated read-only rendering and store scoping. Do not mark production-ready until an authorized Manager completes end-to-end acceptance. No data migrations in phase 1.

## Progress and V1 retirement decision (2026-10-19)
- PR #463 merged: standalone V2 read-only weekly roster, authorized Manager reads of both draft and official assignments.
- PR #465 in progress: isolated V2 auth context and draft-time editor behind explicit preview enablement, backend validation, CI.
- Product owner explicitly authorizes deletion of unusable V1 UI. **Retire V1 only after equivalent V2 scheduling capabilities are operational and navigation is switched.** Do not delete shared RPCs, workforce configuration, auth, employee lifecycle or legacy route prematurely.
- Delete legacy scheduling UI only after verified store/week read, create/edit draft, auto schedule, validate, publish-with-shortage, post-publish change/audit and Manager role checks. Then update links, entry points, QA references and cache paths in one controlled cutover.
- Do not treat the preview URL or a passing static contract as operational acceptance.

## Next task
Complete V2 draft editing (add, replace, delete assignments) on an isolated test dataset and verify concurrency/permission checks, then implement central Validate/Review/Publish UX. Keep the page unlinked from production navigation until these gates pass.
