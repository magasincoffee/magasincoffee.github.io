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
- PR #465, #466 and #467 merged: isolated V2 auth context, draft-time editor, add/replace/remove service, and unified draft shift dialog. Write actions remain preview gated.
- Product owner explicitly authorizes deletion of unusable V1 UI. **Retire V1 only after equivalent V2 scheduling capabilities are operational and navigation is switched.** Do not delete shared RPCs, workforce configuration, auth, employee lifecycle or legacy route prematurely.
- Delete legacy scheduling UI only after verified store/week read, create/edit draft, auto schedule, validate, publish-with-shortage, post-publish change/audit and Manager role checks. Then update links, entry points, QA references and cache paths in one controlled cutover.
- Do not treat the preview URL or a passing static contract as operational acceptance.

## Current phase — validation and publication action bar
- Implement one compact Check / Review / Publish bar in V2, without the former five-step interface.
- Preserve existing server RPCs: validate_schedule_generation_v1, review_schedule_generation, publish_schedule_generation.
- Shortage is a warning and does not veto publication when server validation is valid. Only hard violations block.
- Before each mutating action, re-read accessible store, week, generation identity and status; require user confirmation and a separate preview feature flag. RPC server remains authoritative.
- V2 is not the default route; require staging Manager end-to-end acceptance before enabling live writes.

## Next task
Complete authenticated staging tests of review/publish, add cross-store automatic scheduling, staffing demand configuration, and post-publication adjustments; then retire V1 after V2 fully replaces it.


## Implementation update — PR #469
- PR #468 merged: guarded Check / Review / Publish actions, shortages remain warnings when backend validation passes.
- Add store-scoped automatic staffing proposals; do NOT invoke global auto_generate_cross_store_schedule_v1 for one-store work. Preserve existing manual draft assignments, respect registered available/preferred windows, store priority, overlapping shifts and two-shifts-per-day cap; require explicit confirmation before saving.
- Add empty-draft creation when positive recurring staffing demand exists, preserving the nonblocking-shortage rule.
- Add post-publication add/reassign, reason and audit via the existing audited RPCs.
- Build standalone weekly 7-day staffing requirement configuration page; reuse existing canonical board RPC with whole accessible-scope reconciliation and pre-save stale snapshot detection; backend limit 20 people per band.
- PR #469 builds these components behind existing preview feature guards. This is *not* authorization to cut over until full CI and authenticated role-based acceptance.

## Go-live gates
1. Verify PR #469 static and behavior tests and UI2/People Shift regressions, merge to main.
2. Verify authenticated Manager can load V2 store/week, configure requirements, create/edit draft, preview proposals, validate/review/publish when understaffed, and adjust official shifts; no unauthorized cross-store mutation.
3. Approve a distinct rollout PR to point Manager scheduling entry to V2; keep V1 rollback link until real-world acceptance.
4. Only remove V1 UI routes/assets after no remaining Manager/employee/owner dependencies.
