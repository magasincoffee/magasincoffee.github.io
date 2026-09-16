import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE=process.env.QA_BASE_URL||'https://magasincoffee.github.io';
const USER=process.env.PROCUREMENT_QA_USERNAME||'';
const PASS=process.env.PROCUREMENT_QA_PASSWORD||'';
const outDir=process.env.QA_OUT||'qa-artifacts';
fs.mkdirSync(outDir,{recursive:true});
const report={generated_at:new Date().toISOString(),base_url:BASE,status:'PASS',checks:[],console_errors:[],page_errors:[]};
const ok=(name,detail='')=>report.checks.push({name,status:'PASS',detail});
const fail=(name,detail='')=>report.checks.push({name,status:'FAIL',detail});
const warn=(name,detail='')=>report.checks.push({name,status:'WARN',detail});
if(!USER||!PASS){report.status='SKIPPED';warn('credentials','Thiếu tài khoản QA.');fs.writeFileSync(path.join(outDir,'procurement-ui-polish-report.json'),JSON.stringify(report,null,2));process.exit(0)}

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1600,height:1000},locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh'});
const page=await context.newPage();
page.on('console',m=>{if(m.type()==='error')report.console_errors.push(m.text())});
page.on('pageerror',e=>report.page_errors.push(String(e?.stack||e)));
const box=async sel=>{const b=await page.locator(sel).first().boundingBox();return b?{x:b.x,y:b.y,width:b.width,height:b.height}:null};
const delta=(a,b)=>!a||!b?999:Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.width-b.width),Math.abs(a.height-b.height));

try{
  await page.goto(`${BASE}/03_PLATFORM/01_AUTH/`,{waitUntil:'domcontentloaded',timeout:30000});
  await page.fill('#username',USER);await page.fill('#password',PASS);await page.locator('#loginForm button').click();
  await page.waitForURL('**/04_OWNER/Procurement/**',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForSelector('#app:not(.hidden)',{timeout:45000});
  await page.waitForLoadState('networkidle',{timeout:45000}).catch(()=>{});

  const family=await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily);
  if(/Be Vietnam Pro/i.test(family))ok('typography_be_vietnam_pro',family);else fail('typography_be_vietnam_pro',family);

  const visibleRaw=await page.locator('body').innerText();
  if(!visibleRaw.includes('*ĐỊNH GIÁ'))ok('no_raw_source_name','Không còn tên sheet kỹ thuật trong giao diện.');else fail('no_raw_source_name','Vẫn còn *ĐỊNH GIÁ trên màn hình.');

  await page.click('#newOrderBtn');await page.waitForSelector('#orderDialog[open]');await page.waitForTimeout(250);
  const scrollTop=await page.locator('#orderDialog .modal-body').evaluate(el=>el.scrollTop);
  if(scrollTop===0)ok('dialog_opens_at_top','scrollTop=0');else fail('dialog_opens_at_top',`scrollTop=${scrollTop}`);

  const modalBox=await box('#orderDialog');
  if(modalBox&&modalBox.width>=1450&&modalBox.height>=740&&modalBox.height<=820)ok('desktop_workspace_size',JSON.stringify(modalBox));else fail('desktop_workspace_size',JSON.stringify(modalBox));

  const headings=await page.locator('#orderDialog .line-head').innerText();
  const expected=['Hàng hóa','Quy cách mua','Số lượng','Giá hóa đơn','Quy đổi kho','Tạm tính'];
  const missingHeadings=expected.filter(x=>!headings.includes(x));
  if(!missingHeadings.length)ok('accounting_column_labels',expected.join(' | '));else fail('accounting_column_labels',`Thiếu: ${missingHeadings.join(', ')}`);
  const searchLabel=await page.locator('#orderDialog .line-tools label').innerText();
  if(searchLabel==='Tìm nhanh hàng hóa')ok('quick_search_label');else fail('quick_search_label',searchLabel);

  const ref=await page.evaluate(async()=>{const sb=globalThis.MAGASIN_CORE?.supabase.get();const q=await sb.from('v_procurement_product_price_context').select('product_id,product_code,base_unit').not('reference_id','is',null).order('product_code').limit(1).single();return q.data});
  if(!ref)throw new Error('Không tìm thấy hàng hóa có giá tham khảo.');
  await page.selectOption('.line-product',ref.product_id);await page.waitForTimeout(200);
  const refText=await page.locator('.line-reference').first().innerText();
  if(/^Giá tham khảo:/i.test(refText)&&!refText.includes('*ĐỊNH GIÁ'))ok('human_reference_copy',refText);else fail('human_reference_copy',refText);
  const packageText=await page.locator('.line-package option:checked').innerText();
  if(/^Giá tham khảo/i.test(packageText)&&!packageText.includes('*ĐỊNH GIÁ'))ok('human_package_copy',packageText);else fail('human_package_copy',packageText);

  const before={product:await box('.line-product'),package:await box('.line-package'),qty:await box('.line-qty'),price:await box('.line-price'),base:await box('.line-base'),total:await box('.line-total')};
  await page.fill('.line-qty','123.5');await page.fill('.line-price','987654');await page.waitForTimeout(200);
  const after={product:await box('.line-product'),package:await box('.line-package'),qty:await box('.line-qty'),price:await box('.line-price'),base:await box('.line-base'),total:await box('.line-total')};
  const shifts=Object.fromEntries(Object.keys(before).map(k=>[k,delta(before[k],after[k])]));
  const maxShift=Math.max(...Object.values(shifts));
  if(maxShift<=1.5)ok('entry_layout_stable',JSON.stringify(shifts));else fail('entry_layout_stable',JSON.stringify(shifts));

  const rowHeight=await page.locator('.line-row').first().evaluate(el=>el.getBoundingClientRect().height);
  if(rowHeight>=108&&rowHeight<=120)ok('line_height_stable',String(rowHeight));else fail('line_height_stable',String(rowHeight));
  const priceStatus=await page.locator('.line-price-status').first().innerText();
  if(priceStatus==='Chênh lệch rất lớn')ok('extreme_price_message',priceStatus);else fail('extreme_price_message',priceStatus);

  const summaryText=await page.locator('#orderDialog .order-summary').innerText();
  if(summaryText.includes('Dòng có giá tham khảo')&&summaryText.includes('Chênh lệch giá')&&summaryText.includes('Tổng tiền nhập')&&!summaryText.includes('*ĐỊNH GIÁ'))ok('summary_vietnamese_copy');else fail('summary_vietnamese_copy',summaryText);

  await page.screenshot({path:path.join(outDir,'ui-polish-order-desktop.png'),fullPage:true});
  await page.click('[data-close="orderDialog"]');
  await page.click('#nav button[data-tab="products"]');await page.waitForTimeout(200);
  const productText=await page.locator('#sec-products').innerText();
  if(productText.includes('Giá tham khảo')&&!productText.includes('*ĐỊNH GIÁ'))ok('catalog_vietnamese_copy');else fail('catalog_vietnamese_copy',productText.slice(0,500));
  await page.screenshot({path:path.join(outDir,'ui-polish-products.png'),fullPage:true});
}catch(e){fail('robot_exception',String(e?.stack||e))}finally{await browser.close()}
if(report.console_errors.length)fail('console_errors',report.console_errors.join(' | '));else ok('console_errors');
if(report.page_errors.length)fail('page_errors',report.page_errors.join(' | '));else ok('page_errors');
const failed=report.checks.filter(x=>x.status==='FAIL'),warned=report.checks.filter(x=>x.status==='WARN');report.status=failed.length?'FAIL':warned.length?'WARN':'PASS';
fs.writeFileSync(path.join(outDir,'procurement-ui-polish-report.json'),JSON.stringify(report,null,2));
console.log(`PROCUREMENT_UI_POLISH_QA=${report.status}`);for(const x of report.checks)console.log(`[${x.status}] ${x.name}${x.detail?` — ${x.detail}`:''}`);if(failed.length)process.exit(1);
