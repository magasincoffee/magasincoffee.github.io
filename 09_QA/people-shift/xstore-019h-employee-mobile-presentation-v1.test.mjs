import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const shell=read("02_CORE/ui/magasin-ui-v2-employee-shell.js");
const shellCss=read("02_CORE/ui/magasin-ui-v2-employee-shell.css");
const app=read("06_EMPLOYEE/app/employee-v40.html");
const presentation=read("06_EMPLOYEE/employee-presentation-v4.js");
const presentationCss=read("02_CORE/ui/magasin-ui-v2-employee-presentation-v4.css");
const profile=read("06_EMPLOYEE/profile/engine-v1.js");
const runtime=read("06_EMPLOYEE/runtime/employee-runtime-v1.html");
const index=read("06_EMPLOYEE/index.html");
const secondaryBrowser=read("09_QA/people-shift/ui2-008-employee-secondary-browser.mjs");
const phoneAcceptance=read("09_QA/people-shift/ui2-010-employee-phone-acceptance.mjs");

test("XSTORE-019H primary Employee navigation is exactly Owner-locked five items",()=>{
 const block=shell.match(/const PRIMARY = Object\.freeze\(\[[\s\S]*?\n  \]\);/)?.[0]||"";
 const expected=[["dashboard","Trang chủ"],["availability","Đăng ký lịch làm"],["schedule","Lịch của tôi"],["attendance","Chấm công"],["profile","Hồ sơ & thông tin"]];
 for(const [key,label] of expected){assert.ok(block.includes("'"+key+"'"),key);assert.ok(block.includes("'"+label+"'"),label)}
 assert.equal((block.match(/^\s*\['/gm)||[]).length,5);
 assert.doesNotMatch(block,/payroll|swap/);
 assert.match(shell,/key === 'availability'/);
 assert.match(shell,/MAGASIN_EMPLOYEE\?\.availability\?\.open/);
 assert.match(shell,/key === 'schedule'[\s\S]*availability\?\.close/);
});

test("XSTORE-019H presentation remains writer-free and exact time editing stays canonical",()=>{
 assert.doesNotThrow(()=>new Function(presentation));
 assert.doesNotMatch(presentation,/\.rpc\(|\.from\(|createClient\(|\.insert\(|\.update\(|\.delete\(/);
 for(const token of ["05:00","12:00","17:00","22:00","quickRegStart","quickRegEnd","Bạn vẫn có thể chỉnh giờ chính xác"])assert.ok(presentation.includes(token),token);
 assert.match(app,/employee-presentation-v4\.js\?v=20261007-xstore-019h-visual3/);
 assert.match(app,/magasin-ui-v2-employee-presentation-v4\.css\?v=20261007-xstore-019h-visual3/);
});

test("XSTORE-019H visually separates Availability, published schedule and attendance paths",()=>{
 assert.match(presentation,/data-x19h-source','availability'/);
 assert.match(presentation,/data-x19h-source','published'/);
 assert.match(presentation,/data-x19h-source-label','Lịch làm chính thức đã phát hành'/);
 assert.match(presentation,/data-x19h-source-label','Thời gian có thể làm/);
 assert.match(presentation,/aria-label','Lịch làm chính thức đã phát hành'/);
 assert.match(presentation,/Theo lịch đã phát hành/);
 assert.match(presentation,/Ngoài lịch phát hành/);
 assert.match(presentation,/quản lý xác nhận/);
 assert.match(shellCss,/grid-template-columns:\s*repeat\(5,/);for(const marker of ['owner-mockup-v3','x19h-home-registration','x19h-day-add','x19hRegistrationView','x19hPrimaryView','syncDashboardBand','compactScheduleDays'])assert.ok(presentation.includes(marker),marker);for(const marker of ['XSTORE-019H VISUAL3 OWNER-MOCKUP FIDELITY','data-x19h-primary-view="dashboard"','grid-template-columns:54px minmax(0,1fr)','employee-today-shortcuts{display:none!important','x19h-attendance-mode p{display:none!important','employee-v2-primary-nav__item[data-active="true"]'])assert.ok(presentationCss.includes(marker),marker);
});

test("XSTORE-019H keeps payroll reachable from visible Profile without adding a sixth primary tab",()=>{
 assert.match(presentation,/data-x19h-profile-actions/);
 assert.match(presentation,/data-x19h-route="payroll"/);
 assert.match(presentation,/MAGASIN_EMPLOYEE_UI_V2_SHELL/);
 assert.match(presentation,/Xem thông tin lương/);
});

test("XSTORE-019H employment type is management-owned read-only presentation",()=>{
 assert.match(app,/id="profileEmploymentType" readonly/);
 assert.match(app,/do quản lý thiết lập; nhân viên chỉ xem/);
 assert.match(profile,/FULL_TIME:'Full-time'/);
 assert.match(profile,/PART_TIME:'Part-time'/);
 assert.match(profile,/profileEmploymentType/);
});

test("XSTORE-019H compact day labels are observer-idempotent",()=>{assert.match(presentation,/if\(d\.textContent!==label\)d\.textContent=label/);});
test("XSTORE-019H cache chain reaches exact Employee presentation candidate",()=>{
 assert.match(runtime,/employee-v40\.html\?ui=20261009-x19j-paint1&runtime=engine/);
 assert.match(runtime,/profile\/engine-v1\.js\?v=20261006-xstore-019h/);
 assert.match(index,/employee-runtime-v1\.html\?v=20261009-x19j-paint1/);
 assert.match(app,/employee-shell\.js\?v=20261007-xstore-019h-visual3/);
});
test("XSTORE-019H regression flow returns to published schedule before swap/give actions",()=>{
 const first=secondaryBrowser.indexOf('ui2_008_availability_"+width+"_existing_values_and_context');
 const firstSchedule=secondaryBrowser.indexOf('data-employee-primary-view="schedule"',first);
 const firstSwap=secondaryBrowser.indexOf('data-schedule-action="swap"',first);
 assert.ok(first>=0&&firstSchedule>first&&firstSwap>firstSchedule,"responsive flow must leave Availability before swap");
 const matrix=secondaryBrowser.indexOf('ui2_008_swap_give_state_matrix_delegation_error_retry_submit');
 const matrixSchedule=secondaryBrowser.indexOf('data-employee-primary-view="schedule"',matrix);
 const matrixSwap=secondaryBrowser.indexOf('data-schedule-action="swap"',matrix);
 assert.ok(matrix>=0&&matrixSchedule>matrix&&matrixSwap>matrixSchedule,"390px state matrix must leave Availability before swap/give");
});

test("XSTORE-019H phone acceptance uses canonical primary navigation for Availability",()=>{
 assert.match(phoneAcceptance,/data-employee-primary-view="availability"/);
 assert.match(phoneAcceptance,/data-employee-primary-view="schedule"/);
 assert.doesNotMatch(phoneAcceptance,/employee-schedule-secondary \[data-schedule-availability\]/);
});

console.log("XSTORE_019H_EMPLOYEE_MOBILE_PRESENTATION_STATIC=PASS");
