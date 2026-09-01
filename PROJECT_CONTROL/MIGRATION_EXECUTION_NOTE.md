# Migration execution

This document is the working plan for making `magasincoffee.github.io` the sole source of truth for the MAGASIN internal application.

## Current state
- `magasincoffee/noibo/main` remains the canonical pre-migration reference baseline.
- `magasincoffee/magasincoffee.github.io/main` is the production publication repository.
- Production deployment currently copies `noibo/web` into the Pages repository; this cross-repository build path is the root cause of source drift.

## Immediate objective
Fix Employee Attendance rendering by eliminating source/runtime duplication, then complete repository consolidation.

## Rules
1. Do not change Supabase production schema as part of repository consolidation.
2. Do not rewrite migration history.
3. Do not add new Attendance patches or post-deploy rewriting workflows.
4. Preserve the existing V40 visual structure.
5. Every production change must have one source and one deployment path.

## Gate
Attendance display must show the V40 manual attendance form and the Auto Attendance action before backend smoke tests continue.
