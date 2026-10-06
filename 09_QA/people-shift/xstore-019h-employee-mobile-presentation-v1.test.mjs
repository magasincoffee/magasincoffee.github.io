import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
const shell=read("02_CORE/ui/magasin-ui-v2-employee-shell.js");
const shellCss=read("02_CORE/ui/magasin-ui-v2-employee-shell.css");
const app=read("06_EMPLOYEE/app/employee-v40.html");
const presentation=read("06_EMPLOYEE/employee-presentation-v4.js");
const profile=read("06_EMPLOYEE/profile/engine-v1.js");
const runtime=read("06_EMPLOYEE/runtime/employee-runtime-v1.html");
const index=read("06_EMPLOYEE/index.html");

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
 assert.match(app,/employee-presentation-v4\.js\?v=20261006-xstore-019h/);
 assert.match(app,/magasin-ui-v2-employee-presentation-v4\.css\?v=20261006-xstore-019h/);
});

test("XSTORE-019H visually separates Availability, published schedule and attendance paths",()=>{
 assert.match(presentation,/data-x19h-source','availability'/);
 assert.match(presentation,/data-x19h-source','published'/);
 assert.match(presentation,/Theo lịch đã phát hành/);
 assert.match(presentation,/Ngoài lịch phát hành/);
 assert.match(presentation,/quản lý xác nhận/);
 assert.match(shellCss,/grid-template-columns:\s*repeat\(5,/);
});

test("XSTORE-019H employment type is management-owned read-only presentation",()=>{
 assert.match(app,/id="profileEmploymentType" readonly/);
 assert.match(app,/do quản lý thiết lập; nhân viên chỉ xem/);
 assert.match(profile,/FULL_TIME:'Full-time'/);
 assert.match(profile,/PART_TIME:'Part-time'/);
 assert.match(profile,/profileEmploymentType/);
});

test("XSTORE-019H cache chain reaches exact Employee presentation candidate",()=>{
 assert.match(runtime,/employee-v40\.html\?ui=20261006-xstore-019h&runtime=engine/);
 assert.match(runtime,/profile\/engine-v1\.js\?v=20261006-xstore-019h/);
 assert.match(index,/employee-runtime-v1\.html\?v=20261006-xstore-019h/);
 assert.match(app,/employee-shell\.js\?v=20261006-xstore-019h/);
});
console.log("XSTORE_019H_EMPLOYEE_MOBILE_PRESENTATION_STATIC=PASS");
