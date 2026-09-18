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
    .replace(/\s+/g," ")
    .trim()
    .slice(0,160);
}
const cdp=await findCdp();
if(!cdp) process.exit(0);
const browser=await connect(cdp);
const context=browser.contexts()[0];
if(!context) process.exit(0);
const page=await context.newPage();
try{
  await page.goto(`https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=${PROJECT}`,{waitUntil:"domcontentloaded",timeout:60000}).catch(()=>{});
  await page.waitForTimeout(10000);
  const controls=await page.locator('button,a,[role="button"],[role="link"]').evaluateAll(nodes=>nodes.map(n=>({
    text:(n.innerText||n.textContent||"").trim(),
    aria:n.getAttribute("aria-label")||"",
    title:n.getAttribute("title")||"",
    disabled:n.hasAttribute("disabled")||n.getAttribute("aria-disabled")==="true"
  })));
  const re=/enable|disable|manage|gmail|api|credential|oauth|quota|metric|overview|library|bật|tắt|quản lý|thông tin xác thực|hạn ngạch/i;
  const out=[];
  for(const c of controls){
    const joined=`${c.text} | ${c.aria} | ${c.title}`;
    if(re.test(joined)){
      const label=sanitize(joined);
      if(label && !out.includes(label)) out.push(label);
    }
    if(out.length>=80) break;
  }
  console.log("GMAIL_CONTROL_COUNT="+out.length);
  for(let i=0;i<out.length;i++) console.log(`GMAIL_CONTROL_${i+1}=${out[i]}`);
}finally{
  await page.close().catch(()=>{});
}
process.exit(0);
