import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const draft=read("05_MANAGER/Workforce/draft-publish-v1.js");
const master=read("05_MANAGER/Workforce/cross-store-master-v1.js");
const ui=read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js");
const engine=read("05_MANAGER/Workforce/engine-v1.js");

test("XSTORE-016 removes the global branch selector and renders branch accordion rows",()=>{
  assert.doesNotMatch(draft,/id="msdStore"/);
  assert.match(draft,/data-msd-branch/);
  assert.match(draft,/msd-branches/);
  assert.match(draft,/msd-branch-panel/);
  assert.match(draft,/aria-expanded/);
  assert.match(draft,/Editor lịch nháp nằm ngay trong chi nhánh này/);
});

test("XSTORE-016 keeps global week/actions separate from branch-local editor actions",()=>{
  assert.match(draft,/msd-global-actions/);
  assert.match(draft,/data-msd-week="prev"/);
  assert.match(draft,/data-msd-week="target"/);
  assert.match(draft,/data-msd-week="next"/);
  assert.match(draft,/msd-branch-actions/);
  assert.match(draft,/id="msdStart"/);
  assert.match(draft,/id="msdReload"/);
  assert.match(draft,/id="msdSave"/);
  assert.doesNotMatch(ui,/actions\.querySelector\('#msdStore'\)/);
  assert.doesNotMatch(ui,/Cửa hàng đang xếp/);
  assert.match(ui,/Tuần vận hành · Asia\/Ho_Chi_Minh/);
});

test("XSTORE-016 moves Auto Schedule global and four-store master to collapsed secondary overview",()=>{
  const auto=draft.indexOf('id="xstoreAutomationMount"');
  const branches=draft.indexOf("branchRowsHtml(stage");
  const overview=draft.indexOf("msd-global-overview");
  assert.ok(auto>=0&&branches>=0&&overview>=0);
  assert.ok(auto<branches,"Auto Schedule must render before branch accordion");
  assert.match(draft,/<details class="msd-global-overview">/);
  assert.match(draft,/Tổng quan 4 cửa hàng · thông tin tham khảo/);
  assert.doesNotMatch(master,/id="xstoreAutomationMount"/);
  assert.match(master,/Tổng quan lịch 4 cửa hàng/);
});

test("XSTORE-016 preserves unsaved-change safety for branch and week navigation",()=>{
  assert.match(draft,/dirty:false/);
  assert.match(draft,/function confirmDiscardChanges\(\)/);
  assert.match(draft,/Chi nhánh hiện tại có thay đổi chưa lưu/);
  assert.match(draft,/state\.dirty=true/);
  assert.match(draft,/if\(!confirmDiscardChanges\(\)\)return/);
  assert.match(draft,/state\.dirty=false/);
  assert.match(draft,/Hãy lưu các thay đổi của lịch nháp trước khi kiểm tra/);
});

test("XSTORE-016 cache chain points at exact IA runtime",()=>{
  for(const token of [
    "draft-publish-v1.js?v=20261004-xstore-016",
    "cross-store-master-v1.js?v=20261004-xstore-016",
    "manager-scheduling-ui2-v1.js?v=20261004-xstore-016"
  ])assert.ok(engine.includes(token),token);
  assert.ok(engine.includes("cross-store-auto-schedule-v1.js?v=20261004-xstore-012"));
});

console.log("XSTORE_016_SCHEDULING_IA_STATIC=PASS");
