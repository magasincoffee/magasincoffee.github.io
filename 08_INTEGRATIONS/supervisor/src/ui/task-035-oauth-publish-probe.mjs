import process from "node:process";
const PROJECT="magasin-noibo";
const PORTS=Array.from({length:11},(_,i)=>9222+i);
async function findCdp(){for(const port of PORTS){try{const r=await fetch(`http://127.0.0.1:${port}/json/version`,{cache:"no-store"});if(!r.ok)continue;const d=await r.json();if(d?.webSocketDebuggerUrl)return `http://127.0.0.1:${port}`;}catch{}}return null;}
async function connect(cdp){const {chromium}=await import("playwright-core");const v=await fetch(cdp+"/json/version").then(r=>r.json());const ws=new URL(v.webSocketDebuggerUrl),ep=new URL(cdp);ws.hostname=ep.hostname;ws.port=ep.port;return chromium.connectOverCDP(ws.toString());}
function clean(s){return String(s||"").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email]").replace(/\s+/g," ").trim().slice(0,500);}
const cdp=await findCdp(); if(!cdp)process.exit(1);
const browser=await connect(cdp); const context=browser.contexts()[0]; if(!context)process.exit(1);
const page=await context.newPage();
try{
  await page.goto(`https://console.cloud.google.com/auth/audience?project=${PROJECT}`,{waitUntil:"domcontentloaded",timeout:60000}).catch(()=>{});
  await page.waitForTimeout(7000);
  const publish=page.getByRole("button",{name:/Publish app|Publish/i}).first();
  const visible=await publish.isVisible({timeout:1500}).catch(()=>false);
  console.log("PUBLISH_BUTTON_VISIBLE="+visible);
  if(!visible)process.exit(0);
  await publish.click({force:true});
  await page.waitForTimeout(900);
  const dialog=page.locator('[role="dialog"],[role="alertdialog"],mat-dialog-container').first();
  const dialogVisible=await dialog.isVisible({timeout:1200}).catch(()=>false);
  console.log("PUBLISH_CONFIRM_DIALOG_VISIBLE="+dialogVisible);
  if(dialogVisible){
    const text=clean(await dialog.innerText().catch(()=>""));
    console.log("PUBLISH_CONFIRM_HAS_PRODUCTION="+/production/i.test(text));
    console.log("PUBLISH_CONFIRM_HAS_VERIFICATION="+/verification|verify/i.test(text));
    console.log("PUBLISH_CONFIRM_HAS_USER_LIMIT="+/100 users|user cap|limit/i.test(text));
    console.log("PUBLISH_CONFIRM_BUTTON_COUNT="+await dialog.locator('button,[role="button"]').count());
  }
}finally{await page.close().catch(()=>{});}
process.exit(0);