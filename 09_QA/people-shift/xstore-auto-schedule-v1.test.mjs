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
const managerScheduling=read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js");

test("C03 recurring Manager board remains canonical staffing editor",()=>{
 assert.match(recurring,/workforce_recurring_staffing_requirements/);
 assert.match(ui,/list_workforce_recurring_staffing_requirements_v1/);
 assert.match(ui,/replace_workforce_recurring_staffing_requirements_v1/);
 assert.doesNotMatch(ui,/list_cross_store_staffing_requirements_v1|replace_cross_store_staffing_requirements_v1/);
 assert.doesNotMatch(ui,/data-xsa-f="work_date"|type="date"/);
 assert.match(ui,/Lưu nhu cầu hàng tuần/);
});

test("SCHED-UI-001 keeps the recurring weekly grid scan-only and edits one store/day in a dedicated panel",()=>{
 assert.match(ui,/xsa-cell-open/);
 assert.match(ui,/xsa-workspace\.has-editor/);
 assert.match(ui,/xsa-editor-panel/);
 assert.match(ui,/data-xsa-open-store/);
 assert.doesNotMatch(ui,/xsa-block-edit/);
 for(const label of ["Bắt đầu","Kết thúc","Số người","Xóa khung","+ Thêm khung","Hủy thay đổi","Lưu nhu cầu hàng tuần"])assert.ok(ui.includes(label),label);
 assert.match(ui,/start_time:''/);
 assert.match(ui,/end_time:''/);
 assert.match(ui,/@media\(max-width:760px\)[\s\S]*\.xsa-editor-panel\{position:fixed;left:0;right:0;bottom:0/);
});

test("SCHED-UI-002 separates weekly operation from recurring scheduling setup without adding another writer",()=>{
 assert.match(ui,/surface:'week'/);
 for(const label of ["Lập lịch tuần","Thiết lập xếp lịch","Ưu tiên cửa hàng","Nhu cầu nhân sự cố định hàng tuần"])assert.ok(ui.includes(label),label);
 assert.match(ui,/data-xsa-nav="week"/);
 assert.match(ui,/data-xsa-nav="setup"/);
 assert.match(ui,/data-xsa-go-setup="priority"/);
 assert.match(ui,/data-xsa-go-setup="requirements"/);
 assert.match(ui,/data-xsa-setup-section="priority"/);
 assert.match(ui,/data-xsa-setup-section="requirements"/);
 assert.match(ui,/Phần chỉnh sửa vẫn dùng màn hình Nhân viên hiện có/);
 assert.equal((ui.match(/replace_workforce_recurring_staffing_requirements_v1/g)||[]).length,1);
 assert.doesNotMatch(ui,/replace_.*priority|insert_.*priority/i);
});

test("SCHED-UI-003 exposes one guided next-action workflow and locks Auto Schedule until prerequisites are complete",()=>{
 for(const label of ["Chuẩn bị","Tạo lịch nháp","Chỉnh lịch","Kiểm tra","Duyệt & phát hành","Việc cần làm tiếp theo"])assert.ok(ui.includes(label),label);
 assert.match(ui,/id="xsaNextAction"/);
 assert.match(ui,/data-xsa-next-action/);
 assert.doesNotMatch(ui,/xsa-flow|xsa-step/);
 assert.match(ui,/if\(!priorityReady\)return setMessage\('Cần thiết lập ưu tiên cửa hàng cho tất cả nhân viên trước khi xếp lịch tự động\.'/);
 assert.match(ui,/if\(!complete\)return setMessage\('Cần cấu hình nhu cầu nhân sự cho đủ các cửa hàng trước khi xếp lịch tự động\.'/);
 assert.match(ui,/scheduleApi\(\)\?\.validate\?\.\(\)/);
 assert.match(ui,/scheduleApi\(\)\?\.review\?\.\(\)/);
 assert.match(ui,/scheduleApi\(\)\?\.publish\?\.\(\)/);
 assert.doesNotMatch(managerScheduling,/msu2-stage-rail/);
 assert.match(managerScheduling,/magasin:manager-scheduling-ui-state/);
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
 assert.match(engine,/cross-store-auto-schedule-v1\.js\?v=(?:20261001-xstore-c04|20261001-ui-unified1|20261002-sched-ui-001|20261002-sched-ui-002)/);
});

test("historical XSTORE-007 date-bound implementation remains evidence only",()=>{
 assert.match(historical,/authority_source='XSTORE_V1'/);
 assert.match(historical,/auto_generate_cross_store_schedule_v1/);
 assert.match(historical,/revoke execute on function public\.auto_generate_schedule_generation/);
});

console.log("XSTORE_AUTO_SCHEDULE_V1=PASS");