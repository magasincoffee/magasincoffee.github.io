# MAGASIN WEBAPP — External Project Boundary V1

**Repository:** `magasincoffee/magasincoffee.github.io`  
**Status:** CANONICAL  
**Effective:** 2026-09-28

## 1. WEBAPP-owned scope

This repository owns the MAGASIN Business OS / WEBAPP product and its project truth, including:

- Auth / onboarding;
- Profitability & Cash;
- Workforce / People Shift;
- Procurement;
- Owner / Manager / Employee web surfaces;
- Supabase schema, migrations, RPCs and Edge Functions used by the WEBAPP;
- WEBAPP QA, deployment workflows and project-state documentation.

PFC, Workforce, Auth, UI2 and Procurement are internal WEBAPP tracks. They are not separate repositories/projects for scope accounting.

## 2. External projects

### `magasincoffee/magasin-supervisor`

The Supervisor is an independent orchestration platform repository.

WEBAPP may retain only:

- project-owned state and task queue consumed through an explicit adapter;
- the MAGASIN lane directive / integration contract;
- the Three-Lane project integration architecture;
- immutable migration/cutover evidence proving the historical extraction.

Supervisor runtime source, runtime CI/lifecycle/release logic and production orchestration authority do not belong to this repository.

The independent-repository migration is complete through MIG-007. The embedded executable Supervisor surface was removed and the rollback window is closed.

### `magasincoffee/magasin-media-robot`

This repository is not part of current WEBAPP execution scope.

Any remaining references are historical night-run / cross-project integration evidence only and must not be presented as current WEBAPP state, current task authority or active repository scope.

## 3. Historical evidence rule

Historical evidence may name external repositories when provenance requires it. Historical references must be clearly marked as historical and must not be used as current runtime authority.

Canonical historical locations include:

- `08_AUTONOMY/SUPERVISOR_REPOSITORY_MIGRATION_V1.md`;
- `08_AUTONOMY/MIG_001_SUPERVISOR_MIGRATION_BOOTSTRAP_EVIDENCE.md`;
- `08_AUTONOMY/MIG_002_SUPERVISOR_REPOSITORY_EXTRACTION_EVIDENCE.md`;
- `08_AUTONOMY/MIG_003_SUPERVISOR_DECOUPLING_EVIDENCE.md`;
- `08_AUTONOMY/MIG_004_SUPERVISOR_CI_LIFECYCLE_PARITY_EVIDENCE.md`;
- `08_AUTONOMY/MIG_005_SINGLE_AUTHORITY_CUTOVER_EVIDENCE.md`;
- legacy night-run evidence.

## 4. Active-state rule

The active WEBAPP state must not:

- claim ownership of Supervisor runtime/autostart/browser-control implementation;
- list `magasin-media-robot` as an active execution repository;
- treat pre-migration Brain/Worker or handoff runtime documents as current platform authority;
- use historical night-run state as a current execution gate.

External automation may consume WEBAPP project truth, but it remains external infrastructure.

## 5. Canonical current boundary

```text
WEBAPP repository authority      = magasincoffee/magasincoffee.github.io
Supervisor platform authority    = magasincoffee/magasin-supervisor
Media Robot current WEBAPP scope = NONE
Supervisor migration             = COMPLETE / MIG-007
embedded Supervisor runtime      = REMOVED
rollback window                  = CLOSED
```
