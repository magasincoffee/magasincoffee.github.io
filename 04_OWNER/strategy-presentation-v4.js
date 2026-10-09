const dash=document.getElementById("strategyDashboard");
if(dash){
 const hasMetric=v=>v!==null&&v!==undefined&&v!==""&&typeof v!=="boolean"&&Number.isFinite(Number(v));
 const money=v=>hasMetric(v)?new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(Number(v)):"—";
 const pct=v=>hasMetric(v)?new Intl.NumberFormat("vi-VN",{maximumFractionDigits:1}).format(Number(v))+"%":"—";
 const count=v=>hasMetric(v)?new Intl.NumberFormat("vi-VN").format(Number(v)):"—";
 const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
 const empty=(text="Chưa có dữ liệu được xác minh cho báo cáo này.")=>'<div class="strategy-empty" role="status"><strong>Chưa có dữ liệu</strong><span>'+text+'</span></div>';
 const list=(id,rows,formatter=v=>String(v??"—"),bars=false)=>{
  const el=document.getElementById(id);if(!el)return;el.innerHTML="";
  if(!Array.isArray(rows)||!rows.length){el.dataset.sourceStatus="unavailable";el.innerHTML=empty();return}el.dataset.sourceStatus="available"
  const numeric=rows.map(r=>r.value).filter(hasMetric).map(Number),max=Math.max(1,...numeric.map(Math.abs));
  for(const row of rows){
   const item=document.createElement("div");item.className="strategy-list-item";
   const a=document.createElement("span"),b=document.createElement("strong");a.textContent=String(row.label||"—");b.textContent=formatter(row.value);
   if(bars&&hasMetric(row.value)){const share=hasMetric(row.share)?Number(row.share):Math.round(Math.abs(Number(row.value))/max*100);item.style.setProperty("--bar",Math.max(7,Math.min(100,share))+"%")}else if(bars){item.classList.add("strategy-value-unavailable")}
   item.append(a,b);el.append(item)
  }
 };
 const renderTrend=rows=>{
  const el=document.getElementById("strategyTrendBars");if(!el)return;el.innerHTML="";
  const verified=Array.isArray(rows)?rows.filter(x=>hasMetric(x.revenue)&&hasMetric(x.profit)):[];
  if(!verified.length){el.dataset.sourceStatus="unavailable";el.innerHTML=empty("Chưa có chuỗi doanh thu và lợi nhuận đã xác minh.");return}el.dataset.sourceStatus="available"
  const max=Math.max(1,...verified.flatMap(x=>[Number(x.revenue),Math.abs(Number(x.profit))]));
  for(const row of verified){
   const col=document.createElement("div");col.className="strategy-trend-col";const stack=document.createElement("div");stack.className="strategy-trend-stack";
   const rv=document.createElement("i");rv.className="strategy-trend-bar strategy-trend-revenue";rv.style.height=Math.max(3,Math.round((Number(row.revenue)||0)/max*96))+"px";rv.title="Doanh thu "+money(row.revenue);
   const pf=document.createElement("i");pf.className="strategy-trend-bar strategy-trend-profit";pf.style.height=Math.max(3,Math.round(Math.abs(Number(row.profit)||0)/max*96))+"px";pf.title="Lợi nhuận "+money(row.profit);
   const label=document.createElement("small");label.textContent=String(row.label||"");stack.append(rv,pf);col.append(stack,label);el.append(col)
  }
 };
 const renderDonut=(id,rows,label)=>{
  const el=document.getElementById(id);if(!el)return;el.innerHTML="";
  if(!Array.isArray(rows)||!rows.length){el.dataset.sourceStatus="unavailable";el.innerHTML=empty("Chưa có cơ cấu đã xác minh.");return}el.dataset.sourceStatus="available"
  if(rows.some(r=>!hasMetric(r.value))){el.dataset.sourceStatus="unavailable";el.innerHTML=empty("Nguồn cơ cấu còn thiếu chỉ số được xác minh.");return}
  const clean=rows.slice(0,4).map(r=>({label:String(r.label||"—"),value:Math.max(0,Number(r.value))}));
  const total=clean.reduce((s,r)=>s+r.value,0);if(total<=0){el.dataset.sourceStatus="unavailable";el.innerHTML=empty("Chưa đủ số liệu để xác định cơ cấu.");return}
  let acc=0;const stops=clean.map(r=>{acc+=r.value/total*100;return acc});
  const ring=document.createElement("div");ring.className="strategy-donut-ring";
  ring.style.setProperty("--d1",(stops[0]||100)+"%");ring.style.setProperty("--d2",(stops[1]||100)+"%");ring.style.setProperty("--d3",(stops[2]||100)+"%");
  const center=document.createElement("div");center.className="strategy-donut-center";center.innerHTML="<strong>100%</strong><span>"+label+"</span>";ring.append(center);
  const legend=document.createElement("div");legend.className="strategy-donut-legend";
  clean.forEach(r=>{const row=document.createElement("div"),sw=document.createElement("i"),name=document.createElement("span"),val=document.createElement("strong");name.textContent=r.label;val.textContent=pct(r.value/total*100);row.append(sw,name,val);legend.append(row)});
  el.append(ring,legend)
 };
 const productionModel=()=>{
  const revenueQuality=document.getElementById("revenueQuality")?.dataset.quality||"NOT_CONNECTED";
  const revenueText=document.getElementById("revenueValue")?.textContent?.trim()||"—";
  const trusted=["ACTUAL","ESTIMATE"].includes(revenueQuality)&&revenueText!=="—";
  return {fixture:false,periodLabel:"Kỳ hiện tại",revenueText:trusted?revenueText:"—",revenueMeta:trusted?("Nguồn "+revenueQuality+" từ Control Tower"):"Chưa có dữ liệu doanh thu đủ tin cậy",
   cost:null,profit:null,margin:null,cashflow:null,targetProgress:null,trend:[],stores:[],revenueMix:[],costMix:[],products:[],customers:[],alerts:[],forecast:[]};
 };
 const render=()=>{
  const fixture=globalThis.__MAGASIN_OWNER_STRATEGY_READ_MODEL__;
  const model=fixture&&fixture.fixture===true?fixture:productionModel();
  const source=document.getElementById("strategySourceMode");if(source){source.dataset.mode=model.fixture?"fixture":"read-only";source.textContent=model.fixture?"FIXTURE READ-ONLY":"READ-ONLY"}
  const anyRevenue=model.revenueText&&model.revenueText!=="—"||hasMetric(model.revenue);
  const incomplete=!model.fixture&&!(anyRevenue&&hasMetric(model.cost)&&hasMetric(model.profit));
  dash.dataset.strategySources=model.fixture?"fixture":incomplete?"incomplete":"available";
  const notice=document.getElementById("strategyDataNotice");
  if(notice){notice.hidden=model.fixture||!incomplete;notice.textContent=anyRevenue?
    "Một số nguồn chi phí hoặc lợi nhuận chưa được xác minh. Chỉ số chưa có nguồn được để trống, không quy thành 0 đ.":
    "Chưa có số liệu kinh doanh đủ điều kiện xác minh. Các ô hiển thị “—” không có nghĩa doanh thu hoặc lợi nhuận bằng 0."}
  set("strategyPeriodLabel",model.periodLabel||"Kỳ hiện tại");
  set("strategyRevenue",model.revenueText||money(model.revenue));set("strategyRevenueMeta",model.revenueMeta||"Nguồn read-only");
  set("strategyCost",money(model.cost));set("strategyCostMeta",hasMetric(model.cost)?"Nguồn read-only":"Chưa kết nối nguồn chi phí");
  set("strategyProfit",money(model.profit));set("strategyProfitMeta",hasMetric(model.profit)?"Nguồn read-only":"Không suy diễn khi thiếu chi phí");
  set("strategyMargin",pct(model.margin));set("strategyMarginMeta",hasMetric(model.margin)?"Biên lợi nhuận read-only":"Chỉ hiển thị khi có nguồn hợp lệ");
  set("strategyCashflow",money(model.cashflow));set("strategyCashflowMeta",hasMetric(model.cashflow)?"Nguồn read-only":"Chưa kết nối nguồn dòng tiền");
  set("strategyTargetProgress",pct(model.targetProgress));set("strategyTargetProgressMirror",pct(model.targetProgress));set("strategyTargetMeta",hasMetric(model.targetProgress)?"Tiến độ theo mục tiêu read-only":"Chưa có mục tiêu authoritative");
  set("strategyTrendHeadline",model.trendHeadline||"—");renderTrend(model.trend);
  renderDonut("strategyRevenueMix",model.revenueMix,"doanh thu");renderDonut("strategyCostMix",model.costMix,"chi phí");
  list("strategyStoreComparison",model.stores,money,true);list("strategyProductPerformance",model.products,v=>String(v??"—"));list("strategyCustomerTrends",model.customers,v=>String(v??"—"));list("strategyAlerts",model.alerts,v=>String(v??"—"));list("strategyForecastTargets",model.forecast,v=>String(v??"—"));
  set("strategyWorkforceGap",document.getElementById("workforceGap")?.textContent?.trim()||count(model.workforceGap));
  set("strategyWorkforceUnresolved",document.getElementById("workforceUnresolved")?.textContent?.trim()||count(model.workforceUnresolved));
  dash.dataset.strategyState="ready";
 };
 const observer=new MutationObserver(()=>{if(document.body.dataset.ownerOverviewLoading==="false")render()});
 observer.observe(document.body,{attributes:true,attributeFilter:["data-owner-overview-loading"]});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render();
}
