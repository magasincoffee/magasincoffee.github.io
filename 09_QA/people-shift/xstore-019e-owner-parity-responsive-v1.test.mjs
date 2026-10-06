import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

test("XSTORE-019E Owner reuses Manager writer and shared scheduling presentation",async()=>{
  const [runtime,writer,ui,legacy]=await Promise.all([
    read("04_OWNER/Workforce/runtime/owner-workforce-runtime.html"),
    read("05_MANAGER/Workforce/draft-publish-v1.js"),
    read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js"),
    read("04_OWNER/Workforce/03-publish/engine-v1.js")
  ]);
  assert.match(runtime,/__MAGASIN_SCHEDULING_ACTOR__='OWNER'/);
  assert.match(runtime,/\/05_MANAGER\/Workforce\/draft-publish-v1\.js\?v=20261005-xstore-019/);
  assert.match(runtime,/\/05_MANAGER\/Workforce\/manager-scheduling-ui2-v1\.js\?v=20261006-xstore-019e/);
  assert.match(ui,/data-scheduling-actor="MANAGER"[\s\S]*data-scheduling-actor="OWNER"/);
  assert.match(writer,/replace_schedule_generation_assignments/);
  assert.doesNotMatch(runtime,/replace_schedule_generation_assignments|publish_schedule_generation|\.from\(/);
  assert.doesNotMatch(legacy,/replace_schedule_generation_assignments|publish_schedule_generation/);
});

test("XSTORE-019E selected-store context and primary actions share one sticky toolbar",async()=>{
  const writer=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  assert.match(writer,/\.msd-workspace\{[^}]*max-width:100%;overflow:clip/);
  assert.match(writer,/\.msd-workspace-toolbar\{position:sticky;top:0;z-index:6;display:grid/);
  assert.match(writer,/\.msd-workspace-context\{display:flex;justify-content:space-between/);
  assert.match(writer,/msd-workspace-toolbar"[\s\S]*msd-workspace-context[\s\S]*\+draftActions\+'<\/div><div class="msd-workspace-body">/);
  assert.match(writer,/\.msd-workspace-actions\{display:flex;[^}]*margin:0/);
});

test("XSTORE-019E laptop keeps seven columns while narrow screens scroll inside calendar only",async()=>{
  const [writer,ui]=await Promise.all([
    read("05_MANAGER/Workforce/draft-publish-v1.js"),
    read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js")
  ]);
  for(const source of [writer,ui]){
    assert.match(source,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
    assert.match(source,/@media\(max-width:900px\)[\s\S]*grid-template-columns:repeat\(7,minmax\(15[06]px,1fr\)\)/);
  }
  assert.match(writer,/\.msd-calendar-primary \.msd-board-wrap\{[^}]*overflow:auto;overscroll-behavior:contain/);
});

test("XSTORE-019E candidate picker remains bounded overlay and not page-sprawl layout",async()=>{
  const writer=await read("05_MANAGER/Workforce/draft-publish-v1.js");
  assert.match(writer,/\.msd-people-overlay\{position:fixed;inset:0;[^}]*max-width:100vw;overflow:hidden/);
  assert.match(writer,/\.msd-people-secondary\{[^}]*width:min\(460px,94vw\);[^}]*max-height:100vh;[^}]*overscroll-behavior:contain/);
  assert.match(writer,/@media\(max-width:700px\)\{\.msd-people-secondary\{width:100vw;max-width:100vw\}/);
});
