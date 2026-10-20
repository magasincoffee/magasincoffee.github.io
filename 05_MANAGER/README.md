# MAGASIN Manager — module ownership and legacy cleanup (2026-10-20)

## Production entry points (canonical)

- `/manager/` — ACTIVE `STORE_MANAGER` role guard; Manager Home and the shared V2 sidebar/topbar.
- `/manager/#staff`, `#swap`, `#attendance`, `#payroll-self-check`, `#tasks`, `#settings` — views within the guarded Manager runtime.
- `/manager/scheduling/` — guarded Scheduling V2 host. Uses **the exact same shared shell** as Home, with Scheduling/Demand rendered as content only.
- `/manager/schedule/` — guarded route for published schedule.
- `/05_MANAGER/SchedulingV2/Demand/index.html` — demand subpage embedded under Scheduling's canonical host. Direct standalone page retained for compatibility.

The **only production Manager navigation chrome** is `02_CORE/ui/magasin-ui-v2-shell.js` with `magasin-ui-v2-shell.css`. Do not ship new sidebars or Manager-global headers from modules.

## What stays and why

- `05_MANAGER/runtime/manager-shell-v1.html`: **legacy business view markup**, not an authorized standalone Manager UI. The canonical Manager runtime wraps this while Shared Shell V2 hides its original sidebar/header.
- `05_MANAGER/runtime/manager-runtime-v1.html`: authenticated Manager runtime bridge and injection of the business engine and Shared Shell V2. Do not remove until each V1 business view has migrated.
- `05_MANAGER/Workforce/*.js`: active cross-store/staffing/availability, employee lifecycle, swap, attendance, payroll, draft/official schedule and operational integrations. The suffix `-v1` does **not** mean unused.
- `05_MANAGER/runtime/compat/router/*.js`: single legacy source-view bridge with a subordinate route-state adapter. The route-state adapter defers to the bridge when present.
- `05_MANAGER/runtime/compat/ui/manager-ui-shell-v2.js`: **retired for nested production Manager runtime** (fail-closed early exit); retained for isolated UI2-011 compatibility fixtures and direct legacy tests. Never add it to new production entry points.
- `05_MANAGER/SchedulingV2/manager-navigation-v2.js`: standalone compatibility only. Under the canonical Scheduling host, the child's sidebar/topbar are suppressed, and Shared Shell V2 owns navigation.

## Retired entry-point aliases

The old `/05_MANAGER/Nhan-su/`, `/05_MANAGER/Doi-ca/`, `/05_MANAGER/Cham-cong/` and `/05_MANAGER/Cong-viec/` pages are minimal redirects to `/manager/#staff`, `#swap`, `#attendance` and `#tasks` respectively. They do not mount another Manager runtime. Role authorization happens at `/manager/` via Shared Core.

`/05_MANAGER/Workforce/` redirects to `/manager/scheduling/`. `/05_MANAGER/Lich-lam/` remains an explicit role-aware compatibility bridge because it also routes OWNER and EMPLOYEE roles; do not simplify it without proving cross-role equivalence.

## Invariants and release gates

1. No unguarded Manager business data or write RPC through legacy aliases. The canonical role gate always runs.
2. Exactly one visible Manager sidebar, one topbar, one account/logout surface at every canonical module.
3. V1 business layers may run *behind* the shared shell, but cannot mount a competing visible Manager chrome or rewrite the canonical URL after another module was selected.
4. Preserve employee/Owner route boundaries and existing schedule mutations/RLS.
5. Run `UI2 Cross Role Acceptance`, `People Shift Day-10 Tests`, `SOP Task Tests`, `Scheduling V2 Foundation QA` and visual smoke at desktop/mobile before merging.

This is the current codebase architecture, not a claim that all business modules have been rewritten in V2. Broad migration and authenticated real-user acceptance remain in issue #475.
