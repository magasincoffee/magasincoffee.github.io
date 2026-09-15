import fs from 'node:fs';
import path from 'node:path';

const target = process.argv[2] || '04_OWNER/Procurement/index.html';
const outDir = process.env.QA_OUT || 'qa-artifacts';
fs.mkdirSync(outDir, { recursive: true });

const html = fs.readFileSync(target, 'utf8');
const report = {
  target,
  generated_at: new Date().toISOString(),
  status: 'PASS',
  errors: [],
  warnings: [],
  checks: []
};

const pass = (name, detail = '') => report.checks.push({ name, status: 'PASS', detail });
const warn = (name, detail) => {
  report.warnings.push({ name, detail });
  report.checks.push({ name, status: 'WARN', detail });
};
const fail = (name, detail) => {
  report.errors.push({ name, detail });
  report.checks.push({ name, status: 'FAIL', detail });
};

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    const k = m[1].toLowerCase();
    if (k === 'input' || k === 'select' || k === 'button' || k === 'form' || k === 'dialog' || k === 'section' || k === 'div') continue;
    out[k] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return out;
}

// 1) Required structure.
const requiredIds = [
  'app','nav','sec-orders','sec-products','sec-suppliers','sec-payables','sec-reports',
  'productDialog','productForm','productBaseUnit','packageRows','addPackageBtn',
  'supplierDialog','supplierForm','orderDialog','orderForm','orderLines','paymentDialog','paymentForm',
  'ordersBody','productsBody','suppliersBody','payablesBody','topProductsBody','topSuppliersBody'
];
for (const id of requiredIds) {
  if (!new RegExp(`id=["']${id}["']`).test(html)) fail('required_id', `Thiếu id=${id}`);
}
if (!report.errors.some(x => x.name === 'required_id')) pass('required_ids', `${requiredIds.length} id bắt buộc đều tồn tại`);

// 2) Duplicate IDs in static DOM.
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
const dupIds = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
if (dupIds.length) fail('duplicate_ids', dupIds.join(', ')); else pass('duplicate_ids', `${ids.length} id tĩnh không trùng`);

// 3) Inline JS syntax.
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(Boolean);
if (!inlineScripts.length) fail('inline_js', 'Không tìm thấy inline script của Procurement');
else {
  let ok = true;
  inlineScripts.forEach((js, i) => {
    try { new Function(js); }
    catch (e) { ok = false; fail('inline_js_syntax', `Script #${i + 1}: ${e.message}`); }
  });
  if (ok) pass('inline_js_syntax', `${inlineScripts.length} inline script parse thành công`);
}

// 4) Numeric HTML validation audit — scans both DOM and template literals.
const numberInputs = [...html.matchAll(/<input\b[^>]*\btype=["']number["'][^>]*>/gi)].map(m => m[0]);
for (const tag of numberInputs) {
  const a = attrs(tag);
  const min = a.min === undefined || a.min === '' ? null : Number(a.min);
  const stepRaw = a.step ?? '';
  const value = a.value === undefined || a.value === '' || /\$\{/.test(a.value) ? null : Number(a.value);
  if (stepRaw && stepRaw !== 'any') {
    const step = Number(stepRaw);
    if (!(step > 0)) fail('number_step', `step không hợp lệ: ${tag}`);
    if (Number.isFinite(min) && Number.isFinite(step)) {
      const natural = [1, 10, 100, 1000];
      const validNatural = natural.some(v => Math.abs(((v - min) / step) - Math.round((v - min) / step)) < 1e-9);
      if (!validNatural) fail('number_step_lattice', `Các giá trị tự nhiên 1/10/100/1000 đều không hợp lệ với min=${min}, step=${step}: ${tag}`);
      if (Number.isFinite(value)) {
        const q = (value - min) / step;
        if (Math.abs(q - Math.round(q)) > 1e-9) fail('number_default_value', `value=${value} lệch step từ min=${min}, step=${step}: ${tag}`);
      }
    }
  }
}
if (!report.errors.some(x => x.name.startsWith('number_'))) pass('number_inputs', `${numberInputs.length} number input không có lỗi step/min đã biết`);

// 5) Procurement business-rule guards expected in source.
const sourceRules = [
  ['base_unit_ui_lock', /procurement_purchase_order_items[\s\S]*count\s*:\s*['"]exact['"]/],
  ['base_unit_lock_notice', /unitLockNotice/],
  ['package_factor_any_step', /class=["']pkg-factor["'][^>]*step=["']any["']/],
  ['atomic_order_rpc', /rpc\(['"]procurement_save_order['"]/],
  ['payment_rpc', /rpc\(['"]procurement_record_payment['"]/],
  ['cancel_rpc', /rpc\(['"]procurement_cancel_order['"]/],
  ['edit_reason_required_ui', /Khi chỉnh sửa đơn[\s\S]*lý do chỉnh sửa/],
  ['report_date_filter', /reportFrom[\s\S]*reportTo/]
];
for (const [name, re] of sourceRules) {
  if (re.test(html)) pass(name); else fail(name, 'Không tìm thấy guard/nghiệp vụ bắt buộc trong source');
}

// 6) Catch fragile date arithmetic that converts local dates through UTC.
if (/toISOString\(\)\.slice\(0\s*,\s*10\)/.test(html) && /function\s+addDays/.test(html)) {
  warn('date_arithmetic', 'addDays đang dùng toISOString(); có rủi ro lệch ngày theo múi giờ. Nên dùng phép tính UTC thuần hoặc thao tác chuỗi YYYY-MM-DD.');
} else {
  pass('date_arithmetic');
}

// 7) Unsafe / legacy patterns.
if (/min=["']0\.000001["'][^>]*step=["']0\.001["']/.test(html)) fail('legacy_factor_step_bug', 'Phát hiện lại lỗi min=0.000001 + step=0.001');
else pass('legacy_factor_step_bug');

if (/alert\s*\(/.test(html)) warn('blocking_alert', 'Có alert() blocking UI'); else pass('blocking_alert');

// 8) Core resource references.
for (const src of ['@supabase/supabase-js@2', '/02_CORE/shared/shared-core-v1.js']) {
  if (html.includes(src)) pass('runtime_dependency', src); else fail('runtime_dependency', `Thiếu ${src}`);
}

report.status = report.errors.length ? 'FAIL' : report.warnings.length ? 'WARN' : 'PASS';
const output = path.join(outDir, 'procurement-static-report.json');
fs.writeFileSync(output, JSON.stringify(report, null, 2));

console.log(`PROCUREMENT_STATIC_QA=${report.status}`);
for (const x of report.checks) console.log(`[${x.status}] ${x.name}${x.detail ? ` — ${x.detail}` : ''}`);
console.log(`Report: ${output}`);

if (report.errors.length) process.exit(1);
