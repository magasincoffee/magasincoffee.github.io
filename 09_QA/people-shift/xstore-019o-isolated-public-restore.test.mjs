import fs from 'node:fs';
import assert from 'node:assert/strict';
const base='09_QA/people-shift/';
const src=fs.readFileSync(base+'xstore-019o-isolated-public-restore.sh','utf8');
const wf=fs.readFileSync('.github/workflows/xstore-019o-public-recovery.yml','utf8');
for(const marker of [
  'set -Eeuo pipefail','--network none','--schema=public --section="$stage"',
  'pg_restore --exit-on-error','ISOLATED_PUBLIC_ONLY','TRUSTED_MAIN_ONLY',
  '--schema=auth --section="$stage"','XSTORE_019O_AUTH_PREREQUISITE_',
  'XSTORE_019O_AUTH_USERS_TABLE_IN_ARCHIVE=YES','pg_restore --list',
  'trap cleanup EXIT','XSTORE_019O_PUBLIC_OWNER_ACL_RLS_PARITY=PASS',
  'XSTORE_019O_FULL_SYSTEM_DISASTER_RESTORE=NOT_PROVEN'
]) assert(src.includes(marker),'MISSING_ISOLATED_CONTRACT');
assert(!/pg_restore[^\n]*--no-owner/.test(src),'FORBIDDEN_NO_OWNER');
assert(!/pg_restore[^\n]*--no-acl/.test(src),'FORBIDDEN_NO_ACL');
assert(!src.includes('SET session_replication_role = replica'),'NO_DISABLED_FK_CHECKS');
assert(!/(curl|wget|nc |ssh |socat)/.test(src),'FORBIDDEN_NETWORK_TOOL');
assert(wf.includes("github.event_name == 'push' && github.ref == 'refs/heads/main'"),'TRUSTED_ONLY');
assert(wf.includes("run-id: 38680192167"),'APPROVED_ENCRYPTED_BACKUP_REQUIRED');
assert(wf.includes('xstore-019o-acl-full-encrypted-38680192167'),'ARTIFACT_MISMATCH');
assert(wf.includes('MAGASIN_NOIBO_BACKUP_ENCRYPTION_KEY'),'SECRET_KEY_MISSING');
assert(wf.includes('actions/download-artifact@v4'),'BACKUP_DOWNLOAD_MISSING');
assert(!wf.includes('pull_request_target:'),'DANGEROUS_EVENT');
assert(!wf.includes('upload-artifact@'),'FORBIDDEN_PLAINTEXT_ARTIFACT');
assert(!wf.includes('DATABASE_URL'),'FORBIDDEN_PRODUCTION_CONNECTOR');
assert(wf.includes('rm -rf "$BACKUP_WORK"'),'NO_PRIVATE_CLEANUP');
console.log('XSTORE_019O_PUBLIC_RECOVERY_SOURCE_QA=PASS; TRUSTED_MAIN_ONLY; NO_PRIVATE_DATA_ON_PR');
