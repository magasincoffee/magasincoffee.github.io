import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const sql=await readFile(new URL('../../supabase/migrations/20261022092000_workforce_registration_order_v1.sql',import.meta.url),'utf8');
const planner=await readFile(new URL('../../05_MANAGER/SchedulingV2/store-planner-v1.js',import.meta.url),'utf8');
const ui=await readFile(new URL('../../05_MANAGER/SchedulingV2/auto-ui-v1.js',import.meta.url),'utf8');

test('scoped read-only DB function exposes timestamps but not employee secrets',()=>{
  assert.match(sql,/RETURNS TABLE\(availability_id uuid, registered_at timestamptz\)/i);
  assert.match(sql,/auth\.uid\(\) IS NULL/);
  assert.match(sql,/v_role NOT IN \('OWNER','STORE_MANAGER'\)/);
  assert.match(sql,/p\.status='ACTIVE'/);
  assert.match(sql,/public\.can_access_store\(p_store_id\)/);
  assert.match(sql,/extract\(isodow FROM p_week_start\)<>1/);
  assert.match(sql,/ea\.work_date BETWEEN p_week_start AND p_week_start\+6/);
  assert.match(sql,/esp\.employee_id=ea\.user_id AND esp\.store_id=p_store_id/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.list_workforce_registration_order_v1\(uuid,date\) FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.list_workforce_registration_order_v1\(uuid,date\) TO authenticated/);
  assert.doesNotMatch(sql,/\b(?:UPDATE|DELETE|INSERT)\s+(?:INTO\s+|FROM\s+)?public\.employee_availability\b/i);
});
test('planner requires matching availability id, trusted time and full coverage before verified rank',()=>{
  assert.match(planner,/list_workforce_registration_order_v1/);
  assert.match(planner,/Date\.parse\(String\(row\.registered_at/);
  assert.match(planner,/REGISTRATION_TIMESTAMP_SCOPE_MISMATCH/);
  assert.match(planner,/activeAvailability\.every\(a=>registeredAt\.has/);
  assert.match(planner,/s\.registrationVerified\?a\.registeredAt-b\.registeredAt:0/);
  assert.match(planner,/registrationOrderStatus:s\.registrationVerified\?'VERIFIED_CREATED_AT':'NOT_VERIFIED_MISSING_TIMESTAMP'/);
  assert.match(planner,/\['PGRST202','42883'\]/);
});
test('verified UX note is distinct from unverified fallback; no auto publish',()=>{
  assert.match(ui,/p\.registrationOrderStatus==='VERIFIED_CREATED_AT'/);
  assert.match(ui,/Thứ tự đăng ký sớm nhất chưa được xác minh/);
  assert.doesNotMatch(planner,/publish_schedule_generation\s*['"]/);
});
