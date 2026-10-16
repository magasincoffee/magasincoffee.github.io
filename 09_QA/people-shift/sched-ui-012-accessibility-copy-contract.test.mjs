import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

const recurring=await read("05_MANAGER/Workforce/cross-store-auto-schedule-v1.js");
const draft=await read("05_MANAGER/Workforce/draft-publish-v1.js");
const managerUi=await read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js");
const owner=await read("04_OWNER/Workforce/owner-scheduling-overview-v1.js");
const employeeSchedule=await read("06_EMPLOYEE/schedule/engine-v1.js");
const employeeAvailability=await read("06_EMPLOYEE/availability/engine-v1.js");

test("SCHED-UI-012 recurring staffing is keyboard reachable and announces states",()=>{
  assert.match(recurring,/button:focus-visible[\s\S]*input:focus-visible[\s\S]*select:focus-visible/);
  assert.match(recurring,/role="tab"[\s\S]*aria-controls="xsaSurfaceWeek"/);
  assert.match(recurring,/ArrowLeft[\s\S]*ArrowRight[\s\S]*Home[\s\S]*End/);
  assert.match(recurring,/role="tabpanel"/);
  assert.match(recurring,/role="region" aria-labelledby="xsaEditorTitle" tabindex="-1"/);
  assert.match(recurring,/role="'\+\(liveType==='error'\?'alert':'status'\)/);
  assert.match(recurring,/aria-live="'\+\(liveType==='error'\?'assertive':'polite'\)/);
});

test("SCHED-UI-012 recurring staffing has explicit empty destructive and color-independent copy",()=>{
  assert.match(recurring,/Chưa cấu hình/);
  assert.match(recurring,/Xóa khung giờ này/);
  assert.match(recurring,/Đã bỏ khung giờ khỏi thay đổi đang chỉnh/);
  for(const label of ["Ca sáng · 05:00–12:00","Ca chiều · 12:00–17:00","Ca tối · 17:00–22:00"])assert.ok(recurring.includes(label),label);
  assert.doesNotMatch(recurring,/phiên xếp lịch|ĐANG ĐỒNG BỘ/);
});

test("SCHED-UI-012 Manager draft exposes disabled reasons live states and clear actions",()=>{
  assert.match(draft,/id="msdActionHelp"/);
  assert.match(draft,/aria-describedby="msdActionHelp"/);
  assert.match(draft,/aria-label="Tuần trước"/);
  assert.match(draft,/aria-label="Tuần kế tiếp"/);
  assert.match(draft,/Xóa ca/);
  assert.match(draft,/role="status" aria-live="polite"/);
  assert.match(draft,/type==='error'\?'alert':'status'/);
  assert.match(managerUi,/role','status'/);
  assert.match(managerUi,/aria-live','polite'/);
  assert.match(managerUi,/input:focus-visible/);
  assert.doesNotMatch(draft,/phiên xếp lịch/);
  assert.doesNotMatch(managerUi,/phiên xếp lịch|ĐANG ĐỒNG BỘ/);
});

test("SCHED-UI-012 Owner overview has loading empty error recovery and focus return",()=>{
  assert.match(owner,/role="status">Đang tải trạng thái xếp lịch/);
  assert.match(owner,/class="oso-empty" role="status"/);
  assert.match(owner,/data-owner-overview-retry>Thử lại/);
  assert.match(owner,/role="alert"/);
  assert.match(owner,/detail\.focus\(\{preventScroll:true\}\)/);
  assert.match(owner,/restoreId[\s\S]*data-owner-store-open[\s\S]*focus\(\)/);
  assert.doesNotMatch(owner,/phiên xếp lịch/);
});

test("SCHED-UI-012 Employee scheduling explains temporary disabled actions and preserves explicit states",()=>{
  assert.match(employeeSchedule,/Đang kiểm tra ca hiện tại trước khi mở thao tác/);
  assert.match(employeeSchedule,/aria-disabled','true'/);
  assert.match(employeeSchedule,/Đang tải lịch, vui lòng chờ/);
  assert.match(employeeSchedule,/Tuần này chưa có ca được phát hành/);
  assert.match(employeeSchedule,/Không tải được lịch làm/);
  assert.match(employeeAvailability,/Đang tải thời gian có thể làm tuần sau/);
  assert.match(employeeAvailability,/Đã lưu khoảng thời gian có thể làm/);
  assert.match(employeeAvailability,/Xóa khoảng thời gian đã đăng ký này\?/);
  assert.match(employeeAvailability,/Không thể xóa thời gian có thể làm/);
});

test("SCHED-UI-012 changed scheduling surfaces avoid prohibited normal-user jargon",()=>{
  const surfaces=[recurring,draft,managerUi,owner,employeeSchedule,employeeAvailability];
  for(const source of surfaces){
    assert.doesNotMatch(source,/\bcanonical\b|\bRPC\b|\bwriter\b|\bDML\b|\bserver\b/);
  }
});

console.log("SCHED_UI_012_ACCESSIBILITY_COPY_CONTRACT=PASS");
