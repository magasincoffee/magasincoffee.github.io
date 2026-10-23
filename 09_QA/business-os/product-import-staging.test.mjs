import assert from 'node:assert/strict';
import {stageProductRows} from '../../08_INTEGRATIONS/product-import/stage-sheet.mjs';
const input=[
 [1,'SKU-700','Ly nhựa PP 700ml','Bao', '278.000 đ','303.000 đ','1.000 cái/ Bao',null,null,null,null,null,null,null,495,485,465,410,400,380,null,null,null,'SẴN KHO'],
 [2,'Ly nhựa PET 16oz','PET-16OZ','Ly','543.000 đ','568.000 đ','1.000 cái/ Thùng']
];
const result=stageProductRows(input,{startRow:9});
assert.equal(result.summary.staged,2);
assert.equal(result.staged[0].sku,'SKU-700');
assert.deepEqual(result.staged[0].package,{quantity:1000,unit:'bao'});
assert.equal(result.staged[0].prices[0].unit_price_vnd,495);
assert.equal(result.staged[0].publishable,false);
assert.equal(result.staged[1].source_layout,'C_SKU');
assert.equal(result.staged[1].prices.length,0);
assert.ok(result.issues.some(x=>x.code==='PRICE_LAYOUT_NEEDS_REVIEW'));
const dup=stageProductRows([input[0],input[0]]);
assert.ok(dup.issues.some(x=>x.code==='DUPLICATE_SKU'));
console.log('PASS product staging import tests');
