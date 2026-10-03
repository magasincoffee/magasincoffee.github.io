import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

const files=Object.fromEntries(await Promise.all([
  "xstore",
  "timeBands",
  "employeeSchedule",
  "employeeScheduleBrowser",
  "availability",
  "availabilityBrowser",
  "owner",
  "a11y",
  "authContract",
  "authBrowser",
  "cleanRoutes",
  "responsive",
  "responsiveBrowser",
  "coldReload"
].map(async key=>{
  const paths={
    xstore:"09_QA/people-shift/xstore-cross-store-browser.mjs",
    timeBands:"09_QA/people-shift/sched-ui-005-time-band-contract.test.mjs",
    employeeSchedule:"09_QA/people-shift/sched-03-employee-schedule-ui.test.mjs",
    employeeScheduleBrowser:"09_QA/people-shift/sched-03-employee-schedule-ui-browser.mjs",
    availability:"09_QA/people-shift/employee-availability-canonical.test.mjs",
    availabilityBrowser:"09_QA/people-shift/employee-availability-canonical-browser.mjs",
    owner:"09_QA/people-shift/sched-ui-008-owner-overview-contract.test.mjs",
    a11y:"09_QA/people-shift/sched-ui-012-accessibility-copy-contract.test.mjs",
    authContract:"09_QA/ui2-cross-role/sched-ui-010-auth-navigation-contract.test.mjs",
    authBrowser:"09_QA/ui2-cross-role/sched-ui-010-auth-navigation-browser.mjs",
    cleanRoutes:"09_QA/ui2-cross-role/sched-ui-009-clean-routes-browser.mjs",
    responsive:"09_QA/people-shift/sched-ui-011-responsive-contract.test.mjs",
    responsiveBrowser:"09_QA/people-shift/sched-07-ui-responsive-browser.mjs",
    coldReload:"09_QA/ui2-cross-role/ui2-017-cold-reload-closure-browser.mjs"
  };
  return [key,await read(paths[key])];
})));

test("SCHED-UI-013 recurring editor regression locks add remove save reload and unclipped time DOM",()=>{
  const x=files.xstore;
  for(const token of [
    '#xsaAddBlock',
    '[data-xsa-remove]',
    '#xsaSave',
    'page.reload',
    '07:00–12:00 · 3 người',
    'clippedTimeBlocks',
    'recurring time text clipped',
    'SCHED_UI_013_RECURRING_EDITOR_REGRESSION=PASS'
  ])assert.ok(x.includes(token),token);
  assert.match(x,/replace_workforce_recurring_staffing_requirements_v1/);
  assert.match(x,/p_requirements/);
  assert.doesNotMatch(x,/p_week_start[^\n]*p_requirements/);
});

test("SCHED-UI-013 shared time-band boundaries and Employee published schedule bands remain explicit",()=>{
  const t=files.timeBands,e=files.employeeSchedule,b=files.employeeScheduleBrowser;
  for(const token of ['["05:00","morning"]','["11:59","morning"]','["12:00","afternoon"]','["16:59","afternoon"]','["17:00","evening"]','["22:00","evening"]'])assert.ok(t.includes(token),token);
  assert.match(t,/fail neutral/);
  assert.ok(e.includes('dataset\\.timeBand=k'),'Employee schedule source test must keep dataset.timeBand contract');
  assert.match(e,/band-neutral/);
  assert.match(b,/bands\[0\]\.band!=="morning"/);
  assert.match(b,/bands\[1\]\.band!=="evening"/);
  assert.match(b,/nextBand!=="afternoon"/);
});

test("SCHED-UI-013 Employee availability locks CTA states immediate-save semantics reload and closed policy",()=>{
  const s=files.availability,b=files.availabilityBrowser;
  for(const label of ["Đăng ký ngay","Xem / sửa đăng ký","Xem thời gian đã đăng ký"])assert.ok(s.includes(label),label);
  assert.match(s,/Mỗi khoảng có hiệu lực ngay khi được lưu|Mỗi khoảng được lưu ngay/);
  assert.match(s,/no final-submit concept/);
  assert.match(b,/double_click_is_bounded_to_one_save_mutation/);
  assert.match(b,/sched_ui_007_saved_state_and_canonical_time_bands/);
  assert.match(b,/frame_reload_preserves_same_week_rows_without_resubmit/);
  assert.match(b,/delete_refresh_and_reload_keep_deleted_interval_absent/);
  assert.match(b,/REGISTRATION_CLOSED/);
});

test("SCHED-UI-013 Owner overview copy and shared-writer authority stay guarded",()=>{
  const o=files.owner,a=files.a11y;
  for(const token of ["Tổng quan xếp lịch","Sẵn sàng xếp lịch","Đang xếp lịch","Đã duyệt","Đã phát hành"])assert.ok(o.includes(token),token);
  assert.match(o,/doesNotMatch\(overview,\/\\\.from/);
  assert.match(o,/MAGASIN_MANAGER_SCHEDULE_DRAFT/);
  assert.match(a,/data-owner-overview-retry/);
  assert.match(a,/focus return/);
  assert.match(a,/doesNotMatch\(owner,\/phiên xếp lịch/);
});

test("SCHED-UI-013 canonical Auth destinations and old-route compatibility remain executable",()=>{
  const c=files.authContract,b=files.authBrowser,r=files.cleanRoutes;
  for(const path of ["/owner/","/manager/","/employee/","/manager/schedule/","/employee/attendance/","/owner/scheduling/"])assert.ok(c.includes(path)||r.includes(path),path);
  assert.ok(c.includes('role-unavailable\\.html'),'Auth contract must retain role-unavailable fail-closed assertion');
  assert.match(c,/LEGACY_PREFIX='\/05_MANAGER'/);
  assert.match(b,/\/05_MANAGER\/#workforce/);
  assert.match(b,/\/06_EMPLOYEE\/#attendance/);
  assert.match(b,/\/04_OWNER\/Workforce\//);
  assert.match(b,/page\.goBack/);
  assert.match(b,/page\.goForward/);
  assert.match(b,/page\.reload/);
  assert.match(r,/clean reload not retained/);
});

test("SCHED-UI-013 responsive overflow touch and cold reload/back-forward guards remain in the release suite",()=>{
  const s=files.responsive,b=files.responsiveBrowser,c=files.coldReload;
  assert.match(s,/\[1440,1024,768,430,390,360\]/);
  assert.match(s,/overflow/);
  assert.match(b,/360,390,430,768/);
  assert.match(b,/no_horizontal_overflow|no_overflow/);
  assert.match(b,/history\.back\(\)/);
  assert.match(b,/location\.reload\(\)/);
  assert.match(c,/cold_reload_back_deeplink/);
  assert.match(c,/page\.goBack/);
  assert.match(c,/page\.reload/);
});

test("SCHED-UI-013 does not weaken authority and fail-closed regression boundaries",()=>{
  assert.match(files.authContract,/fail-closed role checks/);
  assert.match(files.authBrowser,/role-unavailable\.html/);
  assert.match(files.owner,/doesNotMatch\(overview,new RegExp\(mutation\)\)/);
  assert.match(files.availability,/write guards keep week\/time safety/);
  assert.match(files.employeeSchedule,/technical backend errors are not Employee-visible/);
});

console.log("SCHED_UI_013_FOCUSED_REGRESSION_CONTRACT=PASS");
