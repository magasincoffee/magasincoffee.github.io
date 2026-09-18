import process from "node:process";
const PROJECT="magasin-noibo";
const PORTS=Array.from({length:11},(_,i)=>9222+i);
async function findCdp(){for(const port of PORTS){try{const r=await fetch(`http://127.0.0.1:${port}/json/version`,{cache:"no-store"});if(!r.ok)continue;const d=await r.json();if(d?.webSocketDebuggerUrl)return `http://127.0.0.1:${port}`;}catch{}}return null;}
async function connect(cdp){const {chromium}=await import("playwright-core");const v=await fetch(cdp+"/json/version").then(r=>r.json());const ws=new URL(v.webSocketDebuggerUrl),ep=new URL(cdp);ws.hostname=ep.hostname;ws.port=ep.port;return chromium.connectOverCDP(ws.toString());}
const cdp=await findCdp(); console.log("AUDIENCE_CDP="+Boolean(cdp)); if(!cdp)process.exit(1);
const browser=await connect(cdp); const context=browser.contexts()[0]; if(!context)process.exit(1);
const page=await context.newPage();
try{
  await page.goto(`https://console.cloud.google.com/auth/audience?project=${PROJECT}`,{waitUntil:"domcontentloaded",timeout:60000}).catch(()=>{});
  await page.waitForTimeout(7000);
  const body=await page.locator("body").innerText().catch(()=>"");
  console.log("AUDIENCE_PAGE_PROJECT_BOUND="+(new URL(page.url()).searchParams.get("project")===PROJECT));
  console.log("AUDIENCE_HAS_EXTERNAL="+/External/i.test(body));
  console.log("AUDIENCE_HAS_INTERNAL="+/Internal/i.test(body));
  console.log("AUDIENCE_HAS_TESTING="+/Testing/i.test(body));
  console.log("AUDIENCE_HAS_PRODUCTION="+/In production|Production/i.test(body));
  console.log("AUDIENCE_PUBLISH_BUTTON_VISIBLE="+await page.getByRole("button",{name:/Publish app|Publish/i}).first().isVisible({timeout:1200}).catch(()=>false));
  console.log("AUDIENCE_BACK_TO_TESTING_VISIBLE="+await page.getByRole("button",{name:/Back to testing|Testing/i}).first().isVisible({timeout:1200}).catch(()=>false));
}finally{await page.close().catch(()=>{});}
process.exit(0);