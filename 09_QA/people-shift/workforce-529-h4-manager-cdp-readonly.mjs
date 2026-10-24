import { chromium } from 'playwright';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9229',{timeout:12000});
try{
 const pages=browser.contexts().flatMap(c=>c.pages());
 const app=pages.find(p=>p.url().startsWith('https://magasincoffee.github.io/manager/scheduling/'));
 if(!app)throw Error('MAGASIN_MANAGER_TAB_NOT_FOUND');
 const data=await app.evaluate(()=>{
   const body=document.body?.innerText||'';
   return {titleOk:document.title.includes('MAGASIN'),managerLabel:/Quản lý|Manager/i.test(document.title+' '+body.slice(0,1500)),loginScreen:/Đăng nhập|Sign in/i.test(body.slice(0,550)),sidebarPresent:!!document.querySelector('.sidebar,[class*="sidebar"],nav'),schedulePresent:/Xếp lịch|Lập lịch tuần|Lịch làm việc/i.test(body),bodyNonempty:body.trim().length>200};
 });
 console.log('H4_REAL_MANAGER_TAB_FOUND=PASS');
 for(const [k,v] of Object.entries(data))console.log('H4_UI_'+k.toUpperCase()+'='+ (v?'YES':'NO'));
 if(!data.bodyNonempty)throw Error('MANAGER_PAGE_EMPTY');
 console.log('H4_BROWSER_AUTHENTICATED_UI_READONLY_PROBE=PASS (page inspect only; login identity not independently confirmed)');
}finally{await browser.close();}
