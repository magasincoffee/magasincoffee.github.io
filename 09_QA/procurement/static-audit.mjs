import fs from 'node:fs';
import path from 'node:path';

const target = process.argv[2] || '04_OWNER/Procurement/index.html';
const outDir = process.env.QA_OUT || 'qa-artifacts';
fs.mkdirSync(outDir, { recursive: true });

const html = fs.readFileSync(target, 'utf8');
const baseDir = path.dirname(target);
const scriptFiles = [...html.matchAll(/<script[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)]
  .map(m => m[1])
  .filter(src => src.startsWith('./'))
  .map(src => path.join(baseDir, src.slice(2)));
const cssFiles = [...html.matchAll(/<link[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
  .map(m => m[1])
  .filter(src => src.startsWith('./'))
  .map(src => path.join(baseDir, src.slice(2)));
const jsParts = scriptFiles.map(file => ({file, content:fs.existsSync(file)?fs.readFileSync(file,'utf8'):''}));
const source = [html, ...jsParts.map(x=>x.content)].join('\n');

const report = {target,generated_at:new Date().toISOString(),status:'PASS',errors:[],warnings:[],checks:[]};
const pass=(name,detail='')=>report.checks.push({name,status:'PASS',detail});
const warn=(name,detail)=>{report.warnings.push({name,detail});report.checks.push({name,status:'WARN',detail})};
const fail=(name,detail)=>{report.errors.push({name,detail});report.checks.push({name,status:'FAIL',detail})};

function attrs(tag){const out={};for(const m of tag.matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)){const k=m[1].toLowerCase();if(['input','select','button','form','dialog','section','div'].includes(k))continue;out[k]=m[2]??m[3]??m[4]??''}return out}

const requiredIds=['app','nav','sec-orders','sec-products','sec-suppliers','sec-payables','sec-reports','productDialog','productForm','productBaseUnit','packageRows','addPackageBtn','supplierDialog','supplierForm','orderDialog','orderForm','orderLines','lineProductFilter','orderValidation','orderReferenceCount','orderPriceWarnCount','paymentDialog','paymentForm','ordersBody','productsBody','suppliersBody','payablesBody','topProductsBody','topSuppliersBody'];
for(const id of requiredIds){if(!new RegExp(`id=["']${id}["']`).test(html))fail('required_id',`Thiếu id=${id}`)}
if(!report.errors.some(x=>x.name==='required_id'))pass('required_ids',`${requiredIds.length} id bắt buộc đều tồn tại`);

const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
const dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];
if(dup.length)fail('duplicate_ids',dup.join(', '));else pass('duplicate_ids',`${ids.length} id tĩnh không trùng`);

for(const file of [...scriptFiles,...cssFiles]){if(!fs.existsSync(file))fail('local_asset_missing',file);else pass('local_asset',file)}
for(const {file,content} of jsParts){if(!content){fail('js_empty',file);continue}try{new Function(content);pass('js_syntax',file)}catch(e){fail('js_syntax',`${file}: ${e.message}`)}}

const numberInputs=[...source.matchAll(/<input\b[^>]*\btype=["']number["'][^>]*>/gi)].map(m=>m[0]);
for(const tag of numberInputs){const a=attrs(tag),min=a.min===undefined||a.min===''?null:Number(a.min),stepRaw=a.step??'',value=a.value===undefined||a.value===''||/\$\{/.test(a.value)?null:Number(a.value);if(stepRaw&&stepRaw!=='any'){const step=Number(stepRaw);if(!(step>0))fail('number_step',`step không hợp lệ: ${tag}`);if(Number.isFinite(min)&&Number.isFinite(step)&&Number.isFinite(value)){const q=(value-min)/step;if(Math.abs(q-Math.round(q))>1e-9)fail('number_default_value',`value=${value} lệch step từ min=${min}, step=${step}`)}}}
if(!report.errors.some(x=>x.name.startsWith('number_')))pass('number_inputs',`${numberInputs.length} number input không có lỗi step/min đã biết`);

const rules=[
 ['atomic_order_rpc',/rpc\(['"]procurement_save_order['"]/],
 ['payment_rpc',/rpc\(['"]procurement_record_payment['"]/],
 ['cancel_rpc',/rpc\(['"]procurement_cancel_order['"]/],
 ['base_unit_lock_query',/procurement_purchase_order_items[\s\S]*count\s*:\s*['"]exact['"]/],
 ['base_unit_lock_notice',/unitLockNotice/],
 ['canonical_policy',/Nguyên liệu định lượng[\s\S]*(g|ml)/i],
 ['reference_view',/v_procurement_product_price_context/],
 ['reference_source',/\*ĐỊNH GIÁ/],
 ['reference_mode',/__REFERENCE__/],
 ['reference_price_warning',/line-price-status/],
 ['edit_reason_required_ui',/lý do chỉnh sửa/i],
 ['report_date_filter',/reportFrom[\s\S]*reportTo/],
 ['xss_escape',/escapeHtml/]
];
for(const [name,re] of rules){if(re.test(source))pass(name);else fail(name,'Không tìm thấy guard/nghiệp vụ bắt buộc trong source')}

if(/toISOString\(\)\.slice\(0\s*,\s*10\)/.test(source)&&/function\s+addDays/.test(source))warn('date_arithmetic','addDays đang dùng toISOString(); có rủi ro lệch ngày.');else pass('date_arithmetic');
if(/min=["']0\.000001["'][^>]*step=["']0\.001["']/.test(source))fail('legacy_factor_step_bug','Phát hiện lại lỗi min=0.000001 + step=0.001');else pass('legacy_factor_step_bug');
if(/alert\s*\(/.test(source))warn('blocking_alert','Có alert() blocking UI');else pass('blocking_alert');

for(const src of ['@supabase/supabase-js@2','/02_CORE/shared/shared-core-v1.js','./procurement-v2.css','./procurement-v2-core.js','./procurement-v2-orders.js','./procurement-v2-boot.js']){if(html.includes(src))pass('runtime_dependency',src);else fail('runtime_dependency',`Thiếu ${src}`)}

report.status=report.errors.length?'FAIL':report.warnings.length?'WARN':'PASS';
const output=path.join(outDir,'procurement-static-report.json');
fs.writeFileSync(output,JSON.stringify(report,null,2));
console.log(`PROCUREMENT_STATIC_QA=${report.status}`);for(const x of report.checks)console.log(`[${x.status}] ${x.name}${x.detail?` — ${x.detail}`:''}`);console.log(`Report: ${output}`);if(report.errors.length)process.exit(1);
