// MAGASIN Product Import V1 — staging only, no database writes.
// Input: Google Sheets values matrix (values, not public CSV). Never log private rows.
const SKU=/^[A-Z0-9][A-Z0-9 ._\/-]{2,79}$/i;
function money(v){if(typeof v==='number')return Number.isSafeInteger(v)&&v>=0?v:null;if(typeof v!=='string')return null;const t=v.replace(/đ|₫|vnđ/gi,'').replace(/\s/g,'').trim();if(!/^\d{1,3}(?:\.\d{3})*$/.test(t)&&!/^\d+$/.test(t))return null;const n=Number(t.replace(/\./g,''));return Number.isSafeInteger(n)?n:null;}
function packageQty(v){const m=String(v??'').match(/(\d[\d.,]*)\s*cái\s*\/\s*(bao|thùng)/i);if(!m)return null;const n=Number(m[1].replace(/[.,]/g,''));return Number.isSafeInteger(n)&&n>0?{quantity:n,unit:m[2].toLowerCase()}:null;}
function isRowNo(v){return /^\d+$/.test(String(v??'').trim());}
function normalizedSku(v){return String(v??'').trim().replace(/\s+/g,' ').toUpperCase();}
function layout(row){const b=String(row[1]??'').trim(),c=String(row[2]??'').trim();const bCode=SKU.test(b)&&(/\d/.test(b)||b.includes('-'))&&!/\s{2}/.test(b);const cCode=SKU.test(c)&&(/\d/.test(c)||c.includes('-'))&&!/\s{2}/.test(c);if(bCode&&c.length>5&&!cCode)return 'B_SKU';if(cCode&&b.length>5&&!bCode)return 'C_SKU';if(bCode&&cCode){if(b.length<c.length/2)return 'B_SKU';if(c.length<b.length/2)return 'C_SKU';}return null;}
export function stageProductRows(rows,{startRow=1,sourceSheet='BẢNG BÁO GIÁ MỚI'}={}){
 const staged=[],issues=[],seen=new Map();
 rows.forEach((r,i)=>{const line=startRow+i;if(!isRowNo(r?.[0]))return;
 const kind=layout(r);if(!kind){issues.push({row:line,code:'LAYOUT_UNRESOLVED'});return;}
 const sku=normalizedSku(r[kind==='B_SKU'?1:2]),name=String(r[kind==='B_SKU'?2:1]??'').trim();
 if(!sku||!name||!SKU.test(sku)){issues.push({row:line,code:'INVALID_IDENTITY'});return;}
 const packing=packageQty(r[6]);
 const status=String(r[23]??'').trim();
 const item={source_sheet:sourceSheet,source_row:line,sku,name,source_layout:kind,package:packing,source_status:status||null,approval_status:'DRAFT',publishable:false,prices:[]};
 // Price extraction is permitted only for confirmed first layout.
 // E/F are procurement package price, O-Q and R-T are quotation tiers.
 // Columns U-W are not trusted until their header/region is approved.
 if(kind==='B_SKU'){
 item.purchase_prices={bulk_package:money(r[4]),standard_package:money(r[5])};
 for(const [idx,region,minQty] of [[14,'NATIONAL',1000],[15,'NATIONAL',3000],[16,'NATIONAL',10000],[17,'CAN_THO_URBAN',1000],[18,'CAN_THO_URBAN',3000],[19,'CAN_THO_URBAN',10000]]){
 const p=money(r[idx]);if(p!==null)item.prices.push({region,min_quantity:minQty,unit_price_vnd:p,approval_status:'DRAFT'});
 }
 }else{issues.push({row:line,code:'PRICE_LAYOUT_NEEDS_REVIEW',sku});}
 if(!packing)issues.push({row:line,code:'PACKAGE_QTY_NEEDS_REVIEW',sku});
 if(seen.has(sku))issues.push({row:line,code:'DUPLICATE_SKU',sku,other_row:seen.get(sku)});else seen.set(sku,line);
 if(status&&!['SẴN KHO','CHỜ NHẬP HÀNG'].includes(status))issues.push({row:line,code:'UNKNOWN_STATUS',sku});
 staged.push(item);
 });
 return {summary:{rows_examined:rows.length,staged:staged.length,issues:issues.length,unique_skus:seen.size},staged,issues};
}
