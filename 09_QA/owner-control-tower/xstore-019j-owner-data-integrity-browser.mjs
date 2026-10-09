import fs from "node:fs";
import {chromium} from "playwright";

const BASE=process.env.QA_BASE_URL||"http://127.0.0.1:8787";
const html=fs.readFileSync("04_OWNER/index.html","utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"");
const strategyJS=fs.readFileSync("04_OWNER/strategy-presentation-v4.js","utf8");
const browser=await chromium.launch({headless:true});
const failures=[];

for(const width of [1440,390]){
 for(const kind of ["missing","genuine-zero"]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:960},locale:"vi-VN"});
  const page=await context.newPage();
  try{
   await page.goto(BASE+"/09_QA/xstore-019j/owner-preview.html",{waitUntil:"domcontentloaded",timeout:20000});
   await page.setContent(html,{waitUntil:"load",timeout:20000});
   await page.evaluate(kind=>{
    document.getElementById("app")?.classList.remove("hidden");
    document.getElementById("loading")?.classList.add("hidden");
    delete globalThis.__MAGASIN_OWNER_STRATEGY_READ_MODEL__;
    if(kind==="genuine-zero")globalThis.__MAGASIN_OWNER_STRATEGY_READ_MODEL__={
     fixture:true,periodLabel:"Kiểm thử số không",revenue:0,cost:0,profit:0,margin:0,cashflow:0,targetProgress:0,
     revenueMix:[],costMix:[],trend:[],stores:[],products:[],customers:[],alerts:[],forecast:[]
    };
   },kind);
   await page.addScriptTag({content:strategyJS});
   const actual=await page.evaluate(()=>{
    const val=id=>document.getElementById(id)?.textContent.trim();
    const font=s=>Number.parseFloat(getComputedStyle(document.querySelector(s)).fontSize);
    const empty=[...document.querySelectorAll(".strategy-empty")].length;
    const gap=document.documentElement.scrollWidth-document.documentElement.clientWidth;
    const chart=document.querySelector("#strategyTrendBars");
    const sources=document.querySelector("#strategyDataNotice");
    return {
     metrics:["strategyRevenue","strategyProfit","strategyCost","strategyCashflow","strategyMargin"].map(val),
     sourceState:document.getElementById("strategyDashboard")?.dataset.strategySources,
     noticeVisible:!sources.hidden,noticeText:sources.textContent.trim(),
     empty,chartHeight:Math.round(chart.getBoundingClientRect().height),
     layoutGap:gap,
     typography:{name:font(".strategy-kpi>span"),value:font(".strategy-kpi>strong"),subtitle:font(".strategy-kpi>small"),panel:font(".strategy-panel-head h3")},
     ringCount:document.querySelectorAll(".strategy-donut-ring").length
    };
   });
   const key="XSTORE_019J_OWNER_SOURCE_INTEGRITY_"+width+"_"+kind;
   if(actual.layoutGap>2||actual.typography.name<10.8||actual.typography.value<18||actual.typography.panel<14.5)
    throw Error(key+" unreadable-or-overflow "+JSON.stringify(actual));
   if(kind==="missing"){
    if(actual.metrics.some(v=>v!=="—")||actual.sourceState!=="incomplete"||!actual.noticeVisible||actual.empty<5||actual.chartHeight>160||actual.ringCount)
     throw Error(key+" missing-source-misrepresented "+JSON.stringify(actual));
   }else{
    if(actual.metrics.slice(0,4).some(v=>!v.includes("0"))||actual.metrics[4]!=="0%"||actual.sourceState!=="fixture"||actual.noticeVisible)
     throw Error(key+" real-zero-misrepresented "+JSON.stringify(actual));
   }
   console.log(key+"=PASS "+JSON.stringify(actual));
  }catch(err){
    failures.push({width,kind,error:String(err?.stack||err)});
    console.error("XSTORE_019J_OWNER_SOURCE_INTEGRITY_"+width+"_"+kind+"=FAIL",err)
  }finally{await context.close()}
 }
}
await browser.close();
if(failures.length){console.error(JSON.stringify(failures));process.exitCode=1}
