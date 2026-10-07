import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";
const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8785",OUT=process.env.QA_OUT||"qa-artifacts/xstore-019i";fs.mkdirSync(OUT,{recursive:true});
const fixture={
 fixture:true,periodLabel:"Tuần 01/10–07/10/2026",
 revenue:128000000,revenueMeta:"SANITIZED STRATEGY FIXTURE",cost:83000000,profit:45000000,margin:35.2,cashflow:29000000,targetProgress:82,
 trendHeadline:"+12,4% so với kỳ trước",
 trend:[["T2",92,28],["T3",98,30],["T4",101,31],["T5",109,36],["T6",116,40],["T7",128,45]].map(([label,revenue,profit])=>({label,revenue:revenue*1e6,profit:profit*1e6})),
 revenueMix:[{label:"Đồ uống",value:57},{label:"Bánh & đồ ăn",value:23},{label:"Khác",value:13},{label:"Dịch vụ",value:7}],
 costMix:[{label:"Nguyên vật liệu",value:42},{label:"Nhân sự",value:28},{label:"Vận hành",value:19},{label:"Khác",value:11}],
 stores:[{label:"CN1",value:45200000,share:92},{label:"CN2",value:32700000,share:70},{label:"CN3",value:28300000,share:61},{label:"CN4",value:21800000,share:47}],
 products:[{label:"Cà phê sữa",value:"18,2 tr"},{label:"Trà đào cam sả",value:"15,9 tr"},{label:"Bạc xỉu",value:"13,1 tr"}],
 customers:[{label:"Khách quay lại",value:"+9%"},{label:"Giá trị đơn trung bình",value:"+6%"},{label:"Khách mới",value:"+4%"}],
 alerts:[{label:"CN2 biên lợi nhuận giảm",value:"Xem xét"},{label:"Chi phí NVL tăng",value:"Theo dõi"},{label:"Cà phê sữa tăng tốt",value:"Cơ hội"}],
 forecast:[{label:"Dự báo tháng",value:"154 triệu"},{label:"Mục tiêu tháng",value:"160 triệu"},{label:"Tiến độ",value:"82%"}]
};
const report={status:"PASS",checks:[]};const check=async(n,f)=>{try{report.checks.push({name:n,status:"PASS",detail:String(await f())})}catch(e){report.status="FAIL";report.checks.push({name:n,status:"FAIL",detail:String(e?.stack||e)})}};
const browser=await chromium.launch({headless:true});
for(const width of [1440,390]){
 const ctx=await browser.newContext({viewport:{width,height:width===390?844:1000},locale:"vi-VN",timezoneId:"Asia/Ho_Chi_Minh"});
 await ctx.addInitScript(data=>{globalThis.__MAGASIN_OWNER_STRATEGY_READ_MODEL__=data},fixture);
 await ctx.route("https://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:"globalThis.supabase=globalThis.supabase||{};"}));
 await ctx.route("**/02_CORE/shared/shared-core-v1.js*",r=>r.fulfill({status:200,contentType:"application/javascript",path:"09_QA/owner-control-tower/ui2-014-shared-core-mock.js"}));
 const page=await ctx.newPage();await page.goto(BASE+"/04_OWNER/",{waitUntil:"domcontentloaded",timeout:20000});await page.locator("#app:not(.hidden)").waitFor({timeout:10000});await page.waitForFunction(()=>document.body.dataset.ownerOverviewLoading==="false");await page.locator('#strategyDashboard[data-strategy-state="ready"]').waitFor();

 await check("xstore_019i_"+width+"_strategy_primary",async()=>page.evaluate(w=>{
  const d=document.getElementById("strategyDashboard"),o=document.getElementById("overview"),html=document.documentElement;
  const vals={revenue:document.getElementById("strategyRevenue").textContent,profit:document.getElementById("strategyProfit").textContent,margin:document.getElementById("strategyMargin").textContent,target:document.getElementById("strategyTargetProgress").textContent};
  const visibleKpis=[...document.querySelectorAll(".strategy-kpi")].filter(x=>getComputedStyle(x).display!=="none").length;
  if(!(d.offsetTop<o.offsetTop)||html.scrollWidth>innerWidth+1||Object.values(vals).some(v=>v==="—")||visibleKpis!==5||document.body.dataset.x19iVisual!=="owner-mockup-v2")throw new Error(JSON.stringify({scroll:html.scrollWidth,w:innerWidth,vals,visibleKpis,visual:document.body.dataset.x19iVisual}));
  return JSON.stringify({vals,visibleKpis})
 },width));

 await check("xstore_019i_"+width+"_decision_surfaces",async()=>page.evaluate(()=>{
  const counts=["strategyStoreComparison","strategyProductPerformance","strategyCustomerTrends","strategyAlerts","strategyForecastTargets"].map(id=>document.querySelectorAll("#"+id+" .strategy-list-item").length);
  const donutCounts=["strategyRevenueMix","strategyCostMix"].map(id=>document.querySelectorAll("#"+id+" .strategy-donut-legend div").length);
  if(counts.some(x=>x<2)||donutCounts.some(x=>x<4))throw new Error(JSON.stringify({counts,donutCounts}));
  const workforce=document.querySelector(".strategy-workforce-summary a")?.getAttribute("href");if(workforce!=="/owner/scheduling/")throw new Error(String(workforce));
  return JSON.stringify({counts,donutCounts,workforce})
 }));

 await check("xstore_019i_"+width+"_mockup_hierarchy",async()=>page.evaluate(w=>{
  const box=s=>document.querySelector(s)?.getBoundingClientRect();
  const trend=box(".strategy-trend-panel"),mix=box(".strategy-revenue-mix"),store=box(".strategy-store-panel"),product=box(".strategy-product-panel"),alerts=box(".strategy-alert-panel");
  const hero=box(".owner-hero");
  if(!trend||!mix||!store||!product||!alerts||!hero)throw new Error("missing visual surfaces");
  if(w>=1000){
   if(hero.height>110||Math.abs(trend.top-mix.top)>4||!(store.top>trend.top+80)||!(trend.width>mix.width))throw new Error(JSON.stringify({hero:hero.height,trend,mix,store}));
  }else{
   for(const r of [trend,store,product,alerts])if(r.width>innerWidth+1||r.left<0)throw new Error(JSON.stringify({r,w}));
   if(getComputedStyle(document.querySelector(".strategy-cost-mix")).display!=="none"||getComputedStyle(document.querySelector(".strategy-workforce-summary")).display!=="none")throw new Error("mobile secondary density not reduced");
  }
  return JSON.stringify({hero:Math.round(hero.height),trend:{w:Math.round(trend.width),top:Math.round(trend.top)},mix:{w:Math.round(mix.width),top:Math.round(mix.top)},storeTop:Math.round(store.top)})
 },width));

 await page.screenshot({path:path.join(OUT,"xstore-019i-owner-"+width+".png"),fullPage:true});await ctx.close();
}
await browser.close();fs.writeFileSync(path.join(OUT,"report.json"),JSON.stringify(report,null,2));console.log("XSTORE_019I_OWNER_STRATEGY_BROWSER="+report.status);for(const c of report.checks)console.log("["+c.status+"] "+c.name+" — "+c.detail);if(report.status!=="PASS")process.exitCode=1;
