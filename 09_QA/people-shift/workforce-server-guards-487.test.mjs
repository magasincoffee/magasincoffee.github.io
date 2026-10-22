import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root=new URL('../../',import.meta.url);
const read=p=>fs.readFile(new URL(p,root),'utf8');

const availability='07_DATABASE/migrations/20261022080000_workforce_employee_availability_deadline_v1.sql';
const swap='07_DATABASE/migrations/20261022081000_workforce_shift_swap_24h_submission_v1.sql';
const probes='09_QA/people-shift/workforce-server-guards-487-db-boundaries.sql';

test('employee changes are blocked at DB write boundary for INSERT/UPDATE/DELETE, not just the UI',async()=>{
  const sql=await read(availability);
  assert.match(sql,/create trigger trg_employee_availability_window_v1\s+before insert or update or delete/i);
  assert.match(sql,/security definer[\s\S]*set search_path=public/i);
  assert.match(sql,/v_actor uuid := auth\.uid\(\)/);
  assert.match(sql,/old\.user_id is distinct from v_actor/);
  assert.match(sql,/new\.user_id is distinct from v_actor/);
  assert.match(sql,/v_role not in \('STAFF','EMPLOYEE'\)/);
  assert.match(sql,/v_status is distinct from 'ACTIVE'/);
  assert.match(sql,/v_old_date:=old\.work_date/);
  assert.match(sql,/v_new_date:=new\.work_date/);
  assert.match(sql,/AVAILABILITY_REGISTRATION_CLOSED/);
  assert.match(sql,/v_time:=clock_timestamp\(\)/);
  assert.doesNotMatch(sql,/\b(update|delete)\s+public\.employee_availability\s+set\b/i);
});

test('Employee time window is next Mon-Sun, strictly before Sunday 12:00 in ICT; 30m input enforced',async()=>{
  const sql=await read(availability);
  const qa=await read(probes);
  assert.match(sql,/time zone 'Asia\/Ho_Chi_Minh'/);
  assert.match(sql,/extract\(isodow from at_local\)/);
  assert.match(sql,/p_work_date between \(monday \+ 7\) and \(monday \+ 13\)/);
  assert.match(sql,/at_local < \(\(monday \+ 6\)::timestamp \+ time '12:00:00'\)/);
  assert.match(sql,/new\.start_time < time '05:00:00'/);
  assert.match(sql,/new\.end_time > time '22:00:00'/);
  assert.match(sql,/mod\(extract\(epoch from new\.start_time\)::numeric,1800\)/);
  assert.match(sql,/mod\(extract\(epoch from new\.end_time\)::numeric,1800\)/);
  for(const boundary of ['11:59:59+07','12:00:00+07','12:00:01+07','00:00:00+07']){
    assert.ok(qa.includes(boundary),boundary);
  }
});

test('Swap applies 24h check on request insertion, without blocking subsequent approval or Give',async()=>{
  const sql=await read(swap);
  assert.match(sql,/create trigger trg_shift_swap_submission_time_v1\s+before insert or update of requester_schedule_id,target_schedule_id/i);
  assert.match(sql,/shift_swap_submission_on_time_v1\(/);
  assert.match(sql,/least\([\s\S]*?at time zone 'Asia\/Ho_Chi_Minh'/);
  assert.match(sql,/>= \(p_checked_at \+ interval '24 hours'\)/);
  assert.match(sql,/clock_timestamp\(\)/);
  assert.match(sql,/new\.requester_schedule_id/);
  assert.match(sql,/new\.target_schedule_id/);
  assert.match(sql,/SHIFT_SWAP_REQUIRES_24H_NOTICE/);
  assert.doesNotMatch(sql,/create or replace function public\.approve_shift_swap/i);
  assert.doesNotMatch(sql,/shift_gives|submit_shift_give|24.hour.{0,20}give/i);
});

test('DB-only boundary probes remain non-destructive and specify unproven signed-JWT gates',async()=>{
  const qa=await read(probes);
  assert.match(qa,/public\.employee_availability_window_open_v1/);
  assert.match(qa,/public\.shift_swap_submission_on_time_v1/);
  assert.match(qa,/exactly 24h/);
  assert.match(qa,/earlier target shift/);
  assert.match(qa,/signed JWT/);
  assert.doesNotMatch(qa,/\b(insert|update|delete|truncate)\s+(into\s+|from\s+)?public\./i);
});
