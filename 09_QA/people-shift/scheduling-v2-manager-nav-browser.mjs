import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:8769';
const browser = await chromium.launch({headless:true});
const outputs=[];
const stub = 'window.supabase={createClient(){return {auth:{getUser:async()=>({data:{user:null},error:{message:"QA_NOT_AUTHENTICATED"}})}}}};';
try {
  for (const width of [1440,1024,390]) {
    const page=await browser.newPage({viewport:{width,height:850}});
    await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:stub}));
    await page.goto(base+'/05_MANAGER/SchedulingV2/index.html?mode=live&draft-editor&release-preview&auto-preview&post-publish-preview',{waitUntil:'domcontentloaded'});
    await page.locator('body.sv2-nav-ready').waitFor();
    assert.equal(await page.locator('.sv2-bar .sv2-demand-back').getAttribute('href'),'./Demand/index.html?mode=live&demand-preview','toolbar demand entry keeps live flag');
    const menu=page.locator('.sv2-menu-toggle');
    const nav=page.locator('.sv2-nav');
    const current=nav.locator('a[aria-current="page"]');
    assert.equal(await current.count(),1,'exactly one active Scheduling menu item');
    assert.equal(await current.first().textContent().then(x=>x.includes('Xếp lịch')),true);
    assert.equal(await nav.locator('a').count(),10,'same 9 shell modules plus demand config');
    const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
    assert.ok(overflow.scroll<=overflow.width+1,'no document-level horizontal overflow at '+width+': '+JSON.stringify(overflow));
    if (width>1024) {
      assert.equal(await menu.isVisible(),false,'desktop uses permanent sidebar');
      const style=await page.locator('.sv2-sidebar').evaluate(el=>({width:el.getBoundingClientRect().width,color:getComputedStyle(el).backgroundColor}));
      assert.ok(style.width>=240 && style.width<=255,'desktop sidebar width');
      assert.equal(style.color,'rgb(16, 24, 40)','sidebar matches Manager shell background');
    } else {
      assert.equal(await menu.isVisible(),true,'small view has menu button');
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'),'true');
      assert.equal(await page.locator('body.sv2-nav-open').count(),1);
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('body.sv2-nav-open').count(),0);
      assert.equal(await menu.evaluate(el=>el===document.activeElement),true,'Escape returns focus');
      await menu.click();
    }
    await nav.getByRole('link',{name:/Nhu cầu nhân sự/}).click();
    await page.waitForURL(/\/SchedulingV2\/Demand\/index\.html\?/);
    await page.locator('body.sv2-nav-ready').waitFor();
    assert.equal(await page.locator('.sv2-nav a[aria-current="page"]').textContent().then(x=>x.includes('Nhu cầu nhân sự')),true);
    assert.equal(await page.locator('#sv2DemandTable').count(),1);
    assert.equal(await page.locator('.sv2-nav a[href="/manager/#staff"]').getAttribute('target'),'_top');
    const returnLink=page.getByRole('link',{name:/Về lịch làm việc/});
    assert.equal(await returnLink.getAttribute('href'),'/manager/scheduling/');
    assert.equal(await returnLink.getAttribute('target'),'_top');
    await page.route('**/manager/scheduling/',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body><main id="qaCanonical">Canonical scheduling return</main></body></html>'}));
    await returnLink.click();
    await page.waitForURL(/\/manager\/scheduling\/$/);
    assert.equal(await page.locator('#qaCanonical').count(),1,'return navigates top window to canonical route');
    outputs.push('PASS '+width+'px schedule→demand→canonical, drawer/active/focus/overflow');
    await page.close();
  }
  console.log('SCHEDULING_V2_SHARED_MANAGER_NAV_BROWSER=PASS');
  outputs.forEach(x=>console.log(x));
} finally { await browser.close(); }
