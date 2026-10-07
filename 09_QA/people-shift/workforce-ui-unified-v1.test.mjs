import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const timePicker=read("02_CORE/ui/app-time-picker-24h.js");
const tokens=read("02_CORE/ui/magasin-ui-v2-tokens.css");
const managerShellCss=read("02_CORE/ui/magasin-ui-v2-shell.css");
const employeeShellCss=read("02_CORE/ui/magasin-ui-v2-employee-shell.css");
const polish=read("02_CORE/ui/workforce-scheduling-polish-v1.css");
const shellJs=read("02_CORE/ui/magasin-ui-v2-shell.js");
const auto=read("05_MANAGER/Workforce/cross-store-auto-schedule-v1.js");
const master=read("05_MANAGER/Workforce/cross-store-master-v1.js");
const draft=read("05_MANAGER/Workforce/draft-publish-v1.js");
const official=read("05_MANAGER/Workforce/official-v1.js");
const schedulingUi=read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js");
const today=read("05_MANAGER/Workforce/ui-consolidation-v1.js");
const managerEngine=read("05_MANAGER/Workforce/engine-v1.js");
const managerRuntime=read("05_MANAGER/runtime/manager-runtime-v1.html");
const employeeRuntime=read("06_EMPLOYEE/runtime/employee-runtime-v1.html");
const employeeApp=read("06_EMPLOYEE/app/employee-v40.html");
const employeeScheduleCss=read("02_CORE/ui/magasin-ui-v2-employee-schedule.css");
const employeeSchedule=read("06_EMPLOYEE/schedule/engine-v1.js");

test("unified UI JavaScript sources parse",()=>{
 for(const [name,source] of [
  ["time picker",timePicker],
  ["shell",shellJs],
  ["staffing board",auto],
  ["cross-store master",master],
  ["draft editor",draft],
  ["official schedule",official],
  ["employee schedule",employeeSchedule],
  ["scheduling presentation",schedulingUi],
  ["manager today",today]
 ])assert.doesNotThrow(()=>new Function(source),name);
});

test("24h time picker preserves business field attributes and never defaults a new block to 05:00",()=>{
 assert.match(timePicker,/for\(const attr of \[\.\.\.input\.attributes\]\)/);
 assert.match(timePicker,/select\.setAttribute\(attr\.name,attr\.value\)/);
 assert.match(timePicker,/Chọn giờ/);
 assert.match(timePicker,/select\.value=validHm\(value\)\?value:''/);
 assert.doesNotMatch(timePicker,/select\.value=TIMES\[0\]/);
 assert.match(timePicker,/min-width:0/);
});

test("Manager recurring staffing editor is compact responsive and uses the shared design foundation",()=>{
 assert.match(auto,/font-family:var\(--m-font-sans/);
 assert.match(auto,/xsa-workspace\.has-editor/);
 assert.match(auto,/grid-template-columns:minmax\(0,1fr\) minmax\(360px,420px\)/);
 assert.match(auto,/\.xsa-editor-block \.magasin-time-select\{width:100%!important;min-width:0!important/);
 assert.match(auto,/table-layout:fixed/);
 assert.match(auto,/@media\(max-width:760px\)/);
 for(const copy of [
  "Lập lịch tuần",
  "Thiết lập xếp lịch",
  "Nhu cầu nhân sự cố định hàng tuần",
  "Ưu tiên cửa hàng",
  "Tạo lịch nháp tự động",
  "Lưu nhu cầu hàng tuần"
 ])assert.ok(auto.includes(copy),copy);
 for(const oldCopy of [
  "Nhu cầu nhân sự recurring",
  "Tạo DRAFT tự động",
  "1. Store Priority",
  "3. Auto Schedule",
  "Robot đã project"
 ])assert.ok(!auto.includes(oldCopy),oldCopy);
});

test("Manager and Employee desktop content use the remaining viewport instead of a forced side column",()=>{
 assert.match(managerShellCss,/width:\s*auto !important;[\s\S]*max-width:\s*none !important;[\s\S]*margin-left:\s*var\(--m-shell-sidebar-width\)/);
 assert.match(managerShellCss,/\.content \{[\s\S]*max-width:\s*none !important;[\s\S]*margin:\s*0 !important/);
 assert.match(employeeShellCss,/@media \(min-width: 1024px\)/);
 assert.match(employeeShellCss,/\.main \{[\s\S]*width:\s*auto !important;[\s\S]*max-width:\s*none/);
 assert.match(employeeShellCss,/\.page-wrap \{[\s\S]*width:\s*min\(100%, 1440px\);[\s\S]*margin-inline:\s*auto/);
 assert.match(polish,/max-width:none;[\s\S]*margin:0;[\s\S]*width:auto/);
});

test("one typography and neutral palette foundation is used across Workforce shells",()=>{
 assert.match(tokens,/--m-font-sans:\s*"Segoe UI", Roboto, "Helvetica Neue", Arial/);
 assert.match(tokens,/--m-color-neutral-950:\s*#101828/);
 assert.match(tokens,/--m-color-neutral-500:\s*#667085/);
 assert.match(tokens,/--m-color-brand-600:\s*#0F8F9C/i);
 assert.match(employeeApp,/--ink:#101828/);
 assert.match(employeeApp,/--muted:#667085/);
 assert.match(employeeApp,/--line:#eaecf0/i);
 assert.match(employeeApp,/--font:"Segoe UI",Roboto,"Helvetica Neue",Arial/);
});

test("primary user guidance is Vietnamese while internal status/RPC identifiers remain implementation details",()=>{
 for(const copy of [
  "Thời gian có thể làm → Lịch nháp → Kiểm tra → Duyệt → Phát hành",
  "Việc cần xử lý",
  "Công việc / Quy trình",
  "+ Thêm nhân viên",
  "Lịch làm chính thức"
 ])assert.ok(shellJs.includes(copy)||today.includes(copy)||draft.includes(copy),copy);
 assert.doesNotMatch(today,/Action Center|Task \/ SOP canonical|Không có route canonical/);
 assert.doesNotMatch(draft,/Employee Availability|Không có availability|Không tìm thấy availability|canonical work_schedules/);
 assert.doesNotMatch(master,/Robot chỉ tạo|Store Priority Profile|Chưa có assignment/);
 assert.doesNotMatch(employeeApp,/>NOT CONNECTED<|Lối tắt Today|phê duyệt canonical/);
 assert.doesNotMatch(draft,/qua server|trên server|revalidate|Không hiển thị ID kỹ thuật/);
 assert.match(draft,/Không khởi tạo được bảng xếp lịch\. Vui lòng tải lại và thử lại\./);
 assert.doesNotMatch(draft,/Không khởi tạo được bảng xếp lịch: ['"]?\s*\+/);
 assert.match(master,/\[XSTORE_MASTER_LOAD\]/);
 assert.match(master,/Không tải được tổng lịch 4 cửa hàng\. Vui lòng tải lại và thử lại\./);
 assert.doesNotMatch(master,/Không tải được tổng lịch 4 cửa hàng\. ['"]?\s*\+/);
 assert.match(official,/\[MANAGER_OFFICIAL_LOAD\]/);
 assert.match(official,/Không tải được lịch làm chính thức\. Vui lòng tải lại và thử lại\./);
 assert.doesNotMatch(official,/state\.lastError=e\?\.message|state\.lastError=e\.message/);
 assert.match(employeeSchedule,/Khi quản lý phát hành lịch, ca chính thức của bạn sẽ xuất hiện tại đây\./);
 assert.doesNotMatch(employeeSchedule,/Khi quản lý publish lịch/);
});


test("shift colors follow one visual rule across Manager and Employee scheduling",()=>{
 for(const token of [
  "--m-shift-morning-bg: #FFF4CC",
  "--m-shift-afternoon-bg: #FDE7E7",
  "--m-shift-evening-bg: #E8F3FF"
 ])assert.ok(tokens.includes(token),token);
 for(const src of [auto,master,draft])assert.match(src,/MAGASIN_CORE\?\.time\?\.shiftKind\?\.\(v\)\|\|'neutral'/);
 assert.match(auto,/xsa-band-morning/);
 assert.match(auto,/Ca sáng · 05:00–12:00/);
 assert.match(auto,/Ca chiều · 12:00–17:00/);
 assert.match(auto,/Ca tối · 17:00–22:00/);
 assert.match(master,/xsm-band-morning/);
 assert.match(draft,/msd-band-morning/);
 assert.match(employeeScheduleCss,/var\(--m-shift-morning-bg\)/);
 assert.match(employeeScheduleCss,/var\(--m-shift-afternoon-bg\)/);
 assert.match(employeeScheduleCss,/var\(--m-shift-evening-bg\)/);
 assert.ok(employeeApp.includes("magasin-ui-v2-employee-schedule.css?v=20261001-ui-unified1"));
});

test("unified asset cache chain reaches both Manager and Employee entry points",()=>{
 for(const token of [
  "review-v1.js?v=20261005-xstore-019",
  "draft-publish-v1.js?v=20261005-xstore-019",
  "cross-store-master-v1.js?v=20261005-xstore-019",
  "cross-store-auto-schedule-v1.js?v=20261006-xstore-019g-r1",
  "manager-scheduling-ui2-v1.js?v=20261005-xstore-019",
  "official-v1.js?v=20261001-ui-unified1",
  "ui-consolidation-v1.js?v=20261005-xstore-019"
 ])assert.ok(managerEngine.includes(token),token);
 for(const token of [
  "manager-shell-v1.html?v=20261001-ui-unified1",
  "magasin-ui-v2-tokens.css?v=20261001-ui-unified1",
  "magasin-ui-v2-shell.css?v=20261001-ui-unified1",
  "magasin-ui-v2-shell.js?v=20261001-ui-unified1",
  "app-time-picker-24h.js?v=20261001-ui-unified1",
  "engine-v1.js?v=20261007-xstore-019g-visual2"
 ])assert.ok(managerRuntime.includes(token),token);
 assert.ok(employeeRuntime.includes("employee-v40.html?ui=20261006-xstore-019h&runtime=engine"));
 assert.ok(employeeRuntime.includes("shared-core-v1.js?v=20261002-sched-ui-005"));
 assert.ok(employeeRuntime.includes("schedule/engine-v1.js?v=20261002-sched-ui-006"));
 assert.ok(employeeRuntime.includes("dashboard/engine-v1.js?v=20261003-sched-ui-007"));
 assert.ok(employeeApp.includes("magasin-ui-v2-tokens.css?v=20261001-ui-unified1"));
 assert.ok(employeeApp.includes("magasin-ui-v2-employee-shell.css?v=20261001-ui-unified1"));
});

console.log("WORKFORCE_UI_UNIFIED_V1=PASS");