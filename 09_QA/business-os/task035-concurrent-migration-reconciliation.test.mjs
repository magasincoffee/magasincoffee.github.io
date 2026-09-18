import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read=p=>fs.readFile(new URL("../../"+p,import.meta.url),"utf8");

test("TASK-035 concurrent migration history ends with duplicate RPC ownership removed",async()=>{
  const [applied,reverted,worker]=await Promise.all([
    read("07_DATABASE/migrations/20260918120917_notification_email_target_resolution_v1.sql"),
    read("07_DATABASE/migrations/20260918121457_revert_redundant_notification_email_target_resolution_v1.sql"),
    read("supabase/functions/notification-email-worker/index.ts")
  ]);
  assert.match(applied,/resolve_notification_email_targets_v1/);
  assert.match(applied,/skip_notification_email_v1/);
  assert.match(reverted,/drop function if exists public\.resolve_notification_email_targets_v1\(uuid\)/i);
  assert.match(reverted,/drop function if exists public\.skip_notification_email_v1\(uuid,text\)/i);
  assert.match(worker,/async function resolveRecipients\(row\)/);
  assert.match(worker,/profiles\?select=email,full_name/);
});
