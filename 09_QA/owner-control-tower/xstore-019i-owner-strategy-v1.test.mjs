import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const home=fs.readFileSync("04_OWNER/index.html","utf8");
const js=fs.readFileSync("04_OWNER/strategy-presentation-v4.js","utf8");
const css=fs.readFileSync("04_OWNER/strategy-presentation-v4.css","utf8");

test("XSTORE-019I Owner home is strategy-first and workforce stays secondary",()=>{
 const strategy=home.indexOf('id="strategyDashboard"'),overview=home.indexOf('id="overview"'),modules=home.indexOf('id="ownerModules"');
 assert.ok(strategy>0&&strategy<overview&&overview<modules);
 for(const token of ["strategyRevenue","strategyCost","strategyProfit","strategyMargin","strategyCashflow","strategyTargetProgress","strategyRevenueMix","strategyCostMix","strategyStoreComparison","strategyProductPerformance","strategyCustomerTrends","strategyAlerts","strategyForecastTargets"])assert.ok(home.includes('id="'+token+'"'),token);
 assert.match(home,/data-x19i-dashboard="owner-mockup-v2"/);
 assert.match(home,/Chào Owner!/);
 assert.match(home,/Doanh thu & lợi nhuận theo kỳ/);
 assert.match(home,/Cơ cấu doanh thu/);
 assert.match(home,/Chi phí hoạt động/);
 assert.match(home,/Top sản phẩm bán chạy/);
 assert.match(home,/href="\/owner\/scheduling\/"/);
 assert.doesNotMatch(home,/publish_schedule_generation|replace_schedule_generation_assignments|create_schedule_generation/);
});

test("XSTORE-019I presentation is read-only and never fabricates unavailable production metrics",()=>{
 assert.doesNotMatch(js,/\.rpc\s*\(|\.from\s*\(|createClient\s*\(|\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(/);
 assert.match(js,/__MAGASIN_OWNER_STRATEGY_READ_MODEL__/);
 assert.match(js,/fixture===true/);
 assert.match(js,/productionModel/);
 assert.match(js,/cost:null,profit:null,margin:null,cashflow:null,targetProgress:null/);
 assert.match(js,/revenueMix:\[\],costMix:\[\]/);
 assert.match(js,/renderDonut/);
 assert.match(js,/strategyTargetProgressMirror/);
 assert.match(js,/revenueQuality/);
 assert.match(js,/NOT_CONNECTED/);
});

test("XSTORE-019I desktop-first and useful mobile summary contracts are explicit",()=>{
 assert.match(css,/XSTORE-019I VISUAL2 OWNER-MOCKUP FIDELITY/);
 assert.match(css,/grid-template-columns:repeat\(5,/);
 assert.match(css,/grid-template-columns:repeat\(12,/);
 assert.match(css,/conic-gradient/);
 assert.match(css,/strategy-bar-list/);
 assert.match(css,/@media\(max-width:1180px\)/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/@media\(max-width:430px\)/);
 assert.match(css,/min-height:44px/);
 assert.match(home,/20261007-xstore-019i-visual2/);
 assert.match(home,/data-x19i-visual="owner-mockup-v2"/);
});
console.log("XSTORE_019I_OWNER_STRATEGY_STATIC=PASS");
