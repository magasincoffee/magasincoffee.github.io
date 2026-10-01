import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const historical=read("07_DATABASE/migrations/20260929063000_xstore_007_009_staffing_auto_draft_v1.sql");
const recurring=read("07_DATABASE/migrations/20261001172500_xstore_c02_recurring_staffing_authority_v1.sql");
const cutover=read("07_DATABASE/migrations/20261001175825_xstore_c04_recurring_auto_projection_v1.sql");
const ui=read("05_MANAGER/Workforce/cross-store-auto-schedule-v1.js");
const master=read("05_MANAGER/Workforce/cross-store-master-v1.js");
const engine=read("05_MANAGER/Workforce/engine-v1.js");

test("C03 recurring Manager board remains canonical staffing editor",()=>{
 assert.match(recurring,/workforce_recurring_staffing_requirements/);
 assert.match(ui,/list_workforce_recurring_staffing_requirements_v1/);
 assert.match(ui,/replace_workforce_recurring_staffing_requirements_v1/);
 assert.doesNotMatch(ui,/list_cross_store_staffing_requirements_v1|replace_cross_store_staffing_requirements_v1/);
 assert.doesNotMatch(ui,/data-xsa-f="work_date"|type="date"/);
 assert.match(ui,/Lưu nhu cầu hàng tuần/);
});

test("C04 Robot projects recurring weekday blocks directly into target week",()=>{
 assert.match(cutover,/from public\.workforce_recurring_staffing_requirements req/);
 assert.match(cutover,/p_week_start \+ \(req\.day_of_week::integer - 1\)/);
 assert.doesNotMatch(cutover,/from public\.staffing_requirements/);
 assert.doesNotMatch(cutover,/insert into public\.staffing_requirements/);
 assert.match(cutover,/staffing_authority','RECURRING_WEEKLY_V1'/);
 assert.match(cutover,/'DRAFT','AUTO_XSTORE_GLOBAL_V1'|'DRAFT','AUTO_XSTORE_GLOBAL_RECURRING_V1'/);
 assert.match(cutover,/'published',false/);
});

test("C04 revokes browser authority for superseded date-bound staffing RPCs",()=>{
 assert.match(cutover,/revoke execute on function public\.list_cross_store_staffing_requirements_v1\(date\)[\s\S]*from public,anon,authenticated/);
 assert.match(cutover,/revoke execute on function public\.replace_cross_store_staffing_requirements_v1\(date,jsonb\)[\s\S]*from public,anon,authenticated/);
 assert.match(cutover,/grant execute on function public\.auto_generate_cross_store_schedule_v1\(date,boolean,text\)[\s\S]*to authenticated/);
});

test("C04 Manager UI calls recurring Robot and still never publishes",()=>{
 assert.match(ui,/auto_generate_cross_store_schedule_v1/);
 assert.match(ui,/XSTORE_GLOBAL_RECURRING_V1/);
 assert.match(ui,/Tạo lịch nháp tự động/);
 assert.doesNotMatch(ui,/Chờ C04|Đang tạm khóa đến XSTORE-C04/);
 assert.doesNotMatch(ui,/publish_schedule_generation|review_schedule_generation/);
 assert.match(master,/Hệ thống chỉ tạo lịch nháp; Quản lý vẫn kiểm tra, chỉnh sửa và phát hành/);
 assert.match(engine,/cross-store-auto-schedule-v1\.js\?v=20261001-xstore-c04/);
});

test("historical XSTORE-007 date-bound implementation remains evidence only",()=>{
 assert.match(historical,/authority_source='XSTORE_V1'/);
 assert.match(historical,/auto_generate_cross_store_schedule_v1/);
 assert.match(historical,/revoke execute on function public\.auto_generate_schedule_generation/);
});

console.log("XSTORE_AUTO_SCHEDULE_V1=PASS");