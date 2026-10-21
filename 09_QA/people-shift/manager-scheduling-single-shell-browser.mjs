import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL||'http://127.0.0.1:8769';
const browser=await chromium.launch({headless:true});
const roleCore=`
window.MAGASIN_CORE={supabase:{
 requireActive:async()=>({id:'qa-person',role:'STORE_MANAGER',status:'ACTIVE',full_name:'Quản lý kiểm thử',username:'qa_manager'}),
 get:()=>window.supabase?.createClient?.()
}};
`;
const mockSupabase=`
window.supabase={createClient:()=>({
 auth:{
  getUser:async()=>({data:{user:{id:'qa-person'}},error:null}),
  getSession:async()=>({data:{session:{user:{id:'qa-person'}}},error:null}),
  signOut:async()=>({error:null})
 },
 from:()=>({select:()=>({eq:()=>({single:async()=>({data:{id:'qa-person',username:'qa_manager',full_name:'Quản lý kiểm thử',role:'STORE_MANAGER',status:'ACTIVE',access_scope:'STORE'},error:null})})})}),
 rpc:async(name)=>({data:name==='get_manager_accessible_stores'?[{id:'qa-store',code:'CN1',name:'Chi nhánh 1',status:'ACTIVE'}]:[],error:null})
})};
`;
const outputs=[];
try{
 for(const width of [1440,1024,390]){
  const page=await browser.newPage({viewport:{width,height:850}});
  await page.route('**/02_CORE/shared/shared-core-v1.js**',route=>route.fulfill({status:200,contentType:'application/javascript',body:roleCore}));
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:mockSupabase}));
  await page.goto(BASE+'/manager/scheduling/',{waitUntil:'domcontentloaded'});
  await page.locator('#magasinUiV2Shell').waitFor({state:'attached',timeout:18000});
  await page.locator('#app:not([hidden])').waitFor({timeout:18000});
  const frame=page.frameLocator('#app');
  await frame.locator('.sv2-roster').waitFor({timeout:18000});
  assert.equal(await page.locator('.m-shell-v2-sidebar').count(),1);
  assert.equal(await page.locator('.m-shell-v2-topbar').count(),1);
  assert.equal(await page.locator('.m-shell-v2-nav__item').count(),9);
  assert.equal(await page.locator('[data-shell-key="workforce"][aria-current="page"]').count(),1);
  assert.equal(await page.locator('[data-shell-account-name]').textContent(),'Quản lý kiểm thử');
  assert.equal(await page.locator('[data-shell-user-name]').textContent(),'Quản lý kiểm thử');
  // Profile may hydrate after the shell mounts; identity should stay in sync.
  await page.locator('#profileName').evaluate(node => { node.textContent='Nguyễn Văn An'; });
  await page.locator('#profileMeta').evaluate(node => { node.textContent='Quản lý · CN1'; });
  await page.waitForFunction(() =>
    document.querySelector('[data-shell-account-name]')?.textContent === 'Nguyễn Văn An' &&
    document.querySelector('[data-shell-user-name]')?.textContent === 'Nguyễn Văn An' &&
    document.querySelector('[data-shell-account-meta]')?.textContent === 'Quản lý · CN1'
  );
  assert.equal(await page.locator('.m-shell-v2-user__avatar').textContent(),'A');
  assert.equal(await frame.locator('.sv2-sidebar').isVisible(),false,'nested sidebar must be hidden');
  assert.equal(await frame.locator('.sv2-app-header').isVisible(),false,'nested topbar must be hidden');
  assert.equal(await frame.locator('html').getAttribute('data-sv2-manager-host'),'shared');

  const topMetrics=await page.evaluate(()=>{
   const frame=document.getElementById('app').getBoundingClientRect();
   const bar=document.querySelector('.m-shell-v2-topbar').getBoundingClientRect();
   return {left:frame.left,top:frame.top,topbar:bar.height,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth};
  });
  assert.ok(topMetrics.scroll<=topMetrics.client+1,'no horizontal page overflow '+width);
  assert.ok(Math.abs(topMetrics.top-topMetrics.topbar)<3,'content below shared topbar '+width);
  if(width>1024)assert.ok(topMetrics.left>=240 && topMetrics.left<=255,'sidebar offset on desktop');
  else assert.ok(Math.abs(topMetrics.left)<2,'mobile iframe full width');

  const menu=page.locator('[data-shell-menu]');
  if(width<=1024){
   assert.equal(await menu.isVisible(),true);
   await menu.click();
   assert.equal(await menu.getAttribute('aria-expanded'),'true');
   await page.keyboard.press('Escape');
   assert.equal(await menu.getAttribute('aria-expanded'),'false');
  }
  const advanced=frame.locator('.sv2-bar details.sv2-advanced');
  await advanced.locator('summary').click();
  assert.equal(await advanced.getAttribute('open'),'','advanced tools expanded');
  await advanced.locator('.sv2-demand-back').click();
  await frame.locator('#sv2DemandTable').waitFor({timeout:18000});
  assert.equal(await page.locator('#magasinUiV2Shell').count(),1);
  assert.equal(await page.locator('[data-shell-key="workforce"][aria-current="page"]').count(),1);
  // Demand navigation replaces the child document; await its shared-host CSS hydration.
  await frame.locator('html[data-sv2-manager-host="shared"]').waitFor();
  await frame.locator('.sv2-sidebar').waitFor({state:'hidden',timeout:12000});
  await frame.locator('.sv2-app-header').waitFor({state:'hidden',timeout:12000});
  assert.equal(await frame.locator('html').getAttribute('data-sv2-manager-host'),'shared');
  outputs.push('PASS '+width+'px: one shell, profile, nav, scheduling→demand, drawer/overflow');

  if(width<=1024)await menu.click();
  await page.locator('[data-shell-key="dashboard"]').click();
  await page.waitForURL(url=>url.pathname==='/manager/',{timeout:12000});
  outputs.push('PASS '+width+'px: Manager Home routes from same sidebar');
  await page.close();
 }
 console.log('MANAGER_SCHEDULING_ONE_SHELL_BROWSER=PASS');
 outputs.forEach(x=>console.log(x));
}finally{await browser.close();}
