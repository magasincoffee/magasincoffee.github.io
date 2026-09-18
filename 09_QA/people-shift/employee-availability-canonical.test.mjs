import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const root=new URL("../../",import.meta.url);
const read=p=>fs.readFile(new URL(p,root),"utf8");

test("Employee availability has one active owner and shell contains no business RPC logic",async()=>{
  const [runtime,shell,engine]=await Promise.all([
    read("06_EMPLOYEE/runtime/employee-runtime-v1.html"),
    read("06_EMPLOYEE/app/employee-v40.html"),
    read("06_EMPLOYEE/availability/engine-v1.js")
  ]);

  assert.equal((runtime.match(/\/06_EMPLOYEE\/availability\/engine-v1\.js/g)||[]).length,1);
  assert.doesNotMatch(shell,/get_my_availability|save_my_availability|delete_my_availability/);
  assert.match(engine,/get_my_availability/);
  assert.match(engine,/save_my_availability/);
  assert.match(engine,/delete_my_availability/);
  assert.match(engine,/employeeAvailabilityEngine/);
  assert.doesNotMatch(engine,/\.from\(/);
});

test("Employee availability canonical API exposes immediate read/delete support",async()=>{
  const engine=await read("06_EMPLOYEE/availability/engine-v1.js");
  assert.match(engine,/data-av-delete/);
  assert.match(engine,/async function remove\(/);
  assert.match(engine,/getRows:\(\)=>state\.rows\.slice\(\)/);
  assert.match(engine,/getWeek:\(\)=>state\.week/);
});
