import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,REQUIRED_STEPS,WORKFLOW} from './workforce-487-backup-admission.mjs';
const t=new Date('2026-10-22T04:00:00.000Z');
const id=38577798740;
function fixture(){
 const run={id,path:'.github/workflows/'+WORKFLOW,event:'workflow_dispatch',head_branch:'main',status:'completed',conclusion:'success',created_at:'2026-10-22T02:00:00Z'};
 const artifacts=[{name:'xstore-019o-noibo-encrypted-'+id,expired:false,expires_at:'2026-10-29T02:00:00Z',size_in_bytes:500000}];
 const jobs=[{name:'encrypted-backup-restore',conclusion:'success',steps:REQUIRED_STEPS.map(name=>({name,conclusion:'success'}))}];
 return {run,artifacts,jobs,now:t};
}
test('current successful manually admitted encrypted backup with isolated restore passes metadata gate but NOT owner ACL',()=>{
 const result=validate(fixture());
 assert.equal(result.ok,true);
 assert.equal(result.fullOwnerAclVerified,false);
});
test('expired artifact must block, even when workflow itself was successful',()=>{
 const x=fixture();x.artifacts[0].expired=true;
 assert.ok(validate(x).problems.includes('ENCRYPTED_ARTIFACT_EXPIRED'));
});
test('previous 14 October backup is too old on 22 October',()=>{
 const x=fixture();x.run.created_at='2026-10-14T14:08:02Z';
 assert.ok(validate(x).problems.includes('BACKUP_TOO_OLD_OR_TIME_INVALID'));
});
test('empty artifact results (actual current GitHub evidence) remain HOLD',()=>{
 const x=fixture();x.artifacts=[];
 assert.ok(validate(x).problems.includes('ENCRYPTED_ARTIFACT_NOT_PRESENT'));
});
test('the encrypted archive must not have zero bytes or missing expiry',()=>{
 const x=fixture();x.artifacts[0].size_in_bytes=0;x.artifacts[0].expires_at=null;
 const r=validate(x);
 assert.ok(r.problems.includes('ENCRYPTED_ARTIFACT_EMPTY'));
 assert.ok(r.problems.includes('ENCRYPTED_ARTIFACT_NO_VALID_EXPIRY'));
});
test('malicious pull request cannot satisfy trusted manual backup admission',()=>{
 const x=fixture();x.run.event='pull_request';x.run.head_branch='evil';
 assert.ok(validate(x).problems.includes('BACKUP_NOT_MANUAL_TRUSTED_MAIN'));
});
test('wrong workflow is rejected even for successful action',()=>{
 const x=fixture();x.run.path='.github/workflows/untrusted.yml';
 assert.ok(validate(x).problems.includes('WRONG_BACKUP_WORKFLOW'));
});
test('successful GitHub job missing actual restore fails',()=>{
 const x=fixture();x.jobs[0].steps=x.jobs[0].steps.filter(s=>!s.name.startsWith('Restore full database archive'));
 assert.ok(validate(x).problems.some(p=>p.startsWith('MISSING_RESTORE_STEP:Restore')));
});
test('skipped or failed restore step cannot count as PASS',()=>{
 const x=fixture();x.jobs[0].steps.at(-1).conclusion='skipped';
 assert.ok(validate(x).problems.some(p=>p.startsWith('MISSING_RESTORE_STEP:Restore')));
});
test('run older than 24 hours is conservatively blocked',()=>{
 const x=fixture();x.run.created_at='2026-10-21T03:00:00Z';
 assert.ok(validate(x).problems.includes('BACKUP_TOO_OLD_OR_TIME_INVALID'));
});
test('backup no future data is required and all checks are read-only',()=>{
 const s=validate(fixture());
 assert.deepEqual(s.problems,[]);
 assert.equal(s.ok,true);
});
