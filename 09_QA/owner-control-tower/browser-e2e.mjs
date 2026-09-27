await import("./ui2-014-owner-oversight-browser.mjs");
if(process.exitCode)throw new Error("UI2-014 Owner oversight browser gate failed");
await import("./ui2-015-owner-drilldown-browser.mjs");
if(process.exitCode)throw new Error("UI2-015 Owner drill-down browser gate failed");
console.log("CONTROL_TOWER_BROWSER_E2E=PASS");
