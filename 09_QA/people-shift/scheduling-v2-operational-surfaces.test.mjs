import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';const get=p=>readFile(new URL('../../'+p,import.meta.url),'utf8');
test('demand editor is a dedicated page and weekly matrix has seven weekdays',async()=>{const [html,js,index]=await Promise.all([get('05_MANAGER/SchedulingV2/Demand/index.html'),get('05_MANAGER/SchedulingV2/Demand/demand-settings-v1.js'),get('05_MANAGER/SchedulingV2/index.html')]);assert.match(html,/Cài đặt nhu cầu nhân sự/);assert.match(index,/href="\/manager\/scheduling\/\?section=demand"/);for(const day of ['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'])assert.ok(html.includes(day),day);assert.match(js,/replace_workforce_recurring_staffing_requirements_v1/);assert.match(js,/list_workforce_recurring_staffing_requirements_v1/);assert.match(js,/fingerprint\(fresh\)!==baseline/);assert.match(js,/\.filter\(r=>r\.store_id!==selected\)/);assert.match(js,/rowsForStore\(\)/);assert.doesNotMatch(js,/from\(['"](?:profiles|shifts|schedule_assignments)/)});
test('automatic planner cannot call global auto schedule or overwrite published schedules',async()=>{const [planner,session,html]=await Promise.all([get('05_MANAGER/SchedulingV2/store-planner-v1.js'),get('05_MANAGER/SchedulingV2/draft-session-v1.js'),get('05_MANAGER/SchedulingV2/index.html')]);assert.doesNotMatch(planner,/auto_generate_cross_store_schedule_v1/);assert.match(planner,/PUBLISHED_WEEK_LOCKED/);assert.match(planner,/DRAFT_CHANGED_BEFORE_SAVE/);assert.match(planner,/originalSignature/);assert.match(planner,/\[\.\.\.rows\.map\(shape\),\.\.\.latest\.proposals\]/);assert.match(session,/STORE_DEMAND_NOT_CONFIGURED/);assert.match(html,/store-planner-v1\.js/);assert.match(html,/draft-session-v1\.js/)});
test('post-publish edits are separated from draft and leave an audit trail',async()=>{const [svc,ui,html]=await Promise.all([get('05_MANAGER/SchedulingV2/post-publish-v1.js'),get('05_MANAGER/SchedulingV2/post-publish-ui-v1.js'),get('05_MANAGER/SchedulingV2/index.html')]);for(const rpc of ['add_published_shift_v1','reassign_published_shift_v1','list_manager_post_publish_audit_v1'])assert.ok(svc.includes(rpc));assert.match(svc,/POST_PUBLISH_PREVIEW_DISABLED/);assert.match(svc,/SCHEDULE_NOT_IN_SCOPE/);assert.match(ui,/Lịch sử điều động/);assert.match(ui,/data-sv2-official-id/);assert.match(html,/post-publish-v1\.js/);assert.match(html,/post-publish-ui-v1\.js/)});


test('Demand editor is executable, timezone-independent and enforces 30-minute wall-clock picks',async()=>{
 const [html,js,css,context,host]=await Promise.all([
  get('05_MANAGER/SchedulingV2/Demand/index.html'),
  get('05_MANAGER/SchedulingV2/Demand/demand-settings-v1.js'),
  get('05_MANAGER/SchedulingV2/Demand/demand-settings-v1.css'),
  get('05_MANAGER/SchedulingV2/manager-context-v2.js'),
  get('manager/scheduling/index.html')
 ]);
 assert.doesNotThrow(()=>new Function(js),'regression: shipped demand JS had a missing closing parenthesis in bands.sort');
 assert.doesNotThrow(()=>new Function(context));
 assert.match(html,/id="sv2DemandStore"[^>]*disabled/);
 assert.match(html,/id="sv2DemandRetry"/);
 assert.doesNotMatch(html,/type="time"/);
 assert.match(html,/Giờ Việt Nam \(UTC\+7\)/);
 const start=html.match(/<select id="sv2BandStart"[^>]*>([\s\S]*?)<\/select>/)?.[1]||'';
 const end=html.match(/<select id="sv2BandEnd"[^>]*>([\s\S]*?)<\/select>/)?.[1]||'';
 const values=x=>[...x.matchAll(/<option value="(\d\d:\d\d)"/g)].map(m=>m[1]);
 const first=values(start),last=values(end);
 const next=(i,begin)=>{const v=begin+i*30;return String(Math.floor(v/60)).padStart(2,'0')+':'+String(v%60).padStart(2,'0')};
 assert.deepEqual(first,Array.from({length:34},(_,i)=>next(i,300)));
 assert.deepEqual(last,Array.from({length:34},(_,i)=>next(i,330)));
 assert.match(js,/bands\.sort\(\(a,b\)=>min\(a\.start\)-min\(b\.start\)\);/);
 assert.match(js,/STORE_NOT_ALLOWED/);
 assert.match(js,/REQUEST_TIMEOUT/);
 assert.match(js,/retry\.addEventListener\('click',start\)/);
 assert.match(css,/\.sv2-demand-controls #sv2AddBand/);
 assert.match(context,/window\.parent\.MAGASIN_CORE\?\.supabase\?\.get/);
 assert.match(host,/Demand\/index\.html\?mode=live&demand-preview&v=20261021-demand-fix1/);
});
