import process from "node:process";
const PROJECT="magasin-noibo";
const PORTS=Array.from({length:11},(_,i)=>9222+i);
async function findCdp(){for(const port of PORTS){try{const r=await fetch(`http://127.0.0.1:${port}/json/version`,{cache:"no-store"});if(!r.ok)continue;const d=await r.json();if(d?.webSocketDebuggerUrl)return `http://127.0.0.1:${port}`;}catch{}}return null;}
async function connect(cdp){const {chromium}=await import("playwright-core");const v=await fetch(cdp+"/json/version").then(r=>r.json());const ws=new URL(v.webSocketDebuggerUrl),ep=new URL(cdp);ws.hostname=ep.hostname;ws.port=ep.port;return chromium.connectOverCDP(ws.toString());}
function clean(s){return String(s||"").replace(/\s+/g," ").trim().slice(0,260);}
const cdp=await findCdp(); if(!cdp) process.exit(1);
const browser=await connect(cdp); const context=browser.contexts()[0]; if(!context) process.exit(1);
const page=await context.newPage();
try{
  await page.goto(`https://console.cloud.google.com/auth/clients/create?project=${PROJECT}`,{waitUntil:"domcontentloaded",timeout:60000}).catch(()=>{});
  await page.waitForTimeout(7000);
  const dismiss=page.getByRole("button",{name:/Dismiss/i}).first();
  if(await dismiss.isVisible({timeout:600}).catch(()=>false)) await dismiss.click({force:true}).catch(()=>{});
  const combo=page.locator('cfc-select[role="combobox"]').last();
  await combo.click({force:true});
  await page.waitForTimeout(500);
  let web=page.getByRole("option",{name:/^Web application$/i}).first();
  if(!(await web.isVisible({timeout:900}).catch(()=>false))) web=page.getByText(/^Web application$/i).first();
  await web.click({force:true});
  await page.waitForTimeout(900);

  const btns=page.getByRole("button",{name:/^Add URI$/i});
  const count=await btns.count();
  console.log("ADD_URI_BUTTON_COUNT="+count);
  for(let i=0;i<count;i++){
    const b=btns.nth(i);
    const contextText=await b.evaluate(el=>{
      let p=el;
      for(let j=0;j<5 && p;j++,p=p.parentElement){
        const t=(p.innerText||p.textContent||"").trim();
        if(t) return t;
      }
      return "";
    }).catch(()=>"");
    console.log(`ADD_URI_BUTTON_${i+1}_CONTEXT=${clean(contextText)}`);
  }

  const headings=await page.locator('text=Authorized redirect URIs').count();
  console.log("REDIRECT_HEADING_COUNT="+headings);
}finally{await page.close().catch(()=>{});}
process.exit(0);
