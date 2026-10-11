// XSTORE-019N: production Owner strategic read model from authenticated Control Tower.
// This projection does not issue RPCs, infer profit from payables, or fabricate SAPO metrics.
const finite = value => typeof value === 'number' && Number.isFinite(value);
const label = value => typeof value === 'string' ? value.trim().slice(0,180) : '';
const sourceDate = value => /^\d{4}-\d{2}-\d{2}$/.test(label(value)) ? label(value) : null;
const verified = (section, field) => section?.quality === 'ACTUAL' && finite(section?.[field]) && !!label(section?.source) && !!label(section?.asOf);

let lastAuthorizedSnapshot=null;
// Module-scoped handoff avoids missing an Owner Control Tower event at module boot.
export function recordOwnerStrategicSnapshot(snapshot){
 lastAuthorizedSnapshot=snapshot&&typeof snapshot==='object'?snapshot:null;
}
export function readOwnerStrategicSnapshot(){return lastAuthorizedSnapshot;}

export function projectOwnerStrategicSnapshot(snapshot) {
 const context = snapshot?.context || {};
 const date = sourceDate(context.reportingDate);
 const scope = label(context.branchScope) || 'ALL';
 const revenue = snapshot?.revenue || {};
 const payables = snapshot?.payables || {};
 // Revenue must be reconciled ACTUAL and explicit about date/source/coverage.
 const revenueValid = !!date && verified(revenue, 'amount') && revenue.amount >= 0;
 const debtValid = verified(payables, 'totalDue') && payables.totalDue >= 0;
 const revenueMeta = revenueValid
   ? ['ACTUAL', label(revenue.source), 'ngày ' + date, 'phạm vi ' + scope, 'đối soát ' + label(revenue.asOf)].join(' · ')
   : 'Chưa có doanh thu ACTUAL đã đối soát kèm nguồn/ngày/phạm vi';
 const alerts = debtValid ? [{label:'Công nợ phải trả (không phải chi phí)', value:payables.totalDue, source:label(payables.source), asOf:label(payables.asOf), metric:'PAYABLES'}] : [];
 return {
   fixture:false, periodLabel: date ? 'Ngày ' + date : 'Kỳ chưa xác định',
   revenue:revenueValid ? revenue.amount : null, revenueText:null, revenueMeta,
   // Payables are liabilities, NOT incurred costs. No canonical complete P&L source exists here.
   cost:null,profit:null,margin:null,cashflow:null,targetProgress:null,
   trend:[],stores:[],revenueMix:[],costMix:[],products:[],customers:[],forecast:[],alerts,
   sourceContracts:{
     revenue:{quality:revenueValid?'ACTUAL':'UNAVAILABLE',source:revenueValid?label(revenue.source):null,asOf:revenueValid?label(revenue.asOf):null,date,scope},
     costs:{quality:'UNAVAILABLE',reason:'Verified complete cost-of-sales and operating expenses not connected'},
     profit:{quality:'UNAVAILABLE',reason:'Cannot derive P&L or margin from revenue and outstanding payables'},
     stores:{quality:'UNAVAILABLE',reason:'No source-qualified per-store aggregate in Control Tower snapshot'},
     products:{quality:'UNAVAILABLE',reason:'No source-qualified product aggregate in Control Tower snapshot'},
     customers:{quality:'UNAVAILABLE',reason:'No source-qualified customer aggregate in Control Tower snapshot'},
     payables:{quality:debtValid?'ACTUAL':'UNAVAILABLE',source:debtValid?label(payables.source):null}
   }
 };
}
