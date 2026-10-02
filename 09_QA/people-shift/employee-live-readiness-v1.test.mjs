import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(new URL("../../"+p,import.meta.url),"utf8");

test("EMLIVE-001 active Employee shell exposes only production-ready surfaces",()=>{
  const app=read("06_EMPLOYEE/app/employee-v40.html");
  assert.doesNotMatch(app,/data-view="inventory"|id="view-inventory"/);
  assert.doesNotMatch(app,/data-view="settings"|id="view-settings"/);
  assert.doesNotMatch(app,/avatarInput|openAvatarPicker\(|previewAvatar\(/);
  assert.match(app,/Mỗi khoảng được lưu ngay khi bấm Đăng ký; không có bước gửi cuối/);
  assert.doesNotMatch(app,/>Xong<\/button>/);\n  assert.match(app,/data-availability-close="back">← Về lịch làm<\/button>/);
  assert.match(app,/Để đổi mật khẩu, hãy đăng xuất rồi chọn “Quên mật khẩu\?”/);
  assert.doesNotMatch(app,/Supabase Auth/);
});

test("EMLIVE-001 availability is immediately authoritative and not fake-finalized",()=>{
  const engine=read("06_EMPLOYEE/availability/engine-v1.js");
  assert.match(engine,/events\?\.emit\?\.\('availability-loaded'/);
  assert.match(engine,/getRows:\(\)=>state\.rows\.slice\(\)/);
  assert.match(engine,/Mỗi khoảng có hiệu lực ngay khi được lưu/);
  assert.doesNotMatch(engine,/Đã hoàn thành đăng ký lịch làm/);
  assert.doesNotMatch(engine,/function finish\(|finishQuickRegistration/);\n  assert.match(engine,/wire\(x,'#weeklyRegistrationPanel \[data-availability-close="back"\]',close\)/);
});

test("EMLIVE-001 Today reflects canonical saved availability rows",()=>{
  const engine=read("06_EMPLOYEE/dashboard/engine-v1.js");
  assert.match(engine,/availability\?\.getRows\?\.\(\)/);
  assert.match(engine,/availabilityDays=new Set/);
  assert.match(engine,/Thời gian có thể làm tuần sau đã được lưu/);
  assert.match(engine,/Đăng ký thời gian có thể làm tuần sau/);
  assert.match(engine,/magasin:availability-loaded/);
});

test("EMLIVE-001 consolidation defensively removes stale legacy surfaces",()=>{
  const consolidation=read("06_EMPLOYEE/workforce-ui-consolidation-v1.js");
  const shell=read("02_CORE/ui/magasin-ui-v2-employee-shell.js");
  assert.match(consolidation,/\['inventory','settings'\]/);
  assert.match(consolidation,/avatarInput/);
  assert.match(shell,/swap: 'schedule'/);
  assert.doesNotMatch(shell,/inventory: 'dashboard'|settings: 'profile'/);
});
