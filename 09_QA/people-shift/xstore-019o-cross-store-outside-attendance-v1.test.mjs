import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(
  '07_DATABASE/migrations/20261010234500_xstore_019l_outside_attendance_requests_v1.sql',
  'utf8'
);
function body(name){
  const start=sql.indexOf('create or replace function public.'+name+'(');
  assert.ok(start>=0,'migration must define '+name);
  const end=sql.indexOf('$function$;',start);
  assert.ok(end>start,'migration function must terminate '+name);
  return sql.slice(start,end);
}
const submit=body('submit_outside_schedule_attendance_v1');
const review=body('review_outside_schedule_attendance_v1');

test('XSTORE-019O submit blocks overlapping approved shift in any store',()=>{
  assert.match(submit,/from public\.work_schedules w[\s\S]*?w\.user_id=v_uid and w\.work_date=p_work_date and w\.status='APPROVED'/);
  assert.match(submit,/w\.start_time<p_actual_end[\s\S]*?p_actual_start<w\.end_time/);
  assert.doesNotMatch(submit,/w\.store_id\s*=\s*p_store_id/);
  assert.match(submit,/ATTENDANCE_PUBLISHED_SHIFT_USE_SCHEDULE/);
});

test('XSTORE-019O Manager review rechecks overlapping published shift globally',()=>{
  assert.match(review,/from public\.work_schedules w[\s\S]*?w\.user_id=v_row\.employee_id[\s\S]*?w\.work_date=v_row\.work_date and w\.status='APPROVED'/);
  assert.match(review,/w\.start_time<p_confirmed_end and p_confirmed_start<w\.end_time/);
  assert.doesNotMatch(review,/w\.store_id\s*=\s*v_row\.store_id/);
  assert.match(review,/OUTSIDE_REQUEST_SCHEDULE_CHANGED/);
});

test('XSTORE-019O serializes cross-store approval and rejects already approved interval',()=>{
  assert.match(review,/pg_advisory_xact_lock\(hashtextextended\([\s\S]*?'x19l_outside_review:'/);
  assert.match(review,/other_request\.employee_id=v_row\.employee_id/);
  assert.match(review,/other_request\.id<>v_row\.id/);
  assert.match(review,/other_request\.work_date=v_row\.work_date/);
  assert.match(review,/other_request\.status='APPROVED'/);
  assert.match(review,/other_request\.confirmed_start<p_confirmed_end/);
  assert.match(review,/p_confirmed_start<other_request\.confirmed_end/);
  assert.match(review,/OUTSIDE_REQUEST_ALREADY_APPROVED_OVERLAP/);
});

test('XSTORE-019O preserves store-scoped review authority, no payroll or official schedule writer',()=>{
  assert.match(submit,/employee_store_priorities esp[\s\S]*?esp\.employee_id=v_uid/);
  assert.match(review,/public\.can_access_store\(v_row\.store_id\)/);
  assert.match(review,/reviewed_by=v_uid/);
  assert.doesNotMatch(sql,/insert\s+into\s+public\.(?:attendance|work_schedules|payroll_entries)\b/i);
});
