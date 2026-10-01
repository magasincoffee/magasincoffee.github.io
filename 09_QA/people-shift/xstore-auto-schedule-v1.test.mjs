import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const sql=read("07_DATABASE/migrations/20260929063000_xstore_007_009_staffing_auto_draft_v1.sql");
const recurringSql=read("07_DATABASE/migrations/20261001172500_xstore_c02_recurring_staffing_authority_v1.sql");
const ui=read("05_MANAGER/Workforce/cross-store-auto-schedule-v1.js");
const master=read("05_MANAGER/Workforce/cross-store-master-v1.js");
const engine=read("05_MANAGER/Workforce/engine-v1.js");

test("XSTORE-007 historical date-bound staffing implementation remains recorded but is superseded",()=>{
  assert.match(sql,/authority_source='XSTORE_V1'/);
  assert.match(sql,/replace_cross_store_staffing_requirements_v1/);
  assert.match(sql,/list_cross_store_staffing_requirements_v1/);
  assert.match(sql,/v_role not in \('OWNER','STORE_MANAGER'\)/);
  assert.match(sql,/STAFFING_REQUIREMENT_INCOMPLETE/);
});

test("XSTORE-C03 Manager staffing UX uses only C02 recurring staffing RPCs",()=>{
  assert.match(recurringSql,/workforce_recurring_staffing_requirements/);
  assert.match(ui,/list_workforce_recurring_staffing_requirements_v1/);
  assert.match(ui,/replace_workforce_recurring_staffing_requirements_v1/);
  assert.doesNotMatch(ui,/list_cross_store_staffing_requirements_v1/);
  assert.doesNotMatch(ui,/replace_cross_store_staffing_requirements_v1/);
  assert.doesNotMatch(ui,/data-xsa-f="work_date"|type="date"|p_week_start:state\.week/);
  assert.match(ui,/NHU CẦU NHÂN SỰ HÀNG TUẦN/);
  assert.match(ui,/Lưu cấu hình tuần mẫu/);
  assert.match(ui,/Tuần mẫu cố định/);
  assert.match(ui,/day_of_week:Number\(r\.day_of_week\)/);
  assert.match(ui,/T2.*T3.*T4.*T5.*T6.*T7.*CN/s);
  assert.match(engine,/cross-store-auto-schedule-v1\.js\?v=20261001-xstore-c03/);
});

test("XSTORE-C03 fails closed on Auto Schedule until C04 Robot projection cutover",()=>{
  assert.match(ui,/id="xsaAuto" disabled/);
  assert.match(ui,/Tạo DRAFT tự động · Chờ C04/);
  assert.match(ui,/Đang tạm khóa đến XSTORE-C04/);
  assert.doesNotMatch(ui,/client\(\)\.rpc\('auto_generate_cross_store_schedule_v1'/);
  assert.doesNotMatch(ui,/publish_schedule_generation|review_schedule_generation/);
});

test("XSTORE-008 historical global Robot remains DRAFT-only pending C04 cutover",()=>{
  assert.match(sql,/auto_generate_cross_store_schedule_v1/);
  assert.match(sql,/join public\.employee_store_priorities esp/);
  assert.match(sql,/order by\s+esp\.priority asc/i);
  assert.match(sql,/employee_availability/);
  assert.match(sql,/CROSS_STORE|workforce_cross_store:/);
  assert.match(sql,/'DRAFT','AUTO_XSTORE_GLOBAL_V1'/);
  assert.match(sql,/'published',false/);
  assert.doesNotMatch(sql,/perform public\.publish_schedule_generation|select public\.publish_schedule_generation/);
  assert.match(sql,/revoke execute on function public\.auto_generate_schedule_generation/);
});

test("XSTORE-009 preserves Manager review/edit/publish authority around C03",()=>{
  assert.match(ui,/Thiết lập ưu tiên nhân viên/);
  assert.match(ui,/Tạo DRAFT tự động/);
  assert.match(master,/Robot chỉ tạo bản nháp; Quản lý vẫn kiểm tra, chỉnh sửa và phát hành/);
  assert.match(engine,/cross-store-auto-schedule-v1\.js/);
  assert.doesNotMatch(ui,/publish_schedule_generation/);
  assert.doesNotMatch(ui,/review_schedule_generation/);
});

console.log("XSTORE_AUTO_SCHEDULE_V1=PASS");