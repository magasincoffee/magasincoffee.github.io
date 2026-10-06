const dash=document.getElementById("strategyDashboard");
if(dash){
 const money=v=>Number.isFinite(Number(v))?new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(Number(v)):"—";
 const pct=v=>Number.isFinite(Number(v))?new Intl.NumberFormat("vi-VN",{maximumFractionDigits:1}).format(Number(v))+"%":"—";
 const count=v=>Number.isFinite(Number(v))?new Intl.NumberFormat("vi-VN").format(Number(v)):"—";
 const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
 const empty=(text="Chưa có nguồn authoritative/read-only đủ tin cậy.")=>'<div class="strategy-empty">'+text+'</div>';
 const list=(id,rows,formatter=v=>String(v??"—"))=>{
  const el=document.getElementById(id);if(!el)return;el.innerHTML="";
  if(!Array.isArray(rows)||!rows.length){el.innerHTML=empty();return}
  for(const row of rows){const item=document.createElement("div");item.className="strategy-list-item";const a=document.createElement("span"),b=document.createElement("strong");a.textContent=String(row.label||"—");b.textContent=formatter(row.value);item.append(a,b);el.append(item)}
 };
 const renderTrend=rows=>{
  const el=document.getElementById("strategyTrendBars");if(!el)return;el.innerHTML="";
  if(!Array.isArray(rows)||!rows.length){el.innerHTML=empty("Chưa có chuỗi thời gian authoritative.");return}
  const max=Math.max(1,...rows.flatMap(x=>[Number(x.revenue)||0,Math.abs(Number(x.profit)||0)]));
  for(const row of rows){const col=document.createElement("div");col.className="strategy-trend-col";const stack=document.createElement("div");stack.className="strategy-trend-stack";
   const r=document.createElement("i");r.className="strategy-trend-bar strategy-trend-revenue";r.style.height=Math.max(3,Math.round((Number(row.revenue)||0)/max*110))+"px";r.title="Doanh thu "+money(row.revenue);
   const p=document.createElement("i");p.className="strategy-trend-bar strategy-trend-profit";p.style.height=Math.max(3,Math.round(Math.abs(Number(row.profit)||0)/max*110))+"px";p.title="Lợi nhuận "+money(row.profit);
   const label=document.createElement("small");label.textContent=String(row.label||"");stack.append(r,p);col.append(stack,label);el.append(col)}
 };
 const productionModel=()=>{
  const revenueQuality=document.getElementById("revenueQuality")?.dataset.quality||"NOT_CONNECTED";
  const revenueText=document.getElementById("revenueValue")?.textContent?.trim()||"—";
  const trusted=["ACTUAL","ESTIMATE"].includes(revenueQuality)&&revenueText!=="—";
  return {fixture:false,revenueText:trusted?revenueText:"—",revenueMeta:trusted?("Nguồn "+revenueQuality+" từ Control Tower"):"Chưa có dữ liệu doanh thu đủ tin cậy",
   cost:null,profit:null,margin:null,cashflow:null,targetProgress:null,trend:[],stores:[],products:[],customers:[],alerts:[],forecast:[]};
 };
 const render=()=>{
  const fixture=globalThis.__MAGASIN_OWNER_STRATEGY_READ_MODEL__;
  const model=fixture&&fixture.fixture===true?fixture:productionModel();
  const source=document.getElementById("strategySourceMode");if(source){source.dataset.mode=model.fixture?"fixture":"read-only";source.textContent=model.fixture?"FIXTURE READ-ONLY":"READ-ONLY"}
  set("strategyRevenue",model.revenueText||money(model.revenue));set("strategyRevenueMeta",model.revenueMeta||"Nguồn read-only");
  set("strategyCost",money(model.cost));set("strategyCostMeta",Number.isFinite(Number(model.cost))?"Nguồn read-only":"Chưa kết nối nguồn chi phí");
  set("strategyProfit",money(model.profit));set("strategyProfitMeta",Number.isFinite(Number(model.profit))?"Nguồn read-only":"Không suy diễn khi thiếu chi phí");
  set("strategyMargin",pct(model.margin));set("strategyMarginMeta",Number.isFinite(Number(model.margin))?"Biên lợi nhuận read-only":"Chỉ hiển thị khi có nguồn hợp lệ");
  set("strategyCashflow",money(model.cashflow));set("strategyCashflowMeta",Number.isFinite(Number(model.cashflow))?"Nguồn read-only":"Chưa kết nối nguồn dòng tiền");
  set("strategyTargetProgress",pct(model.targetProgress));set("strategyTargetMeta",Number.isFinite(Number(model.targetProgress))?"Tiến độ theo mục tiêu read-only":"Chưa có mục tiêu authoritative");
  set("strategyTrendHeadline",model.trendHeadline||"—");renderTrend(model.trend);
  list("strategyStoreComparison",model.stores,money);list("strategyProductPerformance",model.products,v=>String(v??"—"));list("strategyCustomerTrends",model.customers,v=>String(v??"—"));list("strategyAlerts",model.alerts,v=>String(v??"—"));list("strategyForecastTargets",model.forecast,v=>String(v??"—"));
  set("strategyWorkforceGap",document.getElementById("workforceGap")?.textContent?.trim()||count(model.workforceGap));
  set("strategyWorkforceUnresolved",document.getElementById("workforceUnresolved")?.textContent?.trim()||count(model.workforceUnresolved));
  dash.dataset.strategyState="ready";
 };
 const observer=new MutationObserver(()=>{if(document.body.dataset.ownerOverviewLoading==="false")render()});
 observer.observe(document.body,{attributes:true,attributeFilter:["data-owner-overview-loading"]});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render();
}