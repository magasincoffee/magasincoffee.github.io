import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

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
    assert.equal(await page.locator('.sv2-bar .sv2-demand-back').getAttribute('href'),'/manager/scheduling/?section=demand','toolbar demand entry uses guarded Manager route');
    const menu=page.locator('.sv2-menu-toggle');
    const nav=page.locator('.sv2-nav');
    const current=nav.locator('a[aria-current="page"]');
    assert.equal(await current.count(),1,'exactly one active Scheduling menu item');
    assert.equal(await current.first().textContent().then(x=>x.includes('Xếp lịch')),true);
    assert.equal(await nav.locator('a').count(),11,'eight primary mockup B modules and three related operations');
    const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
    assert.ok(overflow.scroll<=overflow.width+1,'no document-level horizontal overflow at '+width+': '+JSON.stringify(overflow));
    if (width>1024) {
      assert.equal(await menu.isVisible(),false,'desktop uses permanent sidebar');
      const style=await page.locator('.sv2-sidebar').evaluate(el=>({width:el.getBoundingClientRect().width,color:getComputedStyle(el).backgroundColor}));
      assert.ok(style.width>=240 && style.width<=255,'desktop sidebar width');
      assert.equal(style.color,'rgb(248, 251, 255)','standalone sidebar matches approved light Manager B background');
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
    // The mobile navigation drawer is intentionally modal and blocks page controls;
    // close it before following a content-toolbar link.
    if (width <= 1024) {
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('aria-expanded'),'false');
    }
    // Visual QA fixture: exercise the mockup C roster without writing any schedule data.
    await page.locator('#sv2RosterSearch').waitFor();
    await page.evaluate(()=>{
      const body=document.querySelector('#sv2Rows');
      body.replaceChildren();
      for(const [name,time,band,status] of [
        ['Nhân viên QA A','07:00–15:00','morning','sv2-draft'],
        ['Nhân viên QA B','15:00–21:00','afternoon','sv2-official']
      ]){
        const tr=document.createElement('tr');
        const head=document.createElement('td');head.textContent=name;tr.appendChild(head);
        for(let day=0;day<7;day++){
          const cell=document.createElement('td');
          if(day===0){
            const shift=document.createElement('span');
            shift.className='sv2-shift sv2-band-'+band+' '+status;
            shift.textContent=time+(status==='sv2-draft'?' · Nháp':' · Chính thức');
            shift.tabIndex=0;cell.appendChild(shift);
          }
          tr.appendChild(cell);
        }
        body.appendChild(tr);
      }
    });
    await page.locator('#sv2RosterSearch').fill('QA A');
    assert.equal(await page.locator('#sv2Rows tr:visible').count(),1,'employee search filters roster');
    await page.locator('#sv2RosterSearch').fill('');
    assert.equal(await page.locator('#sv2Rows tr:visible').count(),2,'clearing search restores roster');
    await page.locator('#sv2Rows tr').first().locator('.sv2-shift').focus();
    assert.equal(await page.locator('.sv2-shift-inspector [data-shift-employee]').textContent(),'Nhân viên QA A');
    assert.equal(await page.locator('.sv2-shift-inspector [data-shift-state]').textContent(),'Bản nháp');
    const screenshotDir=process.env.QA_OUT||'qa-artifacts/people-shift';
    mkdirSync(screenshotDir,{recursive:true});
    await page.screenshot({path:join(screenshotDir,'mockup-c-qa-fixture-'+width+'px.png'),fullPage:true});
    const advanced=page.locator('.sv2-bar details.sv2-advanced');
    await advanced.locator('summary').click();
    assert.equal(await advanced.getAttribute('open'),'','advanced tools expand before Demand navigation');
    await page.route('**/manager/scheduling/?section=demand',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body><main id="qaDemandCanonical">Role-guarded Demand route</main></body></html>'}));
    await advanced.locator('.sv2-demand-back').click();
    await page.waitForURL(/\/manager\/scheduling\/\?section=demand$/);
    assert.equal(await page.locator('#qaDemandCanonical').count(),1,'Demand enters canonical shared Manager host');
    // Independently validate the real Demand editor in direct compatibility mode;
    // no production Supabase writes or credentials are used in this fixture.
    await page.goto(base+'/05_MANAGER/SchedulingV2/Demand/index.html?mode=live&demand-preview',{waitUntil:'domcontentloaded'});
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
