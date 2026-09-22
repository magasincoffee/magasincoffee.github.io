import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

async function migration(){
  const dir=new URL("07_DATABASE/migrations/",root);
  const names=await fs.readdir(dir);
  const name=names.find(x=>x.includes("task_097_give_lifecycle_reconciliation_hardening"));
  assert.ok(name,"TASK-097 migration missing");
  return read("07_DATABASE/migrations/"+name);
}
function fn(sql,name,next){
  const start=sql.indexOf(`create or replace function public.${name}`);
  assert.ok(start>=0,`missing function ${name}`);
  const end=next?sql.indexOf(`create or replace function public.${next}`,start+1):sql.indexOf("revoke execute on function",start+1);
  assert.ok(end>start,`missing end for ${name}`);
  return sql.slice(start,end);
}

test("TASK-097 keeps semantic-compatible Give statuses without rename-only migration",async()=>{
  const sql=await migration();
  assert.match(sql,/PENDING_RECIPIENT = OFFERED/);
  assert.match(sql,/PENDING_MANAGER\s+= recipient accepted/);
  assert.match(sql,/APPROVED\s+= Manager approved \+ ownership transfer APPLIED atomically/);
  assert.doesNotMatch(sql,/alter table public\.shift_gives[\s\S]*status_check/i);
  assert.doesNotMatch(sql,/delete\s+from\s+public\.shift_gives/i);
  assert.doesNotMatch(sql,/CANCELLED.*check|EXPIRED.*check|pg_cron|cron\.schedule/i);
});

test("Give validator enforces ACTIVE STAFF for giver and recipient",async()=>{
  const sql=await migration();
  const v=fn(sql,"validate_shift_give_v1","list_shift_give_candidates_v1");
  for(const code of ["GIVER_INACTIVE","GIVER_NOT_STAFF","RECIPIENT_INACTIVE","RECIPIENT_NOT_STAFF"]){
    assert.match(v,new RegExp(code),code);
  }
  assert.match(v,/where id=p_giver_user_id and status='ACTIVE'/);
  assert.match(v,/where id=p_giver_user_id and role='STAFF'/);
  assert.match(v,/where id=p_recipient_user_id and status='ACTIVE'/);
  assert.match(v,/where id=p_recipient_user_id and role='STAFF'/);
});

test("Give validator blocks both active Swap states and preserves attendance/availability/overlap",async()=>{
  const sql=await migration();
  const v=fn(sql,"validate_shift_give_v1","list_shift_give_candidates_v1");
  assert.match(v,/ss\.status in\('PENDING','PEER_ACCEPTED'\)/);
  assert.match(v,/SCHEDULE_HAS_ACTIVE_SWAP/);
  for(const code of ["ATTENDANCE_ALREADY_EXISTS","RECIPIENT_NOT_AVAILABLE","RECIPIENT_UNAVAILABLE","RECIPIENT_RESULTING_OVERLAP"]){
    assert.match(v,new RegExp(code),code);
  }
});

test("Give validator adds canonical resulting max-two/day independently of hour caps",async()=>{
  const sql=await migration();
  const v=fn(sql,"validate_shift_give_v1","list_shift_give_candidates_v1");
  assert.match(v,/v_recipient_count:=v_recipient_count\+1/);
  assert.match(v,/RECIPIENT_MAX_TWO_ASSIGNMENTS_PER_DAY/);
  assert.match(v,/if v_recipient_count>2/);
  assert.match(v,/RECIPIENT_DAILY_HOURS_LIMIT/);
  assert.match(v,/RECIPIENT_WEEKLY_HOURS_LIMIT/);
});

test("candidate list filters ACTIVE STAFF and hides schedules with an existing active Give",async()=>{
  const sql=await migration();
  const f=fn(sql,"list_shift_give_candidates_v1","submit_shift_give_request");
  assert.match(f,/p\.status='ACTIVE'/);
  assert.match(f,/p\.role='STAFF'/);
  assert.match(f,/status in\('PENDING_RECIPIENT','PENDING_MANAGER'\)/);
  assert.match(f,/validate_shift_give_v1/);
});

test("submit serializes with TASK-096 Swap lock namespace and handles duplicate active Give race",async()=>{
  const sql=await migration();
  const f=fn(sql,"submit_shift_give_request","respond_shift_give_request");
  assert.match(f,/shift_swap_schedule:/);
  assert.match(f,/pg_advisory_xact_lock/);
  assert.match(f,/for update/);
  assert.match(f,/validate_shift_give_v1/);
  assert.match(f,/SHIFT_GIVE_ALREADY_PENDING/);
  assert.match(f,/when unique_violation/);
});

test("recipient response is target-only, revalidates accept, and retries deterministically",async()=>{
  const sql=await migration();
  const f=fn(sql,"respond_shift_give_request","approve_shift_give");
  assert.match(f,/v_give\.recipient_id<>auth\.uid\(\)/);
  assert.match(f,/RECIPIENT_NOT_ALLOWED/);
  assert.match(f,/v_give\.status='PENDING_MANAGER' and p_accept[\s\S]*already_accepted/);
  assert.match(f,/v_give\.status='REJECTED_RECIPIENT'[\s\S]*already_rejected/);
  assert.match(f,/shift_swap_schedule:/);
  assert.match(f,/GIVER_OWNERSHIP_CHANGED/);
  assert.match(f,/SCHEDULE_NOT_APPROVED/);
  assert.match(f,/validate_shift_give_v1/);
});

test("Manager approval is recipient-consent gated, atomic, and idempotent without second transfer",async()=>{
  const sql=await migration();
  const f=fn(sql,"approve_shift_give","reject_shift_give");
  assert.match(f,/ACTOR_NOT_ACTIVE/);
  assert.match(f,/STORE_NOT_ALLOWED/);
  assert.match(f,/SHIFT_GIVE_RECIPIENT_CONSENT_REQUIRED/);
  assert.match(f,/v_give\.status='APPROVED'[\s\S]*SHIFT_GIVE_APPROVED_OWNERSHIP_MISMATCH[\s\S]*already_applied/);
  assert.match(f,/v_give\.status<>'PENDING_MANAGER'/);
  assert.match(f,/validate_shift_give_v1/);
  assert.equal((f.match(/update public\.work_schedules/g)||[]).length,1);
  assert.match(f,/set user_id=v_give\.recipient_id/);
  assert.match(f,/where id=p_give_id and status='PENDING_MANAGER'/);
});

test("Manager reject retry is stable and cannot rewrite APPROVED state",async()=>{
  const sql=await migration();
  const f=fn(sql,"reject_shift_give",null);
  assert.match(f,/v_give\.status='REJECTED_MANAGER'[\s\S]*already_rejected/);
  assert.match(f,/v_give\.status<>'PENDING_MANAGER'/);
  assert.match(f,/SHIFT_GIVE_RECIPIENT_CONSENT_REQUIRED/);
  assert.match(f,/ACTOR_NOT_ACTIVE/);
  assert.match(f,/STORE_NOT_ALLOWED/);
});

test("TASK-097 function privilege boundary keeps validator internal and mutation RPCs non-anon",async()=>{
  const sql=await migration();
  assert.match(sql,/revoke execute on function public\.validate_shift_give_v1\(uuid,uuid,uuid\)[\s\S]*from public,anon,authenticated/);
  for(const sig of [
    "list_shift_give_candidates_v1\\(uuid\\)",
    "submit_shift_give_request\\(uuid,uuid,text\\)",
    "respond_shift_give_request\\(uuid,boolean\\)",
    "approve_shift_give\\(uuid\\)",
    "reject_shift_give\\(uuid,text\\)"
  ]){
    assert.match(sql,new RegExp(`revoke execute on function public\\.${sig}[\\s\\S]*from public,anon`));
  }
});

test("Employee and Manager canonical UI preserve recipient-first Give wording and queue",async()=>{
  const employee=await read("06_EMPLOYEE/swap/engine-v1.js");
  const manager=await read("05_MANAGER/Workforce/swap-approval-v1.js");
  assert.match(employee,/PENDING_RECIPIENT:'Chờ người nhận'/);
  assert.match(employee,/PENDING_MANAGER:'Đã đồng ý nhận ca · Chờ quản lý duyệt'/);
  assert.match(employee,/respond_shift_give_request/);
  assert.match(manager,/list_shift_give_requests_v1/);
  assert.match(manager,/p_status:'PENDING_MANAGER'/);
  assert.match(manager,/Người nhận đã đồng ý/);
  assert.match(manager,/approve_shift_give/);
  assert.doesNotMatch(manager,/\.from\(['"]shift_gives['"]\)/);
});
