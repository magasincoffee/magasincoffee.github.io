import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base=process.env.QA_BASE_URL||'http://127.0.0.1:8769';
const browser=await chromium.launch({headless:true});
const stub='window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}})}}}};';
try {
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:850}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:stub}));
  await page.goto(base+'/05_MANAGER/runtime/manager-runtime-v1.html',{waitUntil:'domcontentloaded'});
  const app=page.frameLocator('#app');
  await app.locator('#magasinUiV2Shell').waitFor({state:'attached',timeout:12000});
  await app.locator('html[data-manager-shell-ready="1"]').waitFor();
  assert.equal(await app.locator('.m-shell-v2-sidebar').count(),1,'exactly one Manager sidebar');
  assert.equal(await app.locator('.manager-v2-sidebar-source').count(),0,'retired alternate sidebar never mounted');
  assert.equal(await app.locator('#managerV2Drawer').count(),0,'retired cloned mobile drawer absent');
  assert.equal(await app.locator('.manager-v2-header').count(),0,'retired second header absent');
  assert.equal(await app.locator('.m-shell-v2-nav__item').count(),10,'Manager has same ten menu destinations as Scheduling V2');
  const keys=await app.locator('.m-shell-v2-nav__item').evaluateAll(nodes=>nodes.map(el=>el.dataset.shellKey));
  assert.deepEqual(keys,['dashboard','workforce','swap','attendance','staff','payroll-self-check','schedule','demand','tasks','settings']);
  assert.equal(await app.locator('[data-shell-key="tasks"]').isVisible(),width>1024);
  assert.equal(await app.locator('html[data-manager-canonical-boot="1"]').count(),1);
  assert.equal(await app.locator('#view-attendance').innerText().then(x=>/Trắng|Mai Chi|Minh Anh/.test(x)),false,'do not render legacy employee samples');
  await app.locator('.m-shell-v2-nav__item[data-shell-key="staff"]').click({force:width<=1024});
  await app.locator('#view-staff.active').waitFor();
  assert.equal(await app.locator('.m-shell-v2-nav__item[aria-current="page"]').count(),1);
  if(width<=1024){
   await app.locator('.m-shell-v2-menu').click();
   assert.equal(await app.locator('.m-shell-v2-nav__item[data-shell-key="demand"]').isVisible(),true);
   await app.locator('.m-shell-v2-nav__item[data-shell-key="demand"]').click();
  }else{
   await app.locator('.m-shell-v2-nav__item[data-shell-key="demand"]').click();
  }
  // Auth is deliberately not bypassed: check top-level canonical route intent only.
  await page.waitForURL(/\/manager\/scheduling\/\?view=demand/,{timeout:12000});
  console.log('MANAGER_SINGLE_SIDEBAR_BROWSER '+width+'px PASS');
  await page.close();
 }
}finally{await browser.close();}
