import process from "node:process";
const PROJECT="magasin-noibo";
const PORTS=Array.from({length:11},(_,i)=>9222+i);

async function findCdp(){
  for(const port of PORTS){
    try{
      const r=await fetch(`http://127.0.0.1:${port}/json/version`,{cache:"no-store"});
      if(!r.ok) continue;
      const d=await r.json();
      if(d?.webSocketDebuggerUrl) return `http://127.0.0.1:${port}`;
    }catch{}
  }
  return null;
}
async function connect(cdp){
  const {chromium}=await import("playwright-core");
  const v=await fetch(cdp+"/json/version").then(r=>r.json());
  const ws=new URL(v.webSocketDebuggerUrl); const ep=new URL(cdp);
  ws.hostname=ep.hostname; ws.port=ep.port;
  return chromium.connectOverCDP(ws.toString());
}
async function visible(locator,timeout=1500){
  try{return await locator.first().isVisible({timeout});}catch{return false;}
}
async function clickIfVisible(locator){
  try{
    const x=locator.first();
    if(await x.isVisible({timeout:1500})){ await x.click({timeout:10000}); return true; }
  }catch{}
  return false;
}

const cdp=await findCdp();
console.log("GMAIL_SETUP_CDP="+Boolean(cdp));
if(!cdp) process.exit(0);
const browser=await connect(cdp);
const context=browser.contexts()[0];
if(!context) process.exit(0);
const page=await context.newPage();

try{
  const urls=[
    `https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=${PROJECT}`,
    `https://console.cloud.google.com/apis/api/gmail.googleapis.com/overview?project=${PROJECT}`
  ];
  let acted=false;
  for(const url of urls){
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:60000}).catch(()=>{});
    await page.waitForTimeout(8000);

    const current=new URL(page.url());
    console.log("GMAIL_SETUP_PROJECT_BOUND="+(current.searchParams.get("project")===PROJECT));
    console.log("GMAIL_SETUP_TITLE="+(await page.title()).replace(/[\r\n]+/g," ").slice(0,120));

    const enable=page.getByRole("button",{name:/enable this API|^Enable$|^Bật$/i});
    const disable=page.getByRole("button",{name:/disable this API|^Disable$|^Tắt$/i});
    const manage=page.getByRole("button",{name:/manage this API|^Manage$|^Quản lý$/i});
    const enableLink=page.getByRole("link",{name:/enable this API|^Enable$|^Bật$/i});

    const enabledState=(await visible(disable)) || (await visible(manage));
    console.log("GMAIL_API_ALREADY_ENABLED="+enabledState);
    if(enabledState){ acted=true; break; }

    const enableVisible=(await visible(enable)) || (await visible(enableLink));
    console.log("GMAIL_API_ENABLE_VISIBLE="+enableVisible);
    if(enableVisible){
      const clicked=(await clickIfVisible(enable)) || (await clickIfVisible(enableLink));
      console.log("GMAIL_API_ENABLE_CLICKED="+clicked);
      if(clicked){
        await page.waitForTimeout(12000);
        const nowEnabled=(await visible(page.getByRole("button",{name:/disable this API|^Disable$|^Tắt$/i}),2500)) ||
          (await visible(page.getByRole("button",{name:/manage this API|^Manage$|^Quản lý$/i}),2500)) ||
          /apis\/api\/gmail\.googleapis\.com/i.test(page.url());
        console.log("GMAIL_API_ENABLED_AFTER_CLICK="+nowEnabled);
        acted=nowEnabled;
        break;
      }
    }
  }
  console.log("GMAIL_API_SETUP_RESOLVED="+acted);
}finally{
  await page.close().catch(()=>{});
}
process.exit(0);
