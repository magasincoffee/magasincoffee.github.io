# SOP / Task QA Bug Log

## BUG-ST-001 — Manager Task deep link resolves to stale runtime / Dashboard

- Date: 2026-09-18
- Scope: TASK-024
- Reproduction 1: open `/05_MANAGER/Cong-viec/`; wrapper targets removed `/manager-v13-runtime.html`.
- Reproduction 2 after wrapper canonicalization: browser smoke loads canonical runtime, but `manager-route-state-v2.js` still interprets only `/manager/*`, causing the top URL to collapse to `/05_MANAGER/` and Dashboard to become active.
- Root cause: two route layers were left on legacy runtime/prefix conventions.
- Fix:
  - deep-link wrapper now uses Shared Core + `/05_MANAGER/runtime/manager-runtime-v1.html`;
  - `manager-route-state-v2.js` now uses canonical `/05_MANAGER` prefix;
  - static regression forbids legacy runtime/prefix drift;
  - Playwright smoke proves Task view stays active on `/05_MANAGER/Cong-viec/`.
- Production writes/schema changes: none.
- Status: VERIFIED — SOP Task Tests run `35321868757`.
