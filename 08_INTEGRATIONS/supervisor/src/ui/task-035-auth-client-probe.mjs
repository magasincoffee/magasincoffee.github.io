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
  const ws=new URL(v.webSocketDebuggerUrl), ep=new URL(cdp);
  ws.hostname=ep.hostname; ws.port=ep.port;
  return chromium.connectOverCDP(ws.toString());
}
function sanitize(s){
  return String(s||"")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email]")
    .replace(/[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com/gi,"[client-id]")
    .replace(/\s+/g," ")
    .trim()
    .slice(0,180);
}
const cdp=await findCdp();
console.log("AUTH_CLIENT_PROBE_CDP="+Boolean(cdp));
if(!cdp) process.exit(0);
const browser=await connect(cdp);
const context=browser.contexts()[0];
if(!context) process.exit(0);
const page=await context.newPage();
try{
  await page.goto(`https://console.cloud.google.com/auth/clients?project=${PROJECT}`,{waitUntil:"domcontentloaded",timeout:60000}).catch(()=>{});
  await page.waitForTimeout(9000);
  console.log("AUTH_CLIENTS_TITLE="+sanitize(await page.title()));
  console.log("AUTH_CLIENTS_PROJECT_BOUND="+(new URL(page.url()).searchParams.get("project")===PROJECT));

  const controls=await page.locator('button,a,[role="button"],[role="link"]').evaluateAll(nodes=>nodes.map(n=>({
    text:(n.innerText||n.textContent||"").trim(),
    aria:n.getAttribute("aria-label")||"",
    title:n.getAttribute("title")||""
  })));
  const relevant=[];
  const re=/create|client|oauth|desktop|application|add|tạo|ứng dụng khách|máy tính|thêm/i;
  for(const c of controls){
    const label=sanitize(`${c.text} | ${c.aria} | ${c.title}`);
    if(label && re.test(label) && !relevant.includes(label)) relevant.push(label);
    if(relevant.length>=60) break;
  }
  console.log("AUTH_CLIENT_CONTROL_COUNT="+relevant.length);
  relevant.forEach((v,i)=>console.log(`AUTH_CLIENT_CONTROL_${i+1}=${v}`));

  const rowTexts=await page.locator('tr,[role="row"]').evaluateAll(nodes=>nodes.map(n=>(n.innerText||n.textContent||"").trim()));
  const clientRows=[];
  for(const raw of rowTexts){
    const t=sanitize(raw);
    if(t && /desktop|web application|android|ios|chrome|tv|client|máy tính|ứng dụng/i.test(t) && !clientRows.includes(t)) clientRows.push(t);
    if(clientRows.length>=40) break;
  }
  console.log("AUTH_CLIENT_ROW_COUNT="+clientRows.length);
  clientRows.forEach((v,i)=>console.log(`AUTH_CLIENT_ROW_${i+1}=${v}`));
}finally{
  await page.close().catch(()=>{});
}
process.exit(0);
