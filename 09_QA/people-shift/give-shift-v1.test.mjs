import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read=p=>fs.readFile(new URL("../../"+p,import.meta.url),"utf8");

test("TASK-033 migration enforces Give lifecycle and RLS boundaries",async()=>{
  const sql=await read("07_DATABASE/migrations/20260918112940_shift_give_v1.sql");
  assert.match(sql,/create table public\.shift_gives/i);
  assert.match(sql,/alter table public\.shift_gives enable row level security/i);
  assert.match(sql,/uq_shift_gives_pending_schedule/);
  assert.match(sql,/PENDING_RECIPIENT/);
  assert.match(sql,/PENDING_MANAGER/);
  assert.match(sql,/REJECTED_RECIPIENT/);
  assert.match(sql,/REJECTED_MANAGER/);
  assert.match(sql,/respond_shift_give_request/);
  assert.match(sql,/SHIFT_GIVE_NOT_PENDING_RECIPIENT/);
  assert.match(sql,/SHIFT_GIVE_NOT_PENDING_MANAGER/);
  assert.match(sql,/recipient_id<>auth\.uid\(\)/);
  assert.match(sql,/current_user_role\(\) not in\('OWNER','STORE_MANAGER'\)/);
  assert.match(sql,/update public\.work_schedules[\s\S]*set user_id=v_give\.recipient_id/i);
  assert.match(sql,/SCHEDULE_HAS_PENDING_GIVE/);
  assert.match(sql,/SCHEDULE_HAS_PENDING_SWAP/);
  assert.match(sql,/revoke execute on function public\.submit_shift_give_request\(uuid,uuid,text\) from public,anon/i);
  assert.match(sql,/grant execute on function public\.submit_shift_give_request\(uuid,uuid,text\) to authenticated/i);
});

test("Employee Give uses dedicated RPCs and recipient consent",async()=>{
  const source=await read("06_EMPLOYEE/swap/engine-v1.js");
  for(const rpc of [
    "list_shift_give_candidates_v1",
    "submit_shift_give_request",
    "list_my_shift_gives_v1",
    "respond_shift_give_request"
  ]) assert.match(source,new RegExp(rpc));
  assert.match(source,/PENDING_RECIPIENT/);
  assert.match(source,/PENDING_MANAGER/);
  assert.match(source,/Đồng ý nhận ca/);
  assert.doesNotMatch(source,/giveShiftState='NOT_CONNECTED'/);
});

test("Manager Give approval stays in canonical Workforce and refreshes official schedule",async()=>{
  const [manager,official]=await Promise.all([
    read("05_MANAGER/Workforce/swap-approval-v1.js"),
    read("05_MANAGER/Workforce/official-v1.js")
  ]);
  assert.match(manager,/list_shift_give_requests_v1/);
  assert.match(manager,/p_status:'PENDING_MANAGER'/);
  assert.match(manager,/approve_shift_give/);
  assert.match(manager,/reject_shift_give/);
  assert.match(manager,/magasin:shift-give-resolved/);
  assert.match(official,/magasin:shift-give-resolved/);
  assert.doesNotMatch(manager,/\.from\(['"]shift_gives['"]\)/);
  assert.doesNotMatch(manager,/\.from\(['"]work_schedules['"]\)/);
});
