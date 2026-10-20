import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');

function view(html,key){
 const marker='<section class="view'+(key==='dashboard'?' active':'')+'" id="view-'+key+'">';
 const begin=html.indexOf(marker);
 assert.ok(begin>=0,'retained module root '+key);
 const end=html.indexOf('<section class="view" id="view-',begin+marker.length);
 assert.ok(end>begin,'next view boundary for '+key);
 return html.slice(begin,end);
}

test('Manager legacy fallback no longer invents metrics, employee records or shifts',async()=>{
 const html=await read('05_MANAGER/runtime/manager-shell-v1.html');
 const states={
  dashboard:'Đang tải tổng quan từ dữ liệu được xác minh',
  staff:'Đang tải danh sách nhân viên từ dữ liệu được xác minh',
  swap:'Đang tải yêu cầu đổi / cho ca từ dữ liệu được xác minh',
  attendance:'Đang tải chấm công từ dữ liệu được xác minh'
 };
 for(const [key,status] of Object.entries(states)){
  const htmlView=view(html,key);
  assert.ok(htmlView.includes(status),key);
  assert.match(htmlView,/role="status"/);
  assert.doesNotMatch(htmlView,/<tr>|data-modal=|data-open=|class="progress"/,key);
 }
 for(const fake of ['49,2tr','2.410 / 2.500','Mai Chi ↔ Trắng','ID NV001','18 nhân sự','1 yêu cầu đổi ca chờ duyệt']){
  assert.equal(html.includes(fake),false,'must not ship invented '+fake);
 }
});

test('Real Manager domain modules and canonical shell are retained unchanged as active entry points',async()=>{
 const [html,engine,root,workforce]=await Promise.all([
  read('05_MANAGER/runtime/manager-shell-v1.html'),
  read('05_MANAGER/Workforce/engine-v1.js'),
  read('02_CORE/ui/magasin-ui-v2-shell.js'),
  read('05_MANAGER/Workforce/ui-consolidation-v1.js')
 ]);
 for(const key of ['dashboard','staff','workforce','schedule','tasks','swap','attendance','settings']){
  assert.ok(html.includes('id="view-'+key+'"'),key);
 }
 assert.match(engine,/staff-projection-v1\.js/);
 assert.match(engine,/swap-approval-v1\.js/);
 assert.match(engine,/attendance-review-v1\.js/);
 assert.match(engine,/ui-consolidation-v1\.js/);
 assert.match(root,/m-shell-v2-sidebar/);
 assert.match(workforce,/MAGASIN_MANAGER_TODAY_V2/);
});
