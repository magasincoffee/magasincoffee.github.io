import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

test("SCHED-UI-011 phone draft schedule stays inside one scrollable seven-day calendar",async()=>{
  const ui=await read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js");
  assert.ok(ui.includes("@media(max-width:600px)"));
  assert.ok(ui.includes(".msd-ui2-012 .msd-board-wrap{overflow:auto;scrollbar-gutter:stable;max-height:62vh}"));
  assert.ok(ui.includes(".msd-ui2-012 .msd-board{grid-template-columns:repeat(7,minmax(150px,1fr));min-width:1080px;width:max-content;gap:6px}"));
  assert.ok(ui.includes(".msd-ui2-012 .msd-day-title{position:sticky;top:0;z-index:2}"));
  assert.ok(ui.includes(".msd-ui2-012 .msd-time-row{grid-template-columns:1fr}"));
});

test("SCHED-UI-011 tablet keeps overflow contained inside scheduling board",async()=>{
  const ui=await read("05_MANAGER/Workforce/manager-scheduling-ui2-v1.js");
  assert.ok(ui.includes("@media(max-width:900px)"));
  assert.ok(ui.includes("grid-template-columns:repeat(7,minmax(156px,1fr));min-width:1128px;width:max-content"));
  assert.ok(ui.includes(".msd-ui2-012 .msd-board-wrap{overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable;max-height:calc(100vh - 330px)}"));
});

test("SCHED-UI-011 recurring staffing becomes phone cards with inline editor",async()=>{
  const auto=await read("05_MANAGER/Workforce/cross-store-auto-schedule-v1.js");
  assert.ok(auto.includes(".xsa-board thead{display:none}"));
  assert.ok(auto.includes(".xsa-board tr{display:grid;grid-template-columns:1fr"));
  assert.ok(auto.includes(".xsa-cell-open::before{content:attr(data-xsa-day-label)"));
  assert.ok(auto.includes(".xsa-editor-panel{position:static;order:-1"));
  assert.ok(auto.includes(".xsa-setup-card{min-width:0;max-width:100%"));
  assert.ok(auto.includes(".xsa-board-wrap{width:100%;max-width:100%;min-width:0;overflow:auto"));
  assert.ok(auto.includes(".xsa-workspace{display:block;width:100%;max-width:100%;min-width:0}"));
  assert.ok(auto.includes("data-xsa-day-label="));
  assert.ok(auto.includes("matchMedia?.('(max-width:760px)')"));
});

test("SCHED-UI-011 browser qualification covers every required representative width",async()=>{
  const draft=await read("09_QA/people-shift/ui2-012-manager-scheduling-browser.mjs");
  const recurring=await read("09_QA/people-shift/xstore-cross-store-browser.mjs");
  const required="[1440,1024,768,430,390,360]";
  assert.ok(draft.includes(required));
  assert.ok(recurring.includes(required));
  assert.ok(draft.includes("SCHED_UI_011_DRAFT_RESPONSIVE"));
  assert.ok(recurring.includes("SCHED_UI_011_RECURRING_RESPONSIVE"));
});

console.log("SCHED_UI_011_RESPONSIVE_CONTRACT=PASS");
