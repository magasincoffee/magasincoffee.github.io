# MIG-005 — Single-Authority Production Cutover Evidence

Status: **DONE**

Date: 2026-09-22

## Canonical target

- Repository: `magasincoffee/magasin-supervisor`
- PR: **#10**
- Runtime candidate installed on new machine: `218f330ee86eea4f0fb79ef9293bd43cf96a45de`
- PR merge commit: `cca403faf0704d52ca488d7fecf3c72809a52291`
- Package-export candidate: `dc0b5f369f6a9c3ae89d821f1ddf603e1135f51e`
- Package SHA256: `b2a67e3c7ae568454c09386b2ceb4f7cc7cfba650e3a37243dea89a2ebfe5753`
- Transfer implementation blob at both package/runtime candidates: `abf72af4ee51a06bf49af669cd4f590bd68a9aa7`

## Old-machine handoff

Sanitized Owner-executed checkpoint:

- pre-handoff mode: `ALL_DISABLED_QUIESCENT`
- config lanes: **3**
- registry lanes: **3**
- enabled lanes: **0**
- old runtime authority instances: **0**
- final state export: **PASS**
- package file count: **5**
- relay evidence count: **1**
- old state root untouched: **true**
- old autostart ownership released: **true**
- old rollback record retained: **true**
- no synthetic Owner STOP was created
- RBT-009 Tier B 480m: **NOT_RUN**

## Package/runtime provenance

The first new-machine activation attempt failed closed because the package manifest candidate was `dc0b5f...` while the later runtime candidate was a descendant. No new production ownership or runtime authority remained after rollback.

The repaired activation contract preserved the package manifest guard and proved:

- package candidate exists in local Git;
- package candidate is an ancestor of runtime candidate;
- `windows/mig-005-state-transfer.ps1` is byte-identical by Git blob at both candidates;
- Import/Verify use the package candidate SHA;
- runtime install/exact-runtime proof uses the runtime candidate SHA.

Hosted regressions proved:
- compatible ancestor + identical transfer blob: **PASS**
- non-ancestor: **FAIL-CLOSED**
- ancestor with changed transfer blob: **FAIL-CLOSED**
- wrong package candidate: **FAIL-CLOSED**
- package hash mismatch: **FAIL-CLOSED**
- `dc0b5f` package → final runtime candidate preserves 3/3 topology, enabled=0, targets/latches, Owner STOP=false: **PASS**

## New-machine activation

Owner-executed activation completed successfully.

Sanitized final markers:

- package candidate verified: **true**
- runtime candidate verified: **true**
- package/runtime ancestry verified: **true**
- transfer blob identity verified: **true**
- package SHA256 verified: **true**
- state import: **PASS**
- state verify: **PASS**
- lane_count: **3**
- registry_lane_count: **3**
- enabled_lane_count: **0**
- target fingerprint preserved: **true**
- latch fingerprint preserved: **true**
- Owner STOP blocked: **false**
- browser profile untouched: **true**
- GitHub runner untouched: **true**
- exact runtime candidate installed: **true**
- new autostart ownership present: **true**
- new runtime authority active: **false**
- production ownership authority instances: **1**
- ownership state: `NEW_AUTHORITY_OWNERSHIP_ACTIVE_ALL_DISABLED_RUNTIME_QUIESCENT`
- new-machine rollback record ready: **true**
- RBT-009 Tier B 480m: **NOT_RUN**

The Supervisor runtime is intentionally quiescent because all three lanes are disabled. The new machine owns the production autostart authority; no lane was enabled and no normal Owner START was performed.

## Exact-head gates before activation

- Supervisor Tests: run `35711190701`, job `106691919524` — **588/588 PASS**
- MIG-003/adapter subset: **50/50 PASS**
- platform core subset: **184/184 PASS**
- Integrity: run `35711190753`, job `106692010441` — **SUCCESS**
- Lifecycle isolated: run `35711190610`, job `106692198176` — **52/52 PASS**
- Autostart isolated: run `35711190671`, job `106691966754` — **25/25 PASS**
- RBT Tier A: run `35711190642`, job `106691974263` — **SUCCESS**
- MIG-005 hosted contract: run `35711190628`, job `106693086802` — **21/21 + 16/16 PASS**
- Fresh machine probes: jobs `106693404916`, `106693404967`, `106693404995`, `106693405039` — **4/4 SUCCESS**
- production-capable workflow jobs: **SKIPPED**
- RBT-009 Tier B 480m: **NOT_RUN**

Fresh probes after the failed attempt proved the new platform root clean before retry: no state files, no runtime install, no autostart ownership, no wrapper/Three-Lane process, no pending reboot.

## Final authority invariant

Transition was **1 → 0 → 1 ownership**, never 2.

Final production state:

- old autostart ownership: **released**
- old runtime authority: **inactive**
- old state/rollback source: **retained**
- new autostart ownership: **active**
- new runtime process: **inactive because enabled_lane_count=0**
- production ownership authority instances: **1**
- split-brain: **false**
- Brain/Work targets and dispatch/relay latches: **preserved**
- Owner STOP semantics: **preserved false**
- raw production state/package committed or uploaded to GitHub: **false**

## Next task

MIG-005 is **DONE**.

MIG-006 is **READY_NOT_STARTED** and must run the final RBT-009 Tier B 480-minute soak from zero on the exact installed runtime candidate when explicitly released. MIG-005 does not start MIG-006.
