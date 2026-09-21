# MAGASIN NEW-PC MIGRATION RUNBOOK V1

Status: PREPARED / FAIL-CLOSED / NOT MERGED TO MAIN

## Objective

Move MAGASIN Supervisor / Robot to a new Windows PC without copying browser cookies, auth tokens, stale process truth, or in-flight execution state.

Canonical source code remains GitHub. Migration transfers only durable lane configuration needed to avoid re-entering project names and Brain/Work conversation URLs.

## Safety contract

- Do not copy the old dedicated Chrome `browser_profile`.
- Do not copy cookies, passwords, Gmail/ChatGPT/GitHub auth tokens, PID files, runtime logs, screenshots, transient status, or exact-once in-flight transaction registry.
- New machine starts with `STOP` and `AUTOSTART_DISABLED`.
- Imported lanes are forced `enabled=false`.
- Owner signs into ChatGPT/Gmail/GitHub manually in the NEW dedicated Robot Chrome profile.
- Runtime is not started until install + login + lane verification are complete.

## Old PC packaging

Local export path:

`D:\MAGASIN_MIGRATION\supervisor-state`

Expected files:

- `lanes.json` — project names + Brain/Work targets, all lanes forced disabled.
- `migration-meta.json` — migration metadata only.
- `SHA256SUMS.csv` — integrity hashes.

No migration bundle is uploaded to the GitHub repository.

## New PC bootstrap

Canonical bootstrap:

`08_INTEGRATIONS/supervisor/windows/bootstrap-new-pc.ps1`

It:

1. checks Windows/RAM/free disk;
2. ensures Git, Node 20+, and Google Chrome;
3. clones the canonical repository;
4. pins the runtime source to commit `18e6d5025429cb1aaee986a8033d8b47169a54c3`;
5. creates Owner STOP latches before install;
6. installs Supervisor + Control Panel + autostart;
7. optionally imports `D:\MAGASIN_MIGRATION\supervisor-state\lanes.json`;
8. forces all imported lanes disabled;
9. verifies installed runtime files;
10. leaves Robot OFF.

## New PC account login

Run:

`08_INTEGRATIONS/supervisor/windows/prepare-new-pc-login.ps1`

This opens the NEW dedicated Robot Chrome profile with:

- ChatGPT
- Gmail
- GitHub

Owner signs in manually. This preserves account security boundaries and avoids moving old session cookies.

Close all dedicated Robot Chrome windows after login.

## GitHub Actions Runner

A new self-hosted GitHub Actions Runner must be registered cleanly on the new PC. Do not copy the old runner credential directory.

The Owner must authorize/register the new runner once through GitHub. After the new runner is online, Brain can perform installation verification, diagnostics, regression gates, and the fresh RBT-009 8-hour soak remotely through Actions.

## Acceptance before Robot START

New PC is accepted only when all are true:

- canonical repo commit verified;
- Supervisor runtime installed;
- Control Panel shortcut exists;
- dedicated Chrome profile can access ChatGPT while signed in;
- lane config imported or manually verified;
- all lanes remain disabled before Owner authorization;
- Owner STOP remains authoritative;
- new GitHub Runner is online;
- normal Supervisor test/integrity/lifecycle/autostart gates pass on the new host;
- no stale old-machine PID/process truth is carried over.

## RBT-009

The interrupted/failed old-machine soak does not transfer.

After new PC migration and host acceptance, RBT-009 Tier B must run a new continuous 480-minute soak from zero on the new machine. Exact-SHA normal gates must be revalidated if runtime code changes before that soak.
