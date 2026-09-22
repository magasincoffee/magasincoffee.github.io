import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

async function migration(){
  const dir=new URL("07_DATABASE/migrations/",root);
  const names=await fs.readdir(dir);
  const name=names.find(x=>x.includes("task_096_swap_lifecycle_reconciliation_hardening"));
  assert.ok(name,"TASK-096 migration file missing");
  return read("07_DATABASE/migrations/"+name);
}
function fn(sql,name,next){
  const start=sql.indexOf(`create or replace function public.${name}`);
  assert.ok(start>=0,`missing function ${name}`);
  const end=next?sql.indexOf(`create or replace function public.${next}`,start+1):sql.indexOf("revoke execute on function",start+1);
  assert.ok(end>start,`missing end for ${name}`);
  return sql.slice(start,end);
}

test("TASK-096 maps PENDING -> PEER_ACCEPTED -> APPROVED without rewriting legacy terminal statuses",async()=>{
  const sql=await migration();
  assert.match(sql,/status in \('PENDING','PEER_ACCEPTED','APPROVED','CANCELLED','REJECTED'\)/);
  assert.match(sql,/add column if not exists peer_responded_at timestamptz/);
  assert.doesNotMatch(sql,/update\s+public\.shift_swaps\s+set\s+status\s*=\s*'PEER_ACCEPTED'\s+where\s+status\s*=\s*'PENDING'/i);
  assert.doesNotMatch(sql,/delete\s+from\s+public\.shift_swaps/i);
  assert.doesNotMatch(sql,/EXPIRED.*interval|cron|pg_cron/i);
});

test("active Swap indexes cover both requested and peer-accepted lifecycle stages",async()=>{
  const sql=await migration();
  assert.match(sql,/uq_shift_swaps_active_requester_schedule[\s\S]*status in \('PENDING','PEER_ACCEPTED'\)/);
  assert.match(sql,/uq_shift_swaps_active_target_schedule[\s\S]*status in \('PENDING','PEER_ACCEPTED'\)/);
  assert.match(sql,/idx_shift_swaps_target_user_status/);
  assert.match(sql,/revoke all on table public\.shift_swaps from anon, authenticated/);
});

test("validator preserves current safety and adds canonical max-two resulting-state rule",async()=>{
  const sql=await migration();
  const v=fn(sql,"validate_shift_swap_v1","list_shift_swap_candidates_v1");
  for(const code of [
    "REQUESTER_SCHEDULE_NOT_OWNED","SAME_EMPLOYEE_SWAP",
    "REQUESTER_SCHEDULE_NOT_APPROVED","TARGET_SCHEDULE_NOT_APPROVED",
    "STORE_MISMATCH","DATE_MISMATCH",
    "REQUESTER_INACTIVE","TARGET_INACTIVE",
    "ATTENDANCE_ALREADY_EXISTS","SCHEDULE_HAS_PENDING_GIVE",
    "REQUESTER_NOT_AVAILABLE_FOR_TARGET_SHIFT","TARGET_NOT_AVAILABLE_FOR_REQUESTER_SHIFT",
    "REQUESTER_RESULTING_OVERLAP","TARGET_RESULTING_OVERLAP",
    "REQUESTER_MAX_TWO_ASSIGNMENTS_PER_DAY","TARGET_MAX_TWO_ASSIGNMENTS_PER_DAY",
    "REQUESTER_DAILY_HOURS_LIMIT","TARGET_DAILY_HOURS_LIMIT",
    "REQUESTER_WEEKLY_HOURS_LIMIT","TARGET_WEEKLY_HOURS_LIMIT"
  ]) assert.match(v,new RegExp(code),code);
  assert.match(v,/ws\.id not in\(v_req\.id,v_target\.id\)/);
  assert.match(v,/v_req_count:=v_req_count\+1/);
  assert.match(v,/v_target_count:=v_target_count\+1/);
});

test("submit is server-serialized and blocks duplicate active swaps across both schedule roles",async()=>{
  const sql=await migration();
  const submit=fn(sql,"submit_shift_swap_request","list_my_incoming_shift_swaps_v1");
  assert.match(submit,/pg_advisory_xact_lock/);
  assert.match(submit,/for update/);
  assert.match(submit,/validate_shift_swap_v1/);
  assert.match(submit,/status in\('PENDING','PEER_ACCEPTED'\)/);
  assert.match(submit,/requester_schedule_id in\(p_requester_schedule_id,p_target_schedule_id\)/);
  assert.match(submit,/target_schedule_id in\(p_requester_schedule_id,p_target_schedule_id\)/);
  assert.match(submit,/SHIFT_SWAP_ALREADY_ACTIVE/);
  assert.match(submit,/when unique_violation/);
});

test("incoming reader is target-user scoped and returns only operational Swap fields",async()=>{
  const sql=await migration();
  const incoming=fn(sql,"list_my_incoming_shift_swaps_v1","respond_shift_swap_request");
  assert.match(incoming,/if auth\.uid\(\) is null then raise exception 'AUTH_REQUIRED'/);
  assert.match(incoming,/where ss\.target_user_id=auth\.uid\(\)/);
  assert.match(incoming,/requester_name text/);
  assert.match(incoming,/requester_schedule_id uuid/);
  assert.match(incoming,/target_schedule_id uuid/);
  assert.doesNotMatch(incoming,/phone|salary|hourly_rate|access_scope/i);
});

test("peer response is target-authoritative, idempotent and revalidates before acceptance",async()=>{
  const sql=await migration();
  const respond=fn(sql,"respond_shift_swap_request","approve_shift_swap");
  assert.match(respond,/v_swap\.target_user_id<>auth\.uid\(\)/);
  assert.match(respond,/SHIFT_SWAP_NOT_TARGET/);
  assert.match(respond,/v_swap\.status='PEER_ACCEPTED' and p_accept[\s\S]*already_accepted/);
  assert.match(respond,/v_swap\.status='REJECTED'[\s\S]*already_rejected/);
  assert.match(respond,/REQUESTER_OWNERSHIP_CHANGED/);
  assert.match(respond,/TARGET_OWNERSHIP_CHANGED/);
  assert.match(respond,/SHIFT_SWAP_SCHEDULE_NOT_APPROVED/);
  assert.match(respond,/validate_shift_swap_v1/);
  assert.match(respond,/SHIFT_SWAP_COMPETING_ACTIVE/);
  assert.match(respond,/set status='PEER_ACCEPTED',peer_responded_at=now\(\)/);
});

test("Manager approval requires peer acceptance, revalidates and cannot swap back on retry",async()=>{
  const sql=await migration();
  const approve=fn(sql,"approve_shift_swap","reject_shift_swap");
  assert.match(approve,/ACTOR_NOT_ACTIVE/);
  assert.match(approve,/STORE_NOT_ALLOWED/);
  assert.match(approve,/v_swap\.status='APPROVED'[\s\S]*already_applied/);
  assert.match(approve,/v_swap\.status<>'PEER_ACCEPTED'[\s\S]*SHIFT_SWAP_PEER_ACCEPTANCE_REQUIRED/);
  assert.match(approve,/REQUESTER_OWNERSHIP_CHANGED/);
  assert.match(approve,/TARGET_OWNERSHIP_CHANGED/);
  assert.match(approve,/validate_shift_swap_v1/);
  assert.match(approve,/SHIFT_SWAP_COMPETING_ACTIVE/);
  assert.equal((approve.match(/update public\.work_schedules/g)||[]).length,2);
  assert.match(approve,/where id=p_swap_id and status='PEER_ACCEPTED'/);
});

test("cancel and Manager reject preserve fail-closed terminal semantics",async()=>{
  const sql=await migration();
  const reject=fn(sql,"reject_shift_swap","cancel_shift_swap");
  const cancel=fn(sql,"cancel_shift_swap","notification_shift_swap_trigger_v1");
  assert.match(reject,/SHIFT_SWAP_PEER_ACCEPTANCE_REQUIRED/);
  assert.match(reject,/already_rejected/);
  assert.match(cancel,/SHIFT_SWAP_ALREADY_PEER_ACCEPTED/);
  assert.match(cancel,/SHIFT_SWAP_ALREADY_RESOLVED/);
  assert.match(cancel,/already_cancelled/);
});

test("notification lifecycle is peer-first and Manager review is not emitted on submit",async()=>{
  const sql=await migration();
  const notify=fn(sql,"notification_shift_swap_trigger_v1",null);
  const insert=notify.slice(notify.indexOf("if tg_op='INSERT'"),notify.indexOf("if tg_op='UPDATE'"));
  assert.match(insert,/SHIFT_SWAP_REQUESTED/);
  assert.doesNotMatch(insert,/SHIFT_SWAP_MANAGER_REVIEW/);
  assert.match(notify,/new\.status='PEER_ACCEPTED'[\s\S]*SHIFT_SWAP_PEER_ACCEPTED[\s\S]*SHIFT_SWAP_MANAGER_REVIEW/);
  assert.match(notify,/SHIFT_SWAP_PEER_REJECTED/);
  assert.match(notify,/SHIFT_SWAP_APPROVED/);
  assert.match(notify,/SHIFT_SWAP_CANCELLED/);
  assert.match(notify,/'swap:'\|\|new\.id\|\|':manager_review'/);
});

test("Swap RPC privilege boundary does not expose mutation or trigger functions to anon/PUBLIC",async()=>{
  const sql=await migration();
  assert.match(sql,/revoke execute on function public\.respond_shift_swap_request\(uuid,boolean\)[\s\S]*from public,anon/);
  assert.match(sql,/grant execute on function public\.respond_shift_swap_request\(uuid,boolean\) to authenticated/);
  assert.match(sql,/revoke execute on function public\.notification_shift_swap_trigger_v1\(\)[\s\S]*from public,anon,authenticated/);
  assert.doesNotMatch(sql,/grant execute on function public\.notification_shift_swap_trigger_v1\(\) to authenticated/);
});
