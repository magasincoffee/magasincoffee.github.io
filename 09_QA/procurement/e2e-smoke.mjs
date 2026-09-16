import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL || 'https://magasincoffee.github.io';
const USER = process.env.PROCUREMENT_QA_USERNAME || '';
const PASS = process.env.PROCUREMENT_QA_PASSWORD || '';
const outDir = process.env.QA_OUT || 'qa-artifacts';
fs.mkdirSync(outDir, { recursive: true });

const report = {generated_at:new Date().toISOString(),base_url:BASE,status:'PASS',skipped:false,checks:[],console_errors:[],page_errors:[],request_failures:[],http_errors:[]};
const ok=(name,detail='')=>report.checks.push({name,status:'PASS',detail});
const warn=(name,detail='')=>report.checks.push({name,status:'WARN',detail});
const fail=(name,detail='')=>report.checks.push({name,status:'FAIL',detail});

if(!USER||!PASS){report.status='SKIPPED';report.skipped=true;warn('credentials','Thiếu PROCUREMENT_QA_USERNAME / PROCUREMENT_QA_PASSWORD trong GitHub Actions secrets.');fs.writeFileSync(path.join(outDir,'procurement-e2e-report.json'),JSON.stringify(report,null,2));console.log('PROCUREMENT_E2E_QA=SKIPPED');process.exit(0)}

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1100},locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh'});
const page=await context.newPage();
page.on('console',msg=>{if(msg.type()==='error')report.console_errors.push(msg.text())});
page.on('pageerror',err=>report.page_errors.push(String(err?.stack||err?.message||err)));
page.on('requestfailed',req=>{const u=req.url();if(!/google-analytics|googletagmanager|favicon/i.test(u))report.request_failures.push({url:u,method:req.method(),resource_type:req.resourceType(),error:req.failure()?.errorText||'unknown'})});
page.on('response',res=>{const u=res.url();if(res.status()>=500&&(/magasincoffee\.github\.io|127\.0\.0\.1|supabase\.co/.test(u)))report.http_errors.push({url:u,status:res.status()})});
async function shot(name){await page.screenshot({path:path.join(outDir,`${name}.png`),fullPage:true})}
async function visible(sel,name){try{await page.locator(sel).waitFor({state:'visible',timeout:10000});ok(name);return true}catch(e){fail(name,e.message);return false}}

try{
  await page.goto(`${BASE}/03_PLATFORM/01_AUTH/`,{waitUntil:'domcontentloaded',timeout:30000});
  await page.fill('#username',USER);await page.fill('#password',PASS);await page.locator('#loginForm button').click();
  const loginOutcome=await Promise.race([
    page.waitForURL('**/04_OWNER/Procurement/**',{waitUntil:'domcontentloaded',timeout:45000}).then(()=> 'success'),
    page.locator('#msg.error:not([hidden])').waitFor({state:'visible',timeout:45000}).then(()=> 'error')
  ]);
  if(loginOutcome==='error')throw new Error(`Đăng nhập QA thất bại: ${await page.locator('#msg').innerText()}`);
  await page.waitForLoadState('networkidle',{timeout:45000});
  if(await page.locator('#denied:not(.hidden)').count()){fail('access',await page.locator('#deniedText').innerText().catch(()=> 'Không có quyền'));throw new Error('QA account không truy cập được Procurement')}
  await visible('#app:not(.hidden)','app_loaded');
  const coverage=(await page.locator('#referenceCoverage').innerText().catch(()=>'' )).replace(/\s+/g,' ');
  if(/51\/55/.test(coverage))ok('reference_coverage_ui',coverage);else fail('reference_coverage_ui',coverage||'Không có nội dung coverage');
  await shot('01-app-loaded');

  for(const tab of ['orders','products','suppliers','payables','reports']){await page.click(`#nav button[data-tab="${tab}"]`);await visible(`#sec-${tab}.active`,`tab_${tab}`)}

  await page.click('#nav button[data-tab="reports"]');await page.click('#runReportBtn');await page.waitForTimeout(800);ok('report_refresh');await shot('02-reports');

  await page.click('#nav button[data-tab="products"]');
  const productRows=await page.locator('#productsBody tr').count();
  if(productRows>=55)ok('product_catalog_rows',String(productRows));else fail('product_catalog_rows',`Chỉ có ${productRows} dòng`);
  const missingBadges=await page.locator('#productsBody .badge.warn').filter({hasText:'Chưa có giá tham khảo'}).count();
  if(missingBadges===4)ok('reference_missing_badges','4 mặt hàng chưa có giá tham khảo');else fail('reference_missing_badges',`Hiển thị ${missingBadges} badge`);
  const editProduct=page.locator('[data-edit-product]').first();
  if(await editProduct.count()){
    const productId=await editProduct.getAttribute('data-edit-product');await editProduct.click();await visible('#productDialog[open]','product_dialog_open');
    const factor=page.locator('#productDialog .pkg-factor').first();
    if(await factor.count()){await factor.fill('1');const validity=await factor.evaluate(el=>({valid:el.checkValidity(),message:el.validationMessage,step:el.getAttribute('step'),min:el.getAttribute('min')}));if(!validity.valid)fail('package_factor_value_1',JSON.stringify(validity));else ok('package_factor_value_1',`step=${validity.step}, min=${validity.min}`)}else warn('package_factor_value_1','Không có ô quy đổi để kiểm tra');
    const lockState=await page.evaluate(async id=>{const sb=globalThis.MAGASIN_CORE?.supabase.get();const q=await sb.from('procurement_purchase_order_items').select('id',{count:'exact',head:true}).eq('product_id',id);return {count:Number(q.count||0),error:q.error?.message||null,disabled:document.querySelector('#productBaseUnit')?.disabled||false}},productId);
    if(lockState.error)fail('base_unit_lock_query',lockState.error);else if((lockState.count>0)!==lockState.disabled)fail('base_unit_lock_ui',JSON.stringify(lockState));else ok('base_unit_lock_ui',JSON.stringify(lockState));
    await page.click('[data-close="productDialog"]');
  }else warn('product_dialog','Danh mục chưa có hàng hóa để mở Sửa');
  await shot('03-products');

  await page.click('#nav button[data-tab="orders"]');await page.click('#newOrderBtn');await page.waitForTimeout(500);
  if(await page.locator('#orderDialog[open]').count()){
    ok('new_order_dialog');
    const ref=await page.evaluate(async()=>{const sb=globalThis.MAGASIN_CORE?.supabase.get();const q=await sb.from('v_procurement_product_price_context').select('product_id,product_code,source_price,reference_base_quantity,base_unit').not('reference_id','is',null).order('product_code').limit(1).single();return {data:q.data,error:q.error?.message||null}});
    if(ref.error||!ref.data){fail('reference_pick_source',ref.error||'Không có dữ liệu tham chiếu')}else{
      await page.selectOption('.line-product',ref.data.product_id);await page.waitForTimeout(150);
      const ui=await page.locator('.line-row').first().evaluate(row=>({mode:row.querySelector('.line-package')?.value,price:Number(row.querySelector('.line-price')?.value||0),qty:Number(row.querySelector('.line-qty')?.value||0),baseText:row.querySelector('.line-base')?.textContent||'',referenceText:row.querySelector('.line-reference')?.textContent||''}));
      if(ui.mode==='__REFERENCE__')ok('reference_mode_default',ref.data.product_code);else fail('reference_mode_default',JSON.stringify(ui));
      if(Math.abs(ui.price-Number(ref.data.source_price))<0.001)ok('reference_price_prefill',String(ui.price));else fail('reference_price_prefill',`UI=${ui.price}, DB=${ref.data.source_price}`);
      if(ui.qty===1)ok('reference_qty_default','1 quy cách');else fail('reference_qty_default',String(ui.qty));
      if(ui.baseText.includes(String(ref.data.base_unit))||/kg|lít/.test(ui.baseText))ok('reference_base_conversion',ui.baseText);else fail('reference_base_conversion',ui.baseText);
      if(/^Giá tham khảo:/i.test(ui.referenceText)&&!ui.referenceText.includes('*ĐỊNH GIÁ'))ok('reference_source_visible',ui.referenceText);else fail('reference_source_visible',ui.referenceText);
    }
    const supplier=page.locator('#orderSupplier option').filter({hasNotText:'-- Chọn'}).first();
    const product=page.locator('.line-product option').filter({hasNotText:'-- Chọn'}).first();
    if(await supplier.count()&&await product.count()){
      const supplierValue=await supplier.getAttribute('value'),productValue=await product.getAttribute('value');await page.selectOption('#orderSupplier',supplierValue||'');await page.selectOption('.line-product',productValue||'');await page.fill('.line-qty','2');await page.fill('.line-price','1000');await page.waitForTimeout(200);const total=await page.locator('#orderGrandTotal').innerText();if(/2[.\s]?000/.test(total))ok('order_total_calculation',total);else fail('order_total_calculation',total)
    }else warn('order_ui_data','Chưa đủ NCC/hàng hóa active để test tính tiền.');
    await shot('04-order-dialog');await page.click('[data-close="orderDialog"]');
  }else warn('new_order_dialog','Không mở được form; thường do chưa có NCC hoặc hàng hóa ACTIVE.');
  await shot('05-orders');

  const db=await page.evaluate(async()=>{const sb=globalThis.MAGASIN_CORE?.supabase.get();const [orders,payments,allocs,items,products,refs,packages]=await Promise.all([
    sb.from('v_procurement_order_summary').select('id,order_no,total_amount,paid_amount,balance_due,status,payment_status'),
    sb.from('procurement_supplier_payments').select('id,supplier_id,amount,status'),
    sb.from('procurement_supplier_payment_allocations').select('payment_id,purchase_order_id,amount'),
    sb.from('procurement_purchase_order_items').select('id,purchase_order_id,product_id,package_id,base_qty_per_unit,quantity,unit_price'),
    sb.from('procurement_products').select('id,code,name,base_unit,status'),
    sb.from('v_procurement_product_price_context').select('product_id,product_code,reference_id,source_price,reference_base_quantity'),
    sb.from('procurement_product_packages').select('id,product_id,label,status')
  ]);return {errors:[orders.error?.message,payments.error?.message,allocs.error?.message,items.error?.message,products.error?.message,refs.error?.message,packages.error?.message].filter(Boolean),orders:orders.data||[],payments:payments.data||[],allocs:allocs.data||[],items:items.data||[],products:products.data||[],refs:refs.data||[],packages:packages.data||[]}});
  if(db.errors.length)fail('db_read',db.errors.join(' | '));else{
    const overpaid=db.orders.filter(x=>Number(x.paid_amount)>Number(x.total_amount)+0.000001),negative=db.orders.filter(x=>Number(x.balance_due)<-0.000001),emptyOrders=db.orders.filter(o=>o.status!=='CANCELLED'&&!db.items.some(i=>i.purchase_order_id===o.id));
    const payAlloc=new Map();for(const a of db.allocs)payAlloc.set(a.payment_id,(payAlloc.get(a.payment_id)||0)+Number(a.amount||0));const paymentMismatch=db.payments.filter(p=>p.status==='ACTIVE'&&Math.abs((payAlloc.get(p.id)||0)-Number(p.amount||0))>0.000001);
    if(overpaid.length)fail('db_overpaid_orders',overpaid.map(x=>x.order_no).join(','));else ok('db_overpaid_orders');
    if(negative.length)fail('db_negative_balance',negative.map(x=>x.order_no).join(','));else ok('db_negative_balance');
    if(emptyOrders.length)fail('db_empty_orders',emptyOrders.map(x=>x.order_no).join(','));else ok('db_empty_orders');
    if(paymentMismatch.length)fail('db_payment_allocation_mismatch',`${paymentMismatch.length} payment`);else ok('db_payment_allocation_mismatch');
    const illegalUnits=db.products.filter(p=>!['g','ml','cái'].includes(p.base_unit));if(illegalUnits.length)fail('canonical_units',JSON.stringify(illegalUnits));else ok('canonical_units',`${db.products.length} sản phẩm chỉ dùng g/ml/cái`);
    const mustG=['BB015','BB007','BB008'].filter(code=>db.products.find(p=>p.code===code)?.base_unit!=='g');if(mustG.length)fail('source_mass_conversions',mustG.join(','));else ok('source_mass_conversions','BB015/BB007/BB008 = g');
    const refRows=db.refs.filter(r=>r.reference_id),missing=db.refs.filter(r=>!r.reference_id).map(r=>r.product_code).sort();if(refRows.length===51)ok('db_reference_count','51');else fail('db_reference_count',String(refRows.length));
    if(JSON.stringify(missing)===JSON.stringify(['BB004','BTP003','NL012','NL025']))ok('db_reference_missing_set',missing.join(','));else fail('db_reference_missing_set',missing.join(','));
    const invalidRef=refRows.filter(r=>!(Number(r.source_price)>=0&&Number(r.reference_base_quantity)>0));if(invalidRef.length)fail('db_reference_validity',invalidRef.map(r=>r.product_code).join(','));else ok('db_reference_validity');
    const codeById=new Map(db.products.map(p=>[p.id,p.code]));const badPackages=db.packages.filter(p=>p.status==='ACTIVE'&&p.label==='Bao 30kg'&&['BB016','BB017'].includes(codeById.get(p.product_id)));if(badPackages.length)fail('placeholder_packages_retired',String(badPackages.length));else ok('placeholder_packages_retired');
  }
}catch(e){fail('robot_exception',String(e?.stack||e))}finally{await shot('99-final').catch(()=>{});await browser.close()}

if(report.console_errors.length)fail('console_errors',report.console_errors.join(' | '));else ok('console_errors');
if(report.page_errors.length)fail('page_errors',report.page_errors.join(' | '));else ok('page_errors');
const actionableRequestFailures=report.request_failures.filter(x=>!(x.method==='HEAD'&&x.error==='net::ERR_ABORTED')),benignHeadAborts=report.request_failures.filter(x=>x.method==='HEAD'&&x.error==='net::ERR_ABORTED');
if(actionableRequestFailures.length)fail('request_failures',JSON.stringify(actionableRequestFailures));else ok('request_failures',benignHeadAborts.length?`Đã bỏ qua ${benignHeadAborts.length} HEAD request kết thúc không có body.`:'');
if(report.http_errors.length)fail('http_5xx',JSON.stringify(report.http_errors));else ok('http_5xx');
const failed=report.checks.filter(x=>x.status==='FAIL'),warned=report.checks.filter(x=>x.status==='WARN');report.status=failed.length?'FAIL':warned.length?'WARN':'PASS';fs.writeFileSync(path.join(outDir,'procurement-e2e-report.json'),JSON.stringify(report,null,2));console.log(`PROCUREMENT_E2E_QA=${report.status}`);for(const x of report.checks)console.log(`[${x.status}] ${x.name}${x.detail?` — ${x.detail}`:''}`);if(failed.length)process.exit(1);
