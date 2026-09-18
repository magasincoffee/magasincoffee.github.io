import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read=p=>fs.readFile(new URL("../../"+p,import.meta.url),"utf8");

test("TASK-035 migration resolves targets and skips permanent no-target delivery through service_role only",async()=>{
  const sql=await read("07_DATABASE/migrations/20260918120917_notification_email_target_resolution_v1.sql");
  assert.match(sql,/resolve_notification_email_targets_v1\(p_notification_id uuid\)/i);
  assert.match(sql,/p\.status = 'ACTIVE'/i);
  assert.match(sql,/p\.role = 'STORE_MANAGER'/i);
  assert.match(sql,/p\.role = 'OWNER'/i);
  assert.match(sql,/skip_notification_email_v1/i);
  assert.match(sql,/email_status = 'SKIPPED'/i);
  assert.match(sql,/NOTIFICATION_NOT_PROCESSING/i);
  assert.match(sql,/revoke execute on function public\.resolve_notification_email_targets_v1\(uuid\)[\s\S]*from public, anon, authenticated/i);
  assert.match(sql,/revoke execute on function public\.skip_notification_email_v1\(uuid,text\)[\s\S]*from public, anon, authenticated/i);
  assert.match(sql,/grant execute on function public\.resolve_notification_email_targets_v1\(uuid\)[\s\S]*to service_role/i);
  assert.match(sql,/grant execute on function public\.skip_notification_email_v1\(uuid,text\)[\s\S]*to service_role/i);
});
