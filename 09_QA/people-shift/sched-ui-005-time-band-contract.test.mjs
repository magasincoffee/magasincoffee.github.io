import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read=p=>fs.readFileSync(p,"utf8");

function loadCore(){
  const context={};
  vm.createContext(context);
  vm.runInContext(read("02_CORE/shared/shared-core-v1.js"),context,{filename:"shared-core-v1.js"});
  return context.MAGASIN_CORE;
}

test("SCHED-UI-005 canonical shared time-band boundaries are exact and fail neutral",()=>{
  const core=loadCore();
  assert.ok(core?.time?.shiftKind);
  const cases=[
    ["04:59","neutral"],
    ["05:00","morning"],
    ["11:59","morning"],
    ["12:00","afternoon"],
    ["16:59","afternoon"],
    ["17:00","evening"],
    ["22:00","evening"],
    ["22:01","neutral"],
    ["","neutral"],
    ["not-a-time","neutral"],
    ["24:00","neutral"]
  ];
  for(const [value,expected] of cases)assert.equal(core.time.shiftKind(value),expected,value);
});

test("SCHED-UI-005 Manager scheduling callers delegate to shared canonical classifier",()=>{
  for(const path of [
    "05_MANAGER/Workforce/draft-publish-v1.js",
    "05_MANAGER/Workforce/cross-store-auto-schedule-v1.js",
    "05_MANAGER/Workforce/cross-store-master-v1.js"
  ]){
    const src=read(path);
    assert.match(src,/MAGASIN_CORE\?\.time\?\.shiftKind\?\.\(v\)\|\|'neutral'/,path);
    assert.doesNotMatch(src,/m>=300&&m<720\?'morning':m>=720&&m<1020\?'afternoon':m>=1020&&m<=1320\?'evening'/,path);
  }
});

test("SCHED-UI-005 Manager runtime loads Shared Core before scheduling engine",()=>{
  const runtime=read("05_MANAGER/runtime/manager-runtime-v1.html");
  const engine=read("05_MANAGER/Workforce/engine-v1.js");
  const coreToken="/02_CORE/shared/shared-core-v1.js?v=20261002-sched-ui-005";
  const engineToken="/05_MANAGER/Workforce/engine-v1.js?v=20261003-sched-ui-017";
  assert.ok(runtime.includes(coreToken));
  assert.ok(runtime.includes(engineToken));
  assert.ok(runtime.indexOf(coreToken)<runtime.indexOf(engineToken));
  assert.match(runtime,/MAGASIN_CORE\?\.time\?\.shiftKind/);
  for(const token of [
    "draft-publish-v1.js?v=20261004-xstore-012",
    "cross-store-master-v1.js?v=20261004-xstore-012",
    "cross-store-auto-schedule-v1.js?v=20261004-xstore-012"
  ])assert.ok(engine.includes(token),token);
});

console.log("SCHED_UI_005_TIME_BAND_CONTRACT=PASS");
