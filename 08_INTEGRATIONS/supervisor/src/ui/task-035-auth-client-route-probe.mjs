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
  const ws=new URL(v.webSocketDebuggerUrl),ep=new URL(cdp);
  ws.hostname=ep.hostname;ws.port=ep.port;
  return chromium.connectOverCDP(ws.toString());
}
function sanitize(s){
  return String(s||"").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email]").replace(/\s+/g," ").trim().slice(0,220);
}
const cdp=await findCdp(); if(!cdp) process.exit(0);
const browser=await connect(cdp); const context=browser.contexts()[0]; if(!context) process.exit(0);
const page=await context.newPage();
try{
  await page.goto(`https://console.cloud.google.com/auth/clients?project=${PROJECT}`,{waitUntil:"domcontentloaded",timeout:60000}).catch(()=>{});
  await page.waitForTimeout(7000);
  const matches=await page.locator('a,button,[role="link"],[role="button"]').evaluateAll(nodes=>nodes.filter(n=>{
    const text=((n.innerText||n.textContent||"")+" "+(n.getAttribute("aria-label")||"")).trim();
    return /Create client/i.test(text);
  }).map(n=>({
    tag:n.tagName,
    href:n.getAttribute("href")||"",
    text:(n.innerText||n.textContent||"").trim(),
    aria:n.getAttribute("aria-label")||""
  })));
  console.log("CREATE_ROUTE_MATCH_COUNT="+matches.length);
  matches.forEach((m,i)=>console.log(`CREATE_ROUTE_MATCH_${i+1}=${sanitize(JSON.stringify(m))}`));
}finally{await page.close().catch(()=>{});}
process.exit(0);
