// MAGASIN #487 backup-admission: GitHub metadata ONLY, no database contact.
// Nonzero exit is a release HOLD; success proves ONLY retained encrypted backup
// and its isolated restore job, never Owner/ACL/role/business acceptance.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

export const WORKFLOW='xstore-019o-cloud-backup.yml';
export const REQUIRED_STEPS=[
  'Capture production PostgreSQL with Docker client v17 (read-only)',
  'Encrypt the archive before it can be uploaded',
  'Authenticate decryption in isolated runner',
  'Restore full database archive and verify critical relations',
];
export function validate({run,artifacts,jobs,now=new Date(),maxAgeHours=24}){
  const problems=[];
  const check=(truth,code)=>{if(!truth)problems.push(code)};
  const workflowPath=String(run?.path||'');
  check(workflowPath.endsWith('/'+WORKFLOW),'WRONG_BACKUP_WORKFLOW');
  check(run?.event==='workflow_dispatch'&&run?.head_branch==='main','BACKUP_NOT_MANUAL_TRUSTED_MAIN');
  check(run?.status==='completed'&&run?.conclusion==='success','BACKUP_RUN_NOT_SUCCESS');
  const created=Date.parse(run?.created_at||'');
  const current=now.getTime();
  check(Number.isFinite(created)&&created<=current&&current-created<maxAgeHours*3600_000,'BACKUP_TOO_OLD_OR_TIME_INVALID');
  const expected='xstore-019o-noibo-encrypted-'+run?.id;
  const matches=Array.isArray(artifacts)?artifacts.filter(x=>x?.name===expected):[];
  check(matches.length===1,'ENCRYPTED_ARTIFACT_NOT_PRESENT');
  if(matches.length===1){
    const artifact=matches[0];
    check(artifact.expired===false,'ENCRYPTED_ARTIFACT_EXPIRED');
    check(Number(artifact.size_in_bytes)>0,'ENCRYPTED_ARTIFACT_EMPTY');
    const expiry=Date.parse(artifact.expires_at||'');
    check(Number.isFinite(expiry)&&expiry>current,'ENCRYPTED_ARTIFACT_NO_VALID_EXPIRY');
  }
  const job=Array.isArray(jobs)?jobs.find(x=>x?.name==='Encrypted production backup + isolated restore'):null;
  // GitHub job names may evolve; use the exact required steps across
  // successful jobs without granting eligibility for skipped jobs.
  const passingSteps=(Array.isArray(jobs)?jobs:[])
   .filter(j=>j?.conclusion==='success')
   .flatMap(j=>j.steps||[])
   .filter(step=>step?.conclusion==='success')
   .map(step=>step.name);
  for(const name of REQUIRED_STEPS)check(passingSteps.includes(name),'MISSING_RESTORE_STEP:'+name);
  // The Github-hosted restore is --no-owner --no-acl; full ACL rehearsal
  // and the live JWT/role acceptance remain separate mandatory hard gates.
  return {ok:problems.length===0,problems,backupRunId:run?.id||null,fullOwnerAclVerified:false};
}
function requireSafeID(raw){
  assert.match(String(raw||''),/^\d{7,15}$/,'BACKUP_RUN_ID_REQUIRED');
  return Number(raw);
}
async function getJSON(path,token,repo){
 const response=await fetch('https://api.github.com/repos/'+repo+path,{
  headers:{accept:'application/vnd.github+json',authorization:'Bearer '+token,'x-github-api-version':'2022-11-28'}
 });
 if(!response.ok)throw new Error('GITHUB_METADATA_READ_FAILED_'+response.status);
 return response.json();
}
export async function main(){
 const runId=requireSafeID(process.env.WORKFORCE_BACKUP_RUN_ID);
 const token=process.env.GITHUB_TOKEN;
 assert.ok(token,'GITHUB_READ_TOKEN_REQUIRED');
 const repo=process.env.GITHUB_REPOSITORY||'magasincoffee/magasincoffee.github.io';
 assert.equal(repo,'magasincoffee/magasincoffee.github.io','WRONG_REPOSITORY');
 const maxAgeHours=24; // conservative preflight default, not business policy
 const [run,artifactPayload,jobPayload]=await Promise.all([
  getJSON('/actions/runs/'+runId,token,repo),
  getJSON('/actions/runs/'+runId+'/artifacts?per_page=100',token,repo),
  getJSON('/actions/runs/'+runId+'/jobs?per_page=100',token,repo),
 ]);
 const result=validate({run,artifacts:artifactPayload.artifacts,jobs:jobPayload.jobs,maxAgeHours});
 console.log(JSON.stringify({backupRunId:result.backupRunId,backupGate:result.ok?'PASS':'HOLD',reasons:result.problems,ownerAcl:'NOT_VERIFIED',productionDdl:'NOT_AUTHORIZED'}));
 if(!result.ok)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 main().catch(e=>{console.error('BACKUP_PREFLIGHT_HOLD:',e.message);process.exitCode=1});
}
