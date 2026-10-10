import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const draft=fs.readFileSync("05_MANAGER/Workforce/draft-publish-v1.js","utf8");

test("XSTORE-019C removes the persistent employee pool and renders an on-demand overlay drawer",()=>{
  assert.match(draft,/candidateDrawerOpen:false/);
  assert.match(draft,/function candidateDrawerHtml\(\)[\s\S]*if\(!state\.candidateDrawerOpen\)return ''/);
  assert.match(draft,/class="msd-people-overlay" data-msd-candidate-overlay/);
  assert.match(draft,/\.msd-people-overlay\{[^}]*position:fixed[^}]*inset:0[^}]*justify-content:flex-end/);
  assert.match(draft,/const people=candidateDrawerHtml\(\)/);
  assert.doesNotMatch(draft,/thao tác thêm thủ công vẫn giữ ở vùng phụ này cho đến XSTORE-019C/);
});

test("XSTORE-019C opens candidate UI only from explicit add or shortage actions",()=>{
  assert.match(draft,/id="msdOpenCandidateDrawer"/);
  assert.match(draft,/msdOpenCandidateDrawer'\)\?\.addEventListener\('click',\(\)=>openCandidateDrawer\(null\)\)/);
  assert.match(draft,/function openSupplement\(index,sourceWrap=null\)[\s\S]*openCandidateDrawer\(target,sourceWrap\)/);
  assert.match(draft,/openSupplement\(b\.dataset\.msdSupplement,b\.closest\('\.msd-board-wrap'\)\)/);
  assert.match(draft,/data-msd-supplement/);
  assert.match(draft,/data-msd-candidate-close/);
});

test("XSTORE-019C keeps exact target ranking, manual override audit and hard-conflict disabling",()=>{
  assert.match(draft,/targetDate=target\?String\(target\.work_date\)/);
  assert.match(draft,/targetStart=target\?hm\(target\.shortage_start\)/);
  assert.match(draft,/targetEnd=target\?hm\(target\.shortage_end\)/);
  assert.match(draft,/Number\(Boolean\(b\.targetAvailable\)\)-Number\(Boolean\(a\.targetAvailable\)\)/);
  assert.match(draft,/MANAGER_AVAILABILITY_OVERRIDE/);
  assert.match(draft,/disabled aria-disabled="true"/);
  for(const label of ["Chưa được xếp ca nào","Còn thời gian có thể xếp","Có thể điều động thủ công","Không thể chọn do xung đột"])assert.ok(draft.includes(label),label);
});

test("XSTORE-019C preserves calendar context while drawer opens and closes",()=>{
  assert.match(draft,/function rememberCalendarViewport\(wrap=null\)/);
  assert.match(draft,/calendarViewport=\{left:target\.scrollLeft,top:target\.scrollTop\}/);
  assert.match(draft,/function restoreCalendarViewport\(\)/);
  assert.match(draft,/wrap\.scrollLeft=Number\(v\.left\|\|0\)/);
  assert.match(draft,/wrap\.scrollTop=Number\(v\.top\|\|0\)/);
  assert.match(draft,/apply\(\);requestAnimationFrame\(apply\)/);
  assert.match(draft,/function closeCandidateDrawer\(\)[\s\S]*candidateDrawerOpen=false[\s\S]*restoreCalendarViewport\(\)/);
  const closeBody=draft.match(/function closeCandidateDrawer\(\)\{([\s\S]*?)\n\}/)?.[1]||"";
  assert.doesNotMatch(closeBody,/rememberCalendarViewport\(\)/);
  assert.match(draft,/focus\(\{preventScroll:true\}\)/);
});

test("XSTORE-019C keeps one canonical DRAFT writer",()=>{
  assert.match(draft,/replace_schedule_generation_assignments/);
  assert.doesNotMatch(draft,/client\(\)\.from\(|sb\.from\(|insert\s+into\s+work_schedules/i);
});

console.log("XSTORE_019C_CANDIDATE_DRAWER_STATIC=PASS");
