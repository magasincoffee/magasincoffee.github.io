import {chromium} from 'playwright';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9229',{timeout:12000});
try{
 const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('https://magasincoffee.github.io/manager/scheduling/'));
 if(!page)throw Error('MANAGER_TAB_MISSING');
 const labels=await page.locator('button').allTextContents();
 const i=labels.findIndex(s=>s.includes('Thiếu tối đa 2 người'));
 if(i<0){console.log('SHORTAGE_BADGE_NOT_FOUND');console.log('BROWSER_QA_READONLY_DONE');process.exit(0);}
 const target=page.getByRole('button',{name:/Thiếu tối đa 2 người/}).first();
 await target.click();
 await page.waitForTimeout(350);
 const result=await page.evaluate(()=>{
 const t=document.body.innerText;
 const p=t.indexOf('Thiếu tối đa');
 const region=t.slice(Math.max(0,p-100),p+1600);
 return {shortageDetailsVisible:/khung giờ|chi tiết thiếu|thiếu người|thiếu nhân sự/i.test(region),detailExcerpt:region.replace(/\b\d{9,}\b/g,'[redacted]').slice(0,1000),dialogs:document.querySelectorAll('[role=dialog]').length};
 });
 console.log('H4_MANAGER_SHORTAGE_DIRECT='+JSON.stringify(result));
 console.log('BROWSER_QA_READONLY_DONE');
}finally{await browser.close();}
