import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const sql=read("07_DATABASE/migrations/20260929063000_xstore_007_009_staffing_auto_draft_v1.sql");
const ui=read("05_MANAGER/Workforce/cross-store-auto-schedule-v1.js");
const master=read("05_MANAGER/Workforce/cross-store-master-v1.js");
const engine=read("05_MANAGER/Workforce/engine-v1.js");

test("XSTORE-007 staffing requirements are Manager-owned explicit weekly truth",()=>{
  assert.match(sql,/authority_source='XSTORE_V1'/);
  assert.match(sql,/replace_cross_store_staffing_requirements_v1/);
  assert.match(sql,/list_cross_store_staffing_requirements_v1/);
  assert.match(sql,/v_role not in \('OWNER','STORE_MANAGER'\)/);
  assert.match(sql,/STAFFING_REQUIREMENT_INCOMPLETE/);
  assert.match(ui,/Hệ thống không tự đoán số người/);
  assert.match(ui,/Lưu nhu cầu tuần/);
});

test("XSTORE-008 global Robot respects Store Priority and creates DRAFT only",()=>{
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

test("XSTORE-009 preserves Manager review/edit/publish authority",()=>{
  assert.match(ui,/Robot dùng Availability \+ Store Priority để tạo DRAFT/);
  assert.match(ui,/Quản lý hãy kiểm tra\/chỉnh sửa trước khi duyệt và phát hành/);
  assert.match(master,/Robot chỉ tạo bản nháp; Quản lý vẫn kiểm tra, chỉnh sửa và phát hành/);
  assert.match(engine,/cross-store-auto-schedule-v1\.js/);
  assert.doesNotMatch(ui,/publish_schedule_generation/);
  assert.doesNotMatch(ui,/review_schedule_generation/);
});

console.log("XSTORE_AUTO_SCHEDULE_V1=PASS");
